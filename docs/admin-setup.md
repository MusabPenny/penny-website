# PennyPlus: Microsoft prijava, Supabase i administracija

> Panel je proširen CMS-om, marketing rolom i prijavama kandidata. Migracije 003/004, nove rute, prava, privatni prilozi i operativne upute opisani su u [content-and-recruitment.md](content-and-recruitment.md). Javne CMS stranice koriste ISR; izvorni opis statičkog sadržaja ispod odnosi se na početnu verziju.

## Arhitektura

Next.js 16.4.2 App Router u `app/`, React 19.3.0 i TypeScript. Auth.js (`next-auth@5.0.0-beta.32`) koristi isključivo Microsoft Entra ID, uz dodatnu RS256 provjeru ID tokena pomoću `jose`. Autentifikacija ne koristi Supabase Auth. Auth.js v5 je beta; nadogradnje provjeravati testovima.

Administracija koristi postojeći Supabase JS paket i Data API. Prisma, `pg`, `DATABASE_URL` i `DIRECT_URL` nisu potrebni. Javne stranice ostaju statičke i zadržavaju sadržaj i SEO.

- `lib/supabase/connection.mjs`: postojeći anonimni/publishable klijent.
- `lib/supabase/admin.ts`: zaseban `server-only` klijent sa secret ključem, bez korisničkih Supabase sesija, uz no-store i timeout.
- `lib/admin/repository.ts`: tipizirani pozivi RPC-a; ne izvršava proizvoljni SQL.
- `public.penny_admin_execute`: odobreni skup operacija; identitet prima isključivo od pouzdanog serverskog koda poslije provjere Auth.js sesije.
- SQL fajlovi u `db/migrations` jedini su izvor admin šeme.

Auth.js cookie se ne tretira kao Supabase korisnički JWT. Publishable ključ ne dobija interna prava prijavom kroz Entra. Secret ključ zaobilazi RLS, pa se RBAC obavezno provjerava na serveru i ponovo u RPC-u. Taj ključ nikada ne smije biti u browseru ili varijabli s prefiksom `NEXT_PUBLIC_`.

## Environment

Lokalne vrijednosti idu u ignorisani `.env`/`.env.local`; produkcijske u Vercel Project → Settings → Environment Variables → Production. `.env.example` sadrži samo nazive i primjere. Postojeće Entra varijable već koriste tražene nazive.

| Varijabla                              | Gdje i zašto                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Postojeći URL projekta                                                                                                  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Javni klijent; bez admin privilegija                                                                                    |
| `SUPABASE_SECRET_KEY`                  | Serverski `sb_secret_...` ključ za privatni Data API/RPC; lokalno i u Vercel runtimeu                                   |
| `AUTH_SECRET`                          | Kriptografski slučajna tajna najmanje 32 znaka za Auth.js sesije                                                        |
| `AUTH_MICROSOFT_ENTRA_ID_ID`           | Application (client) ID aplikacije Penny Website                                                                        |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET`       | Client secret **value**, ne Secret ID                                                                                   |
| `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID`    | PennyPlus Directory (tenant) ID                                                                                         |
| `ENTRA_ACCESS_ROLE`                    | `Portal.Access`                                                                                                         |
| `AUTH_URL`                             | Lokalno `http://localhost:3000`; produkcija `https://www.pennyplus.com`                                                 |
| `SITE_URL`                             | Produkcijski origin prije builda: `https://www.pennyplus.com`                                                           |
| `SITE_INDEXABLE`                       | `true` za produkciju, `false` za staging                                                                                |
| `SUPABASE_ACCESS_TOKEN`                | Personal Access Token za Management API; samo administrativni računar/CI, nije potreban aplikaciji niti Vercel runtimeu |
| `INITIAL_SUPERADMIN_TENANT_ID`         | Samo za ručni seed, mora odgovarati Entra tenant konfiguraciji                                                          |
| `INITIAL_SUPERADMIN_OBJECT_ID`         | Samo za seed, Object ID konkretnog Entra korisnika                                                                      |

SUPABASE_SECRET_KEY i SUPABASE_ACCESS_TOKEN nisu međusobno zamjenjivi. Secret ključ pristupa podacima i postojećim funkcijama; Personal Access Token omogućava SQL DDL/migracije kroz Management API. Koristite scoped PAT s pristupom samo ovom projektu, pravom izvršavanja SQL-a (`database_write`) i ograničenim rokom. Nakon administrativnog rada može se opozvati bez prekida aplikacije.

Tajne se ne šalju u chat, ne stavljaju u Git i ne ispisuju u logove. Za AUTH_SECRET može se koristiti `npx auth secret`; provjerite koji ignorisani env fajl CLI popunjava. Razvoj i produkcija koriste odvojene tajne. Rotacija AUTH_SECRET prekida stare lokalne sesije; Entra i Supabase tajne rotiraju se kroz odgovarajuće postavke i redeploy.

## Microsoft Entra

Postojeća App Registration **Penny Website** treba ostati Single tenant. Dodajte tačne **Web** redirect URI-je:

```text
http://localhost:3000/api/auth/callback/microsoft-entra-id
https://www.pennyplus.com/api/auth/callback/microsoft-entra-id
```

Koristi se Authorization Code Flow s PKCE, state i nonce, bez implicit flowa. Issuer je `https://login.microsoftonline.com/{TENANT_ID}/v2.0`. Enabled app role `Portal.Access` mora biti dodijeljena odgovarajućem korisniku. Nema email fallbacka za identitet.

Traže se samo `openid profile email`; nema Graph poziva, `User.Read`, group dozvola ili refresh tokena. Provider je eksplicitna Auth.js OIDC konfiguracija s ID-jem `microsoft-entra-id`, čime se izbjegava podrazumijevani Graph poziv za fotografiju ugrađenog providera.

Auth.js provjerava OAuth/OIDC tok. `jose` dodatno provjerava RS256 potpis, tenant-specifični JWKS, issuer, audience, vremenske claimove te obavezne sub/nonce/tid/oid/Portal.Access. JWKS adresa dolazi iz konfiguracije. Stabilni interni identitet je tenant+oid; email i ime služe za prikaz.

Pregledan je instalirani Auth.js kod: callback `profile` je sirovi OIDC profil, a mapirani profil je `user`. Verificirani identitet prenosi se kroz `user.entraIdentity` u signIn/jwt. Testovi koriste stvarnu instaliranu `getUserAndAccount` funkciju da potvrde mapiranje.

## Migracije i inspekcija

Migracije `001_admin_rbac.sql` i `002_supabase_admin_rpc.sql` primijenjene su na postojeći Supabase projekt nakon izričitog odobrenja korisnika. Kreirano je šest admin tabela, uloge/dozvole, privatne pomoćne funkcije i serverski RPC. Primjena nije kreirala niti odobrila ljudskog korisnika.

Za buduće promjene prvo napravite backup, pregledajte SQL i postojeću šemu. Skripte koriste Personal Access Token preko Management API-ja, ne secret ključ aplikacije:

```sh
npm run db:plan
npm run db:inspect
npm run db:status
```

Plan ne otvara konekciju; inspect čita strukturu, a status primijenjene verzije i checksumove. DDL se primjenjuje samo eksplicitnom komandom, nakon odobrenja vlasnika:

```sh
npm run db:apply
```

`db:migrate` bez proslijeđene `--apply` zastavice prikazuje plan. `db:apply` ima zastavicu ugrađenu u npm skriptu, čime izbjegava probleme prosljeđivanja argumenata u PowerShellu. Nijedna migracija se ne pokreće pri buildu ili instalaciji.

Skripta koristi jednu transakciju, advisory lock i istoriju `penny_admin_migrations`. Iste migracije se preskaču, a izmjena primijenjenog SQL-a odbija. Checksum normalizuje LF/CRLF. Konflikt s postojećim nepovezanim tabelama izaziva rollback; ništa se ne briše ili prepisuje. Pripremite novu migraciju za promjene već primijenjene šeme.

Alternativa bez PAT-a: `npm run db:export` generiše `db/admin-migration.sql` bez tajni, koji ovlašteni administrator može pregledati i izvršiti kroz Supabase SQL Editor. Export ne mijenja udaljenu bazu. Isti transakcijski/checksum mehanizam važi i za taj SQL.

Provjera stvarne baze, bez upisa poslovnih podataka:

```sh
npm run check:admin:db
```

Provjerava šest tabela i RLS, početne uloge/dozvole, serverski RPC, odbijanje javnog pristupa i nemogućnost runtimea da uređuje/briše audit ili izvrši bootstrap. Koristi PAT za provjeru kataloga i oba API ključa za provjeru stvarnog Data API pristupa.

## Privatnost i transakcije

RLS je uključen na svim admin tabelama, a PUBLIC/anon/authenticated nemaju pristup. Serverska service_role ima eksplicitne grantove za potrebne operacije i EXECUTE nad RPC-om. Javne role ne mogu pozivati RPC. Pomoćne funkcije su u neizloženoj šemi `penny_admin`, koriste SECURITY INVOKER, prazan search_path i potpuno kvalifikovane nazive. Bootstrap nije dostupan service_role ni browseru.

RPC ne čita `auth.uid()` i ne vjeruje browseru za identitet. Server tenant+oid izvodi iz provjerene sesije. Svaka poslovna read operacija ponovo provjerava status i dozvolu u bazi. Sve mutacije koriste zajednički advisory lock, provjeru prava, upis promjene i audit u jednoj SQL transakciji. Greška audita rollbackuje promjenu.

Samopromjena statusa/uloga i izmjena vlastite uloge su blokirane. ADMIN ne može dodijeliti prava koja nema. Samo SUPER_ADMIN smije mijenjati SUPER_ADMIN dodjele/status njihovih nosilaca. Posljednji aktivni superadministrator je zaštićen i pri konkurentnim mutacijama. SUPER_ADMIN dozvole se ne uređuju kroz UI.

Runtime ima samo SELECT/INSERT nad auditom. Bilježe se login success/denied kada je moguće, logout, status, uloge, dozvole i bootstrap. Credentiali i tokeni se ne čuvaju. IP ostaje prazan jer nije definisan pouzdan proxy lanac; proizvoljni X-Forwarded-For se ne prihvata kao dokaz IP-a.

## Inicijalni superadministrator

Prvi Microsoft login nikada automatski ne dobija admin prava. Novi identitet je PENDING, bez uloga; ponovni login ne resetuje APPROVED/DISABLED status. Za inicijalni pristup postavite oba INITIAL_SUPERADMIN ID-a i, nakon odobrenja za konkretnog korisnika, ručno pokrenite:

```sh
npm run db:seed-superadmin:apply
```

Skripta validira GUID-ove i podudaranje tenanta te kroz Management API poziva privatni bootstrap. Operacija je idempotentna, odobrava konkretnog korisnika, dodjeljuje SUPER_ADMIN i bilježi audit. Ponovno izvođenje može ponovo odobriti deaktiviranog inicijalnog korisnika: tretirajte ga kao privilegovanu ručnu operaciju. Ne izvršava se automatski. Entra Portal.Access i validna prijava ostaju obavezni.

## UI i sesije

Rute: `/admin/login`, `/admin`, `/admin/korisnici`, `/admin/uloge`, `/admin/audit`, `/admin/pristup-na-cekanju`, `/admin/pristup-odbijen`. Panel je na bosanskom, responzivan i prati postojeću temu. Admin stranice su dinamičke, noindex/no-store i nisu u sitemapu.

PENDING identitet dobija samo ograničenu sesiju za čekanje, bez pristupa poslovnim podacima. DISABLED prijava se odbija, a stara sesija ne zaobilazi novu provjeru baze. APPROVED korisniku i dalje treba dozvola za svaku stranicu i radnju. Statistika traži users.read, aktivnosti audit.read. API `/api/admin/users` vraća 401 neprijavljenima i 403 nedovoljno ovlaštenima. Server Actions koriste Next.js Origin/Host provjeru, a Auth.js vlastiti CSRF/state tok.

Auth.js sesija je šifrovani JWT u HttpOnly cookieju, SameSite=Lax, Secure u produkciji. Apsolutni rok je najviše jedan sat ili raniji istek originalnog ID tokena. Obnova cookieja ne produžava taj rok. Browser ne dobija access/refresh/ID tokene ni spremljena RBAC prava. Logout briše lokalni cookie, bez odjave iz drugih Microsoft aplikacija.

Promjena Entra app role ne poništava trenutno već izdatu lokalnu sesiju. Interna deaktivacija blokira sljedeću serversku provjeru; samo Entra revokacija djeluje pri novom loginu, najkasnije nakon ograničenog isteka sesije. Kao kod stateless sesija, ukradena kopija cookieja može važiti do isteka ako račun nije interno deaktiviran. Već prikazani podaci mogu ostati u otvorenom tabu. Auth.js debug je isključen, a korisnici vide generičke poruke bez tajni.

## Testiranje i objava

```sh
npm run fix
npm run typecheck
npm run test:admin
npm run build
npm run check
```

Testovi izvršavaju stvarni migracijski SQL i RPC na izolovanom PostgreSQL-u (PGlite), pod service_role pravima. Pokrivaju statuse, dozvole, privilegije, samopovećanje prava, posljednjeg superadministratora, seed, audit rollback, idempotentne migracije/checksumove, token provjere i stvarni Auth.js HTTP session/logout. Ne stvaraju testne korisnike u produkciji i ne predstavljaju stvarnu Entra prijavu.

Na lokalno pokrenutom produkcijskom serveru `npm run check:admin:http` provjerava anonimne rute, 401 API, login HTML, noindex/no-store i sitemap. Podrazumijevani CHECK_BASE_URL je `http://127.0.0.1:32123`.

Za dijagnostiku konkretnog računa lokalno pokrenite `npm run diagnose:admin -- email@kompanija.ba` (ili direktno `node --import tsx scripts/diagnose-admin.mts email@kompanija.ba` ako PowerShell ne proslijedi argument). Ispisuju se samo status, uloge i rezultati read-only RPC provjera, bez tokena i ličnih podataka iz odgovora.

`npm run check:admin:session` provjerava renderovanje četiri zaštićene stranice s kratkotrajnom testnom sesijom inicijalnog korisnika. Cookie ostaje u memoriji, ne ispisuje se, a skripta dozvoljava samo loopback hostove. Podrazumijeva lokalni produkcijski server na portu 32123; za postojeći development server postavite `CHECK_BASE_URL=http://localhost:3000` i `CHECK_COOKIE_SECURE=false`. Ova provjera ne izvršava Entra prijavu niti mijenja bazu. Testni identitet mora već imati potrebne interne dozvole.

Privremeni mrežni prekidi i HTTP 502/503/504 pri čitanju mogu se automatski ponoviti najviše jednom. Mutacije i odbijene dozvole se ne ponavljaju. Neočekivani RPC neuspjeh u serverskom logu bilježi samo operaciju i validirani kod greške. Dugme za oporavak koristi Next.js `retry()` za stvarno ponovno dohvaćanje serverskog sadržaja.

Prije objave postavite runtime varijable u Vercelu, provjerite SITE_URL/AUTH_URL i Web redirect URI te izvršite build/redeploy. Preview treba zaseban odobreni callback ili isključenu prijavu. Stvarnim Entra računima provjerite APPROVED, PENDING, DISABLED, odsustvo Portal.Access i drugi tenant. Direktnim zahtjevima provjerite 403, promjene prava, audit i logout. Stvarna Microsoft prijava nije potvrđena automatizovanim lokalnim testovima.

Izvori: [Supabase API ključevi](https://supabase.com/docs/guides/getting-started/api-keys), [Management API](https://supabase.com/docs/reference/api/v1-run-a-query), [Personal Access Tokens](https://supabase.com/docs/guides/platform/personal-access-tokens), [Auth.js](https://authjs.dev/getting-started/installation).
