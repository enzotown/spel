# Mät med klossar

Mätning med en egen enhet för barn 4–7 år. Fyra saker på bänken — bok (3), bänk (4), stövel (5),
pinne (6) — mäts med klossar kant i kant.

## Rundan

1. **Gissa.** Tre kort med tal och prickar; barnet trycker på det tal det tror.
2. **Mät.** Barnet lägger klossar genom att trycka på mätlinjen eller dra klossen ur lådan.
   Klossen snäpper på nästa plats, räknas högt (”ett”, ”två” …) och en spökkloss visar var nästa
   hamnar. Det går inte att lägga fel och inget kan tas bort.
3. **Kvitto.** När saken är mätt säger Kotten antalet och jämför med gissningen — rätt gissning ger
   en stjärna, fel gissning sägs vänligt utan straff. Gissningens klossar och de mätta klossarna
   visas bredvid varandra.
4. **Fest** efter fyra saker: alla fyra korten på en tavla, tryck för att höra längden igen.

Mekaniken är icke-standardiserad mätning (mäta med klossar i stället för linjal) kombinerad med
gissning-före-mätning. Serien hade tidigare färdig linjal (Mät med Kotten) och gissning av vikt
(Balansvågen), men aldrig en enhet barnet själv bygger och räknar.

## Filer

- `app.js` — allt: canvas, ljud, pek, testkrok `window.__mk`.
- `kotten.js` — maskoten (ritas med `KOTTEN.drawAtFeet`).
- `ljud/roster.txt` — alla meningar; `ljud/lines.js` + mp3 via `verktyg/rost.py matklossar`.
- `sma-ljud.js` — tyst pet när ett tryck inte låter något.

## Röst och AI

Rösterna är Shipholms färdiga MP3-filer (`nst`, fart 0.9), med webbläsarens talsyntes som reserv.
Appens texter och repliker är AI-skrivna vid bygget och ligger som data i `app.js`; inget AI-anrop
görs när barnet spelar och ingen data lämnar enheten.

## Test

```js
__mk.start()        // intro -> gissa
__mk.state()        // fas, n, kort, lagt, geometri
__mk.gissa(1)       // tryck på kort 1 (index)
__mk.lagg(3)        // lägg tre klossar
__mk.spola(900)     // låt timers gå
__mk.nasta()        // nästa sak / fest
__mk.errs()         // ska vara []
```