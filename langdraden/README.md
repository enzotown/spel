# Längdraden

Fem pinnar står huller om buller på sågbänken. Ovanför finns en rad med fem streckade platser och
en gemensam grön startlinje. Barnet drar (eller trycker) en pinne i taget upp till raden — den
kortaste först — och när raden stämmer ritas en trappa ovanför topparna som visar hur mycket längre
varje pinne är.

Live: <https://spel.shipholm.dev/langdraden/> (appen ligger som undermapp till spel-hubben eftersom
kontot har 50 av 50 appar; repot `enzotown/langdraden` finns och appen får egen domän när en plats
blir ledig).

## Vad spelet tränar

Seriell ordning (seriation) och transitivitet — nästa steg efter `hittalangden`, där en sak
jämfördes mot ett givet mått. Här måste flera saker ordnas mot varandra, och en gemensam startlinje
gör att det är topparna som jämförs.

- Fyra rundor med olika längder: runda 1 har stora steg (2–6 enheter), runda 4 ojämna steg
  (1,5 · 2,1 · 2,4 · 3,4 · 4,6) så att barnet måste jämföra i stället för att gissa.
- Båda riktningarna godtas (kortast först eller längst först); trappan och rösten följer med.
- Ingen förlust: en rad som inte stämmer lämnar bara tillbaka de pinnar som ligger fel, resten står
  kvar. Efter två försök lyser den kortaste pinnen och rösten säger "Börja med den kortaste pinnen."
- Fest efter fyra stjärnor: pinnarna flyttas fritt och ett tryck säger hur pinnen är
  ("Kortast.", "Näst kortast.", "I mitten.", "Näst längst.", "Längst.").

## Rösten

14 meningar i `ljud/roster.txt`, genererade med `python3 verktyg/rost.py langdraden` (Shipholms
`speak`, röst `nst`, fart 0.9). Saknad mening blir tyst – ingen talsyntes som reserv.

## AI och integritet

Bilder, texter och röst skrevs och ritades när spelet byggdes — innehållet är AI-genererat vid
bygget, men inget skickas till AI när barnet spelar, inget barns data lämnar enheten och barnet kan
inte få ett oväntat svar. Se `larare.html` under "Bra att veta".

## Filer

`index.html`, `app.js` (allt i en fil), `kotten.js` (figuren), `sma-ljud.js`, `sw.js`
(cache-first, `kotten-langdraden-v1`), `manifest.webmanifest`, `icon-180.png`, `icon-512.png`,
`delningsbild.png`, `larare.html`, `ljud/`.

## Research

`ideer/research-2026-11-26-langdraden.md` — Clements & Sarama, Learning Trajectories
("Serial Orderer to 6+ (Length)", LT² 2025) och appstudien från Utah State om att ordna stavar
efter längd.

## Testkrok

`window.__lr` med `state()`, `start()`, `place(pinne, plats)`, `ratt()`, `tap(x,y)`, `spola(ms)`,
`trappKlar()`, `errs()`. Genomspelad med riktiga `PointerEvent` i 768×1024 och 1024×768.