export type FormField = {
  name: string;
  label: string;
  type?: "email" | "tel" | "date" | "number" | "textarea";
  required?: boolean;
  options?: readonly string[];
  min?: number;
  max?: number;
};
export type FormSection = { title: string; fields: FormField[] };
const skill = ["Ne poznajem", "Osnovno", "Dobro", "Odlično"];
const personal: FormField[] = [
  { name: "first_name", label: "Ime", required: true },
  { name: "last_name", label: "Prezime", required: true },
  { name: "birth_date", label: "Datum rođenja", type: "date", required: true },
  { name: "phone", label: "Kontakt telefon", type: "tel", required: true },
  { name: "email", label: "E-mail", type: "email", required: true },
];
export const jobSections: FormSection[] = [
  {
    title: "Lične informacije",
    fields: [
      ...personal,
      { name: "citizenship", label: "Državljanstvo", required: true },
      { name: "address", label: "Adresa stanovanja", required: true },
      { name: "city", label: "Grad stanovanja", required: true },
      {
        name: "driving_license",
        label: "Vozačka dozvola",
        required: true,
        options: ["Nemam", "A", "B", "C", "D", "BE", "CE", "Više kategorija"],
      },
    ],
  },
  {
    title: "Obrazovanje",
    fields: [
      {
        name: "education_level",
        label: "Stepen stručne spreme",
        required: true,
        options: ["Osnovna škola", "KV", "SSS", "VŠS", "VSS", "Master", "Doktorat"],
      },
      { name: "school", label: "Naziv škole / fakulteta", required: true },
      { name: "qualification", label: "Stečeno zvanje", required: true },
    ],
  },
  {
    title: "Radno iskustvo (ostavite prazno ako ga nemate)",
    fields: [
      { name: "employer", label: "Naziv kompanije" },
      { name: "previous_position", label: "Radno mjesto / pozicija" },
      { name: "work_from", label: "Od (godina)", type: "number", min: 1950, max: 2100 },
      {
        name: "work_to",
        label: "Do (godina), prazno ako još radite",
        type: "number",
        min: 1950,
        max: 2100,
      },
      { name: "other_experience", label: "Dodatno radno iskustvo", type: "textarea" },
    ],
  },
  {
    title: "Vještine i dodatna pitanja",
    fields: [
      { name: "excel", label: "MS Excel", required: true, options: skill },
      { name: "powerpoint", label: "MS PowerPoint", required: true, options: skill },
      { name: "word", label: "MS Word", required: true, options: skill },
      { name: "english", label: "Engleski jezik", required: true, options: skill },
      {
        name: "applied_before",
        label: "Jeste li ranije konkurisali u PennyPlusu?",
        required: true,
        options: ["Da", "Ne"],
      },
      { name: "motivation", label: "Pismo motivacije", type: "textarea" },
    ],
  },
];
export const internshipSections: FormSection[] = [
  {
    title: "Lične informacije",
    fields: [
      ...personal,
      {
        name: "recommended_by",
        label: "Preporuka zaposlenika (ime i poslovno područje), ako postoji",
      },
      { name: "heard_from", label: "Kako ste saznali za praksu?", required: true },
      { name: "address", label: "Adresa i mjesto stanovanja", required: true },
    ],
  },
  {
    title: "Roditelj / staratelj",
    fields: [
      { name: "guardian_name", label: "Ime i prezime roditelja / staratelja", required: true },
      {
        name: "guardian_phone",
        label: "Telefon roditelja / staratelja",
        type: "tel",
        required: true,
      },
      {
        name: "guardian_email",
        label: "E-mail roditelja / staratelja",
        type: "email",
        required: true,
      },
    ],
  },
  {
    title: "Školovanje",
    fields: [
      { name: "school", label: "Srednja škola i grad", required: true },
      { name: "qualification", label: "Zanimanje za koje se školujete", required: true },
      {
        name: "school_year",
        label: "Razred u sljedećoj školskoj godini",
        type: "number",
        required: true,
        min: 1,
        max: 5,
      },
      {
        name: "bosnian_grade",
        label: "Ocjena iz bosanskog jezika i književnosti",
        type: "number",
        required: true,
        min: 1,
        max: 5,
      },
      {
        name: "math_grade",
        label: "Ocjena iz matematike",
        type: "number",
        required: true,
        min: 1,
        max: 5,
      },
      {
        name: "overall_grade",
        label: "Opći uspjeh u prethodnoj školskoj godini",
        type: "number",
        required: true,
        min: 1,
        max: 5,
      },
      {
        name: "absences",
        label: "Broj neopravdanih izostanaka (sati)",
        type: "number",
        required: true,
        min: 0,
        max: 2000,
      },
    ],
  },
  {
    title: "O vama",
    fields: [
      {
        name: "motivation",
        label: "Zašto želite obavljati stručnu praksu u PennyPlusu?",
        type: "textarea",
        required: true,
      },
      {
        name: "strengths",
        label: "Koje biste svoje vrline izdvojili?",
        type: "textarea",
        required: true,
      },
      {
        name: "preferred_location",
        label: "U kojoj poslovnici želite obavljati praksu?",
        required: true,
        options: [
          "Velešići",
          "Nedžarići",
          "Blažuj",
          "Vogošća",
          "Alipašino polje",
          "Otes",
          "Rezni centar",
          "Toys&Fun Velešići",
          "Toys&Fun Blažuj",
        ],
      },
    ],
  },
];
export function validateApplication(data: FormData, kind: "job" | "internship") {
  const sections = kind === "job" ? jobSections : internshipSections;
  const answers: Record<string, string> = {};
  for (const field of sections.flatMap((s) => s.fields)) {
    const raw = data.get(field.name);
    if (raw !== null && typeof raw !== "string") throw new Error("Provjerite unesene podatke.");
    const value = String(raw ?? "").trim();
    if ((field.required && !value) || value.length > (field.type === "textarea" ? 4000 : 320))
      throw new Error(`Provjerite polje: ${field.label}.`);
    if (value && field.options && !field.options.includes(value))
      throw new Error(`Provjerite polje: ${field.label}.`);
    if (value && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      throw new Error(`Provjerite polje: ${field.label}.`);
    if (
      value &&
      field.type === "number" &&
      (!/^\d+$/.test(value) ||
        Number(value) < (field.min ?? 0) ||
        Number(value) > (field.max ?? 2100))
    )
      throw new Error(`Provjerite polje: ${field.label}.`);
    if (
      value &&
      field.type === "date" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        value > new Date().toISOString().slice(0, 10) ||
        value < "1900-01-01")
    )
      throw new Error("Provjerite datum rođenja.");
    answers[field.name] = value;
  }
  if (answers.work_from && answers.work_to && Number(answers.work_to) < Number(answers.work_from))
    throw new Error("Provjerite godine radnog iskustva.");
  if (answers.employer && (!answers.previous_position || !answers.work_from))
    throw new Error("Dopunite radno iskustvo ili ostavite sva polja prazna.");
  if (data.get("consent") !== "yes")
    throw new Error("Potvrdite da ste pročitali informacije o obradi podataka.");
  if (kind === "internship" && data.get("guardian_consent") !== "yes")
    throw new Error("Potrebna je potvrda roditelja / staratelja za prijavu na praksu.");
  return answers;
}
