// Run only before applying migration 007; applied migration checksums are immutable.
import { writeFile } from "node:fs/promises";
import { locationPages } from "../lib/pages";
import { teamDepartments } from "../lib/team";
const rows = [
  ...locationPages.map((data, position) => ({ kind: "location", id: data.slug, position, data })),
  ...teamDepartments.flatMap((group, groupIndex) =>
    group.members.map((member, index) => ({
      kind: "member",
      id: member.id,
      position: groupIndex * 100 + index,
      data: { ...member, departmentId: group.id, departmentName: group.name },
    })),
  ),
];
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
await writeFile(
  "db/migrations/007_directory_seed.sql",
  "-- Preserve the reviewed public directory; never overwrite later admin edits.\nINSERT INTO public.site_directory(kind,id,position,data) VALUES\n" +
    rows
      .map(
        (row) =>
          `(${literal(row.kind)},${literal(row.id)},${row.position},${literal(JSON.stringify(row.data))}::jsonb)`,
      )
      .join(",\n") +
    "\nON CONFLICT(kind,id) DO NOTHING;\n",
);
console.log(`Prepared ${rows.length} directory records; database unchanged.`);
