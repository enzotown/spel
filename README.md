# Spelen

Startsidan: alla tretton lek-apparna på en skärm, med stora tryckytor och en ikon
per spel. Ingen meny, inget att ställa in — tryck på en bild så startar spelet.

Sidan är ren HTML och CSS (några rader JavaScript för offline-cachen). Ikonerna
hämtas från varje spels egen adress, så de byts automatiskt när ett spel får ny ikon.

## Live

https://spel.shipholm.dev — byggs från `enzotown/spel` och deployas vid push.

## Provkör lokalt

```bash
python3 -m http.server 8170
# öppna http://127.0.0.1:8170/
```

Ikonerna på de andra spelens adresser kräver nät; startsidan själv fungerar offline.

## Bara några spel (till läraren)

`?spel=klockan,kasinot` visar bara de spelen — skicka länken till gruppen i stället för att
peka på tretton ikoner. Okänt namn ger hela listan, och "Visa alla" tar bort filtret.

Startsidan minns också senast spelade spel (`localStorage` `marre-senast`) och visar det
överst under "Fortsätt", med texten "Senast spelad".

## Lägga till ett spel

Kopiera ett `<a class="kort">`-block i rätt grupp och byt adress, ikon, namn och
den korta raden. `--kant` är kortets ramfärg.
