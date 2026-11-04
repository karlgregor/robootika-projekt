# Heltec WiFi Kit 32 V3 API / OLED test

The board sends a text query to `/api/v1/interpret-text` at startup and whenever
BOOT is pressed. The built-in OLED displays the command and reply; long replies
advance through pages every four seconds. Commands are displayed only: this test
does not drive actuators. The original motor/servo template is in `src/projektinimi.ino`
at the repository root.

## Configuration

Copy `HeltecApiTest/secrets.example.h` to `HeltecApiTest/secrets.h` and edit it.
**Both Arduino IDE and PlatformIO use this same configuration file.** A missing
`secrets.h` stops compilation instead of silently using placeholder settings.

- `WIFI_SSID`: the 2.4 GHz Wi-Fi network at the board's location.
- `WIFI_PASSWORD`: its password; use `""` for an open network. Browser login pages
  and enterprise Wi-Fi authentication are not supported.
- `API_BASE_URL`: the server base URL, without `/api/...`, e.g.
  `http://192.168.1.100:3000` or `https://YOUR-DOMAIN.ngrok-free.app`.
- `TEST_QUERY`: the text to send, initially a question about France's capital.

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
7. Open Serial Monitor at **115200 baud**, then tap RESET to see startup output.

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
The old `include/secrets.h` location is no longer used.

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

The OLED shows connection status, the query, then a command and reply. The default
question should return `NONE` and an answer mentioning Paris. Press BOOT to retry
or send again; there is no automatic polling. To isolate networking from the AI
provider, add an exact phrase rule in the server's localhost `/admin` panel:
`oled test` → `NONE`, reply `Hello Heltec!`, and set that query in `secrets.h`.

Serial prints the board IP, HTTP status, duration and full UTF-8 response. HTTP 200
means success; connection errors suggest the URL, firewall or network; HTTP 502
needs investigation in the server terminal. Wi-Fi attempts time out after 15
seconds. HTTP responses can take 30 seconds, plus connection/TLS setup; button
handling pauses during a request.

The OLED font uses ASCII, so Estonian characters are transliterated. Long replies
split at character boundaries. The full original response remains in Serial.

## Hardware

Target: **WiFi Kit 32 V3 (ESP32-S3)**, `heltec_wifi_kit_32_V3`.
SSD1306 OLED: 128×64, address `0x3C`, SDA 17, SCL 18, reset 21.
Vext 36 is enabled LOW; BOOT uses GPIO 0. No extra wiring is required.

Pins follow [Heltec's board definition](https://github.com/Heltec-Aaron-Lee/WiFi_Kit_series/blob/master/variants/heltec_wifi_kit_32_V3/pins_arduino.h).
