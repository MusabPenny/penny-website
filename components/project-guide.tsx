import Image from "next/image";
import Link from "next/link";
import { Icon } from "./icon";
import { categories } from "@/lib/content";

const projects = [
  {
    title: "Dom po vašoj mjeri",
    subtitle: "OSVJEŽENJE PROSTORA",
    image: "interior",
    description:
      "Nova nijansa, praktičan komad namještaja ili detalj koji mijenja sve. Počnite od onoga što vašem prostoru nedostaje.",
    categories: ["uredski-i-kucanski-namjestaj", "boje-i-lakovi"],
    service: "toniranje-boja",
    serviceLabel: "Pronađite svoju nijansu",
    tip: "Ponesite fotografiju prostora i dimenzije prije odabira.",
  },
  {
    title: "Kupatilo za vaš ritam",
    subtitle: "VRIJEME ZA PROMJENU",
    image: "bathroom",
    description:
      "Od sanitarija do završnih detalja. Povežite funkcionalnost i udobnost u prostoru kojim počinje svaki dan.",
    categories: ["sanitarna-oprema"],
    service: "dostava",
    serviceLabel: "Dogovorite dostavu",
    tip: "Zabilježite dimenzije i položaj postojećih priključaka.",
  },
  {
    title: "Od plana do temelja",
    subtitle: "GRADNJA I RENOVIRANJE",
    image: "construction",
    description:
      "Pravi materijal i alat za sljedeći korak. Pripremite svoj projekat uz ponudu za velike radove i male popravke.",
    categories: ["gradevinski-materijal", "alati-i-masine"],
    service: "rezanje-i-kantiranje",
    serviceLabel: "Materijali po vašoj mjeri",
    tip: "Pripremite spisak materijala, količine i redoslijed radova.",
  },
];

export function ProjectGuide() {
  return (
    <section
      id="vas-projekat"
      className="project-section section container"
      aria-labelledby="project-title"
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            <span className="section-index">02 /</span> OD IDEJE DO OSTVARENJA
          </div>
          <h2 id="project-title">
            Nešto vaše.
            <br />
            <em>Od samog početka.</em>
          </h2>
        </div>
        <p>
          Ne morate imati sve odgovore.
          <br />
          Odaberite svoj plan — mi povezujemo ponudu i podršku.
        </p>
      </div>
      <div className="project-grid">
        {projects.map((project, index) => (
          <article className="project-card" key={project.title}>
            <div className="project-photo">
              <Image
                src={`/images/${project.image}.webp`}
                alt=""
                fill
                sizes="(max-width: 760px) 100vw, 33vw"
              />
              <span>PROJEKAT / 0{index + 1}</span>
            </div>
            <div className="project-copy">
              <div className="eyebrow">{project.subtitle}</div>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <details className="project-plan">
                <summary>
                  Pronađite svoj prvi korak <Icon name="plus" size={19} />
                </summary>
                <div className="project-plan-content">
                  <p>{project.tip}</p>
                  <span className="eyebrow">PONUDA NA PENNYSHOPU ↗</span>
                  {project.categories.map((slug) => {
                    const category = categories.find((item) => item.slug === slug);
                    return category ? (
                      <a key={slug} href={category.href} target="_blank" rel="noreferrer">
                        {category.name}
                        <Icon name="arrow" size={16} />
                      </a>
                    ) : null;
                  })}
                  <Link href={`/usluge/${project.service}`}>
                    {project.serviceLabel}
                    <Icon name="arrow" size={16} />
                  </Link>
                </div>
              </details>
            </div>
          </article>
        ))}
      </div>
      <div className="project-help">
        <span>
          <Icon name="phone" size={18} /> Radije biste krenuli od razgovora?
        </span>
        <a href="tel:080020261">
          080 020 261 <span>Besplatni info telefon</span>
          <Icon name="arrow" size={18} />
        </a>
      </div>
    </section>
  );
}
