import "server-only";
import { locationPages } from "./pages";
import { teamDepartments } from "./team";
import type { LocationRecord, TeamDepartment, TeamMember } from "./directory-types";

async function directory(kind: string): Promise<{ id: string; data: unknown }[] | null> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/penny_directory_public`,
    {
      method: "POST",
      headers: { apikey: process.env.SUPABASE_SECRET_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ p_kind: kind }),
      next: { revalidate: 60, tags: ["site-directory"] },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (response.status === 404) return null; // Migration not applied yet.
  if (!response.ok) throw new Error("Imenik trenutno nije dostupan.");
  return response.json();
}
export async function publishedLocations(): Promise<LocationRecord[]> {
  const records = await directory("location");
  return records === null ? locationPages : records.map((row) => row.data as LocationRecord);
}
export async function publishedTeam(): Promise<TeamDepartment[]> {
  const records = await directory("member");
  if (records === null) return teamDepartments;
  const groups = new Map<string, TeamDepartment>();
  for (const row of records) {
    const member = row.data as TeamMember;
    if (!groups.has(member.departmentId))
      groups.set(member.departmentId, {
        id: member.departmentId,
        name: member.departmentName,
        members: [],
      });
    groups.get(member.departmentId)!.members.push(member);
  }
  return [...groups.values()];
}
