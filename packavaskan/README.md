# Packa väskan

Ett lek- och lärspel för barn 4–7 år. En öppen väska med ett rutnät står på golvet och sakerna
ligger på bänken bredvid. Barnet drar en sak i taget ner i väskan; den snäpper fast i närmaste ruta
om det finns plats. Ett tryck vrider saken ett kvarts varv — och det behövs, för en lång och smal
sak får plats liggande men inte stående. När allt fått plats går locket igen, en stjärna flyger upp
och nästa väska står framme. Fyra väskor, sedan fest där alla åtta sakerna får packas hur som helst.

Spelas på <https://spel.shipholm.dev/packavaskan/> (appen ligger som undermapp till hubb-appen
eftersom kontot har 50 av 50 appar på Shipholm; repot `enzotown/packavaskan` är pushat och appen får
egen domän när en plats blir ledig).

## Vad det tränar

Rumslig packning: area och form på samma gång. Att en sak tar olika mycket plats åt olika håll, att
läsa ett rutnät och fylla det, och att våga försöka igen när det inte passar. Ingen förlust, ingen
tidspress, inga minus — bara pling, beröm och en glödande ruta som hjälp efter en stund.

## Rundorna

| Väska | Rutnät | Saker |
|-------|--------|-------|
| 1 | 4×3 | bok, kudde, filt |
| 2 | 4×4 | bok, kudde, låda, bröd, flaska |
| 3 | 5×4 | bok, kudde, låda, boll, filt |
| 4 | 5×4 | dagbok, låda, filt, kudde |
| fest | 6×6 | alla åtta |

## Filer

- `index.html` — sidan, allt annat laddas härifrån.
- `app.js` — hela spelet: layout, rutnät, drag, vridning, ljud, ledtråd och testkrok.
- `kotten.js` — figuren Kotten (`KOTTEN.drawAtFeet`).
- `ljud/` — röst från Shipholms TTS (`speak`, röst `nst`, fart 0.9) och `roster.txt` med meningarna.
- `sw.js`, `manifest.webmanifest`, `icon-180/192/512.png` — appskalet för hemskärmen och offline.
- `larare.html` — lärarsida med Lgr22-koppling.

## Testkrok

`window.__pv` i konsolen:

```js
__pv.start()                 // starta spelet
__pv.state()                 // fas, rutnät, sakernas plats, fel
__pv.lagg('filt', 0, 2, 1)   // lägg filten i ruta (0,2) med rotation 1, som ett riktigt drag
__pv.auto()                  // spela klart rundan (hittar giltiga platser)
__pv.vrid('bok')             // vrid en sak
__pv.spola(3200)             // spola tiden (locket, nästa väska)
```

## Innehåll och AI

Bilder, texter och röst skrevs och ritades när spelet byggdes. Inget skickas till AI när barnet
spelar, inget barns data lämnar enheten och inga konton eller köp finns. Efter första besöket
fungerar spelet helt utan nät.