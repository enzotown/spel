# Hitta längden

Jämförelse av längd för barn 4–7 år. En ribba av klossar (3, 4, 5 eller 6) ligger på bänken och tre
saker står på hyllan; bara en är exakt lika lång.

## Rundan

1. **Frågan.** Rösten säger "Hitta den som är fem klossar lång" och ribban ligger kvar som mått.
2. **Välj.** Barnet trycker på en sak. Saken lyfts ur hyllfacket, växer till riktig storlek och läggs
   kant i kant med ribbans vänsterkant.
3. **Kvittot.** Den streckade slutlinjen visar var ribban slutar: rätt sak stannar med en stjärna och
   "Precis! Fem klossar!", fel sak sägs vänligt ("Fyra klossar. Leta vidare!") och flyttas tillbaka.
4. **Fest** efter fyra rundor: alla sju sakerna på en tavla, tryck för att höra längden igen.

## Varför just den här mekaniken

Mätningens lärandebana går från direkt jämförelse → indirekt jämförelse (via en tredje sak) → mäta
kant i kant med lika stora enheter (Sarama & Clements 2009; Sarama m.fl. 2021, *AERA Open* 7(1),
doi 10.1177/23328584211026657). **Mät med klossar** (post 41) byggde måttet av en sak och räknade
det. Här är måttet givet och barnet ska hitta saken — samma kunskap baklänges, och det tränar att en
längd kan jämföras utan att mätas om varje gång.

## Saker och längder

| sak | klossar |
|-----|---------|
| boken, skeden | 3 |
| hammaren, bänken | 4 |
| stöveln, moroten | 5 |
| pinnen | 6 |

Alla saker ritas i en ruta som är exakt `n` klossar bred, så en sak som passar slutar alltid exakt på
ribbans slutlinje. På hyllan ritas de med en gemensam skala, så även där går längderna att jämföra.

## Filer

- `app.js` — allt: canvas, ljud, pek, testkrok `window.__hl`.
- `kotten.js` — maskoten (ritas med `KOTTEN.drawAtFeet`).
- `ljud/roster.txt` — alla meningar; `ljud/lines.js` + mp3 via `verktyg/rost.py hittalangden`.
- `sma-ljud.js` — tyst pet när ett tryck inte låter något.
- `sw.js` — offline-cache efter första besöket (registreras bara på https).

## Röst och AI

Rösterna är Shipholms färdiga MP3-filer (`nst`, fart 0.9), med webbläsarens talsyntes som reserv.
Appens texter och repliker är AI-skrivna vid bygget och ligger som data i `app.js`; inget AI-anrop
görs när barnet spelar och ingen data lämnar enheten.

## Test

```js
__hl.start()        // intro -> spel
__hl.state()        // fas, ri, mal, sak, ratt, jmf, geometri
__hl.valj(1)        // tryck på hyllfack 1
__hl.spola(600)     // låt animation och timers gå
__hl.nasta()        // spola klart och gå vidare
__hl.errs()         // ska vara []
```

Publicerad på `https://spel.shipholm.dev/hittalangden/` (kontot har 50 av 50 appar, så appen ligger
som undermapp till hubb-appen). Eget repo: `enzotown/hittalangden`.