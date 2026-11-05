#pragma once
#include <Arduino.h>

struct SensorSnapshot {
  bool available = false;
  float temperatureC = 0;
  float humidityPercent = 0;
  uint32_t ageMs = 0;
  uint32_t receivedAt = 0;
};
