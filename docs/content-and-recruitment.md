# Objave, marketing i prijave kandidata

## Šta je uključeno

Javni sadržaj se čuva u `site_entries` u Supabase bazi. Prijave za posao i stručnu praksu idu u privatnu tabelu `candidate_applications`. Nema preusmjeravanja obrazaca na stari sajt, slanja kandidata e-mailom ili lokalnog čuvanja priloga.

| Uloga               | Dozvole dodane ovom izmjenom                                             |
| ------------------- | ------------------------------------------------------------------------ |
| SUPER_ADMIN i ADMIN | `jobs.manage`, `applications.manage`, `content.manage`, `dashboard.read` |
| MARKETING           | `content.manage`, `dashboard.read`                                       |

Marketing nema pristup kandidatima, njihovim prilozima, oglasima za posao ili upravljanju internim korisnicima. Uloga se dodjeljuje postojećim, odobrenim poslovnim računima kroz `/admin/korisnici`; nije automatski dodijeljena nijednoj osobi. Microsoft Entra `Portal.Access` i dalje je obavezan.

## Rad u panelu

- `/admin/oglasi`: novi oglas, uređivanje teksta, lokacija, prilog, rok prijave, nacrt/objava/arhiva.
- `/admin/prijave`: prijave za posao i praksu, filteri po vrsti i statusu, po 25 rezultata. Otvaranje prijave prikazuje odgovore i privatne priloge. Statusi: nova, u obradi, uži izbor, prihvaćena, odbijena. Interne bilješke nisu javne. Brisanje traži checkbox potvrdu i uklanja priloge prije reda prijave.
- `/admin/sadrzaj`: novosti, katalozi, akcije, dokumenti i partneri. Katalozi/dokumenti koriste PDF; ostali sadržaj može imati fotografiju ili prilog. Tekst je običan tekst, s odlomcima odvojenim praznim redom; HTML se ne izvršava.
- `/admin/newsletter`: posljednjih 500 prijava i odjave. Slanje kampanja i potvrda e-mailom nije povezano s vanjskim e-mail servisom. Svaka buduća kampanja mora poštovati odjave i sadržavati mogućnost odjave. Korisnik nakon prijave dobija svoju poveznicu za odjavu.

Datumi se unose datetime pickerom u vremenskoj zoni Europe/Sarajevo, a u bazu se spremaju kao UTC. Nacrt, arhivirana objava, buduća objava i sadržaj s isteklim rokom nisu u javnom upitu. ISR osvježavanje je 60 sekundi; promjena iz panela odmah invalidira tag i javni layout. Kod prijave se otvorenost oglasa ponovo provjerava u bazi, nezavisno od cachea stranice. Novi slugovi dostupni su bez novog builda. Verzija zapisa štiti od prepisivanja tuđih paralelnih izmjena.

Microsoft 365 potvrde kandidatima, HR primaoci i red obavijesti opisani su u [microsoft-365-mail.md](microsoft-365-mail.md). Postavke su na `/admin/obavijesti`; zahtijevaju migraciju 005 i posebnu mail aplikaciju. Slanje je početno isključeno.

## Obrasci i prilozi

`lib/application-fields.ts` definira sekcije i serversku validaciju obrazaca prema starim obrascima:

- Posao: lični podaci, izbor oglasa ili otvorena prijava, vozačka dozvola, obrazovanje, radno iskustvo, MS Office, engleski, ranije konkurisanje, motivacija i CV.
- Praksa: lični podaci, preporuka, izvor informacije, roditelj/staratelj, škola, zanimanje, razred, ocjene, izostanci, motivacija, vrline, poslovnica i tri opcionalna priloga.

PDF, DOC i DOCX prilozi kandidata imaju limit od 3 MB po fajlu; javni sadržaj limit 10 MB. Datoteke se šalju direktno u Storage putem potpisanog URL-a, da upload ne zavisi od veličine serverless HTTP zahtjeva. Potpisani receipt važi 20 minuta i veže upload za admina/tip sadržaja ili za konkretne odgovore kandidata. Server ponovo provjerava veličinu i potpis formata. To nije antivirusni pregled; priloge treba otvarati samo u zaštićenom pregledniku/uredskom okruženju.

Bucketi:

- `site-assets`: javni dokumenti, fotografije objava i oglasa, logotipi partnera.
- `candidate-files`: privatni prilozi kandidata; pristup samo kroz provjerenu admin rutu. Nema javnih URL-ova niti browser grantova.
- `upload-staging`: privremeni privatni upload marketinga/admina, prije serverske validacije i kopiranja u javni bucket.

Autorizacija se provjerava na serveru i ponovo u SQL RPC-u. Javni/anonimni Supabase klijent nema SELECT nad kandidatima niti EXECUTE nad CMS funkcijama. Serverski ključ se nikada ne šalje pregledniku. Admin otvaranje prijave, preuzimanje, promjene i brisanje ostavljaju audit bez sadržaja prijave. Broj pokušaja javnih obrazaca ograničen je na pet po adresi e-pošte u satu, uz HMAC ključ u posebnoj tabeli i honeypot.

Nedovršen upload može ostaviti privatan fajl bez prijave. `scripts/cleanup-content-uploads.mts` prikazuje takve fajlove starije od 24 sata; brisanje zahtijeva `--apply`. Skripta prvo provjerava sve reference u bazi. Ne briše prijave kandidata po starosti. Rok čuvanja kandidata nije pretpostavljen niti automatski uveden; ovlaštene osobe vode brisanje prema poslovnom postupku i zahtjevima kandidata.

## Preneseni sadržaj

Preneseno 29.10.2026: 5 javnih dokumenata, 7 novosti, 7 oglasa i 32 partnera. Fajlovi su byte-provjereni poslije prenosa u Storage; fotografije su prethodno konvertovane u WebP. Izvori su u `scripts/content-import-manifest.json`, a mapiranje poznatih starih URL-ova u `lib/legacy-redirects.json` i `next.config.ts`. Ponovno pokretanje importa ne prepisuje postojeće CMS zapise. Slike originalnih oglasa sačuvane su kao prilozi; gdje izvor nije imao tekst, tekst oglasa ostaje na originalnom posteru.

Na starim stranicama kataloga i akcija u vrijeme prenosa nije bilo objavljenih stavki. Nisu dodane izmišljene ili stare ponude kao aktivne. Marketing objavljuje nove ponude iz panela.

Dodane su usluge zamjene robe, garancije/servisa, Club/mClub kartica, rezanja granita i mjenjačnice. Trenutne operativne uslove potvrđuje poslovnica; ne prikazuje se historijska kursna lista kao važeća. Nije kopiran zastarjeli cookie banner; javna verzija nema marketinško praćenje.

## Postavljanje i provjera

Migracije `003_content_recruitment.sql` i `004_newsletter.sql` primijenjene su na postojeći projekt. Runtime koristi postojeće Supabase varijable i `AUTH_SECRET`. Na novom okruženju:

```sh
npm run db:apply
npm run storage:setup
npm run content:import
```

Import čita stari sajt; sačuvajte izvor ili manifest prije zamjene domene. Nije dio builda. Objavljeni sadržaj zahtijeva konfiguraciju baze tokom builda. Lokalni produkcijski server traži eksplicitni `AUTH_URL=http://localhost:32124`; nemojte radi lokalnog testiranja oslabiti provjeru hosta.

```sh
npm run fix
npm run typecheck
npm run test:admin
npm run test:cms
npm run build
npm run check
npm run test:team
```

`CHECK_BASE_URL=http://localhost:32124 npm run check:admin:session` radi read-only provjeru svih admin stranica s kratkom testnom sesijom samo prema loopback hostu; ne testira stvarnu Microsoft prijavu.

`node --import tsx scripts/check-cms-http.mts --write-test` je eksplicitni integracijski test lokalnog produkcijskog servera. Koristi sintetičke `.invalid` kandidate, testira oba obrasca, potpisani upload, upis u stvarnu bazu, zaštićeno preuzimanje, obradu prijave, CMS nacrt, objavu nove vijesti bez rebuilda i arhivu. Na kraju briše samo svoje probne redove i fajlove; audit ostaje. Ne šalje e-mail poruke. Ne pokretati slučajno protiv tuđeg sistema.

Izmjene aplikacije nisu automatski deployane. Nakon postavljanja provjerite stvarnu Microsoft prijavu i dodijelite MARKETING ulogu imenovanim osobama kroz postojeći panel.
