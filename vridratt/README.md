# Vrid rätt — vrid biten tills den passar

Kottens arbetsbänk: en träbit ligger lös på bänken bredvid sin skugga. Barnet
trycker på biten och den vrids ett kvarts varv; när den står rätt glider den ner
i urtaget med ett klick, en stjärna flyger upp till stjärnraden och Kotten säger
"Rätt! Den passar!". Sex bitar, sedan fest där alla åtta kan vridas fritt.

Spela: https://spel.shipholm.dev/vridratt/

## Vad det tränar

Mental rotation — att vrida en form i huvudet och avgöra när den passar. Det är
en egen mekanik i serien: **Spegelängen** speglar en bild och **Mönsterbanan** /
**Vad fattas i raden?** upprepar ett mönster, men ingen app har hittills låtit
barnet vrida en bit tills den passar i sin skugga.

Forskningen bakom valet (se `ideer/research-2026-11-26-vridratt.md`):

- Frick m.fl. (2013): 4–5-åringar klarar uppgiften "passar den roterade biten i
  hålet?", och träningseffekten växer med hur mycket biten är vriden
  (PMC5964331).
- Hawes m.fl. (2015): roterande pussel på iPad i sex veckor höjde både mental
  rotation och visuospatialt pussel, g ≈ 1,3 (PMC7485443).
- Levine m.fl. (2012): mängden pussellek 2–4 år förutspår senare spatial
  förmåga (PMC3289766).

## Formen

- En sida: `index.html` + `app.js`, ingen byggsteg, inga beroenden.
- Åtta bitar ritade i canvas som unioner av polygoner, cirklar, streck och
  bågar — samma ritfunktion ritar biten och urtaget, så formerna kan aldrig
  glida ifrån varandra. Alla bitar är osymmetriska (en vridning ska synas).
- Bara tryck: inget att dra, inget att missa. Varje tryck är ett kvarts varv åt
  samma håll och när biten står rätt faller den på plats — det finns ingen väg
  att göra fel, bara fler varv.
- Ingen förlust, ingen tid, inga poäng som dras. Efter 8,5 sekunder börjar
  urtaget lysa och Kotten säger "Titta på skuggan!".
- Porträtt och landskap: bänken ritas om vid rotation, Kotten står under bänken i
  porträtt och till vänster i landskap.
- Rösten är Shipholms egna mp3-filer (`ljud/`, `nst`, fart 0.9); webbläsarens
  talsyntes är reserv om en fil saknas.

## AI

Bitarnas former, texterna och röstmeningarna är skrivna av en AI-modell när
spelet byggdes och ligger färdiga i `app.js` / `ljud/roster.txt`. **Inget skickas
till en AI när barnet spelar**, inget barns data lämnar enheten och barnet kan
inte få ett oväntat svar. Se `larare.html`.

## Filer

```
index.html  app.js  kotten.js  sma-ljud.js  sw.js  manifest.webmanifest
icon-180.png  icon-512.png  delningsbild.png  larare.html
ljud/  roster.txt  lines.js  rosten.js  vridratt-01..08.mp3
```

## Publicering

Appen ligger som en undermapp till hubb-appen eftersom kontot har 50 av 50
appar: `spel/vridratt/` kopieras till `hubben/vridratt/` och publiceras med
`bash verktyg/publicera.sh spel hubben`. Repot `enzotown/vridratt` finns och
ligger redo för en egen domän när en plats blir ledig.