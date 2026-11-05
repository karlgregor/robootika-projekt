#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>
#include <math.h>
#include "SensorSnapshot.h"
#include "secrets.h"
constexpr int OLED_SDA = 17;
constexpr int OLED_SCL = 18;
constexpr int OLED_RESET = 21;
constexpr int VEXT = 36;
constexpr int UNO_RX = 5;
constexpr int UNO_TX = 4;
constexpr uint32_t UNO_ACK_TIMEOUT_MS = 2000;
HardwareSerial unoLink(1);
Adafruit_SSD1306 display(128, 64, &Wire, OLED_RESET);
bool displayReady = false;
uint32_t lastPageChange = 0;
String replyText;
String responseCommand;
size_t replyPage = 0;
constexpr size_t PAGE_CHARS = 21 * 5;
constexpr uint32_t WIFI_TIMEOUT_MS = 15000;
constexpr uint32_t PAGE_INTERVAL_MS = 4000;
constexpr size_t MAX_QUERY_BYTES = 1000;
String serialInput;
bool discardInputLine = false;
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
bool executeLightCommand(const String &command) {
  if (command != "LIGHT_ON" && command != "LIGHT_OFF") return false;
  while (unoLink.available()) unoLink.read();
  unoLink.println(command);
  Serial.println("Sent to UNO: " + command);
  const String expected = "OK " + command;
  String line;
  bool discardLine = false;
  const uint32_t started = millis();
  while (millis() - started < UNO_ACK_TIMEOUT_MS) {
    while (unoLink.available()) {
      const char c = static_cast<char>(unoLink.read());
      if (c == '\r') continue;
      if (c == '\n') {
        if (!discardLine && line.length() > 0) {
          Serial.println("UNO: " + line);
          if (line == expected) return true;
          if (line.startsWith("ERR ")) return false;
        }
        line = "";
        discardLine = false;
      } else if (!discardLine) {
        if (line.length() < 63) line += c;
        else discardLine = true;
      }
    }
    delay(1);
  }
  Serial.println("UNO acknowledgement timed out; output state unknown.");
  return false;
}

SensorSnapshot readSensorSnapshot() {
  SensorSnapshot result;
  while (unoLink.available()) unoLink.read();
  unoLink.println("GET_STATS");
  String line;
  bool discardLine = false;
  const uint32_t started = millis();
  while (millis() - started < UNO_ACK_TIMEOUT_MS) {
    while (unoLink.available()) {
      const char c = static_cast<char>(unoLink.read());
      if (c == '\r') continue;
      if (c == '\n') {
        if (!discardLine && line.length() > 0) {
          Serial.println("UNO: " + line);
          unsigned long age = 0;
          char extra;
          if (sscanf(line.c_str(), "STATS %f %f %lu %c", &result.temperatureC,
                     &result.humidityPercent, &age, &extra) == 3 &&
              isfinite(result.temperatureC) && isfinite(result.humidityPercent) &&
              result.temperatureC >= -40 && result.temperatureC <= 80 &&
              result.humidityPercent >= 0 && result.humidityPercent <= 100 && age <= 9000) {
            result.ageMs = age + (millis() - started);
            result.receivedAt = millis();
            result.available = result.ageMs <= 10000;
            return result;
          }
          if (line.startsWith("ERR ")) return result;
        }
        line = "";
        discardLine = false;
      } else if (!discardLine) {
        if (line.length() < 95) line += c;
        else discardLine = true;
      }
    }
    delay(1);
  }
  Serial.println("No valid sensor snapshot; AI will be told readings are unavailable.");
  return result;
}

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  showMessage("WiFi", "Connecting...");
  if (WIFI_PASSWORD[0] == '\0') {
    WiFi.begin(WIFI_SSID);
  } else {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
  const uint32_t started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < WIFI_TIMEOUT_MS) delay(100);
  if (WiFi.status() != WL_CONNECTED) {
    showMessage("WiFi failed", "Check 2.4 GHz/SSID. Send text again.");
    return false;
  }
  Serial.println("Board IP: " + WiFi.localIP().toString());
  return true;
}

void queryApi(const String &query) {
  replyText = "";
  if (!connectWifi()) return;
  String baseUrl = API_BASE_URL;
  const bool useTls = baseUrl.startsWith("https://");
  if (!useTls && !baseUrl.startsWith("http://")) {
    showMessage("URL error", "Use http:// or https://");
    return;
  }
  while (baseUrl.endsWith("/")) baseUrl.remove(baseUrl.length() - 1);
  WiFiClient plainClient;
  WiFiClientSecure secureClient;
  if (useTls) {
    secureClient.setInsecure();
    secureClient.setHandshakeTimeout(15);
  }
  WiFiClient &client = useTls ? static_cast<WiFiClient &>(secureClient) : plainClient;
  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(30000);
  if (!http.begin(client, baseUrl + "/api/v1/interpret-text")) {
    showMessage("HTTP error", "Invalid API URL. Send text again.");
    return;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("ngrok-skip-browser-warning", "true");
  showMessage("Reading sensor", "Requesting UNO stats...");
  const SensorSnapshot sensors = readSensorSnapshot();
  JsonDocument request;
  request["text"] = query;
  const uint32_t sensorAge = sensors.ageMs + (millis() - sensors.receivedAt);
  if (sensors.available && sensorAge <= 10000) {
    request["sensors"]["temperatureC"] = sensors.temperatureC;
    request["sensors"]["humidityPercent"] = sensors.humidityPercent;
    request["sensors"]["ageMs"] = sensorAge;
    Serial.printf("Sending snapshot: %.1f C, %.1f %% RH, age %lu ms\n",
                  sensors.temperatureC, sensors.humidityPercent, static_cast<unsigned long>(sensorAge));
  } else Serial.println("Sensor unavailable; sending query without measurements.");
  String body;
  serializeJson(request, body);
  showMessage("Sending query", query);
  const uint32_t started = millis();
  const int status = http.POST(body);
  const String payload = status > 0 ? http.getString() : HTTPClient::errorToString(status);
  http.end();
  Serial.printf("HTTP %d (%lu ms)\n", status, static_cast<unsigned long>(millis() - started));
  Serial.println(payload);
  if (status != 200) {
    showMessage("HTTP " + String(status), status < 0 ? payload : "See Serial log. Send text again.");
    return;
  }
  JsonDocument response;
  if (deserializeJson(response, payload) || !response["replyText"].is<const char *>() ||
      !response["command"].is<const char *>() ||
      !response["kind"].is<const char *>()) {
    showMessage("JSON error", "Missing response fields. Send text again.");
    return;
  }
  const String kind = response["kind"].as<String>();
  const String command = response["command"].as<String>();
  const String text = oledText(response["replyText"].as<String>());
  if (text.isEmpty()) {
    showMessage("Empty reply", "Send text again.");
    return;
  }
  if (kind == "DEVICE_COMMAND" && command == "REPORT_TEMPERATURE") {
    const SensorSnapshot latest = readSensorSnapshot();
    if (!latest.available) {
      showMessage("Sensor unavailable", "Check DHT22 wiring and UNO. Send text again.");
      return;
    }
    replyText = String(latest.temperatureC, 1) + " C / " + String(latest.humidityPercent, 1) + " % RH";
    responseCommand = "DHT22 reading";
    replyPage = 0;
    lastPageChange = millis();
    showReply();
    return;
  }
  if (kind == "DEVICE_COMMAND") {
    if (command != "LIGHT_ON" && command != "LIGHT_OFF") {
      showMessage("Not implemented", command + ": only light commands supported.");
      return;
    }
    showMessage("Waiting for UNO", command);
    if (!executeLightCommand(command)) {
      showMessage("UNO unconfirmed", "LED state unknown. Check UNO/wiring. Send text again.");
      return;
    }
    responseCommand = command == "LIGHT_ON" ? "LED ON confirmed" : "LED OFF confirmed";
  } else if ((kind == "ANSWER" || kind == "UNSUPPORTED") && command == "NONE") {
    responseCommand = kind;
  } else {
    showMessage("Invalid response", "Inconsistent kind/command; no action sent.");
    return;
  }
  replyText = text;
  replyPage = 0;
  lastPageChange = millis();
  showReply();
}

void setup() {
  Serial.begin(115200);
  unoLink.begin(9600, SERIAL_8N1, UNO_RX, UNO_TX);
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
  serialInput.reserve(MAX_QUERY_BYTES);
  showMessage("Ready", "Type in Serial Monitor. 115200 baud + Newline.");
  Serial.println("Enter a query and send with Newline (or Both NL & CR). No startup request.");
}

void loop() {
  while (Serial.available()) {
    const char c = static_cast<char>(Serial.read());
    if (c == '\r' || c == '\n') {
      if (discardInputLine) {
        Serial.println("Input too long (maximum 1000 UTF-8 bytes); line discarded.");
      } else {
        serialInput.trim();
        if (serialInput.length() > 0) {
          queryApi(serialInput);
          Serial.println("Ready for the next query.");
        }
      }
      serialInput = "";
      discardInputLine = false;
    } else if (!discardInputLine) {
      if (serialInput.length() < MAX_QUERY_BYTES) serialInput += c;
      else {
        serialInput = "";
        discardInputLine = true;
      }
    }
  }
  if (replyText.length() > PAGE_CHARS && millis() - lastPageChange >= PAGE_INTERVAL_MS) {
    replyPage = (replyPage + 1) % ((replyText.length() + PAGE_CHARS - 1) / PAGE_CHARS);
    lastPageChange = millis();
    showReply();
  }
  delay(10);
}
