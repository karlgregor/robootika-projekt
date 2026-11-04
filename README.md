# Robootika iseseisev arendusprojekt

See repositoorium on mõeldud IFI6203.DT kursuse "Robootika" üliõpilastele.  
Iga meeskond **forkib** selle repo ja dokumenteerib siin oma seadme/projekti:
- *mis probleemi lahendate ja miks see seade kasulik on;*
- *millest seade koosneb (riistvara, kood, 3D prinditud detailid jne);*
- *kuidas seade töötab;*
- *kuidas seda uuesti ehitada.*

## Kuidas seda repo't kasutada

1. Vajuta ülal paremas nurgas **Fork**.
2. Muuda `docs/PROJEKTIDOKUMENTATSIOON.md` enda projekti järgi.
3. Pane kogu kood kataloogi `src/`.
4. Pane skeemid ja riistvara info kataloogi `hardware/`.
5. Lisa pildid / videod kataloogi `media/`.
6. Commiti regulaarselt (isegi pooleliolevad sammud on okei – oluline on arengulugu).

## Projekti minimaalne sisu hindamiseks

- Täidetud dokumentatsioon failis `docs/PROJEKTIDOKUMENTATSIOON.md`
- Töötav kood failis/failides `src/`
- Ühendusskeem (foto / joonis / Fritzing eksport `hardware/wiring-diagram.png`)
- Komponentide loetelu koos linkidega `hardware/komponentide-loetelu.md`

## Meeskond

- Õppeaine: IFI6203.DT Robootika  
- Autor(id): Karl-Gregor Keerles, Taaniel Tubin, Raimond Lige, Karel Reose, Patrick Jurs
- Aasta / semester: 2026 sügis

## Heltec API ja OLED test

Heltec WiFi Kit 32 V3 püsivara ning seadistamise ja üleslaadimise juhend asuvad
kataloogis [`firmware/heltec-api`](firmware/heltec-api/README.md). Test saadab
serverisse tekstipäringu käivitamisel ja BOOT-nupu vajutamisel ning kuvab vastuse
sisseehitatud OLED-il.
