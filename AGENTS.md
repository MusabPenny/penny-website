<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Obavezno formatiranje i provjera nakon izmjena

- Na kraju svake izmjene projekta pokreni `npm run fix` iz korijena projekta, prije završetka zadatka.
- Komanda provjerava cijeli projekat: ESLint automatski popravlja podržane JS/TS fajlove, a Prettier formatira sve podržane izvorne i konfiguracijske fajlove.
- Otkloni preostale lint greške i upozorenja, pa ponovo pokreni `npm run fix` dok ne završi uspješno. Nemoj isključivati pravila samo da bi komanda prošla.
- Poštuj ignore konfiguraciju za zavisnosti, generisane fajlove, build izlaze, tajne i lokalno stanje alata. Sačuvaj Next.js blok iznad neizmijenjen.
