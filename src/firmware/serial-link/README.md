# Heltec ↔ UNO R4 WiFi serial test

This standalone test checks both UART directions before adding API-controlled
actuators. The Heltec diagnostic needs no Wi-Fi or credentials; the UNO controller requires the DHT libraries listed below. Uploading temporarily
replaces the Heltec API program; re-upload that sketch to restore it. The OLED is
not used in this test. Feedback is through USB Serial and the UNO's built-in L LED.

## Wiring

Disconnect power while changing wires. Use a 3.3 V ↔ 5 V logic-level converter:

| Converter | Connect to |
|---|---|
| LV | Heltec 3V3 |
| HV | UNO 5V |
| GND | Heltec GND and UNO GND |
| LV1 | Heltec GPIO4 (TX) |
| HV1 | UNO D0 / RX |
| LV2 | Heltec GPIO5 (RX) |
| HV2 | UNO D1 / TX |

These are GPIO labels, not physical pin positions. Leave unused channels open.
If the converter has OE/EN, follow its manufacturer's enable instructions: check
its exact model before wiring that pin. Never feed a UNO 5 V signal directly into
a Heltec GPIO. Power each board through its own USB connection; do not tie their
5 V rails together. Both boards and converter must be powered for communication.

## Arduino IDE on Windows

1. Open `UnoSerialTest/UnoSerialTest.ino`. In Boards Manager install **Arduino UNO R4
   Boards**, then select **Arduino UNO R4 WiFi**, its COM port and Upload.
2. Open `HeltecSerialTest/HeltecSerialTest.ino`. Select **Heltec WiFi Kit 32 (V3)**
   from **esp32 by Espressif Systems** (2.0.17 matches the build environment).
   Select the Heltec's CP2102 COM port and Upload. Keep USB CDC On Boot disabled
   if that option appears. The UNO sketch needs Adafruit DHT sensor library 1.4.6 and its Unified Sensor dependency.
3. Open the Heltec's Serial Monitor at **115200 baud**, tap RESET and wait for
   startup to finish. Press BOOT briefly; do not hold it while resetting.
4. The UNO's small built-in **L LED** should light. The Heltec monitor should show:

   ```text
   Sent: LIGHT_ON
   UNO: OK LIGHT_ON
   Link OK. Press BOOT for the next command.
   ```

5. Press BOOT again: the LED switches off and `OK LIGHT_OFF` confirms the return
   path. The next command changes only after a matching acknowledgement. A timeout
   leaves the next command unchanged, so BOOT safely retries the same LED state.

The link uses **9600 baud, 8N1**; USB monitors use **115200 baud**. Commands and
acknowledgements are newline terminated. Unknown commands and overlong lines do
not change the LED. No commands run automatically at startup.

If no acknowledgement arrives after two seconds, check the UNO has this sketch,
both boards have power, GND is shared, the converter is enabled, and TX goes to
RX on both paths. The UNO monitor (115200) prints received commands: if its LED
changes but Heltec gets no reply, check the UNO TX → Heltec RX path. The UNO's LED
matrix is separate; this test uses only LED_BUILTIN, the small L indicator.

## PlatformIO compile checks

```sh
pio run -d src/firmware/serial-link
```

## Next stage

After both commands and acknowledgements work, upload the
[API sketch](../heltec-api/README.md#api--uno-light-control) to the Heltec and keep
`UnoSerialTest` on the UNO. The API sketch forwards LIGHT_ON/LIGHT_OFF and waits for
a matching acknowledgement. These standalone tests do not call the API. Keep other actuators disconnected until
each output and its power supply have been tested separately.

## Integrated DHT22 controller

`UnoSerialTest` now also samples a DHT22 on D2 every 2.5 seconds. Install **DHT
sensor library by Adafruit 1.4.6** and **Adafruit Unified Sensor** before uploading.
The original LIGHT_ON/LIGHT_OFF protocol remains usable without a sensor. GET_STATS
returns a current reading or ERR SENSOR_UNAVAILABLE. See the [API guide](../heltec-api/README.md#dht22-readings-for-ai)
for sensor wiring and AI integration.
