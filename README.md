# PennyPlus - druga faza

Microsoft Entra prijava i interni `/admin` panel: [konfiguracija, migracije, RBAC i objava](docs/admin-setup.md). Privatne tabele se ne kreiraju pri buildu; produkcijska migracija i seed zahtijevaju izričito odobrenje.

Prezentacijska aplikacija u Next.js 16 i Reactu 19. Kategorije vode direktno na PennyShop; nema lokalnih artikala, cijena ili korpe.

## Pokretanje

```sh
npm ci
npm run dev
```

Otvorite http://localhost:3000.

## Formatiranje nakon svake izmjene

```sh
npm run fix
```

Ova komanda pokreće ESLint automatske popravke i zatim Prettier formatiranje kroz cijeli projekat. Prettier je formatter; dodatni paket za formatiranje nije potreban. Zavisnosti, build izlazi, generisani fajlovi i lokalne tajne se preskaču. Pravilo da se komanda pokreće na kraju svake izmjene upisano je u `AGENTS.md`.

- `npm run lint` - provjera ESLinta bez izmjene fajlova.
- `npm run lint:fix` - samo automatske lint popravke.
- `npm run format` - samo formatiranje.
- `npm run format:check` - provjera formatiranja bez izmjene fajlova.

Workspace postavke za VS Code preporučuju ESLint i Prettier ekstenzije te uključuju formatiranje i ESLint popravke pri ručnom snimanju fajla. Potrebno je instalirati preporučene ekstenzije u editoru; CLI komande rade nezavisno od njih.

## Provjere

```sh
npm run build
npm run check
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 32123
```

Dok je server pokrenut na portu 32123, izvršite `node scripts/check-site.mjs --http`. Za drugi port postavite `CHECK_BASE_URL`.

Provjere obuhvataju 26 izgrađenih stranica, jedinstvene naslove/opise, canonical i OG metapodatke, interne linkove, JSON-LD, sitemap, preview noindex, slike i favicon. HTTP provjera obuhvata sve stranice, nepoznate adrese i slugove sa stvarnim 404 statusom, trajno preusmjerenje i optimizaciju logotipa.

## Supabase konekcija

U lokalni `.env` i postavke okruženja hostinga dodajte `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` iz postavki Supabase projekta. `.env.example` sadrži samo primjere, a `.env` je isključen iz Gita.

U Server Components, Server Actions ili Route Handlers koristite `import { createDatabaseClient } from "@/lib/supabase/server"`, zatim `const supabase = createDatabaseClient()`. Klijent se kreira po pozivu, bez trajnog čuvanja ili dijeljenja korisničkih sesija. Serverski ulaz ima `server-only` zaštitu. Nedostajuća ili neispravna konfiguracija daje jasnu grešku pri kreiranju klijenta.

```sh
npm run check:db
```

Komanda učitava lokalne varijable istim mehanizmom kao Next.js i provjerava Data API kroz stvarni Supabase SDK. Upit bez redova prema namjenskom probnom nazivu potvrđuje prihvaćen ključ i odgovor PostgREST-a; očekivani odgovor za nepostojeću tabelu je `PGRST205`. Ne čita poslovne podatke, ne kreira tabele i ne mijenja bazu. Ne provjerava dozvole nad budućim tabelama.

Ovo je veza kroz Supabase Data API, s publishable ključem i pravima anonimne uloge; RLS pravila baze određuju pristup podacima. Publishable ključ je po namjeni javan, ali secret/service_role ključ nikada ne smije biti u `NEXT_PUBLIC_` varijabli. Prijava korisnika i upravljanje sesijama nisu dio ove konekcije. Javne stranice još koriste postojeće lokalne podatke; povezivanje sadržaja s konkretnim tabelama slijedi nakon definisanja strukture baze.

Dokumentacija: [Supabase klijent](https://supabase.com/docs/reference/javascript/initializing) i [API ključevi](https://supabase.com/docs/guides/getting-started/api-keys).

## Stranice i sadržaj

- Početna i imenik svih 35 PennyShop kategorija s pretragom i filterima.
- Usluge i devet zasebnih stranica usluga.
- Lokacije: četiri PennyPlus centra, šest marketa, Rezni centar i dvije Toys&Fun igraonice.
- O nama, kontakt, karijera, poslovni kupci, novosti i CMS za javni sadržaj.
- Mobilni meni, modal pretrage (prečica `/`), e-mail i telefonski kontakti te Google Maps linkovi.

`lib/shop-categories.json` čuva PennyShop linkove. `lib/content.ts`, `lib/pages.ts` i `lib/team-data.json` su početni snimak. CMS sadržaj se čita iz baze; lokacije i tim nakon migracija 006/007 uređuju se kroz `/admin/imenik`. Upute: [operativni CMS](docs/operational-cms.md).

Izvori: https://www.pennyplus.com/, https://www.pennyplus.com/usluge, https://www.pennyplus.com/prodajnicentri, https://www.pennyplus.com/novosti i https://pennyshop.ba/shop/penny-plus.

## SEO

Sve javne stranice unaprijed se generišu kao HTML. Imenik kategorija, usluge i svi kontakti lokacija dostupni su bez JavaScripta. Svaka stranica ima vlastiti naslov, opis, canonical, Open Graph/Twitter metapodatke i jednu H1 oznaku. JSON-LD Organization, WebSite, WebPage, BreadcrumbList, Service, ItemList i LocalBusiness/HardwareStore/GroceryStore odgovara vidljivom sadržaju. Nema Product oznaka, izmišljenih ocjena, zaliha ili koordinata.

`/sitemap.xml` obuhvata samo javne stranice ovog sajta. `/robots.txt` upućuje na sitemap. Nepostojeće stranice i nepoznati slugovi vraćaju 404. `/onama` i `/prodajnicentri` imaju trajna preusmjerenja, a stara vrtna kategorija vodi na PennyShop.

Konfiguracija je u `.env.example`. `SITE_URL` je produkcijska domena, podrazumijevano `https://www.pennyplus.com`. Za staging postavite `SITE_INDEXABLE=false` **prije izgradnje**: stranice dobijaju noindex, a sitemap se prazni. Vercel preview i development automatski imaju noindex. Crawling nije blokiran da bi pretraživač mogao pročitati noindex.

Poslije produkcijske objave dodajte sitemap u Google Search Console i provjerite URL Inspection i Rich Results Test. Objava i povezivanje Search Console nisu izvršeni u ovoj lokalnoj fazi. Pri zamjeni postojećeg sajta treba zadržati ili migrirati postojeće radne pozicije i obrazac za prijavu: karijera za sada otvara postojeće PennyPlus stranice. Potpuna migracija starih adresa zahtijeva njihov popis iz postojećeg sajta ili Search Console.

## Svijetla i tamna tema

Svijetla tema je zadana bez obzira na sistemsku postavku. Dugme sunce/mjesec u navigaciji mijenja temu na svim stranicama, pamti izbor u lokalnom spremištu preglednika i sinhronizuje ga između tabova. Početna skripta u zaglavlju primjenjuje sačuvani izbor prije prikaza stranice, bez naknadnog skakanja sadržaja. Ako spremište nije dostupno, promjena teme i dalje radi u otvorenoj stranici. Boje su definisane CSS varijablama; fotografije i logotip se ne mijenjaju.

## Miran prikaz sadržaja

Tekst, fotografije, kartice i sekcije prikazuju se odmah na svom mjestu, bez ulaznih animacija, skaliranja ili kašnjenja pri skrolanju. Nema JavaScript kontrolera animacija ni posmatranja skrola. Zadržani su diskretni hover efekti na interaktivnim elementima i podrška za `prefers-reduced-motion`. Sadržaj je dostupan u početnom HTML-u i bez JavaScripta.

## Logo i fotografije

Logo koristi korisnikov `public/penny.png`. `node scripts/prepare-icon.mjs` iz njega generiše višerezolucijski `app/favicon.ico`, identičan `public/penny.ico`, Apple touch ikonu i Open Graph thumbnail.

Fotografije objekata preuzete su s PennyPlus/PennyShop stranica. Fotografije enterijera, vrta, alata i gradnje s Unsplasha ilustriraju kategorije i ne predstavljaju konkretne PennyPlus artikle ili projekte. Fotografija uz izbor lokacije prikazuje mrežu centara, a ne svaku izabranu poslovnicu. Izvori su u `scripts/prepare-assets.mjs`.

`node scripts/prepare-assets.mjs` osvježava kategorije i fotografije. Skripte koriste `sharp`, koji trenutno dolazi uz Next.js. Administracija koristi Microsoft Entra ID i privatne PostgreSQL tabele, opisane u `docs/admin-setup.md`. E-mail akcije otvaraju program za e-poštu, a kupovina se nastavlja na PennyShopu.

# Novi CMS, marketing i karijera

Oglasi, prijave za posao i praksu, novosti, katalozi, akcije, dokumenti i partneri koriste Supabase bazu i Storage. Admin upravlja poslovima i privatnim prijavama; MARKETING upravlja javnim sadržajem. Upute i provjere su u [docs/content-and-recruitment.md](docs/content-and-recruitment.md). Novi javni ulazi: `/karijera`, `/akcije`, `/katalozi`, `/dokumenti`, `/partneri` i `/newsletter`.

# Naš tim

Stranica `/nas-tim` koristi lokalni snimak podataka iz `lib/team-data.json`, preuzet sa `https://www.pennyplus.com/nastim`. Sačuvana su imena, funkcije i kontakti svih 70 osoba u 17 službi. Fotografije su WebP objekti u javnom Supabase Storage bucketu `team-photos`, bez lokalnih kopija u projektu; originalni izvori su evidentirani u `scripts/team-assets.json`.

Prikaz se generiše tokom builda, bez zahtjeva prema izvornom sajtu. Fotografije imaju hash sadržaja u imenu i keširaju se godinu dana; promijenjena fotografija dobija novo ime. Next Image dodatno kešira optimizovane veličine. Pretraga i filter rade lokalno u pregledniku.

`npm run assets:team` provjerava postojeći snimak sa Storage URL-ovima bez mrežnih zahtjeva. Za namjerno ponovno preuzimanje koristite `npm run assets:team:refresh`, zatim `npm run fix` i novi build/deploy. Ažuriranje izvora nije automatski dio builda. `npm run test:team` nakon builda provjerava podatke, fotografije, pretragu i kompletan HTML za SEO.

Fotografije se pri osvježavanju šalju direktno u Storage i provjeravaju javnim preuzimanjem prije upisa URL-ova. Potrebni su NEXT_PUBLIC_SUPABASE_URL i serverski SUPABASE_SECRET_KEY. Bucket dozvoljava WebP; javno je samo čitanje slika, dok upload koristi serverski ključ. Jednokratno premještanje starih lokalnih slika: node scripts/migrate-team-storage.mjs (lokalne kopije briše tek nakon provjere svih prenosa).
