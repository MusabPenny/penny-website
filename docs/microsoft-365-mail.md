# Obavijesti o prijavama kroz Microsoft 365

`/admin/obavijesti` je dostupan korisnicima s `applications.manage`, bez pristupa marketinga. Admin unosi mailbox pošiljaoca, do 20 HR primalaca, potvrdu kandidatu i uključuje slanje. Nema unaprijed postavljenih primalaca i slanje je isključeno po defaultu. Ne šalje se retroaktivno postojećim kandidatima.

## Postavljanje

1. Primijeniti migraciju `005_recruitment_notifications.sql` kroz postojeći postupak odobravanja migracija. Ona dodaje postavke, red obavijesti i triggere. Postojeći oglasi ostaju neizmijenjeni, a nove objave i izmjene objavljenih oglasa traže rok prijave. Novi import starih oglasa kreira nacrte.
2. U Entra ID napraviti zasebnu aplikaciju za slanje, dodati Microsoft Graph **application** dozvolu `Mail.Send` i odobriti admin consent. Prijavna aplikacija i njene dozvole se ne mijenjaju.
3. Exchange administrator treba ograničiti aplikaciju na odabrani mailbox putem podržanog Exchange Application RBAC / application access postupka.
4. Na server dodati `M365_MAIL_TENANT_ID`, `M365_MAIL_CLIENT_ID`, `M365_MAIL_CLIENT_SECRET`. Tajna nije polje admin forme i ne ide u browser.
5. U panelu sačuvati pošiljaoca i HR adrese, pa uključiti slanje. Primaoci trebaju zasebnu dozvolu za pregled prijava.

Graph dokumentacija: https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0

## Pouzdanost i privatnost

Red se kreira u istoj transakciji kao prijava. Slanje ide nakon odgovora kandidatu (`after`); greška e-maila ne poništava prijavu. Dva odvojena zapisa omogućavaju ponovni pokušaj HR obavijesti bez ponavljanja kandidatove potvrde. HR poruka sadrži poveznicu na panel, bez CV-ja, odgovora ili imena kandidata. Potvrda kandidatu sadrži oznaku prijave.

Graph `202` znači da je zahtjev prihvaćen, ne da je poruka dostavljena. Nakon migracije 006 panel prikazuje sve obavijesti kroz serversku paginaciju i filtere. Worker ponavlja definitivne neuspjehe uz odgodu, najviše pet pokušaja. Mrežni prekid tokom slanja i serverski 5xx imaju nepoznat ishod i ne ponavljaju se automatski. Provjerite Sent Items / Exchange message trace prije daljnjeg postupka. Obrada starija od 15 minuta označava se za provjeru. Brisanje prijave briše pripadajuće zapise obavijesti. Raspored workera i sigurnost opisani su u [operational-cms.md](operational-cms.md); Microsoft 365 nije aktiviran.

Dok migracija nije primijenjena ili slanje nije uključeno, prijave rade kao ranije. Konfiguracijska provjera potvrđuje prisustvo varijabli; stvarnu dozvolu i dostavu treba provjeriti kontrolisanom probnom prijavom nakon postavljanja. Tokom razvoja nije poslano nijedno stvarno e-mail obavještenje.

## Datumi i sadržaj

CMS koristi native `datetime-local` picker. Uneseno vrijeme uvijek znači Europe/Sarajevo, a server ga pretvara u UTC za bazu. Pri promjeni sata nepostojeći i dvostruki sat se odbijaju jasnom porukom. Upozorenje na listi oglasa izdvaja objavljene oglase bez roka; HR mora pregledati originalne priloge i odlučiti o roku/arhivi. Sistem ne izmišlja rokove.

Početna prikazuje do dvije aktivne akcije i dva kataloga odmah ispod uvoda, te tri novosti pri dnu. Prazna ponuda jasno se označava; nema izmišljenih akcija. Sadržaj koristi postojeći CMS cache i osvježavanje od 60 sekundi.
