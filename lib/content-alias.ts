import { permanentRedirect } from "next/navigation";
import aliases from "./legacy-redirects.json";
export function canonicalContentAlias(path: string) {
  const alias = aliases.find((a) => a.source.toLowerCase() === path.toLowerCase());
  if (alias && alias.destination !== path) permanentRedirect(alias.destination);
}
