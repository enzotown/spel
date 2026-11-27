# Slå rutan

Ddakji (딱지치기), den koreanska pappersleken, för barn 4–7 år. Först viks ett papper tre gånger,
sedan ligger den färdiga rutan på mattan vid kompisens ruta. Barnet sveper handflatan snabbt över sin
ruta — luftdraget far iväg och vänder kompisens ruta. Fem rutor → fest, och sedan får man slå hur
mycket man vill.

## Mekaniken

- **Vikningen är tre svep.** Papperet är 2:1 (en remsa, som det riktiga ddakjit papperet). Svep åt
  vänster, svep uppåt, svep åt vänster — varje svep måste börja på den halva som ska flyttas och
  korsa den streckade viklinjen. Papperet halveras för varje vikning och slutar som en liten kvadrat
  (`L.minS`), alltså fyra gånger mindre än det började. Ett svep åt fel håll vinkas vänligt
  ("Svep åt vänster!") och ingenting går förlorat.
- **Slaget är fart, inte riktning.** Efter vikningen ligger barnets ruta nere på mattan och kompisens
  ruta uppe. Barnet sveper över sin egen ruta; farten mäts som `sträcka / tid` mellan `pointerdown`
  och `pointerup` (med svepbanans längd som reserv om fingret kröker). Trösklarna stiger per ruta:
  500, 580, 660, 740, 820 px/s. Under tröskeln händer inget värre än att rutan skakar lite och rösten
  säger "Svep snabbare!" — efter två försök tänds en grön pil.
- **Vändningen.** En vit ring far från barnets ruta till kompisens (0,26 s), rutan trycks ihop
  (`scale(1, |cos|)`) och byter sida vid halva tiden: framsidan har X-mönstret, baksidan är
  kraftpapper med en stämpel. Sedan en stjärna, konfetti och nästa ruta — som är lite större och
  kräver lite snabbare svep.
- **Barnets ruta har en egen färg** (`MINRUTA`, sandgul) som ingen kompisruta har, annars blandas de
  ihop när kompisrutan råkar vara mintgrön.
- **Ingen förlust.** Inga poäng dras, ingen klocka, ingen motståndare som vinner. Festen efter fem
  rutor är fri lek där rutorna fortsätter att komma.

## Filer

`index.html`, `app.js`, `kotten.js` (maskoten), `sma-ljud.js` (tyst pet när ett tryck annars är
tyst), `sw.js` (cache-first), `manifest.webmanifest`, ikoner, `delningsbild.png`, `ljud/` (19
röstfiler från Shipholms `speak`, röst `omni`, fart 0.9) och `larare.html`.

## Röst

`ljud/roster.txt` innehåller meningarna; `python3 verktyg/rost.py slarutan` skapar mp3:orna och
`ljud/lines.js`. Alla meningar i `ROST`-tabellen i `app.js` finns som fil — annars blir de tysta
(det finns ingen talsyntes som reserv).

## Testat

Spelat igenom med riktiga `PointerEvent`: alla tre vikningarna (även fel håll), fem rundor till fest,
för långsamt svep två gånger → grön pil, rotation mitt i vikningen (papperet hittar tillbaka till
mattans mitt med rätt mått) och i speläget, porträtt 768×1024 och landskap 1024×768, "En gång till".
Noll JS-fel i `window.__errs`. Testkrok: `window.__sr` (`state`, `start`, `vik`, `svep`, `tap`).

## AI

Texten, röstens meningar och spelets uppbyggnad skrevs med AI när spelet byggdes och ligger färdiga i
appen. Inget skickas till AI när barnet spelar, inget barns data lämnar enheten och barnet kan inte få
ett oväntat svar.

## Publicerad

https://spel.shipholm.dev/slarutan/ (undermapp till hubb-appen — kontot har 50 av 50 appar).
Eget repo: `enzotown/slarutan`.
