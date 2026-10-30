const sarajevo = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Sarajevo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function pickerDateTime(instant: string): string {
  const parts = Object.fromEntries(
    sarajevo.formatToParts(new Date(instant)).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// The picker contains Sarajevo wall time, independently of the browser/server timezone.
export function pickerInstant(value: string): Date {
  if (!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Provjerite datum i vrijeme.");
  const wall = Date.parse(`${value}:00Z`);
  const matches = [60, 120]
    .map((offset) => new Date(wall - offset * 60_000))
    .filter(
      (instant) =>
        Number.isFinite(instant.getTime()) && pickerDateTime(instant.toISOString()) === value,
    );
  if (matches.length !== 1)
    throw new Error(
      "Provjerite vrijeme: tokom promjene sata odaberite vrijeme izvan perioda 02:00–02:59.",
    );
  return matches[0];
}
