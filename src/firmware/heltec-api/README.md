# Heltec WiFi Kit 32 V3 API / OLED test

The board sends each query typed into USB Serial Monitor to
`/api/v1/interpret-text`. There is no startup or BOOT-button query. The built-in OLED displays the result and reply; long replies
advance through pages every four seconds. LIGHT_ON and LIGHT_OFF are forwarded to
a connected UNO R4 WiFi running the serial-link sketch, which controls its built-in
LED. Other device commands are not implemented.

## Configuration

Copy `HeltecApiTest/secrets.example.h` to `HeltecApiTest/secrets.h` and edit it.
**Both Arduino IDE and PlatformIO use this same configuration file.** A missing
`secrets.h` stops compilation instead of silently using placeholder settings.

- `WIFI_SSID`: the 2.4 GHz Wi-Fi network at the board's location.
- `WIFI_PASSWORD`: its password; use `""` for an open network. Browser login pages
  and enterprise Wi-Fi authentication are not supported.
- `API_BASE_URL`: the server base URL, without `/api/...`, e.g.
  `http://192.168.1.100:3000` or `https://YOUR-DOMAIN.ngrok-free.app`.

For an iPhone hotspot, enable Allow Others to Join and Maximize Compatibility;
use the iPhone's name as the SSID and its hotspot password. Keep the hotspot
settings screen open while connecting. Save and upload after configuration changes.
The real secrets file is ignored by Git. Do not put the Groq API key in firmware.

## Arduino IDE on Windows

1. Copy the `HeltecApiTest` folder to Windows. Keep `secrets.h` beside the `.ino`
   file; use Sketch → Show Sketch Folder to locate the correct copy. Ensure Windows
   has not named it `secrets.h.txt`.
2. In File → Preferences, add this Additional Boards Manager URL:
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`.
3. In Boards Manager, install **esp32 by Espressif Systems 2.0.17**, matching the
   PlatformIO build. Select **Heltec WiFi Kit 32 (V3)**.
4. In Library Manager install **Adafruit SSD1306 2.5.13** with its dependencies
   and **ArduinoJson 7.4.2**.
5. Connect with a USB data cable. Install the
   [CP210x driver](https://www.silabs.com/developer-tools/usb-to-uart-bridge-vcp-drivers)
   if Device Manager shows CP2102 under Other devices. Select its COM port in Tools.
6. Open `HeltecApiTest/HeltecApiTest.ino` and click Upload. Leave USB CDC On Boot
   disabled if that option appears: Serial uses the CP2102 bridge.
7. Open Serial Monitor at **115200 baud** and choose **Newline** (or Both NL & CR).
   Tap RESET, type a query into the input field and press Enter/Send. Wait for
   `Ready for the next query.` before sending another. No line ending means the
   board keeps waiting; empty lines are ignored. Input is limited to 1000 UTF-8
   bytes; overlong lines are discarded entirely.

If upload cannot connect, hold BOOT, tap RESET, release BOOT and retry. Tap RESET
after upload if needed. For transfer, compress the sketch folder yourself, excluding
any real `secrets.h`; create that file on the destination from the example.

## PlatformIO

Open this directory as the project. Configure `HeltecApiTest/secrets.h` as above,
then run:

```sh
pio run
pio device list
pio run -t upload --upload-port /dev/cu.YOUR_BOARD
pio device monitor --port /dev/cu.YOUR_BOARD --baud 115200
```

`src/main.cpp` includes the Arduino sketch so both tools compile the same program.
The platform and direct library versions are pinned in `platformio.ini`.

## Server and ngrok

Start the API using [the server guide](../../server/README.md). On the same LAN,
use the server computer's LAN IP rather than `localhost`; the server defaults to
`0.0.0.0:3000`. Allow Node through its firewall if needed. Check `/health` first.

For a board on another network, run `ngrok http 3000` on the server computer and
put its HTTPS forwarding address in `API_BASE_URL`. Keep both the API and ngrok
running and the server computer awake. Update and upload the configuration if the
URL changes. The firmware sends `ngrok-skip-browser-warning` with the request.

This temporary prototype uses `setInsecure()` for HTTPS: traffic is encrypted,
but the server certificate is not verified. Add CA verification before permanent
use. The public API has no authentication; stop ngrok after testing.

## Checking the result

The OLED initially shows Ready. Type `Mis on Prantsusmaa pealinn?` into Serial
Monitor; it should return an answer mentioning Paris without sending any UART
command. To isolate networking from the AI provider, add an exact phrase rule in
the server's localhost `/admin` panel: `oled test` → `NONE`, reply `Hello Heltec!`,
then type `oled test` in Serial Monitor. Send the text again to retry after an error.

Serial prints the board IP, HTTP status, duration and full UTF-8 response. HTTP 200
means success; connection errors suggest the URL, firewall or network; HTTP 502
needs investigation in the server terminal. Wi-Fi attempts time out after 15
seconds. HTTP responses can take 30 seconds, plus connection/TLS setup; serial input
processing pauses during a request.

The OLED font uses ASCII, so Estonian characters are transliterated. Long replies
split at character boundaries. The full original response remains in Serial.

## Hardware

Target: **WiFi Kit 32 V3 (ESP32-S3)**, `heltec_wifi_kit_32_V3`.
SSD1306 OLED: 128×64, address `0x3C`, SDA 17, SCL 18, reset 21.
Vext 36 is enabled LOW; BOOT uses GPIO 0. No extra wiring is required.

Pins follow [Heltec's board definition](https://github.com/Heltec-Aaron-Lee/WiFi_Kit_series/blob/master/variants/heltec_wifi_kit_32_V3/pins_arduino.h).

## API → UNO light control

First complete the [serial-link test](../serial-link/README.md). Keep its wiring
and the `UnoSerialTest` program on the UNO; upload this API sketch to the Heltec
instead of `HeltecSerialTest`. It uses the same GPIO4 TX / GPIO5 RX and 9600 baud.
No UNO code change is needed. Keep the small built-in LED as the only output.

Open the Heltec Serial Monitor at 115200 baud with Newline selected and send
`Pane tuli põlema`. The API must return kind DEVICE_COMMAND and command LIGHT_ON;
the Heltec sends `LIGHT_ON\n` and waits up to two seconds for `OK LIGHT_ON`. Only
then does the OLED show `LED ON confirmed` with the API reply. Send `Kustuta tuli`
to switch off; confirmation shows `LED OFF confirmed`. No re-upload is needed when
changing the query. Send one query at a time and wait for the ready message.

Expected Serial output includes `Sent to UNO: LIGHT_ON` and `UNO: OK LIGHT_ON`.
On timeout or UNO error, `UNO unconfirmed` remains on the OLED; the API reply does
not replace this error. The LED state is unknown if an acknowledgement was lost.
There are no automatic UART retries. A manual retry repeats an idempotent LED state
command. Invalid API kind/command combinations never reach the UNO. Other device
commands show `Not implemented`, and ANSWER/UNSUPPORTED with NONE only display text.

## DHT22 readings for AI

Upload the updated `UnoSerialTest` controller, from `src/firmware/serial-link/UnoSerialTest`.
Install Adafruit DHT sensor library 1.4.6 and its Unified Sensor dependency on the
UNO. With a bare DHT22's vented front facing you and pins downward, left to right:
1 VCC → UNO 5V; 2 DATA → D2; 3 NC → disconnected; 4 GND → UNO GND. Add 10 kΩ
between pins 1 and 2. Keep the existing level converter/UART wiring unchanged.

UNO samples every 2.5 seconds and logs readings on its USB monitor. Heltec asks
`GET_STATS` before each API request. UNO replies `STATS <C> <RH%> <ageMs>` or
`ERR SENSOR_UNAVAILABLE`. Failed samples invalidate the previous reading.
Heltec checks range and age, adds serial round-trip time conservatively, and sends
valid readings as a structured `sensors` object. A missing/bad/stale snapshot is
omitted, and the AI is explicitly told current readings are unavailable. The
snapshot describes conditions at request submission, not after AI processing.

The updated server must be running. Ask in Heltec Serial Monitor (115200 + Newline):
`Mis on toas temperatuur ja õhuniiskus?` or `What are the current sensor readings?`.
Serial shows the snapshot sent to the AI; the OLED shows the response. The model
is instructed to answer reading questions with ANSWER/NONE. If an exact phrase rule
instead returns REPORT_TEMPERATURE, Heltec fetches and displays an actual reading
locally rather than forwarding an unsupported command. Other existing light
commands still work. Exact fixed-response phrase rules can override AI answers.

Restart the server after updating it unless it is running in watch mode.
