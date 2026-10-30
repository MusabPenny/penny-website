import rawCategories from "./shop-categories.json";

export const shopUrl = "https://pennyshop.ba/shop/penny-plus";
export const groups = [
  "Sve kategorije",
  "Dom i uređenje",
  "Gradnja i alati",
  "Vrt",
  "Svakodnevica",
] as const;
export type CategoryGroup = (typeof groups)[number];

const groupSlugs: Record<string, CategoryGroup> = {
  "vrtni-program": "Vrt",
  "penny-sport": "Svakodnevica",
  "alati-i-masine": "Gradnja i alati",
  "gradevinski-materijal": "Gradnja i alati",
  "bravarski-materijal-i-okovi": "Gradnja i alati",
  "vijcana-oprema": "Gradnja i alati",
  "suha-gradnja": "Gradnja i alati",
  metalurgija: "Gradnja i alati",
  "oprema-za-pp-zastitu": "Gradnja i alati",
  "plocasti-materijal": "Gradnja i alati",
  prehrana: "Svakodnevica",
  higijena: "Svakodnevica",
  "oprema-i-igracke-za-djecu": "Svakodnevica",
  "skolski-i-kancelarijski-pribor": "Svakodnevica",
  "oprema-i-hrana-za-kucne-ljubimce": "Svakodnevica",
  "auto-dijelovi": "Svakodnevica",
  "auto-kozmetika": "Svakodnevica",
  "oprema-za-frizere": "Svakodnevica",
  "oprema-za-bankarstvo-i-trgovine": "Svakodnevica",
  ugostiteljstvo: "Svakodnevica",
};

const featured: Record<
  string,
  { title: string; description: string; image: string; order: number }
> = {
  "uredski-i-kucanski-namjestaj": {
    title: "Dom i namještaj",
    description: "Vaš prostor. Vaš karakter.",
    image: "interior",
    order: 0,
  },
  "sanitarna-oprema": {
    title: "Kupatilo i sanitarije",
    description: "Mali rituali, velika udobnost.",
    image: "bathroom",
    order: 1,
  },
  "vrtni-program": {
    title: "Vrt i vanjski prostor",
    description: "Više života na otvorenom.",
    image: "garden",
    order: 2,
  },
  "alati-i-masine": {
    title: "Alati i mašine",
    description: "Za sve što ste zamislili.",
    image: "tools",
    order: 3,
  },
  "kucanski-aparati-i-bijela-tehnika": {
    title: "Aparati i bijela tehnika",
    description: "Jednostavnija svakodnevica.",
    image: "kitchen",
    order: 4,
  },
  "gradevinski-materijal": {
    title: "Gradnja i renoviranje",
    description: "Dobre ideje počinju od temelja.",
    image: "construction",
    order: 5,
  },
};

const decode = (text: string) =>
  text
    .replace(/&scaron;/g, "š")
    .replace(/&Scaron;/g, "Š")
    .replace(/&amp;/g, "&");
export const categories = rawCategories
  .filter((c) => !["novo", "kategorije"].includes(c.href.split("/").at(-1)!))
  .map((c) => {
    const slug = c.href.split("/").at(-1)!;
    return {
      ...c,
      name: decode(c.name),
      slug,
      group: groupSlugs[slug] ?? "Dom i uređenje",
      feature: featured[slug],
    };
  });

export const normalizeSearch = (value: string) =>
  value
    .toLocaleLowerCase("bs")
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const services = [
  {
    title: "Dostava na vašu adresu",
    summary: "Od našeg centra do vašeg doma.",
    icon: "truck",
    text: "Za organizaciju dostave kupljene robe obratite se našem prodajnom timu. Provjerite mogućnost dostave, termin i cijenu za svoju lokaciju prije kupovine.",
    action: "Raspitajte se o dostavi",
    href: "mailto:prodaja@pennyplus.com?subject=Upit%20za%20dostavu",
  },
  {
    title: "Toniranje boja",
    summary: "Pronađite baš svoju nijansu.",
    icon: "paint",
    text: "U PennyPlus prodajnim centrima dostupno je kompjutersko miješanje i toniranje boja. Naše osoblje pomoći će vam pri izboru nijanse za zidove ili fasadu.",
    action: "Pronađite prodajni centar",
    href: "#centri",
  },
  {
    title: "Rezanje i kantiranje",
    summary: "Preciznost po vašoj mjeri.",
    icon: "ruler",
    text: "Rezni centar u Vogošći pruža usluge rezanja i kantiranja pločastih materijala. Pošaljite svoje dimenzije i zahtjeve našem timu za informacije i ponudu.",
    action: "Kontaktirajte Rezni centar",
    href: "mailto:reznicentar@pennyplus.com?subject=Upit%20za%20rezanje%20i%20kantiranje",
  },
  {
    title: "Plaćanje na rate",
    summary: "Lakše do većih planova.",
    icon: "card",
    text: "Za kupovinu na rate provjerite trenutno dostupne kartice, broj rata i minimalni iznos kupovine u prodajnom centru. Uslovi zavise od banke i kartice.",
    action: "Provjerite uslove",
    href: "tel:080020261",
  },
];

export const locations = [
  {
    name: "Velešići",
    type: "Toys&Fun igraonice",
    address: "Halida Kajtaza b.b.",
    city: "Sarajevo",
    hours: "10:00 – 21:00",
    phone: "+38733407644",
    displayPhone: "033 407 644",
    email: "toysandfun@pennyplus.com",
    services: ["Igraonica", "Rođendanske proslave", "Prodavnica igračaka"],
  },
  {
    name: "Blažuj",
    type: "Toys&Fun igraonice",
    address: "Mostarsko raskršće 10, West Gate",
    city: "Blažuj, Sarajevo",
    hours: "10:00 – 21:00",
    phone: "+38761217890",
    displayPhone: "061 217 890",
    email: "toysandfun@pennyplus.com",
    services: ["Igraonica", "Rođendanske proslave"],
  },
  {
    name: "Nedžarići",
    type: "PennyPlus",
    address: "Munira Gavrankapetanovića 1",
    city: "Ilidža, Sarajevo",
    hours: "Pon – sub · 07:30 – 21:00",
    phone: "+38733467956",
    displayPhone: "033 467 956",
    email: "nedzarici@pennyplus.com",
    services: ["Građevinski materijal", "Uređenje doma", "Toniranje boja"],
  },
  {
    name: "Velešići",
    type: "PennyPlus",
    address: "Halida Kajtaza b.b.",
    city: "Sarajevo",
    hours: "Pon – sub · 07:30 – 21:00",
    phone: "+38733666998",
    displayPhone: "033 666 998",
    email: "velesici@pennyplus.com",
    services: ["Građevinski materijal", "Uređenje doma", "Toniranje boja"],
  },
  {
    name: "Blažuj",
    type: "PennyPlus",
    address: "Mostarsko raskršće b.b.",
    city: "Hadžići, Sarajevo",
    hours: "Pon – sub · 07:30 – 21:00",
    phone: "+38733624072",
    displayPhone: "033 624 072",
    email: "blazuj@pennyplus.com",
    services: ["Građevinski materijal", "Uređenje doma", "Toniranje boja"],
  },
  {
    name: "Vogošća",
    type: "PennyPlus",
    address: "Igmanska b.b.",
    city: "Vogošća, Sarajevo",
    hours: "Pon – sub · 07:30 – 18:00",
    phone: "+38733434616",
    displayPhone: "033 434 616",
    email: "vogosca@pennyplus.com",
    services: ["Građevinski materijal", "Uređenje doma"],
  },
  {
    name: "Rezni centar",
    type: "Rezni centar",
    address: "Igmanska b.b.",
    city: "Vogošća, Sarajevo",
    hours: "Pon – pet · 08:00 – 17:00 / sub · 08:00 – 15:00",
    phone: "+38762345086",
    displayPhone: "062 345 086",
    email: "reznicentar@pennyplus.com",
    services: ["Rezanje ploča", "Kantiranje", "Pločasti materijali"],
  },
  {
    name: "Alipašino polje",
    type: "Penny marketi",
    address: "Trg solidarnosti b.b.",
    city: "Novi Grad, Sarajevo",
    hours: "Pon – sub · 07:30 – 21:00",
    phone: "+38733591997",
    displayPhone: "033 591 997",
    email: "market7@pennyplus.com",
    services: ["Prehrana", "Roba široke potrošnje"],
  },
  {
    name: "Velešići",
    type: "Penny marketi",
    address: "Halida Kajtaza b.b.",
    city: "Novo Sarajevo",
    hours: "Pon – sub · 07:30 – 21:00",
    phone: "+38733586148",
    displayPhone: "033 586 148",
    email: "market8@pennyplus.com",
    services: ["Prehrana", "Roba široke potrošnje"],
  },
  {
    name: "Nedžarići",
    type: "Penny marketi",
    address: "Munira Gavrankapetanovića 1",
    city: "Ilidža, Sarajevo",
    hours: "Pon – sub · 07:30 – 21:00",
    phone: "+38733467956",
    displayPhone: "033 467 956",
    email: "market15@pennyplus.com",
    services: ["Prehrana", "Roba široke potrošnje"],
  },
  {
    name: "Blažuj",
    type: "Penny marketi",
    address: "Mostarsko raskršće b.b.",
    city: "Hadžići, Sarajevo",
    hours: "Pon – sub · 07:30 – 21:00",
    phone: "+38733624072",
    displayPhone: "033 624 072",
    email: "market12@pennyplus.com",
    services: ["Prehrana", "Roba široke potrošnje"],
  },
  {
    name: "Vogošća",
    type: "Penny marketi",
    address: "Igmanska b.b.",
    city: "Vogošća, Sarajevo",
    hours: "Pon – sub · 07:30 – 18:00",
    phone: "+38733434616",
    displayPhone: "033 434 616",
    email: "market9@pennyplus.com",
    services: ["Prehrana", "Roba široke potrošnje"],
  },
  {
    name: "Otes",
    type: "Penny marketi",
    address: "Barska 61 A",
    city: "Otes, Sarajevo",
    hours: "Pon – sub · 07:30 – 21:00",
    phone: "+38733246926",
    displayPhone: "033 246 926",
    email: "otes@pennyplus.com",
    services: ["Prehrana", "Roba široke potrošnje"],
  },
];
