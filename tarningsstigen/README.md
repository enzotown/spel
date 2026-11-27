# Tärningsstigen

Två tärningar med 1–3 prickar slås. Barnet räknar prickarna och Kotten går lika många
stenar på stigen — ett steg per tryck, räknat högt ("ett", "två" …). Tio stenar leder
till picknickfilten, där festen väntar med fri lek.

- **Tränar:** mängd → antal → rörelse (en-till-en-korrespondens), räkneramsan i takt med
  handlingen, och enkel addition (1–3 + 1–3 = 2–6).
- **Ingen förlust:** ingen timer, inga minus, ingen väg att gå fel. Trycker barnet innan
  tärningen slagits säger Kotten "Slå tärningen först!" och skakar på huvudet.
- **Röst:** färdiga MP3-filer från Shipholms TTS (`ljud/`), med webbläsarens röst som reserv.
- **Offline:** service worker (`sw.js`) precachar allt; andra besöket fungerar utan nät.
- **AI:** texter, röstmeningar och bilder är skrivna när spelet byggdes. Inget AI-anrop sker
  i drift, inget barns data lämnar enheten.

Mekaniken bygger på forskning om linjära tärningsspel för förskolan (Elofsson m.fl. 2021;
Gasteiger & Obersteiner 2024) och Numberblocks-avsnittet "Six" (NCETM): prickmönstret är
mängden, steget är antalet, stigens nummer gör ordningen synlig.

Källa: `spel/tarningsstigen/` i monorepot. Live: https://spel.shipholm.dev/tarningsstigen/
(eget repo `enzotown/tarningsstigen` är pushat; appen ligger som undermapp till hubben
eftersom Shipholm-kontot har 50 av 50 appar).