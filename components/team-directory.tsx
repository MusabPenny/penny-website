"use client";

import Image from "next/image";
import { useState } from "react";
import { filterTeam, teamPhoneHref } from "@/lib/team-search";
import type { TeamDepartment } from "@/lib/directory-types";

export function TeamDirectory({ departments: teamDepartments }: { departments: TeamDepartment[] }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const groups = filterTeam(query, department, teamDepartments);
  const teamMemberCount = teamDepartments.reduce((sum, group) => sum + group.members.length, 0);
  const count = groups.reduce((sum, group) => sum + group.members.length, 0);
  return (
    <div className="team-directory">
      <div className="team-tools" role="search" aria-label="Pretraga našeg tima">
        <label>
          Pronađite osobu ili kontakt
          <input
            type="search"
            placeholder="Ime, funkcija ili e-mail…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Služba
          <select value={department} onChange={(event) => setDepartment(event.target.value)}>
            <option value="">Sve službe</option>
            {teamDepartments.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setDepartment("");
          }}
          disabled={!query && !department}
        >
          Poništi filtere
        </button>
      </div>
      <p className="team-results" role="status" aria-live="polite">
        Prikazano {count} od {teamMemberCount} kontakata · {groups.length} službi
      </p>
      <div className="team-layout">
        <aside className="team-index" aria-label="Službe našeg tima">
          <span className="eyebrow">LJUDI I SLUŽBE</span>
          <nav>
            {groups.map((group) => (
              <a key={group.id} href={`#${group.id}`}>
                {group.name}
                <span>{group.members.length}</span>
              </a>
            ))}
          </nav>
        </aside>
        <div className="team-groups">
          {groups.length === 0 && (
            <div className="team-empty">
              <h2>Nema rezultata za ovu pretragu.</h2>
              <p>Pokušajte s drugim imenom ili odaberite sve službe.</p>
            </div>
          )}
          {groups.map((group) => (
            <section
              className="team-group"
              key={group.id}
              id={group.id}
              aria-labelledby={`${group.id}-title`}
            >
              <div className="team-group-heading">
                <h2 id={`${group.id}-title`}>{group.name}</h2>
                <span>{String(group.members.length).padStart(2, "0")}</span>
              </div>
              <div className="team-grid">
                {group.members.map((member) => (
                  <article className="team-card" key={member.id} id={`osoba-${member.id}`}>
                    <div className="team-photo">
                      <Image
                        src={member.image.src}
                        alt={member.name}
                        width={member.image.width}
                        height={member.image.height}
                        placeholder={member.image.blurDataURL ? "blur" : "empty"}
                        blurDataURL={member.image.blurDataURL}
                        sizes="(max-width: 540px) 90vw, (max-width: 900px) 45vw, 28vw"
                      />
                    </div>
                    <div className="team-card-body">
                      <h3>{member.name}</h3>
                      <p className="team-role">{member.role}</p>
                      <div className="team-contacts">
                        {member.phone && (
                          <a href={teamPhoneHref(member.phone)}>
                            <span>TELEFON</span>
                            {member.phone}
                          </a>
                        )}
                        {member.emails.map((email) => (
                          <a key={email} href={`mailto:${email}`}>
                            <span>E-MAIL</span>
                            {email}
                          </a>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
