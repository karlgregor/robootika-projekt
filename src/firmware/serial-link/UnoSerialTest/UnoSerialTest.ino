#include <Arduino.h>
#include <string.h>
#include <DHT.h>
constexpr unsigned long LINK_BAUD = 9600;
DHT sensor(2, DHT22);
constexpr uint32_t SAMPLE_INTERVAL_MS = 2500;
uint32_t lastSample = 0;
float temperatureC = NAN;
float humidityPercent = NAN;
bool sensorValid = false;
char command[32];
size_t commandLength = 0;
bool discardLine = false;

void handleCommand() {
  command[commandLength] = '\0';
  Serial.print("Received: ");
  Serial.println(command);
  if (strcmp(command, "GET_STATS") == 0) {
    if (!sensorValid || millis() - lastSample > 10000) {
      Serial1.println("ERR SENSOR_UNAVAILABLE");
    } else {
      Serial1.print("STATS ");
      Serial1.print(temperatureC, 1);
      Serial1.print(' ');
      Serial1.print(humidityPercent, 1);
      Serial1.print(' ');
      Serial1.println(millis() - lastSample);
    }
    return;
  }
  if (strcmp(command, "LIGHT_ON") == 0) {
    digitalWrite(LED_BUILTIN, HIGH);
    Serial1.println("OK LIGHT_ON");
    Serial.println("LED ON; sent OK LIGHT_ON");
  } else if (strcmp(command, "LIGHT_OFF") == 0) {
    digitalWrite(LED_BUILTIN, LOW);
    Serial1.println("OK LIGHT_OFF");
    Serial.println("LED OFF; sent OK LIGHT_OFF");
  } else {
    Serial1.println("ERR UNKNOWN_COMMAND");
  }
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  Serial.begin(115200);
  Serial1.begin(LINK_BAUD);
  sensor.begin();
  lastSample = millis();
  Serial.println("UNO ready: Serial1 on D0 RX / D1 TX, 9600 baud");
}

void loop() {
  if (millis() - lastSample >= SAMPLE_INTERVAL_MS) {
    humidityPercent = sensor.readHumidity();
    temperatureC = sensor.readTemperature();
    lastSample = millis();
    sensorValid = !isnan(temperatureC) && !isnan(humidityPercent) &&
                  temperatureC >= -40 && temperatureC <= 80 &&
                  humidityPercent >= 0 && humidityPercent <= 100;
    if (sensorValid) {
      Serial.print("Temperature C: "); Serial.print(temperatureC, 1);
      Serial.print(" | Humidity %: "); Serial.println(humidityPercent, 1);
    } else Serial.println("DHT22 read failed; check sensor wiring/pull-up.");
  }
  while (Serial1.available()) {
    const char c = static_cast<char>(Serial1.read());
    if (c == '\r') continue;
    if (c == '\n') {
      if (discardLine) Serial1.println("ERR LINE_TOO_LONG");
      else if (commandLength > 0) handleCommand();
      commandLength = 0;
      discardLine = false;
    } else if (!discardLine) {
      if (commandLength < sizeof(command) - 1) command[commandLength++] = c;
      else discardLine = true;
    }
  }
}
