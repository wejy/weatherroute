# TypeScript SaaS Tech Stack: MVP ja Production Stack

Tämä dokumentti kuvaa suositellun teknisen arkkitehtuurin TypeScript-pohjaiselle SaaS-sovellukselle, jossa käytetään Mapbox-karttoja sekä säädataa Open-Meteo- ja yr.no-palveluista. Tavoitteena on antaa suoraan hyödynnettävä kuvaus esimerkiksi Cursorille tai Claude AI:lle niin, että sen pohjalta voidaan alkaa rakentaa projektia käytännössä.

## Tavoite

Rakennettava sovellus on moderni, nopea ja tietoturvallinen SaaS, jossa:

- frontend on TypeScript-pohjainen web-sovellus,
- karttanäkymä toteutetaan Mapboxilla,
- säädata haetaan Open-Meteo- ja tarvittaessa yr.no-palveluista,
- käyttäjillä on omat tilit ja mahdollisesti organisaatio- tai tenant-kohtainen data,
- arkkitehtuuri tukee ensin nopeaa MVP-kehitystä ja myöhemmin hallittua siirtymää production-tasolle.

Next.js suosittelee App Router -projekteissa Data Access Layer -mallia, jossa palvelinpuoli keskittää datan luvituksen, käsittelyn ja palauttaa clientille vain turvallisen minimidatan DTO-muodossa[cite:54]. Supabasen turvallisuusohje korostaa, että frontendissä näkyvä publishable key on hyväksyttävä vain silloin, kun tietokanta on suojattu Row Level Securityllä ja salaiset service role -avaimet pidetään kokonaan palvelinpuolella[cite:59].

## Arkkitehtuuriperiaatteet

Seuraavat periaatteet kannattaa pitää samoina sekä MVP- että production-vaiheessa:

- Käytä Next.js:ää TypeScriptilla pääsovelluksena.
- Pidä liiketoimintalogiikka ja integraatiot palvelinpuolella.
- Palauta clientille vain välttämätön data.
- Suojaa moniasiakasdata RLS-politiikoilla tai vastaavalla tenant-eristyksellä[cite:54][cite:59].
- Kutsu sääpalveluita oman backend-kerroksen kautta, jotta cache, rate limiting ja avainten hallinta pysyvät omassa kontrollissa[cite:54].
- Rakenna integraatiot niin, että Open-Meteo ja yr.no voidaan vaihtaa tai yhdistää ilman muutoksia käyttöliittymään.

## MVP Stack

MVP-vaiheen tavoite on päästä nopeasti tuotantokelpoiseen beta-versioon ilman turhaa kompleksisuutta. Käyttöönoton tulee olla nopea, mutta perustan pitää silti tukea myöhempää laajennusta.

### Suositeltu MVP-teknologia

| Osa | Suositus |
|---|---|
| Web-sovellus | Next.js App Router + TypeScript [cite:54] |
| UI | Tailwind CSS + shadcn/ui |
| Auth | Supabase Auth [cite:59] |
| Tietokanta | Supabase Postgres [cite:59] |
| ORM | Drizzle ORM |
| Kartta | Mapbox GL JS |
| Haku / geocoding | Mapbox Search |
| Säädata | Open-Meteo ensisijaisena, yr.no fallbackina |
| Hosting | Vercel |
| Virheseuranta | Sentry |
| Analytiikka | PostHog tai kevyt analytics |

### MVP-rakenne

MVP kannattaa toteuttaa yhtenä monorepon tai yksinkertaisen single-app-repon sisällä. Kaikki keskeinen logiikka pidetään samassa Next.js-projektissa.

Suositeltu kansiorakenne:

```txt
app/
  (marketing)/
  dashboard/
  api/
src/
  server/
    auth/
    dal/
    services/
    integrations/
      mapbox.ts
      weather/
        openmeteo.ts
        yr.ts
  db/
    schema.ts
    queries.ts
  lib/
    validation/
    utils/
```

### MVP-suunnittelusäännöt

- Käytä Data Access Layeria heti alussa, vaikka sovellus olisi pieni, koska Next.js suosittelee keskittämään turvallisen datan käsittelyn palvelinpuolelle[cite:54].
- Käytä `server-only`-ajattelua kaikissa moduuleissa, jotka käsittelevät salaisuuksia, käyttöoikeuksia tai integraatioavaimia[cite:54].
- Käytä Supabasen publishable keytä frontendissä vain authiin ja turvallisesti rajattuun dataan, jota suojaa RLS[cite:59].
- Älä koskaan altista service role -avaimia clientille[cite:59].
- Tee säähaut backend-endpointin kautta, jotta voit myöhemmin lisätä välimuistin, fallback-logiikan ja kutsurajoitukset ilman että frontend muuttuu.
- Debounce Mapbox Search -haut, jotta hakukutsuja ei synny liikaa.

### MVP-tietoturva

MVP:ssä riittää hyvä perustaso, kunhan se tehdään heti oikein:

- HTTP-only secure cookie -pohjaiset sessiot.
- RLS kaikkiin käyttäjäkohtaisiin tauluihin[cite:59].
- Zod-validointi kaikille route handlereille ja server actioneille[cite:54].
- Rate limiting vähintään auth-, search- ja weather-endpointeille.
- Selkeä tenant- tai `user_id`-sidonta tietokantatauluihin.
- DTO-muotoiset vastaukset clientille, ei suoria database-objekteja[cite:54].

### MVP-suorituskyky

- Pidä suurin osa UI:sta server-first-mallissa ja siirrä vain kartta sekä vahvasti interaktiiviset osat client-komponenteiksi[cite:54].
- Cache säävastauksia 5–15 minuuttia tilanteesta riippuen.
- Tallenna viimeisin location snapshot tietokantaan tai edge-cacheen.
- Yhdistä paikkatieto + sää mahdollisuuksien mukaan yhdeksi backend-vastaukseksi.
- Vältä ylimääräisiä clientistä lähteviä rinnakkaiskutsuja.

## Production Stack

Production-vaiheessa tavoitteena ei ole enää vain nopea kehitys, vaan skaalautuvuus, tietoturva, tenant-eristys, havainnointi ja kustannusten hallinta. Perusrakenne voi säilyä samana, mutta mukaan lisätään cache, background jobs ja tarkempi käyttöoikeusmalli.

### Suositeltu production-teknologia

| Osa | Suositus |
|---|---|
| Web-sovellus | Next.js + TypeScript [cite:54] |
| Backend-arkkitehtuuri | Selkeä DAL + service layer + `server-only` -moduulit [cite:54] |
| Tietokanta | Hallittu PostgreSQL tai Supabase Postgres [cite:59] |
| Auth | Supabase Auth tai Auth.js |
| ORM | Drizzle ORM |
| Kartta | Mapbox |
| Säädata | Open-Meteo + yr.no + oma adapterikerros |
| Cache | Redis / Upstash |
| Jobs / queue | Inngest, Trigger.dev tai BullMQ |
| Storage | S3-yhteensopiva objektitallennus |
| Monitoring | Sentry + tracing/logging |
| Analytics | PostHog |
| Hosting | Vercel + tarvittaessa erillinen worker/backend-service |

### Production-rakenne

Production-vaiheessa logiikka jaetaan selkeämmin kerroksiin:

```txt
app/
src/
  server/
    auth/
    dal/
    services/
      weather-service.ts
      location-service.ts
      billing-service.ts
      usage-service.ts
    integrations/
      mapbox/
      weather/
    jobs/
    policies/
  db/
    schema/
    migrations/
    repositories/
  lib/
    validation/
    telemetry/
    rate-limit/
```

### Production-tietoturva

Production-stackissa suojaus kiristetään systemaattiseksi:

- Tenant-kohtaiset RLS-politiikat ja roolipohjainen käyttöoikeusmalli[cite:59].
- Audit log kaikille tärkeille operaatioille.
- Salaisuudet vain palvelinympäristössä; vain `NEXT_PUBLIC_*`-muuttujat clientille[cite:54].
- CSP-headerit, turvalliset HTTP-headerit ja tarkistettu origin-politiikka.
- Webhook-allekirjoitusten verifiointi.
- DTO-only tietovirta clientiin[cite:54].
- Dependency scanning ja säännölliset tietoturvapäivitykset.
- Erottelu julkisen datan, tenant-datan ja admin-datan välillä.

### Production-suorituskyky ja skaalautuvuus

- Redis-cache usein haetulle sää- ja paikkadatalle.
- Queue-pohjainen taustaprosessointi esimerkiksi ennakkopäivityksiin, hälytyksiin, rikastukseen ja raportointiin.
- Usage metering Mapbox-hakujen, sääkutsujen ja tenant-kohtaisten rajojen seurantaan.
- Mahdollinen read-replica tai erillinen analytiikkapolku, jos datamäärä kasvaa.
- Selkeä adapterikerros kolmannen osapuolen API:lle, jotta toimittajan vaihtaminen ei riko domain-logiikkaa.

## Etenemissuositus

Käytännössä järkevin eteneminen on:

1. Aloita MVP-stackilla.
2. Rakenna heti alussa hyvä DAL, validaatio ja tenant-ajattelu[cite:54][cite:59].
3. Lisää production-ominaisuuksia vaiheittain: cache, queue, observability, usage billing.
4. Pidä integraatiot abstrahoituina palvelukerroksen taakse.
5. Siirrä monimutkaisemmat optimoinnit käyttöön vasta kun oikea käyttödata osoittaa tarpeen.

Tämä lähestymistapa sopii erityisen hyvin tilanteeseen, jossa kehittäjä haluaa päästä nopeasti liikkeelle mutta välttää umpikujaan johtavan “hackattu MVP” -arkkitehtuurin. Perus full-stack-taustalla nopein turvallinen tie on yksinkertainen stack, jossa turvalliset rajat määritellään alusta asti, mutta infraa ei yliyritetä liian aikaisin[cite:39][cite:54].

## Tiivis vertailu

| Osa | MVP | Production |
|---|---|---|
| App | Next.js App Router + TypeScript [cite:54] | Next.js + TypeScript [cite:54] |
| Data access | Kevyt DAL [cite:54] | Täysi DAL + service layer [cite:54] |
| DB | Supabase Postgres [cite:59] | Supabase tai hallittu PostgreSQL [cite:59] |
| Auth | Supabase Auth [cite:59] | Supabase Auth tai Auth.js |
| Security | RLS + input validation + basic rate limit [cite:59][cite:54] | RLS + RBAC + audit + CSP + stricter secret boundaries [cite:59][cite:54] |
| Weather integration | Backend proxy | Backend proxy + cache + queue |
| Caching | Kevyt cache | Redis / Upstash |
| Jobs | Ei pakollinen | Inngest / Trigger.dev / BullMQ |
| Monitoring | Sentry | Sentry + tracing + logs |
| Billing / usage | Myöhemmin | Mukana alusta tai heti varhaisessa growth-vaiheessa |

## Prompt-ready ohje AI-työkalulle

Alla oleva kuvaus voidaan antaa suoraan Cursorille tai Claude AI:lle projektin rungon suunnitteluun:

```md
Build a modern SaaS web application using Next.js App Router and TypeScript.

Core requirements:
- Multi-user SaaS architecture.
- Map-based UI using Mapbox.
- Weather data integration using Open-Meteo as the primary source.
- yr.no as a fallback weather provider.
- PostgreSQL database.
- Authentication for users.
- Secure server-side integration layer for all external APIs.
- Clean separation between UI, data access layer, service layer, and integrations.

Architecture requirements:
- Use a Data Access Layer (DAL) for secure server-side data access.
- Return only minimal DTOs to the client.
- Keep secrets server-side only.
- Use Row Level Security if Supabase is used.
- Implement rate limiting for search and weather endpoints.
- Debounce map search requests.
- Add caching for weather queries.
- Design the codebase so that Open-Meteo and yr.no can be swapped behind a weather adapter interface.

MVP stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- Drizzle ORM
- Mapbox GL JS
- Open-Meteo + yr.no fallback
- Vercel
- Sentry

Production evolution:
- Add Redis/Upstash caching
- Add background jobs with Inngest, Trigger.dev, or BullMQ
- Add usage metering and billing hooks
- Add audit logs and stronger tenant isolation
- Add structured monitoring and tracing

Suggested folder structure:
- app/
- src/server/auth/
- src/server/dal/
- src/server/services/
- src/server/integrations/mapbox/
- src/server/integrations/weather/
- src/db/
- src/lib/validation/

Generate:
1. Recommended folder structure.
2. Initial database schema.
3. Authentication approach.
4. Weather provider adapter interface.
5. Mapbox search + weather aggregation endpoint.
6. Basic dashboard page architecture.
7. Security checklist for production readiness.
```
