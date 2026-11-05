# Tehisintellektil põhinev koduassistent

IFI6203.DT robootikaprojekt: Heltec WiFi Kit 32 V3 saadab kasutaja tekstipäringu
Node.js-i serverile, kuvab vastuse OLED-ekraanil ning suhtleb Arduino UNO R4 WiFi-ga.
UNO juhib (hetkel) sisseehitatud LED-i ja mõõdab DHT22 abil temperatuuri ning õhuniiskust.
Server kasutab Groq'i teksti tõlgendamiseks ja toetab eesti ning inglise keelt.

## Käivitamine

1. Seadista ja käivita [server](src/server/README.md).
2. Ühenda plaadid [UART-ühenduse juhendi](src/firmware/serial-link/README.md#wiring) järgi ning laadi UNO-le `UnoSerialTest`.
3. Seadista Wi-Fi ja serveri aadress ning laadi Heltecile [HeltecApiTest](src/firmware/heltec-api/README.md).
4. Ava Helteci Serial Monitor: **115200 baud**, **Newline**. Saada näiteks
   `Pane tuli põlema` või `Mis on toas temperatuur ja õhuniiskus?`.

UART töötab kiirusel **9600 baud**. Kasuta plaatide vahel 3,3 V / 5 V
loogikataseme muundurit ja ühist maad. DHT22 andmeliin ühendub UNO D2-ga.
Täpne juhtmestik ja teekide versioonid on püsivara juhendites.

## Projekti struktuur

- `src/firmware/heltec-api/` – Helteci võrguühendus, OLED ja UNO juhtimine.
- `src/firmware/serial-link/` – UNO LED-i ja DHT22 kontroller ning Helteci UART-diagnostika.
- `src/server/` – teksti- ja helipäringute töötlemine, brauseritest, seadistuspaneel ja testid.
- `src/hardware/` – kasutatava riistvara loetelu.
- `docs/` – projekti dokumentatsioon ja edasised plaanid.

Arduino IDE ja PlatformIO kasutavad samu `.ino` faile.

## Praegune võimekus

Helteci püsivara toetab tekstisisendit USB kaudu, LED-i sisse- ja väljalülitamist,
DHT22 näitude edastamist AI-le ja vastuste kuvamist OLED-il. LED-käsu täitmist
kinnitab UNO. Puuduvat või aegunud mõõtmist ei kasutata.

Serveri brauseritest toetab ka mikrofoni kaudu kõnetuvastust. Helteci mikrofoni,
kõlari, ventilaatori ja servo juhtimine on kavandatud, kuid püsivaras veel teostamata.
Serveri käsukataloog sisaldab ka neid tulevasi tegevusi.

## Kontrollid

```sh
cd src/server
npm ci
npm test
npm run typecheck
npm run build
```

Püsivara kontrollimiseks käivita projekti juurkataloogist:

```sh
pio run -d src/firmware/heltec-api
pio run -d src/firmware/serial-link
```

Loo kohalikud `.env` ja `secrets.h` näidisfailide põhjal. Need, serveri kohalikud
seaded ja genereeritud failid on Gitist välja jäetud. HTTPS-ühendus püsivaras
veel sertifikaati ei kontrolli ning avalikel päringutel puudub autentimine;
lahendus on katsetamiseks usaldatud keskkonnas.

## Meeskond

Karl-Gregor Keerles, Taaniel Tubin, Raimond Lige, Karel Reose, Patrick Jurs.
IFI6203.DT Robootika, 2026 sügis.
