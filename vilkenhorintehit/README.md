# Vilken hör inte hit? med Kotten

Fyra saker på hyllan och tre hör ihop. Barnet trycker på den som **inte** hör dit, Kotten
säger varför med kategoriens ord ("Snigeln hör inte hit – de andra kan flyga") och en stjärna
flyger upp till stjärnraden. Sex frågor, sedan fest.

Live: https://vilkenhorintehit.shipholm.dev

## Mekaniken

Odd-one-out: till skillnad från Sopsortering och Två sätt att sortera sorteras ingenting —
gruppen är redan given och barnet ska hitta **undantaget**. Det tränar kategoribegrepp,
jämförelse och negationen "inte", som är svårare än att para ihop lika.

Sex kategorier:

| Fråga | De tre | Undantaget |
| --- | --- | --- |
| kan flyga | fågel, fjäril, bi | snigel |
| har hjul | bil, cykel, vagn | stövel |
| kan man äta | äpple, banan, bröd | sten |
| bor i vattnet | fisk, krabba, sjöstjärna | katt |
| är runda | boll, sol, apelsin | penna |
| kan man spela på | trumma, gitarr, flöjt | kudde |

Ordningen bland de fyra slumpas varje gång, så undantaget sitter aldrig på samma plats.

## Ingen förlust

- Fel kort: ett vänligt "Titta igen!", korten skakar lite, inga poäng dras.
- Efter två fel lyser rätt kort med en grön streckad ring.
- Rätt svar: guldkant, andra kort dämpas, stjärna flyger upp, förklaringen sägs högt.
- Efter sex frågor: fest där varje förklaring kan höras igen.

## Filer

- `index.html`, `app.js` — allt i en canvas, ingen build, inga beroenden.
- `kotten.js` — figuren (KOTTEN.drawAtFeet) med fjällklippningen.
- `ljud/` — 12 färdiga röstfiler från Shipholms TTS (`nst`, fart 0.9) och `rosten.js`.
  `roster.txt` är meningarna; `lines.js` är mappningen mening → fil.
- `sma-ljud.js` — tyst pet när ett tryck inte låter något.
- `sw.js`, `manifest.webmanifest`, ikoner — app-skalet för hemskärmen och offline.

## Testkrok

```js
window.__vh.state()      // fas, runda, kort, ratt, fel, kortPos, errs
window.__vh.start()      // börja om
window.__vh.tap(i)       // tryck på kort i
window.__vh.tapRatt()    // rätt svar
window.__vh.runda(i)     // hoppa till fråga i
window.__vh.fest()       // till festen
```

## AI

Innehållet (frågorna och förklaringarna) är skrivet av modellen när spelet byggdes, och
ligger som data i `app.js`. Inget skickas till AI när barnet spelar, inget barns data lämnar
enheten och barnet kan inte få ett oväntat svar.