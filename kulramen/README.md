# Kulramen

En kulram (rekenrek) med två rader och tio kulor per rad, fem röda och fem vita.
Kotten ber om ett tal, barnet skjuter fram kulor med fingret och hör hur många som
ligger framme — "fem och två — sju".

Live: https://spel.shipholm.dev/kulramen/ (undermapp till hubb-appen `spel`, eftersom
kontot har 50 av 50 appar; repot `enzotown/kulramen` ligger redo för egen domän när en
plats blir ledig).

## Vad den tränar

- **Femstrukturen:** tal över fem ses som 5 + något, inte som en rad att räkna.
- **Subitisering/talbilder:** mängden syns som en grupp på tråden.
- **Tal, ord och mängd ihop:** siffran på skylten, rösten och kulorna i samma stund.

## Så fungerar det

- Tryck på en kula: den och alla till vänster glider fram till vänsterkanten.
- Tryck på en framflyttad kula: den och de till höger om den glider tillbaka.
- Åtta uppgifter: 3, 5, 7, 4, 8, 6, 9, 10. Rätt antal ger stjärna och fest.
- Fel antal ger "Prova igen!" — inga poäng dras. Efter två försök lyser rätt kula.
- Festen: båda raderna är fria, rösten räknar varje rad ("fem och tre — åtta").

## Filer

- `index.html`, `app.js` — allt ritas i canvas, inga beroenden.
- `kotten.js` — figuren (från `verktyg/kotten/`).
- `ljud/` — röstfiler från Shipholms TTS (`nst`, fart 0.9) + `lines.js`/`rosten.js`.
- `sw.js` — offline efter första besöket; bumpa `CACHE` när filerna ändras.
- `larare.html` — målgrupp, Lgr22, spelguide.

Innehållet (uppgifterna, röstens meningar) skrevs med AI när spelet byggdes och ligger
färdigt i appen. Inget skickas till någon AI när barnet spelar, och inget barns data
lämnar enheten.

## Testkrok

`window.__kul` med `state()`, `tap(row, i)`, `tapXY(x, y)`, `start()`, `next()`,
`restart()`, `fest()`, `layout()`, `hits()`.

Testat i 1024×768 och 768×1024 med riktiga pektryck: åtta rundor till fest, noll JS-fel,
kulorna flyttar sig vid tryck (luckan mellan grupperna syns), rätt röstfil spelas.
