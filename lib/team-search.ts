import type { TeamDepartment } from "./directory-types";

function searchable(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

export function filterTeam(query: string, department: string, source: TeamDepartment[]) {
  const terms = searchable(query.trim()).split(/\s+/).filter(Boolean);
  return source
    .filter((group) => !department || group.id === department)
    .map((group) => ({
      ...group,
      members: group.members.filter((member) => {
        const text = searchable(
          [group.name, member.name, member.role, member.phone, ...member.emails].join(" "),
        );
        return terms.every((term) => text.includes(term));
      }),
    }))
    .filter((group) => group.members.length > 0);
}

export function teamPhoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `tel:${digits.startsWith("00") ? `+${digits.slice(2)}` : digits.startsWith("0") && !digits.startsWith("0800") ? `+387${digits.slice(1)}` : phone.startsWith("+") ? `+${digits}` : digits}`;
}
