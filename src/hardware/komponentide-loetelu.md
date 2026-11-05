# Prototüübi riistvara

| Komponent | Otstarve |
|---|---|
| Heltec WiFi Kit 32 V3 (ESP32-S3), sisseehitatud SSD1306 OLED | Wi-Fi, tekstipäringud ja vastuste kuvamine |
| Arduino UNO R4 WiFi | LED-i juhtimine ja anduri lugemine |
| DHT22 / AM2302, nelja kontaktiga | Temperatuur ja suhteline õhuniiskus |
| 3,3 V / 5 V loogikataseme muundur | Plaatide UART-signaalide sobitamine |
| 10 kΩ takisti | DHT22 andmeliini väline pull-up |
| Makettplaat ja ühendusjuhtmed | Prototüübi ühendused |
| Kaks USB-andmekaablit | Programmeerimine ja plaatide toide |

Valgustuse katseks kasutatakse UNO sisseehitatud LED-i.

[UART-ühendused](../firmware/serial-link/README.md#wiring) ja
[DHT22 ühendused](../firmware/heltec-api/README.md#dht22-readings-for-ai).

Kavandatud täiendused: INMP441 mikrofon, MAX98357A võimendi ja kõlar,
SG90 servo ning ventilaator koos sobiva draiveri ja toitega. Need pole praeguse
püsivara kasutamiseks vajalikud. Lõplik toitelahendus ja korpus on valimata.
