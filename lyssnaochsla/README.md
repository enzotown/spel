# Lyssna och slå

En digital karuta: sex bildkort ligger utspridda på en matta, Kotten säger ett ord och
barnet slår (trycker) på kortet med den bilden. Rätt kort lyfts och flyger ner i barnets
egen hög. Tre omgångar, arton ord, sedan fest.

Live: https://spel.shipholm.dev/lyssnaochsla/ (undermapp till hubb-appen `spel`, eftersom
kontot har 50 av 50 appar; repot `enzotown/lyssnaochsla` ligger redo för egen domän när en
plats blir ledig).

## Vad den tränar

- **Lyssna och koppla ord till bild:** hörförståelse utan text, bilden bär betydelsen.
- **Ordförråd:** arton vardagsord (boll, katt, hund, fisk, stjärna, hatt, bil, buss, blomma,
  äpple, banan, måne, sol, sko, mugg, nyckel, klocka, tårta).
- **Uppmärksamhet och arbetsminne:** hålla ordet kvar medan blicken söker över sex kort.

## Så fungerar det

- Tryck på den gröna knappen: Kotten säger "Lyssna och slå!" och sedan ett ord.
- Tryck på rätt kort: det flyger ner i högen vid Kotten, en stjärna tänds, beröm hörs.
- Tryck på fel kort: kortet vickar vänligt, "Prova igen." sägs och ordet sägs om. Efter två
  fel lyser rätt kort; efter sex sekunder utan svar glöder det också.
- Högtalaren uppe till höger säger ordet igen, hur många gånger som helst.
- Sex kort per omgång, tre omgångar, inga ord upprepas. Sedan fest med alla arton orden.

## Filer

- `index.html`, `app.js` — allt ritas i canvas, inga beroenden. Bilderna ritas som funktioner
  i en 100×100-ruta (`BILD`-tabellen), aldrig emoji.
- `kotten.js` — figuren (från `verktyg/kotten/`).
- `ljud/` — röstfiler från Shipholms TTS (`nst`, fart 0.9) + `lines.js`/`rosten.js`.
- `sw.js` — offline efter första besöket; bumpa `CACHE` när filerna ändras.
- `larare.html` — målgrupp, Lgr22, spelguide.

Innehållet (orden, röstens meningar) skrevs med AI när spelet byggdes och ligger färdigt i
appen. Inget skickas till någon AI när barnet spelar, och inget barns data lämnar enheten.

## Testkrok

`window.__ls` med `state()`, `start()`, `tap(i)`, `tapRatt()`, `tapFel()`, `ord()`, `pos(i)`,
`spela()`, `kort()`, `skip()`, `next()`, `bild(id)`.

Testat i 1024×768 och 768×1024 med riktiga pektryck: tre omgångar till fest, noll JS-fel,
högen växer genom alla arton korten, fel tryck vickar och glöder rätt kort, rätt röstfil spelas
(`lyssnaochsla-14.mp3` för banan), rotation mitt i spelet ritar om utan omladdning.
