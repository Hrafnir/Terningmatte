# Terningmatte

Et matematikkverksted der eleven bruker fem faste terninger til å bygge positive heltall med regnetegn.

## Regler

- Terningene velges én gang per runde. De samme fem verdiene gjelder hele runden.
- Hver terning kan brukes maks én gang i hvert uttrykk; alle fem trenger ikke brukes. Terningene blir tilgjengelige igjen etter en løsning.
- Tall for tall starter på 1. Fri utforsking lar eleven fylle tallstien i valgfri rekkefølge. Begge deler samme kast og løsninger; poeng er den ubrutte rekken fra 1.
- **Start ny runde** viser en advarsel og krever bekreftelse før kast, uttrykk, løsninger og poeng erstattes. Avbryt eller Escape beholder runden. Både tilfeldig kast og manuelle siffer følger denne flyten.
- Lokallagring beholder runden på samme enhet og nettadresse. Ingen elevkonto eller ekstern AI-tjeneste brukes.

## Utvikling

Krever Node.js 20 eller nyere. Ingen npm-avhengigheter.

```sh
npm run dev    # http://127.0.0.1:4173
npm test       # regnemotor, runder og hint
npm run build # statiske filer i dist/
```

GitHub Pages kan fortsatt servere rotmappen direkte. Sites bruker den statiske dist-mappen. Ingen server eller database trengs i produksjon.

## Innhold

- `index.html`, `script.js`, `style.css`: responsivt spillebrett, knapp- og dra-basert uttrykksbygging, angre, skriftlig inntasting og slettedialog.
- `matematikk.html`, `learn.js`: reglene, de fire regneartene, regnerekkefølge, parenteser, potenser, fakultet og strategier, med stegvis gjennomgang.
- `math.js`: egen parser uten eval; eksplisitt prioritet og validering av terningenes antall. Eksakte brøker følger rasjonelle beregninger for å unngå falske heltall. Ikke-rasjonelle potensresultater bruker flyttall og en absolutt toleranse på 1e-9. Beregninger har størrelse- og lengdegrenser; fakultet stopper ved 18!.
- `hints.js`, `hint-worker.js`: begrenset søk i egne terningdelmengder. Søk kjøres utenfor hovedtråden. Hver foreslått løsning valideres av den samme regnemotoren som elevsvar. Manglende hint er ikke et bevis for at måltallet er umulig. Hint bruker +, −, ×, ÷ og, på avansert nivå, enkelte potenser og fakulteter.
- `assets/eirik.png`: AI-generert karikatur basert på brukerens eget referansefoto og bestilling. Originalfotoet er ikke lagt i prosjektet. Humoren er selvironisk på veilederens vegne, aldri på elevens.

Fonter lastes fra Google Fonts, med lokale systemfonter som reserve. Selve spillet, veiledertekstene og beregningene bruker ikke eksterne tjenester.

## Skrivefelt og avatarer

Skrivefeltet er alltid synlig rett under terningene. Tekst og flyttbare brikker er to visninger av samme uttrykk; endringer, angre og validering gjelder begge. Tidligere lagrede utkast migreres uten å miste det aktive uttrykket. Løsningene vises i en åpen liste.

Nye spillere starter direkte med konkurransekastet 1, 2, 3, 5, 6. Bare en eksisterende runde utløser advarselen om sletting. Manuelle siffer kan velges før start eller som del av en bekreftet ny runde.

24 separate avatarillustrasjoner ligger i `assets/avatars/`. `avatars.js` kobler seks varianter til hver av gruppene vanlig spill, oppmuntring ved feil, hint og feiring ved minst tre riktige svar på rad. Feil bryter denne bonusrekken, men sletter aldri løste tall eller poeng. Hint bryter ikke rekken. Knappen «Ny forkledning» blar gjennom alle 24. Kostymer skifter bare ved handlinger, ikke på en forstyrrende tidsstyring. Bevegelse respekterer redusert animasjon.

## Deling av runder

`rundestatus.html` leser den lagrede runden på samme enhet og nettadresse. Eleven fyller inn navn og får kast, poeng og alle løsninger samlet. Siden revaliderer løsningene før eksport. Navnet lagres separat fra rundedata, slik at visning og navneendringer ikke overskriver spillfremdrift.

«Kopier bilde» bruker PNG via Clipboard API, med tydelig alternativ til nedlasting hvis nettleseren ikke støtter eller tillater bildekopiering. «Last ned bilde» lager PNG lokalt fra Canvas, uten ekstern bildeservice eller automatisk sending til Teams. «Kopier som tekst» inkluderer hele resultatlisten. Ekstra lange lister fordeles over flere bildesider, med kast, navn og poeng på hver side. Bruk av potenser/fakultet fremgår selv om eleven senere har byttet til grunnleggende regnetegn.

## Validering

60 automatiske tester dekker regnerekkefølge, fakultet, negative eksponenter, ugyldig syntaks, eksakte brøkresultater, terningbegrensninger, rundestart, modusbytte og kontrollerte hint. Byggsteget sjekker at lokale sider og ressurser finnes. Visuell nettlesertesting er ikke gjennomført for denne versjonen.

## Konkurransekast og GitHub Pages

Nye besøk starter direkte med 1, 2, 3, 5, 6. Eksisterende lagrede runder beholdes; «Start ny runde» har konkurransekastet som standard. «Kopier / lagre resultat» åpner rundestatus, med knapper for PNG-kopiering, PNG-nedlasting og tekst rett under navnet. GitHub Pages publiserer rotmappen fra main.
