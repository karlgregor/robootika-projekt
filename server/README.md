# Häälassistendi server

Fastify ja Groq põhine server, mis teisendab helisalvestise tekstiks ning teksti
lubatud koduassistendi käsuks.

## Käivitamine

Vajalik on Node.js 22 või uuem versioon.

```bash
cd server
cp .env.example .env
# Lisa faili .env enda GROQ_API_KEY.
npm install
npm run dev
```

Server kuulab vaikimisi pordil `3000`.

Brauseripõhine teksti- ja mikrofonitest on aadressil:

```text
http://localhost:3000
```

Mikrofoni kasutamiseks ava leht samas arvutis `localhost` aadressiga või kasuta
HTTPS-i. Brauserid ei luba mikrofoni ebaturvalisel tavalisel LAN-i HTTP-aadressil.

## Tekstiga proovimine

```bash
curl http://localhost:3000/api/v1/interpret-text \
  -H 'content-type: application/json' \
  -d '{"text":"Siin on liiga pime"}'
```

## Helifailiga proovimine

```bash
curl http://localhost:3000/api/v1/voice \
  -F 'audio=@recording.wav'
```

Näidisvastus:

```json
{
  "transcript": "Siin on liiga pime",
  "kind": "DEVICE_COMMAND",
  "command": "LIGHT_ON",
  "replyText": "Panen tule põlema."
}
```

Üldiste küsimuste puhul on `command` alati `NONE`, seega ei saadeta küsimust
kogemata riistvarale:

```json
{
  "transcript": "Mis on Prantsusmaa pealinn?",
  "kind": "ANSWER",
  "command": "NONE",
  "replyText": "Prantsusmaa pealinn on Pariis."
}
```

## Juhtpaneel

„Household context” võimaldab lisada taustainfot ja eelistusi, mis saadetakse
iga AI-päringuga kaasa. See ei ole vestlusmälu ega reaalajas andurite info.
Reegli „Meaning / hint (AI)” korral kirjelda kavatsust, nt „Kasutaja vihjab,
et õhk on umbne või soovib tuuleõhku” → `FAN_ON`. AI saab rakendada sama reeglit
erineva sõnastuse korral. Vastuse tekst toimib eeskujuna ning kohandatakse kasutaja
keelele. Tähenduspõhised reeglid nõuavad sisselülitatud AI-d; nende tuvastus pole
deterministlik. Olemasolevad fraasireeglid jäävad vaikimisi täpseks vasteks.

Ava `http://localhost:3000/admin`, et muuta fraasireegleid, käskude kirjeldusi
ja silumisseadeid. Muudatused rakenduvad salvestamisel ilma serveri taaskäivituseta.
Fraasireeglid rakenduvad enne AI-d; võrdlus eirab tähesuurust, tavalisi kirjavahemärke
ja liigseid tühikuid. `NONE` võimaldab määrata fikseeritud tekstivastuse.

Käsu keelamine blokeerib nii AI kui ka fraasireegli valitud käsu. Uute riistvaraliste
tegevuste lisamine nõuab endiselt serveri ja püsivara muutmist; paneel seadistab
olemasolevaid käske. Riistvara käivitamist paneeli test ei teosta.

Seaded säilivad failis `server/data/settings.json` (Gitist välja jäetud). Viimased
200 logikirjet säilivad mälus ja kaovad taaskäivitamisel. Transkriptide logimist
saab välja lülitada; varasemate transkriptide eemaldamiseks kasuta „Clear logs”.
Adminiliides ja selle API on lubatud ainult localhostilt ning sama päritoluga
päringutele. Tavaline testkonsool ja hääl-API on jätkuvalt LAN-ist kasutatavad.

## Kontrollid

```bash
npm test
npm run typecheck
npm run build
```
