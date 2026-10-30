"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { categories, groups, normalizeSearch, shopUrl, type CategoryGroup } from "@/lib/content";
import { Icon } from "./icon";
import { ThemeToggle } from "./theme-toggle";
import type { LocationRecord } from "@/lib/directory-types";

const navigation = [
  { href: "/akcije", label: "Akcije" },
  { href: "/katalozi", label: "Katalozi" },
  { href: "/kategorije", label: "Kategorije" },
  { href: "/usluge", label: "Usluge" },
  { href: "/prodajni-centri", label: "Prodajni centri" },
  { href: "/o-nama", label: "O nama" },
];

const teamNavigation = [
  { href: "/nas-tim", label: "Pregled našeg tima" },
  { href: "/karijera", label: "Karijera i otvorena radna mjesta" },
  { href: "/karijera/prijava", label: "Prijava za posao" },
  { href: "/karijera/praksa", label: "Prijava za praksu" },
  { href: "/admin", label: "Prijava na admin panel" },
];

function TeamNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const dropdown = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !dropdown.current?.contains(event.target) &&
        dropdown.current
      )
        dropdown.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  return (
    <details
      className="team-navigation"
      ref={dropdown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        className={
          pathname === "/nas-tim" || pathname.startsWith("/karijera")
            ? "team-navigation-active"
            : undefined
        }
      >
        Naš tim <Icon name="chevron" size={12} />
      </summary>
      <div className="team-navigation-links">
        {teamNavigation.map((item) => (
          <Link
            href={item.href}
            key={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            onClick={() => {
              if (dropdown.current) dropdown.current.open = false;
              onNavigate?.();
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  function openSearch() {
    dialog.current?.showModal();
    searchInput.current?.focus();
  }
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName) &&
        !(event.target as HTMLElement).isContentEditable
      ) {
        event.preventDefault();
        dialog.current?.showModal();
        searchInput.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pathname]);
  const matches = categories.filter((c) =>
    normalizeSearch(c.name + " " + (c.feature?.title ?? "")).includes(normalizeSearch(query)),
  );
  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label="PennyPlus početna stranica">
            <Image
              src="/penny.png"
              alt="PennyPlus i Penny marketi"
              width={750}
              height={750}
              sizes="(max-width: 760px) 52px, 65px"
              className="brand-image"
              preload
            />
          </Link>
          <nav className="desktop-nav" aria-label="Glavna navigacija">
            {navigation.map((n) => (
              <Link
                href={n.href}
                key={n.href}
                aria-current={
                  pathname === n.href || pathname.startsWith(n.href + "/") ? "page" : undefined
                }
              >
                {n.label}
                {n.label === "Kategorije" && <Icon name="chevron" size={12} />}
              </Link>
            ))}
            <TeamNavigation />
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <button
              type="button"
              className="icon-button search-trigger"
              aria-label="Pretražite kategorije"
              onClick={openSearch}
            >
              <Icon name="search" size={21} />
            </button>
            <span className="header-divider" />
            <a className="header-shop" href={shopUrl} target="_blank" rel="noreferrer">
              PennyShop <Icon name="diagonal" size={17} />
            </a>
            <button
              type="button"
              aria-label={menuOpen ? "Zatvori meni" : "Otvori meni"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              className="icon-button menu-toggle"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name={menuOpen ? "close" : "menu"} size={24} />
            </button>
          </div>
        </div>
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label="Mobilna navigacija"
          hidden={!menuOpen}
        >
          {navigation.map((n) => (
            <Link href={n.href} key={n.href} onClick={() => setMenuOpen(false)}>
              {n.label}
              <Icon name="arrow" size={18} />
            </Link>
          ))}
          <TeamNavigation onNavigate={() => setMenuOpen(false)} />
          <Link href="/kontakt" onClick={() => setMenuOpen(false)}>
            Kontakt
            <Icon name="phone" size={18} />
          </Link>
        </nav>
      </header>
      <dialog
        ref={dialog}
        className="search-dialog"
        aria-labelledby="search-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="search-dialog-inner">
          <div className="dialog-heading">
            <h2 id="search-title">Šta tražite za svoj dom?</h2>
            <button
              className="icon-button"
              type="button"
              aria-label="Zatvori pretragu"
              onClick={() => dialog.current?.close()}
            >
              <Icon name="close" />
            </button>
          </div>
          <label className="search-field">
            <Icon name="search" />
            <input
              ref={searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pretražite kategorije…"
              aria-label="Naziv kategorije"
            />
          </label>
          <p className="search-explanation">Kategorije vas vode direktno na PennyShop.</p>
          <div className="search-results" aria-live="polite">
            {matches.length ? (
              matches.map((c) => (
                <a href={c.href} key={c.slug} target="_blank" rel="noreferrer">
                  <span>{c.name}</span>
                  <Icon name="diagonal" size={16} />
                </a>
              ))
            ) : (
              <p className="empty-state">
                Nema rezultata za „{query}“. Pokušajte s kraćim nazivom.
              </p>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

export function CategoryExplorer({
  initialExpanded = false,
  editorial = false,
}: {
  initialExpanded?: boolean;
  editorial?: boolean;
}) {
  const [group, setGroup] = useState<CategoryGroup>("Sve kategorije");
  const [expanded, setExpanded] = useState(initialExpanded);
  const [query, setQuery] = useState("");
  const featured = categories
    .filter((c) => c.feature)
    .sort((a, b) => a.feature.order - b.feature.order);
  const filtered = categories.filter(
    (c) =>
      (group === "Sve kategorije" || c.group === group) &&
      normalizeSearch(c.name + " " + (c.feature?.title ?? "")).includes(normalizeSearch(query)),
  );
  const showDirectory = expanded || group !== "Sve kategorije" || query !== "";
  return (
    <>
      <div className="category-toolbar">
        <div className="category-filters" role="group" aria-label="Filtrirajte kategorije">
          {groups.map((g) => (
            <button type="button" key={g} aria-pressed={g === group} onClick={() => setGroup(g)}>
              {g}
            </button>
          ))}
        </div>
        <label className="category-search">
          <Icon name="search" size={17} />
          <input
            placeholder="Pronađite kategoriju"
            aria-label="Pretraži kategorije"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {!showDirectory && (
        <div className="category-grid">
          {featured.map((c, i) => (
            <a
              className="category-card"
              href={c.href}
              key={c.slug}
              target="_blank"
              rel="noreferrer"
            >
              <div className="category-image">
                <Image
                  src={`/images/${c.feature.image}.webp`}
                  alt=""
                  fill
                  sizes={
                    editorial
                      ? i < 2
                        ? "(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 60vw"
                        : "(max-width: 420px) 100vw, (max-width: 1100px) 50vw, 25vw"
                      : "(max-width: 540px) 100vw, (max-width: 900px) 50vw, 33vw"
                  }
                />
                <span className="category-number">0{i + 1}</span>
                <span className="category-photo-arrow">
                  <Icon name="diagonal" size={20} />
                </span>
              </div>
              <div className="category-caption">
                <div>
                  <h3>{c.feature.title}</h3>
                  <p>{c.feature.description}</p>
                </div>
                <Icon name="arrow" size={19} />
              </div>
            </a>
          ))}
        </div>
      )}
      {showDirectory && (
        <div className="category-directory" aria-live="polite">
          {filtered.length ? (
            filtered.map((c) => (
              <a href={c.href} key={c.slug} target="_blank" rel="noreferrer">
                <span>
                  <small>{c.group}</small>
                  <strong>{c.name}</strong>
                </span>
                <Icon name="diagonal" size={20} />
              </a>
            ))
          ) : (
            <div className="empty-state">
              <Icon name="search" size={25} />
              <p>Nismo pronašli kategoriju „{query}“.</p>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setQuery("");
                  setGroup("Sve kategorije");
                }}
              >
                Poništi pretragu i filter
              </button>
            </div>
          )}
        </div>
      )}
      <div className="category-bottom">
        <span>
          <Icon name="diagonal" size={14} /> Kupovinu nastavljate na pennyshop.ba
        </span>
        <button
          className="text-link"
          type="button"
          aria-expanded={showDirectory}
          onClick={() => {
            setExpanded(!showDirectory);
            setGroup("Sve kategorije");
            setQuery("");
          }}
        >
          {showDirectory
            ? "Prikažite izdvojene kategorije"
            : `Pogledajte sve kategorije (${categories.length})`}
          <Icon name={showDirectory ? "close" : "arrow"} size={18} />
        </button>
      </div>
    </>
  );
}

export function LocationFinder({ locations }: { locations: LocationRecord[] }) {
  const [type, setType] = useState("PennyPlus");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const filtered = locations.filter((l) => l.type === type);
  const selected = filtered[selectedIndex] ?? filtered[0];
  if (!selected)
    return (
      <p className="data-note">
        Trenutno nema objavljenih lokacija za odabrani tip.{" "}
        <button type="button" onClick={() => setType(locations[0]?.type ?? "PennyPlus")}>
          Prikaži dostupne lokacije
        </button>
      </p>
    );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.type} ${selected.name} ${selected.address} ${selected.city}`)}`;
  return (
    <>
      <div className="location-filters" role="group" aria-label="Tip prodajnog objekta">
        {["PennyPlus", "Penny marketi", "Rezni centar", "Toys&Fun igraonice"].map((t) => (
          <button
            type="button"
            aria-pressed={type === t}
            key={t}
            onClick={() => {
              setType(t);
              setSelectedIndex(0);
            }}
          >
            {t}
            <span>{locations.filter((l) => l.type === t).length}</span>
          </button>
        ))}
      </div>
      <div className="location-layout">
        <div className="location-options" role="group" aria-label="Odaberite lokaciju">
          {filtered.map((l, index) => (
            <button
              type="button"
              className="location-option"
              aria-pressed={selectedIndex === index}
              key={l.name}
              onClick={() => setSelectedIndex(index)}
            >
              <span className="location-marker">
                <Icon name="pin" size={21} />
              </span>
              <span>
                <strong>{l.name}</strong>
                <small>{l.address}</small>
              </span>
              <Icon name="arrow" size={19} />
            </button>
          ))}
        </div>
        <div className="location-detail" aria-live="polite">
          <div className="location-detail-copy">
            <span className="eyebrow">{selected.type.toLocaleUpperCase("bs")}</span>
            <h3>{selected.name}</h3>
            <p>
              {selected.address}
              <br />
              {selected.city}
            </p>
            <div className="location-hours">
              <Icon name="clock" size={17} />
              <span>{selected.hours}</span>
            </div>
            <small className="hours-note">Za praznično radno vrijeme kontaktirajte centar.</small>
            <div className="location-contact">
              <a href={`tel:${selected.phone}`}>
                <Icon name="phone" size={16} />
                {selected.displayPhone}
              </a>
              <a href={`mailto:${selected.email}`}>
                <Icon name="mail" size={16} />
                {selected.email}
              </a>
            </div>
            <div className="location-tags">
              {selected.services.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <a href={mapsUrl} className="button button-dark" target="_blank" rel="noreferrer">
              Pokaži put <Icon name="diagonal" size={17} />
            </a>
          </div>
          <div className="location-photo">
            <Image
              src={type === "Rezni centar" ? "/images/tools.webp" : "/images/store.webp"}
              alt={
                type === "Rezni centar"
                  ? "Alati u radionici, ilustracija usluge"
                  : "Penny prodajni centar u Sarajevu, ilustrativna fotografija mreže centara"
              }
              fill
              sizes="(max-width: 760px) 100vw, 30vw"
            />
            <span className="location-photo-caption">
              {type === "Rezni centar" ? "PRECIZNO. PO VAŠOJ MJERI." : "DOBRODOŠLI KUĆI."}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
