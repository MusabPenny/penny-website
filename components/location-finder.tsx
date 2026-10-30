import { publishedLocations } from "@/lib/directory";
import { LocationFinder } from "./interactive";
export async function LiveLocationFinder() {
  const locations = await publishedLocations().catch(() => null);
  if (!locations)
    return (
      <p className="data-note">
        Lokacije trenutno ne možemo učitati. Za informacije pozovite{" "}
        <a href="tel:080020261">080 020 261</a>.
      </p>
    );
  return <LocationFinder locations={locations} />;
}
