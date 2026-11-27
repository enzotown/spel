# Blinda ansiktet

Fukuwarai, den japanska nyårsleken, för barn 4–7 år. Ett tomt ansikte ligger på ett papper under
en duk. Sex delar (två ögon, två bryn, näsa, mun) ligger i en låda; barnet drar dem dit det vill
och ser inte var de hamnar. När sista delen lagts lyfts duken och ansiktet syns.

## Mekaniken

- **Duk i stället för ögonbindel.** Medan `G.duk > 0` ritas ett tygstycke över hela papperet med
  bara den streckade ansiktskonturen kvar. Delen som hålls i fingret ritas *ovanpå* duken, så
  barnet ser vad det håller men inte var det landar. Duken tonar bort på ~0,7 s när alla sex delar
  ligger (`G.dukTarget = 0`).
- **Delen stannar där fingret släppte.** Ingen snäppning mot ett rätt läge: `lagg()` klampar bara
  punkten innanför papperet. Det är hela poängen — fel finns inte.
- **Sex delar, tre ansikten.** `ANSIKTEN` ger tre olika ägg (rund, bred, hög) och papperet flyttar
  sig lite mellan rundorna, så barnet inte kan lära sig en fast punkt. Efter tre ansikten kommer
  festen, där alla delar får flyttas fritt.
- **Prickar i stället för siffror.** Nere på duken sitter sex prickar; fylld = del som ligger.
  Antalet står också som "3 av 6" i lådans hörn (bara för den vuxne).
- **Hjälp efter tio sekunder.** Ligger ingen del ännu sägs instruktionen om, och efter åtta sekunder
  pulserar delarna i lådan lätt. Ingen del kan försvinna: släpps den utanför papperet går den
  tillbaka till lådan.

## Filer

`index.html`, `app.js`, `kotten.js` (maskoten), `sma-ljud.js` (tyst pet när ett tryck annars är
tyst), `sw.js` (cache-first), `manifest.webmanifest`, ikoner, `ljud/` (16 röstfiler från Shipholms
`speak`, röst `omni`, fart 0.9) och `larare.html`.

## Röst

`ljud/roster.txt` innehåller meningarna; `python3 verktyg/rost.py blindaansiktet` skapar mp3:orna
och `ljud/lines.js`. Alla meningar i `ROST`-tabellen finns som fil — annars blir de tysta.

## Testat

Spelat igenom med riktiga `PointerEvent` i 1024×768 och 768×1024: alla tre ansikten till fest,
del släppt utanför papperet, rotation mitt i en runda (delarna hittar tillbaka till lådan), fri lek
på festen. Noll JS-fel i `window.__errs`. Testkrok: `window.__ba`.

## AI

Spelets text, röstens meningar och ansiktsdelarnas former skrevs med AI när spelet byggdes och
ligger färdiga i appen. Inget skickas till någon AI när barnet spelar, inget barns data lämnar
enheten och barnet kan inte få ett oväntat svar.
