#include <Arduino.h>
#include <string.h>
constexpr int LINK_RX = 5;
constexpr int LINK_TX = 4;
constexpr int BUTTON = 0;
constexpr uint32_t ACK_TIMEOUT_MS = 2000;
HardwareSerial unoLink(1);
bool previousButton = HIGH;
bool stableButton = HIGH;
uint32_t buttonChangedAt = 0;
bool waitingForReply = false;
bool turnOnNext = true;
uint32_t sentAt = 0;
char expectedReply[32];
char reply[64];
size_t replyLength = 0;
bool discardLine = false;

void sendCommand() {
  const char *command = turnOnNext ? "LIGHT_ON" : "LIGHT_OFF";
  snprintf(expectedReply, sizeof(expectedReply), "OK %s", command);
  replyLength = 0;
  discardLine = false;
  unoLink.println(command);
  Serial.print("Sent: ");
  Serial.println(command);
  sentAt = millis();
  waitingForReply = true;
}

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON, INPUT_PULLUP);
  unoLink.begin(9600, SERIAL_8N1, LINK_RX, LINK_TX);
  Serial.println("Heltec ready: GPIO4 TX / GPIO5 RX, 9600 baud");
  Serial.println("Press BOOT to turn UNO LED on; press again to turn it off.");
}

void loop() {
  while (unoLink.available()) {
    const char c = static_cast<char>(unoLink.read());
    if (c == '\r') continue;
    if (c == '\n') {
      reply[replyLength] = '\0';
      if (!discardLine && replyLength > 0) {
        Serial.print("UNO: ");
        Serial.println(reply);
        if (waitingForReply && strcmp(reply, expectedReply) == 0) {
          waitingForReply = false;
          turnOnNext = !turnOnNext;
          Serial.println("Link OK. Press BOOT for the next command.");
        }
      }
      replyLength = 0;
      discardLine = false;
    } else if (!discardLine) {
      if (replyLength < sizeof(reply) - 1) reply[replyLength++] = c;
      else discardLine = true;
    }
  }
  if (waitingForReply && millis() - sentAt >= ACK_TIMEOUT_MS) {
    waitingForReply = false;
    Serial.println("No matching reply. Check UNO power, wiring and sketches. BOOT retries.");
  }
  const bool button = digitalRead(BUTTON);
  if (button != previousButton) {
    previousButton = button;
    buttonChangedAt = millis();
  }
  if (button != stableButton && millis() - buttonChangedAt >= 50) {
    stableButton = button;
    if (stableButton == LOW && !waitingForReply) sendCommand();
  }
  delay(1);
}
