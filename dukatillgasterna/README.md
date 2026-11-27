# Duka till gästerna

Tre gäster sitter bakom bordet och ska få var sin plats: en tallrik, ett glas och en gaffel.
Sakerna ligger i högar på bänken — precis så många som det behövs — och barnet drar (eller
trycker) en sak i taget dit den hör. När varje gäst har allt sitt kommer maten in, gästerna
säger tack och en stjärna flyger upp.

- **Mekanik:** ett-till-ett för en hel uppsättning per person (tre olika saker till varje gäst),
  plus att högarna räcker precis till alla — när högen är tom står det en bock där.
- **Rundor:** 3 gäster med tallrik, glas och gaffel → 4 gäster → 4 gäster med servetter → fest
  där allt får flyttas fritt på bordet.
- **Ingen förlust:** en sak som läggs på en full plats säger "oj, där finns redan en tallrik" och
  går tillbaka till högen. I festen kan inget tappas bort — det som släpps hamnar på bordet.
- **Röst:** 20 färdiga meningar i `ljud/` (Shipholms `speak`, röst `nst`, fart 0,9), med
  webbläsarens talsyntes som reserv. All text skrevs när spelet byggdes; inget skickas till AI
  när barnet spelar.

## Filer

`index.html`, `app.js` (allt i en fil), `kotten.js` (figuren), `sma-ljud.js` (tyst pet när appen
annars är tyst), `ljud/` (mp3 + `lines.js` + `rosten.js`), `sw.js` (offline efter första besöket),
`manifest.webmanifest`, ikoner och `delningsbild.png` (1200×630), `larare.html`.

## Testat

Genomspelat i webbläsaren med riktiga PointerEvent i 1024×768 och 768×1024: drag och tryck-tryck,
fel plats (vänligt nej, ingen förändring), tre rundor till fest, fri lek med flyttade saker,
noll JS-fel och röststatus utan uppspelningsfel.

## Källor

Tirosh, Tsamir, Levenson & Barkai (2020), "Setting the table with toddlers: a playful context for
engaging in one-to-one correspondence", *ZDM Mathematics Education* 52, 717–728 — barns svårighet
sitter i placeringen och i vad som blir över; båda görs synliga här.
