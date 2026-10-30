import type { locationPages } from "./pages";
import type { teamDepartments } from "./team";
export type LocationRecord = (typeof locationPages)[number];
export type TeamDepartment = (typeof teamDepartments)[number];
export type TeamMember = TeamDepartment["members"][number] & {
  departmentId: string;
  departmentName: string;
};
export type DirectoryRecord = {
  kind: "location" | "member";
  id: string;
  data: LocationRecord | TeamMember;
  published: boolean;
  position: number;
  updated_at: string;
};
