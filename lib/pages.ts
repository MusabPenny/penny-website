import { locations, normalizeSearch, services } from "./content";
import { extraServices } from "./extra-services";

const serviceDetails = [
  {
    slug: "dostava",
    image: "store",
    heading: "Dostava kupljene robe u dogovoru s našim timom",
    description:
      "Saznajte kako dogovoriti dostavu kupljene robe iz PennyPlusa. Kontaktirajte prodajni tim za područje dostave, termin i cijenu.",
    paragraphs: [
      "Kupovina materijala ili opreme često traži i plan prevoza. PennyPlus pruža uslugu dostave kupljene robe, a prodajni tim je vaša kontakt tačka za dogovor i informacije.",
      "Prije kupovine provjerite mogućnost isporuke na svoju adresu, trošak i raspoloživ termin. U upitu navedite šta planirate kupiti, okvirnu količinu i adresu kako bi vam tim mogao dati konkretnije informacije.",
    ],
    steps: [
      "Navedite robu i okvirnu količinu koju kupujete.",
      "Pošaljite adresu i podatke važne za pristup i istovar.",
      "S prodajnim timom potvrdite mogućnost dostave, cijenu i termin.",
    ],
    related: ["gradevinski-materijal", "uredski-i-kucanski-namjestaj"],
  },
  {
    slug: "toniranje-boja",
    image: "interior",
    heading: "Pronađite nijansu za svoj zid ili fasadu",
    description:
      "Kompjutersko miješanje i toniranje boja u PennyPlus centrima. Informišite se o odabiru nijanse, odgovarajućoj bazi i količini boje.",
    paragraphs: [
      "Boja mijenja osjećaj prostora. Uz kompjutersko miješanje i toniranje u PennyPlus prodajnim centrima možete odabrati nijansu za zidove ili fasadu uz podršku osoblja.",
      "Ponesite oznaku željene nijanse ako je imate i navedite površinu koju uređujete. Timu recite da li bojite unutrašnji zid ili vanjsku fasadu kako biste provjerili odgovarajuću bazu i potrebnu količinu.",
      "Fotografija na ekranu može poslužiti kao inspiracija, ali konačan odabir napravite uz fizičku ton kartu. Za naknadnu kupovinu sačuvajte oznaku nijanse i podatke o korištenoj boji.",
    ],
    steps: [
      "Odaberite nijansu na ton karti uz pomoć osoblja.",
      "Provjerite bazu, namjenu i količinu za svoju površinu.",
      "Sačuvajte podatke o nijansi za buduće radove.",
    ],
    related: ["boje-i-lakovi", "alati-i-masine"],
  },
  {
    slug: "rezanje-i-kantiranje",
    image: "tools",
    heading: "Pločasti materijali pripremljeni za vaš projekat",
    description:
      "Rezanje i kantiranje pločastih materijala u PennyPlus Reznom centru u Vogošći. Pripremite dimenzije, količine i zahtjeve za obradu.",
    paragraphs: [
      "PennyPlus Rezni centar u Vogošći pruža usluge rezanja i kantiranja pločastih materijala. Obratite se timu kada pripremate dijelove namještaja ili drugi projekat koji traži obradu po mjeri.",
      "Za upit pripremite listu dijelova s dužinom, širinom, količinom i odabranim materijalom. Jasno označite rubove koje treba kantirati i, kada je važno, smjer dekora.",
      "Prije početka obrade s timom potvrdite sve dimenzije, materijal, obradu rubova, cijenu i rok. Tako ćete lakše uskladiti pripremu ploča s ostatkom svog projekta.",
    ],
    steps: [
      "Pripremite dimenzije i količine svakog dijela.",
      "Označite materijal, dekor i rubove za kantiranje.",
      "Pošaljite upit Reznom centru i potvrdite detalje obrade.",
    ],
    related: ["plocasti-materijal", "bravarski-materijal-i-okovi"],
  },
  {
    slug: "placanje-na-rate",
    image: "kitchen",
    heading: "Planirajte kupovinu uz provjerene uslove plaćanja",
    description:
      "Informacije o plaćanju na rate u PennyPlusu. Prije kupovine provjerite podržane kartice, broj rata i minimalan iznos transakcije.",
    paragraphs: [
      "Za veće planove korisno je unaprijed provjeriti dostupne mogućnosti plaćanja. U PennyPlus prodajnim centrima možete se informisati o kupovini na rate putem podržanih bankovnih kartica.",
      "Broj rata, minimalni iznos i dostupnost ove opcije zavise od banke i kartice. Prije kupovine kontaktirajte centar ili info telefon i navedite koju karticu koristite.",
      "Objavljeni uslovi navode Raiffeisen MasterCard Shopping i UniCredit kreditne kartice do 12 rata, te Intesa Sanpaolo Visa Inspire/Platinum i American Express Green/Gold do 6 rata, uz minimalnu transakciju od 100 KM. Dostupnost za vašu karticu i trenutno važeće uslove obavezno potvrdite s centrom i bankom prije kupovine.",
      "Uslove banke i prodajnog mjesta provjerite prije potvrde kupovine. Za online kupovinu provjerite načine plaćanja koji su prikazani na PennyShopu.",
    ],
    steps: [
      "Pripremite naziv banke i vrstu kartice, bez slanja broja kartice.",
      "Provjerite dostupnost rata i uslove za planirani iznos.",
      "Prije kupovine potvrdite način plaćanja u centru ili na PennyShopu.",
    ],
    related: ["kucanski-aparati-i-bijela-tehnika", "sanitarna-oprema"],
  },
];

export const servicePages = [
  ...services.map((service, index) => ({
    ...service,
    ...serviceDetails[index],
    href: service.href === "#centri" ? "/prodajni-centri" : service.href,
  })),
  ...extraServices,
];

export function locationSlug(location: (typeof locations)[number]) {
  const prefix =
    location.type === "Toys&Fun igraonice"
      ? "toys-fun-"
      : location.type === "Penny marketi"
        ? "market-"
        : location.type === "Rezni centar"
          ? ""
          : "pennyplus-";
  return (
    prefix +
    normalizeSearch(location.name)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

export const locationPages = locations.map((location) => ({
  ...location,
  slug: locationSlug(location),
  title:
    location.type === "Rezni centar"
      ? "Rezni centar Vogošća"
      : `${location.type === "Toys&Fun igraonice" ? "Toys&Fun" : location.type === "Penny marketi" ? "Penny market" : "PennyPlus"} ${location.name}`,
}));

export const staticRoutes = [
  "/akcije",
  "/katalozi",
  "/dokumenti",
  "/partneri",
  "/privatnost",
  "/newsletter",
  "/karijera/praksa",
  "/",
  "/kategorije",
  "/usluge",
  "/prodajni-centri",
  "/o-nama",
  "/nas-tim",
  "/kontakt",
  "/karijera",
  "/poslovni-kupci",
  "/novosti",
];
export const publicRoutes = [
  ...staticRoutes,
  ...servicePages.map((s) => `/usluge/${s.slug}`),
  ...locationPages.map((l) => `/prodajni-centri/${l.slug}`),
];
