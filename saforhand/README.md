# Så för hand

Mancala (pallanguzhi / oware / kalaha) för barn 4–7 år, på svenska, med Kotten som motspelare.
Barnet tar en skål med bär och så ett i varje nästa skål medan rösten räknar. Ingen förlust:
slutet räknas alltid ihop och båda är glada. Tränar ett-till-ett-räkning under förflyttning och
bevarande av antal.

- Live: https://spel.shipholm.dev/saforhand/ (hubben) — eget repo `enzotown/saforhand` väntar på
  en ledig appplats på Shipholm (kontot har 50/50 appar).
- Källa: `spel/saforhand/` i monorepot. Publiceras med `bash verktyg/publicera.sh saforhand`.
- Röster: `ljud/` (Shipholm TTS, `verktyg/rost.py saforhand`), reserv är webbläsarens talsyntes.

## AI i appen

Innehållet — text, menyformuläringar och den svenska rösten — skrevs med AI när spelet byggdes
och ligger färdigt som data i appen. Ingen AI körs när barnet spelar, inget skickas till nät
för innehåll, och inget barns data lämnar enheten (bara offline-cache i webbläsaren).