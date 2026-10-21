# Projekti dokumentatsioon

**Projekti nimi:** Tehisintellektil põhinev hääljuhitav koduassistent

## 1. Projekti eesmärk ja seadme lühikirjeldus

Meie projekti eesmärk on luua tehisintellektil põhinev hääljuhitav koduassistent, mis võimaldab kasutajal juhtida erinevaid elektroonilisi seadmeid loomuliku kõne abil.

Seade sarnaneb oma tööpõhimõttelt Google Home'i või Amazon Alexa assistendiga, kuid on meie enda arendatud prototüüp, mis kasutab Arduino ja ESP32 mikrokontrollereid.

Erinevalt tavapärasest häälkäsklustega juhitavast süsteemist ei pea kasutaja ütlema täpselt etteantud käsklusi. Tehisintellekt suudab tõlgendada erinevalt sõnastatud lauseid ning otsustada, millist tegevust kasutaja soovib.

Näiteks:
- „Pane tuli põlema.” → LED lülitub sisse.
- „Siin on liiga pime.” → Süsteem lülitab valgustuse sisse.
- „Lülita ventilaator sisse.” → Ventilaator käivitub.
- „Mis temperatuur toas on?” → Assistent loeb temperatuurianduri väärtuse ja vastab kasutajale.
- „Ma lähen magama.” → Süsteem lülitab valgustuse välja ja sulgeb servomootoriga juhitava luugi või kardina.

**Praktiline probleem:** Seade võimaldab juhtida koduseid elektroonikaseadmeid käsi kasutamata. Selline lahendus võib olla kasulik näiteks liikumisraskustega inimestele või olukordades, kus füüsiliste lülitite kasutamine on ebamugav.

Prototüüp on kavandatud ühe füüsilise seadmena, mis sisaldab mikrofoni, kõlarit, mikrokontrollereid ja juhitavaid elektroonikakomponente.

Kõne töötlemiseks kasutatakse Wi-Fi kaudu ühendatud serverit ja Groq tehisintellekti API-t.

## 2. Sisendite loetelu

Süsteem kasutab järgmisi sisendeid:

- **Häälkäsklused → INMP441 mikrofon.** Mikrofon salvestab kasutaja kõne, mis edastatakse ESP32 kaudu serverile töötlemiseks.
- **Kõne aktiveerimise nupp → digitaalne sisend ESP32-l.** Nupu vajutamisel alustab seade kõne salvestamist.
- **Temperatuur ja õhuniiskus → BME280 andur.** Arduino loeb anduri väärtusi, mida saab kasutajale häälvastusena edastada.
- **Tehisintellekti juhtimiskäsud → Wi-Fi ühendus.** ESP32 võtab serverilt vastu töödeldud ja kontrollitud käsud ning edastab need vajaduse korral Arduino kontrollerile.
- **Arduino tagasiside → UART-ühendus.** ESP32 saab Arduino kontrollerilt teavet käskluste täitmise kohta.

Tulevikus võib lisada täiendavaid andureid, näiteks valgusanduri, liikumisanduri või kaugusanduri.

## 3. Väljundite loetelu

Süsteemil on järgmised väljundid:

- **LED-valgustid → Arduino digitaalväljundid.** Valgustite sisse- ja väljalülitamine häälkäskluste abil.
- **Servomootor → Arduino juhtsignaal.** Kardina, luugi või muu liikuva mehhanismi avamine ja sulgemine.
- **Ventilaator → DC-mootor ja MOSFET-draiver.** Ventilaatori sisse- ja väljalülitamine.
- **Kõlar → MAX98357A helivõimendi.** Tehisintellekti genereeritud häälvastuste esitamine.
- **OLED-ekraan → Heltec WiFi Kit 32 sisseehitatud ekraan.** Kuvab seadme olekut, näiteks „Kuulan”, „Töötlen”, „Valmis” või „Viga”.

## 4. Nõuded loodavale seadmele

### Hääljuhtimine

- Kui kasutaja vajutab kõne aktiveerimise nuppu, alustab seade kõne salvestamist.
- Kui kasutaja lõpetab salvestamise, saadetakse salvestatud heli serverile.
- Kui server tuvastab kõnest toetatud tegevuse, edastatakse vastav juhtimiskäsk seadmele.
- Kui kasutaja ütleb „Lülita tuli sisse” või mõne samatähendusliku lause, lülitatakse vastav LED sisse.
- Kui kasutaja ütleb „Lülita tuli välja”, lülitatakse vastav LED välja.
- Kui kasutaja ütleb „Lülita ventilaator sisse”, käivitatakse ventilaator.
- Kui kasutaja ütleb „Lülita ventilaator välja”, peatatakse ventilaator.
- Kui kasutaja palub kardina või luugi avada, liigub servomootor määratud avatud asendisse.
- Kui kasutaja palub kardina või luugi sulgeda, liigub servomootor määratud suletud asendisse.

### Andurid ja tagasiside

- Kui kasutaja küsib toatemperatuuri, loeb Arduino temperatuurianduri väärtuse ja assistent vastab kõne kaudu.
- Kui käsk täidetakse edukalt, annab assistent kasutajale vastava kinnituse.
- Kui käsklust ei ole võimalik täita, teavitab assistent kasutajat probleemist.
- Kui süsteem salvestab kõnet, kuvatakse OLED-ekraanile „Kuulan”.
- Kui süsteem töötleb käsklust, kuvatakse OLED-ekraanile „Töötlen”.
- Kui süsteem on valmis uut käsklust vastu võtma, kuvatakse OLED-ekraanile vastav olek.

### Ohutus ja töökindlus

- Kui Wi-Fi ühendus puudub, ei tohi süsteem käivitada juhuslikke tegevusi.
- Kui tehisintellekt tagastab tundmatu või vigase käsu, seda ei täideta.
- Kui kasutaja palub teha midagi, mida seade ei toeta, annab assistent sellest teada.
- Kui käsk puudutab juba soovitud olekus olevat seadet, ei pea süsteem sama tegevust uuesti sooritama.
- Kui servomootor jõuab määratud lõppasendisse, ei tohi süsteem seda üle lubatud liikumisulatuse juhtida.

**Täpsustamisel:** Häälkäskluste toetatud keeled, servomootori lõppasendid, ventilaatori kiiruse juhtimine ning süsteemi lubatud reageerimisaeg.

## 5. Süsteemi füüsiliste komponentide loetelu

| Komponent | Mudel / tüüp | Otstarve |
|---|---|---|
| Mikrokontroller | Heltec WiFi Kit 32 V3 (ESP32-S3) | Mikrofon, kõlar, Wi-Fi, OLED |
| Mikrokontroller | Arduino UNO R4 WiFi | LED-ide, mootorite ja andurite juhtimine |
| Mikrofon | INMP441 I²S | Kõne salvestamine |
| Helivõimendi | MAX98357A I²S | Kõlari juhtimine |
| Kõlar | 4Ω, 3W | Häälvastused |
| Nupp | Momentlüliti | Kõne aktiveerimine |
| LED-id | Tavalised LED-id | Valgustuse demonstreerimine |
| Takistid | 220Ω | LED-ide voolu piiramine |
| Servomootor | SG90 | Liikuva mehhanismi juhtimine |
| Andur | BME280 | Temperatuur ja õhuniiskus |
| Ventilaator | Väike alalisvooluventilaator | Ventilatsiooni demonstreerimine |
| Mootoridraiver | Sobiv MOSFET-moodul | Ventilaatori lülitamine |
| Tasememuundur | 5 V / 3,3 V | UART-suhtluse pingetasemete sobitamine |
| Ühendusvahendid | Makettplaat ja juhtmed | Komponentide ühendamine |
| Toiteallikas | Täpsustamisel | Süsteemi toide |
| Korpus | 3D-prinditud või muu | Komponentide paigutamine |

**Komponentide lõplik valik ei ole veel kinnitatud.** Enne tellimist tuleb kontrollida nende omavahelist ühilduvust ja toitevajadusi.

Tarkvaraliselt kasutatakse:
- Arduino IDE või PlatformIO – mikrokontrollerite programmeerimine.
- Node.js ja TypeScript – serveripoolne juhtimisloogika.
- Groq Whisper – kõne tekstiks teisendamine.
- Groq LLM – kasutaja kavatsuse tõlgendamine.
- Tekst-kõneks lahendus – häälvastuste genereerimine.

## 6. Ühendusskeem

Süsteem koosneb kahest mikrokontrollerist, mis paiknevad ühes korpuses.

**Heltec WiFi Kit 32 ühendused:**

- INMP441 mikrofon → ESP32 I²S sisend.
- MAX98357A helivõimendi → ESP32 I²S väljund.
- Kõlar → MAX98357A väljund.
- Kõne aktiveerimise nupp → ESP32 digitaalne sisend.
- OLED-ekraan → Helteci sisemine ühendus.
- Wi-Fi → ühendus Node.js-i serveriga.
- UART TX/RX → Arduino UNO R4 WiFi, vajaduse korral läbi loogikataseme muunduri.

**Arduino UNO R4 WiFi ühendused (esialgne):**

- LED 1 → digitaalviik D8 läbi 220Ω takisti.
- LED 2 → digitaalviik D7 läbi 220Ω takisti.
- Servomootori juhtsignaal → digitaalviik D9.
- BME280 SDA → Arduino SDA.
- BME280 SCL → Arduino SCL.
- Ventilaatori MOSFET-draiveri juhtsisend → sobiv vaba digitaalviik.
- UART RX1 (D0) → ESP32 TX.
- UART TX1 (D1) → ESP32 RX läbi pingetaseme muunduri.
- GND → ühine maa kõigi omavahel ühendatud komponentide jaoks.

**Oluline:** Helteci I²S ja UART viigud on veel määramata. Enne skeemi koostamist tuleb kontrollida konkreetse plaadi vabade GPIO-de olemasolu. Mootorite ja kõlari toide tuleb dimensioneerida nende voolutarbimise järgi.

Lõplik ühendusskeem koostatakse pärast komponentide kinnitamist ning salvestatakse faili `hardware/wiring-diagram.png`.

## 7. Süsteemi juhtiv kood (pseudokood)

Kuna süsteemi programmeerimist ei ole veel alustatud, on allpool esitatud planeeritud tööloogika pseudokoodina.

### ESP32 – häälassistendi juhtimine

```text
ALUSTA
    Ühenda Wi-Fi võrguga
    Seadista mikrofon
    Seadista kõlar
    Seadista OLED-ekraan
    Seadista UART-ühendus Arduinoga
    Kuva ekraanil "Valmis"

    KORDA:
        KUI kasutaja vajutab kõnenuppu:
            Kuva "Kuulan"
            Alusta mikrofonist heli salvestamist
            Edasta heli osadena serverile

        KUI kasutaja lõpetab salvestamise:
            Lõpeta heliedastus
            Kuva "Töötlen"

            Oota serveri vastust

            KUI vastus sisaldab juhtimiskäsku:
                Kontrolli käsu tüüpi
                Edasta lubatud käsk Arduinole
                Oota Arduino kinnitust

            KUI vastus sisaldab häälvastust:
                Võta vastu helifail
                Esita heli kõlarist

            Kuva "Valmis"

        KUI tekib viga:
            Kuva "Viga"
            Säilita seadmete ohutu olek
```

### Node.js – serveri tööloogika

```text
KUI ESP32 saadab helisalvestise:
    Võta helisalvestis vastu

    Saada heli Groq Whisper teenusele
    Võta vastu tuvastatud tekst

    Saada tekst keelemudelile
    Koos süsteemi toetatud funktsioonide loeteluga

    KUI keelemudel soovib seadet juhtida:
        Kontrolli funktsiooni ja parameetreid

        KUI käsk on lubatud:
            Saada juhtimiskäsk ESP32-le
            Võta vastu täitmise tulemus

        MUIDU:
            Tagasta veateade

    Genereeri kasutajale sobiv vastus
    Teisenda vastus heliks
    Saada vastuse heli ESP32-le
```

### Arduino – füüsiliste seadmete juhtimine

```text
ALUSTA
    Seadista LED-id väljunditeks
    Seadista servomootor
    Seadista ventilaatori juhtimine
    Seadista temperatuuriandur
    Seadista UART-ühendus ESP32-ga

    Lülita LED-id ja ventilaator välja

    KORDA:
        KUI UART kaudu saabub käsk:
            KUI käsk on LED1_ON:
                Lülita esimene LED sisse

            KUI käsk on LED1_OFF:
                Lülita esimene LED välja

            KUI käsk on FAN_ON:
                Käivita ventilaator

            KUI käsk on FAN_OFF:
                Peata ventilaator

            KUI käsk on BLINDS_OPEN:
                Liiguta servo avatud asendisse

            KUI käsk on BLINDS_CLOSE:
                Liiguta servo suletud asendisse

            KUI käsk on GET_TEMPERATURE:
                Loe temperatuurianduri väärtus
                Saada väärtus ESP32-le

            KUI käsk on tundmatu:
                Saada veateade

            MUIDU:
                Saada käsu täitmise kinnitus
```

### Planeeritud projektifailide struktuur

```text
projekt/
├── hardware/
│   ├── wiring-diagram.png
│   └── enclosure.stl
├── firmware/
│   ├── esp32/
│   │   └── esp32.ino
│   └── arduino/
│       └── arduino.ino
├── server/
│   └── src/
│       ├── index.ts
│       ├── speech.ts
│       ├── assistant.ts
│       └── commands.ts
└── README.md
```

**Märkus:** Tegemist on projekti esialgse dokumentatsiooniga. Komponentide lõplik valik, ühendusskeem ja töötav lähtekood lisatakse arenduse käigus.
