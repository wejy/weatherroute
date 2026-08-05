import {
  BarChart,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
} from "cursor/canvas";

/**
 * Solviax.app pricing & unit-economics canvas.
 * Sources: PAID_FEATURES.md / env defaults · Mapbox public pricing ·
 * Open-Meteo pricing page + published Standard/Pro $ · Stripe EEA fees (Aug 2026).
 * Scenarios are modeled — not live billing data.
 */

const stripeFee = (grossEur: number) =>
  Math.round((grossEur * 0.015 + 0.25) * 1000) / 1000;

export default function PricingMonetization() {
  const fee199 = stripeFee(1.99);
  const fee299 = stripeFee(2.99);
  const fee30 = stripeFee(30);
  const fee490 = stripeFee(4.9);
  const fee690 = stripeFee(6.9);

  return (
    <Stack gap={28}>
      <Stack gap={8}>
        <H1>Solviax.app — hinnoittelu & kustannukset</H1>
        <Text tone="secondary">
          Nykyiset kiintiöt koodista · Mapbox / Open-Meteo / Stripe · skenaariot
          10 ja 100 käyttäjälle · vaihtoehtoiset mallit (elokuu 2026)
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value="€1.99" label="Kerta · 60 pv · sis. ALV" />
        <Stat value="€2.99" label="Jatkuva / kk · sis. ALV" tone="info" />
        <Stat value="€30" label="Vuosi / v · sis. ALV" tone="info" />
        <Stat value="~€27" label="Open-Meteo Standard / kk*" />
      </Grid>

      <Callout tone="info" title="Listahinnat (brutto)">
        Kaikki Pro-hinnat sis. ALV 25,5 %. Stripeen tallennetaan brutto
        (unit_amount) tax_behavior=inclusive. Kerta 60 UTC-päivää; Vuosi =
        €30 vuodessa (ei /kk).
      </Callout>

      <H2>1. Nykyiset käyttörajat (tuote)</H2>
      <Table
        headers={["Taso", "Discover-haut", "Tulokset", "Säde", "Tallennetut reitit"]}
        rows={[
          [
            "Anon",
            "3 / cookie (+ IP-kerros ~10/vrk)",
            "10",
            "≤ Wider Region 200 km",
            "0",
          ],
          [
            "Free (kirjautunut)",
            "50 / UTC-kk",
            "20",
            "≤ 200 km",
            "0",
          ],
          [
            "Pro Kerta €1.99",
            "400 / 60 pv (ei mainosteta)",
            "30",
            "Pro-säteet + custom",
            "2",
          ],
          [
            "Pro Jatkuva €2.99",
            "200 / UTC-kk (ei mainosteta)",
            "30",
            "Pro-säteet + custom",
            "Rajaton",
          ],
          [
            "Pro Vuosi €30",
            "200 / UTC-kk (ei mainosteta)",
            "30",
            "Pro-säteet + custom",
            "Rajaton",
          ],
        ]}
        rowTone={["neutral", "neutral", "info", "success", "success"]}
      />
      <Text tone="secondary" size="small">
        Pro-ominaisuudet molemmissa: National/Continent/custom-säde, earliest
        departure, same-country. Env: FREE_MONTHLY=50, PRO_MONTHLY=200,
        PRO_ONE_TIME=400.
      </Text>

      <H2>2. Toimittajien hinnat (mitä maksat)</H2>
      <Table
        headers={["Palvelu", "Mihin Solviax käyttää", "Free / alkuporras", "Yli free"]}
        rows={[
          [
            "Mapbox GL JS",
            "Web-kartta (map load / sessio)",
            "50 000 load / kk",
            "~$5 / 1k load",
          ],
          [
            "Mapbox Geocoding",
            "Haku + reverse origin",
            "100 000 req / kk (temporary)",
            "~$0.75 / 1k",
          ],
          [
            "Mapbox Directions",
            "Reittisuunnittelu",
            "100 000 req / kk",
            "~$2 / 1k",
          ],
          [
            "Mapbox Mobile Maps",
            "Expo-kartta (MAU)",
            "25 000 MAU / kk",
            "~$4 / 1k MAU",
          ],
          [
            "Open-Meteo",
            "Sääennusteet (batch discover)",
            "Vain non-commercial (10k/pv)",
            "Standard ~$29 · 1M call/kk · commercial",
          ],
          [
            "Open-Meteo Pro",
            "Historiallinen / ensemble (ei nyt)",
            "—",
            "~$99 · 5M call/kk",
          ],
          [
            "Stripe (EEA)",
            "Checkout + tilaukset",
            "Ei kk-maksua",
            "1.5% + €0.25 (std kortti)",
          ],
          [
            "Upstash Redis",
            "Rate limit",
            "Free-tier riittää alkuun",
            "Pay-as-you-go REST",
          ],
          [
            "Resend",
            "OTP-sähköposti",
            "Free-tier / domain",
            "Käyttöön perustuva",
          ],
          [
            "VPS + Postgres",
            "Hostaus",
            "—",
            "Tyypillisesti ~€10–40 / kk MVP",
          ],
        ]}
      />
      <Text tone="secondary" size="small">
        Lähteet: mapbox.com/pricing · open-meteo.com/en/pricing (+ julkaistut
        Standard/Pro $-hinnat) · stripe.com EEA. Premium EEA -kortit ~2.8% +
        €0.25. Hinnat voivat muuttua — tarkista ennen go-liveä.
      </Text>

      <Callout tone="info" title="Open-Meteo commercial">
        Tuotemarkkinointi + maksullinen Pro = commercial use → free-tier ei
        riitä juridisesti. Budjetoi vähintään Standard (~$29/kk ≈ €27) heti
        julkaisuun, vaikka liikenne olisi pientä.
      </Callout>

      <H2>3. Stripe: mitä jää käteen</H2>
      <Table
        headers={["Brutto", "Stripe (1.5%+€0.25)", "Netto", "Fee %"]}
        rows={[
          [
            "€1.99 (Kerta)",
            `€${fee199.toFixed(3)}`,
            `€${(1.99 - fee199).toFixed(3)}`,
            `${((fee199 / 1.99) * 100).toFixed(1)}%`,
          ],
          [
            "€2.99 (Jatkuva)",
            `€${fee299.toFixed(3)}`,
            `€${(2.99 - fee299).toFixed(3)}`,
            `${((fee299 / 2.99) * 100).toFixed(1)}%`,
          ],
          [
            "€30 (Vuosi)",
            `€${fee30.toFixed(3)}`,
            `€${(30 - fee30).toFixed(3)}`,
            `${((fee30 / 30) * 100).toFixed(1)}%`,
          ],
          [
            "€4.90",
            `€${fee490.toFixed(3)}`,
            `€${(4.9 - fee490).toFixed(3)}`,
            `${((fee490 / 4.9) * 100).toFixed(1)}%`,
          ],
          [
            "€6.90",
            `€${fee690.toFixed(3)}`,
            `€${(6.9 - fee690).toFixed(3)}`,
            `${((fee690 / 6.9) * 100).toFixed(1)}%`,
          ],
        ]}
        rowTone={["warning", "info", "success", "success", "success"]}
      />
      <Text tone="secondary" size="small">
        Kiinteä €0.25 painaa pieniä maksuja; vuosimaksu €30 on fee-%:ltään
        selvästi edullisempi.
      </Text>

      <H2>4. API-määrät 10 vs 100 käyttäjällä</H2>
      <Text>
        Mallioletus (aktiivinen kuukausi): keskimäärin ~25 Discover-hakua /
        käyttäjä, ~0.4 reittiä / käyttäjä, ~2 karttasessiota / käyttäjä.
        Discover ≈ 1 geocode + 1 Open-Meteo -batch (≈ 20–30 sijaintia /
        HTTP; OM voi laskuttaa sijainteja — alla konservatiivinen 1 batch ≈ 1–25
        callia).
      </Text>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>10 MAU</CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text>~250 discovers · ~4 routes · ~20 map loads</Text>
              <Text>Mapbox: selvästi free-tierin sisällä (~$0)</Text>
              <Text>Open-Meteo: Standard ~$29 (licenssi), volume &lt;&lt; 1M</Text>
              <Text>Muut: Upstash/Resend ~€0–5</Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>100 MAU</CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text>~2 500 discovers · ~40 routes · ~200 map loads</Text>
              <Text>Mapbox: edelleen free (map loads &lt;&lt; 50k)</Text>
              <Text>Open-Meteo: Standard riittää; Pro vasta isommalla volume</Text>
              <Text>Mapbox maksaa vasta ~1k+ MAU / raskaalla karttakäytöllä</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <H3>Arvioidut kuukausikulut (ilman omaa palkkaa)</H3>
      <Table
        headers={["Kuluerä", "10 MAU", "100 MAU"]}
        rows={[
          ["Open-Meteo Standard", "~€27", "~€27"],
          ["Mapbox", "~€0", "~€0"],
          ["VPS + managed DB", "~€15", "~€20"],
          ["Upstash + Resend + domain", "~€3", "~€5"],
          ["Yhteensä (kiinteä)", "~€45", "~€52"],
        ]}
      />

      <H2>5. Tuotto nykyhinnoilla</H2>
      <Text>
        Oletusmuunnos: 15 % MAU:sta Jatkuva (€2.99/kk), 5 % Vuosi (amort ≈
        €2.50/kk), 10 % aktiivisia Kerta-ostajia (amort €1.99 / 60 pv ≈
        €1.00/kk). Loput Free. Hinnat sis. ALV.
      </Text>
      <Table
        headers={["Skenaario", "Kuukausitulo brutto", "Stripe jälkeen", "Kiinteät kulut", "Tulos"]}
        rows={[
          ["10 MAU · mix", "~€8", "~€7", "~€45", "≈ −€38"],
          ["100 MAU · mix", "~€80", "~€72", "~€52", "≈ +€20"],
          ["100 MAU · 25% Jatkuva + 10% Vuosi", "~€100", "~€90", "~€52", "≈ +€38"],
        ]}
        rowTone={["danger", "success", "success"]}
      />

      <H3>Kuukausikate-arvio (nykyhinnat, mallioletus)</H3>
      <Text tone="secondary" size="small">
        Netto Stripe jälkeen − kiinteät API/infra (€)
      </Text>
      <BarChart
        categories={["10 MAU", "100 MAU (20%)", "100 MAU (35%)"]}
        series={[
          {
            name: "Kate €",
            data: [-40, 1, 36],
            tone: "info",
          },
        ]}
        height={200}
      />
      <Text tone="secondary" size="small">
        Negatiivinen = tappio. 100 käyttäjällä nykyhinta on break-even vasta
        kohtuullisella conversionilla — ei “oikeaa” katetta.
      </Text>

      <Divider />

      <H2>6. Vaihtoehtoiset hinnoittelumallit</H2>

      <Stack gap={12}>
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          <Pill tone="neutral" active>
            A Nykyinen
          </Pill>
          <Pill tone="info" active>
            B Nosta hintoja
          </Pill>
          <Pill tone="success" active>
            C Vuositarjous
          </Pill>
          <Pill tone="warning" active>
            D Yksi Pro-taso
          </Pill>
        </Row>
      </Stack>

      <Table
        headers={["Malli", "Hinnat", "Kenelle", "Arvio 100 MAU (25% paid)", "Plussat / miinukset"]}
        rows={[
          [
            "A · Nykyinen",
            "€1.99 / 60 pv · €2.99/kk · €30/v",
            "Soft launch, kokeilu",
            "Brutto ~€70 · kate heikko",
            "+ ALV sis.  + vuosi parempi fee-%  − kiinteät API-kulut edelleen",
          ],
          [
            "B · Nosto",
            "€4.90 / 90 pv · €4.90/kk",
            "Consumer Pro",
            "Brutto ~€122 · kate ~€55+",
            "+ Stripe % järkevä  − conversion voi laskea",
          ],
          [
            "B2 · Premium Jatkuva",
            "€4.90 Kerta · €6.90/kk",
            "Power users",
            "Brutto ~€150+ jos 20% Jatkuva",
            "+ oikea kate  − tarvitaan selkeä arvo (säteet, tallennus)",
          ],
          [
            "C · Vuositarjous",
            "€49 / vuosi (~€4.08/kk)",
            "Sitoutuneet",
            "Parempi LTV, vähemmän churn-Stripeä",
            "+ kassavirta etukäteen  − refund-/churn-riski",
          ],
          [
            "D · Yksi Pro",
            "Poista €1 · vain €5.90/kk",
            "Yksinkertainen funnel",
            "Selkeä viesti, vähemmän edge-caseja",
            "+ ops helppo  − menetetään “kokeile euron” -funnel",
          ],
          [
            "E · Trip pack",
            "€2.90 / 10 Pro-discoveriä",
            "Satunnaiset",
            "Käyttöön sidottu",
            "+ reilu  − monimutkaisempi UI + Stripe metering",
          ],
        ]}
      />

      <H3>Malli B vs nykyinen — kate 100 MAU:lla</H3>
      <Text tone="secondary" size="small">
        Arvioitu kuukausikate · 20 Jatkuva + 5 Kerta-amort · kiinteät ~€52
      </Text>
      <BarChart
        categories={["A €2.99 / €1.99", "B €4.90 / €4.90", "B2 €6.90 / €4.90"]}
        series={[
          {
            name: "Kate €",
            data: [1, 48, 78],
            tone: "success",
          },
        ]}
        height={220}
      />
      <H2>7. Mitä tarvitaan “oikeaan” ansaintaan?</H2>
      <Grid columns={3} gap={12}>
        <Card>
          <CardHeader trailing={<Pill size="sm" tone="warning" active>Lyhyt</Pill>}>
            Hinnat ylös
          </CardHeader>
          <CardBody>
            <Text>
              Nosta Jatkuva ainakin ~€4.90–€6.90. Kerta min. ~€3–€5 (tai poista),
              jotta Stripe €0.25 ei dominoi.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill size="sm" tone="info" active>Keskipitkä</Pill>}>
            Conversion
          </CardHeader>
          <CardBody>
            <Text>
              Soft paywall Free 50 → Pro. Näytä arvo (laajemmat säteet,
              tallennus) ennen maksua. Tavoite ≥20–30 % aktiivisista Free →
              paid.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill size="sm" tone="success" active>Skaala</Pill>}>
            Volyymi
          </CardHeader>
          <CardBody>
            <Text>
              ~€50 kiinteällä tarvitset ~15–25 Jatkuva-tilaajaa €4.90:llä
              break-eveniin; €2.99:llä ~18–22. Vuosi €30 auttaa fee-%:ssä.
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <Callout tone="success" title="Suositus (käytännöllinen)">
        1) Budjetoi Open-Meteo Standard heti commercial-julkaisuun. 2) Nosta
        Jatkuva €4.90–€6.90 ja Kerta €3.90–€4.90 / 90 pv (tai poista Kerta). 3)
        Pidä discover-kiintiöt pehmeänä mainontana. 4) Lisää vuositarjous
        (~2 kk alennus) LTV:lle. 5) Älä laske Mapbox-kuluja ongelmaksi ennen
        ~1k MAU — pullonkaula on hinta × conversion, ei tilejä.
      </Callout>

      <H2>8. Break-even: montako tilaajaa?</H2>
      <Table
        headers={["Kuukausihinta (netto ≈)", "Kiinteät ~€50", "Tavoitekate +€100"]}
        rows={[
          ["€2.99 (netto ~€2.70)", "~19 tilaajaa", "~56 tilaajaa"],
          ["€4.90 (netto ~€4.58)", "~11 tilaajaa", "~33 tilaajaa"],
          ["€6.90 (netto ~€6.55)", "~8 tilaajaa", "~23 tilaajaa"],
        ]}
      />
      <Text tone="secondary" size="small">
        Yksinkertaistus: vain Jatkuva-tilaukset, ei Kerta/churn/verot/ALV.
        Suomi: tarkista ALV-velvollisuus liikevaihdon kasvaessa.
      </Text>

      <Divider />
      <Text tone="secondary" size="small">
        Canvas on päätöksenteon malli, ei kirjanpito. Päivitä kun listahinnat
        tai Open-Meteo/Mapbox-hinnat muuttuvat. Evidence: PAID_FEATURES.md,
        plans.ts, env defaults, open-meteo.com/en/pricing, Mapbox pricing,
        Stripe EEA.
      </Text>
    </Stack>
  );
}
