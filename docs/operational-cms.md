# Operativni CMS i optimizacije

## Migracije

`006_operational_cms.sql` dodaje serverske upite za sadržaj i newsletter, historiju slugova, imenik i paginirani red obavijesti. `007_directory_seed.sql` prenosi postojećih 13 lokacija i 70 osoba, bez prepisivanja naknadnih izmjena. SQL je provjeren u izolovanom PostgreSQL testu, uključujući ponovljenu primjenu migracijskog runnera. Primjena na postojeću bazu prolazi postojeći postupak odobravanja vlasnika; stare migracije nisu mijenjane.

`scripts/generate-directory-seed.mts` je priprema migracije 007 iz lokalnog snimka; ne pokretati nakon primjene migracije jer su checksumovi nepromjenjivi. Javni imenik do migracije koristi prethodni snimak, nakon nje čita podatke iz baze. Administrativni unos nije vezan za izvorni sajt.

HR je potvrdio da je svih sedam prenesenih oglasa otvoreno. Oglasi ostaju objavljeni; rokove će unijeti HR kroz postojeći datetime picker. Ova izmjena ne izmišlja rokove i ne arhivira oglase.

## Lokacije i tim

`/admin/imenik` zahtijeva `directory.manage`, dodijeljen ADMIN i SUPER_ADMIN ulogama. Marketing nema tu dozvolu. Omogućeni su novi zapisi, izmjene, redoslijed i skrivanje sa javne stranice. Postojeći identifikatori i URL-ovi se ne mijenjaju. Za člana tima uređuju se funkcija, služba, kontakti i fotografija; fotografija se šalje u Storage (JPG/PNG/WebP, do 3 MB). Pri promjeni naziva postojeće službe naziv se usklađuje za sve njene članove. Sakrivanje nije fizičko brisanje podataka.

Promjene invalidiraju tag `site-directory` i javni layout. Nova lokacija dobija stranicu bez rebuilda. Sitemap koristi objavljene lokacije. Strukturirani podaci više ne prikazuju hardkodirane sate koji bi mogli proturječiti izmijenjenom radnom vremenu.

## Upiti i prikaz

Admin sadržaj: 10 rezultata po stranici, pretraga više riječi i statusa u bazi. Editor dohvaća jedan zapis; liste ne prenose kompletan tekst objave. Newsletter: 15 rezultata, pretraga cijele baze umjesto posljednjih 500 redova. Parametri su u URL-u, pa se filteri i stranice mogu podijeliti i vratiti kroz browser.

Detalj javne objave dohvaća jedan zapis po slugu. Početna ima odvojene ograničene upite za dvije akcije, dva kataloga i tri novosti. Sitemap i liste mogu dohvatiti sve javne sažetke kroz batch upite. Promjena sluga pamti prethodnu adresu; stara adresa vodi na trenutnu, a rezervisanu adresu ne može preuzeti druga objava.

Javni header/footer su u `app/(public)/layout.tsx`; admin ih više ne renderuje i ne skriva CSS-om. Javne adrese ostaju iste. Greška ponuda, novosti ili lokacija ima vlastiti fallback na početnoj; ostale javne stranice imaju zajedničku error stranicu.

## Worker obavijesti (slanje ostaje isključeno)

`GET /api/internal/mail-worker` zahtijeva `Authorization: Bearer <CRON_SECRET>`. Planer hostinga može ga pozivati svakih pet minuta; raspored i tajnu postaviti u odobrenom okruženju kada se bude aktivirao Microsoft 365. Ovom izmjenom nije postavljen udaljeni raspored, nije aktiviran M365 i nije poslan e-mail. Ako je slanje isključeno, worker odmah vraća `paused: true`.

Jedan poziv obrađuje do pet dospjelih obavijesti. Definitivni neuspjesi ponavljaju se uz rastuću odgodu, najviše pet pokušaja. Atomska provjera statusa i broja pokušaja štiti od duplog preuzimanja. Ishod `uncertain` se ne ponavlja; obrada starija od 15 minuta postaje `uncertain` radi ručne provjere. Graph timeout i 5xx ne tretiraju se kao siguran neuspjeh. Admin može pregledati sve stranice reda, filtrirati status i pokrenuti obradu dospjelih stavki. Ne postoji ograničenje na posljednjih 50 poruka.

## Provjera

`npm run fix`, `npm run typecheck`, `npm run test:admin`, `npm run test:cms`, `npm run build`, `npm run check`, `npm run test:team`. HTTP provjera uključuje 401 zaštitu workera. Nakon odobrene primjene migracija provjeriti stvarni `/admin/imenik`, editor jednog zapisa, pretragu starijih pretplatnika i `paused` rezultat workera. Testovi ne šalju stvarne e-mailove.
