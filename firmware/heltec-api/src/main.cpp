#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>

// Näidisseadistus võimaldab kompileerida ka enne võrguandmete lisamist.
#if __has_include("secrets.h")
#include "secrets.h"
#else
#include "secrets.example.h"
#endif

// Heltec WiFi Kit 32 V3 sisseehitatud OLED ja BOOT-nupp.
constexpr int OLED_SDA = 17;
constexpr int OLED_SCL = 18;
constexpr int OLED_RESET = 21;
constexpr int VEXT = 36;
constexpr int BUTTON = 0;
Adafruit_SSD1306 display(128, 64, &Wire, OLED_RESET);
bool displayReady = false;
bool requestPending = true;
bool previousButton = HIGH;
uint32_t lastButtonChange = 0;
uint32_t lastPageChange = 0;
String replyText;
String responseCommand;
size_t replyPage = 0;
constexpr size_t PAGE_CHARS = 21 * 5;

// OLED-i vaikefont on ASCII; teisendame eesti tähed loetavaks.
String oledText(String text) {
  const char *from[] = {"õ", "ä", "ö", "ü", "Õ", "Ä", "Ö", "Ü", "š", "ž", "Š", "Ž", "–", "—", "“", "”", "’"};
  const char *to[] = {"o", "a", "o", "u", "O", "A", "O", "U", "s", "z", "S", "Z", "-", "-", "\"", "\"", "'"};
  for (size_t i = 0; i < sizeof(from) / sizeof(from[0]); ++i) text.replace(from[i], to[i]);
  String ascii;
  for (size_t i = 0; i < text.length(); ++i) {
    const uint8_t c = text[i];
    if (c == '\n' || c == '\r' || c == '\t') ascii += ' ';
    else if (c >= 32 && c < 127) ascii += char(c);
    else if ((c & 0xC0) != 0x80) ascii += '?';
  }
  return ascii;
}

void showMessage(const String &title, const String &body) {
  Serial.println(title + ": " + body);
  if (!displayReady) return;
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println(oledText(title).substring(0, 21));
  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
  display.setCursor(0, 16);
  display.print(oledText(body).substring(0, PAGE_CHARS));
  display.display();
}

void showReply() {
  const size_t pages = (replyText.length() + PAGE_CHARS - 1) / PAGE_CHARS;
  showMessage(responseCommand + " " + String(replyPage + 1) + "/" + String(pages),
              replyText.substring(replyPage * PAGE_CHARS, (replyPage + 1) * PAGE_CHARS));
}

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  showMessage("WiFi", "Connecting...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const uint32_t started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 15000) delay(100);
  if (WiFi.status() != WL_CONNECTED) {
    showMessage("WiFi failed", "Check 2.4 GHz/SSID. BOOT retries.");
    return false;
  }
  Serial.println("Board IP: " + WiFi.localIP().toString());
  return true;
}

void queryApi() {
  replyText = "";
  if (!connectWifi()) return;
  // Kohalik HTTP test; API võti jääb serverisse.
  String baseUrl = API_BASE_URL;
  if (!baseUrl.startsWith("http://")) {
    showMessage("URL error", "Use http://LAN-IP:3000 for this test.");
    return;
  }
  while (baseUrl.endsWith("/")) baseUrl.remove(baseUrl.length() - 1);
  WiFiClient client;
  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(30000);
  if (!http.begin(client, baseUrl + "/api/v1/interpret-text")) {
    showMessage("HTTP error", "Invalid API URL. BOOT retries.");
    return;
  }
  http.addHeader("Content-Type", "application/json");
  JsonDocument request;
  request["text"] = TEST_QUERY;
  String body;
  serializeJson(request, body);
  showMessage("Sending query", TEST_QUERY);
  const uint32_t started = millis();
  const int status = http.POST(body);
  const String payload = status > 0 ? http.getString() : HTTPClient::errorToString(status);
  http.end();
  Serial.printf("HTTP %d (%lu ms)\n", status, static_cast<unsigned long>(millis() - started));
  Serial.println(payload);
  if (status != 200) {
    showMessage("HTTP " + String(status), status < 0 ? payload : "See Serial log. BOOT retries.");
    return;
  }
  JsonDocument response;
  if (deserializeJson(response, payload) || !response["replyText"].is<const char *>() ||
      !response["command"].is<const char *>()) {
    showMessage("JSON error", "Missing replyText/command. BOOT retries.");
    return;
  }
  replyText = oledText(response["replyText"].as<String>());
  if (replyText.isEmpty()) {
    showMessage("Empty reply", "BOOT retries.");
    return;
  }
  responseCommand = response["command"].as<String>();
  replyPage = 0;
  lastPageChange = millis();
  showReply();
}

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON, INPUT_PULLUP);
  // Vext on aktiivne LOW; lülitame OLED-i toite sisse enne lähtestamist.
  pinMode(VEXT, OUTPUT);
  digitalWrite(VEXT, LOW);
  delay(100);
  Wire.begin(OLED_SDA, OLED_SCL);
  displayReady = display.begin(SSD1306_SWITCHCAPVCC, 0x3C, true, false);
  if (displayReady) {
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setTextWrap(true);
  } else Serial.println("OLED initialization failed; continuing with Serial.");
  WiFi.mode(WIFI_STA);
  showMessage("Heltec API test", "Starting...");
}

void loop() {
  // Üks päring käivitamisel; järgmised ainult nupuvajutusega.
  const bool button = digitalRead(BUTTON);
  if (button != previousButton) {
    previousButton = button;
    lastButtonChange = millis();
  }
  static bool pressHandled = false;
  if (button == HIGH) pressHandled = false;
  if (button == LOW && !pressHandled && millis() - lastButtonChange >= 50) {
    pressHandled = true;
    requestPending = true;
  }
  if (requestPending) {
    requestPending = false;
    queryApi();
    // Päringu ajal all hoitud nupp ei põhjusta korduspäringut.
    pressHandled = digitalRead(BUTTON) == LOW;
  }
  if (replyText.length() > PAGE_CHARS && millis() - lastPageChange >= 4000) {
    replyPage = (replyPage + 1) % ((replyText.length() + PAGE_CHARS - 1) / PAGE_CHARS);
    lastPageChange = millis();
    showReply();
  }
  delay(10);
}
