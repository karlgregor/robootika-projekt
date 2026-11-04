# Heltec WiFi Kit 32 V3 API / OLED test

This standalone PlatformIO project leaves the original motor/servo sketch in
`src/projektinimi.ino` untouched. No extra wiring is needed: it uses the board's
built-in OLED and BOOT button. It displays commands but does not drive actuators.

## Configure and run

1. Install the PlatformIO IDE extension in VS Code, or install PlatformIO Core
   (`pipx install platformio`). Open this directory as the PlatformIO project.
2. Copy `include/secrets.example.h` to `include/secrets.h`. Set your 2.4 GHz Wi-Fi
   SSID/password and `API_BASE_URL`, using the server computer's LAN IP, e.g.
   `http://192.168.1.100:3000`. The secrets file is ignored by Git.
   `localhost` on the board means the board itself. Keep both devices on the same
   reachable network. HTTP and HTTPS URLs are supported. For this temporary test, HTTPS certificate
   verification is disabled; traffic is encrypted but the server identity is not verified.
   Use CA verification before permanent use.
3. Start the existing server following [its README](../../server/README.md).
   Its default bind address is already `0.0.0.0`. Allow Node through the computer's
   firewall if prompted. From another device on the same network, check
   `http://SERVER-LAN-IP:3000/health`; it should return `{"status":"ok"}`.
   On macOS, Wi-Fi settings → Details → TCP/IP shows the computer's IP address.
4. Connect the Heltec using a USB data cable. Build and upload using PlatformIO,
   or from this directory:

   ```sh
   pio run
   pio device list
   pio run -t upload --upload-port /dev/cu.YOUR_BOARD
   pio device monitor --port /dev/cu.YOUR_BOARD --baud 115200
   ```

   If upload cannot connect, hold BOOT, tap RESET, then release BOOT and retry.
   Press RESET after upload if needed. Do not hold BOOT while powering on unless
   entering the bootloader intentionally.

## Expected behavior

On startup the OLED shows `Connecting...`, then the test query, then the server's
`command` and `replyText`. The default question asks for France's capital;
expect `NONE` and an answer mentioning Paris when the AI service is configured.
Long replies advance through pages every four seconds. Press BOOT to send another
request or retry after an error. There is no automatic polling or retry loop.

Change `TEST_QUERY` in `secrets.h` to test another question or a device command,
then upload again. To isolate networking from the AI provider, add an exact phrase
rule in `http://localhost:3000/admin` on the server computer, such as `oled test`
→ `NONE`, reply `Hello Heltec!`, and use that phrase as `TEST_QUERY`.

Serial output includes the board IP, HTTP status, request duration and full API
response. The OLED shows error summaries; HTTP 502 usually needs investigation
in the server terminal. A Wi-Fi error suggests credentials or a non-2.4 GHz
network; a connection error suggests the server address, firewall, or network
client isolation. Requests can wait up to 30 seconds for a response, during which
button handling and page updates pause.

The OLED's small default font uses ASCII: Estonian characters are transliterated
on screen, while Serial retains the full UTF-8 response. Pages split at character
boundaries rather than words. The firmware does not need the Groq API key.

## Hardware reference

Target: **WiFi Kit 32 V3 (ESP32-S3)**, PlatformIO board `heltec_wifi_kit_32_V3`.
OLED: SSD1306, 128×64, I²C address `0x3C`, SDA 17, SCL 18, reset 21;
Vext 36 is enabled LOW. BOOT uses GPIO 0.

Pins verified against [Heltec's V3 board definition](https://github.com/Heltec-Aaron-Lee/WiFi_Kit_series/blob/master/variants/heltec_wifi_kit_32_V3/pins_arduino.h).
The project pins the ESP32 platform and direct library versions for repeatable builds.
Without `secrets.h`, a build uses placeholder configuration; set real values before uploading.

## Arduino IDE on Windows / ngrok

The Arduino sketch is `HeltecApiTest/HeltecApiTest.ino`; PlatformIO includes this
same source. Copy `HeltecApiTest` to Windows. Copy `secrets.example.h` inside it
to `secrets.h`, and set the Wi-Fi at the ESP32 location and your ngrok HTTPS URL
(without an API path). Do not share a secrets file containing real credentials.
The prepared `HeltecApiTest.zip` contains only placeholders and can also be transferred.

On the Mac, keep the server running and start `ngrok http 3000`. Keep both running.
When the ngrok URL changes, update the sketch configuration and upload again.

In Arduino IDE, install **esp32 by Espressif Systems** using Boards Manager
(version **2.0.17** matches the compiled PlatformIO environment). Select
**Heltec WiFi Kit 32 (V3)** and the CP2102 COM port. Through Library Manager install
**Adafruit SSD1306** (including dependencies) and **ArduinoJson 7.4.2**.
Open `HeltecApiTest.ino`, click Upload, then open Serial Monitor at 115200 baud
and tap RESET. BOOT sends another request. With the CP2102 connection, leave
USB CDC On Boot disabled if that option appears.

The firmware sends `ngrok-skip-browser-warning` for tunnel requests. HTTPS uses
`setInsecure()` for this temporary connectivity test; do not use it for sensitive
queries or permanent deployments. Your unauthenticated API is publicly reachable
while the tunnel runs, so stop ngrok after testing.
