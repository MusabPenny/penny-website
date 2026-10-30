import data from "./team-data.json";

export const teamDepartments = data.departments;
export const teamMemberCount = teamDepartments.reduce(
  (sum, group) => sum + group.members.length,
  0,
);

import { filterTeam as searchTeam } from "./team-search";
export { teamPhoneHref } from "./team-search";
export function filterTeam(query: string, department: string, source = teamDepartments) {
  return searchTeam(query, department, source);
}
