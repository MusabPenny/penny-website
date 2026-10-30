import { createHash } from "node:crypto";

export async function checkedUpload(file: File, privateFile = false) {
  const max = privateFile ? 3 * 1024 * 1024 : 10 * 1024 * 1024;
  if (!file.size || file.size > max)
    throw new Error(`Fajl smije imati najviše ${privateFile ? 3 : 10} MB.`);
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  if (!ext || !types[ext] || (privateFile && !["pdf", "doc", "docx"].includes(ext)))
    throw new Error("Nepodržan format fajla.");
  const valid =
    ext === "pdf"
      ? bytes.subarray(0, 5).toString() === "%PDF-"
      : ext === "doc"
        ? bytes.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1"
        : ext === "docx"
          ? bytes.subarray(0, 4).toString("hex") === "504b0304" &&
            bytes.includes(Buffer.from("[Content_Types].xml")) &&
            bytes.includes(Buffer.from("word/document.xml")) &&
            !bytes.includes(Buffer.from("vbaProject.bin"))
          : ext === "png"
            ? bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
            : ext === "webp"
              ? bytes.subarray(0, 4).toString() === "RIFF" &&
                bytes.subarray(8, 12).toString() === "WEBP"
              : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!valid) throw new Error("Sadržaj fajla ne odgovara odabranom formatu.");
  return {
    bytes,
    mime: types[ext],
    ext,
    hash: createHash("sha256").update(bytes).digest("hex"),
    name: file.name.replace(/[\r\n\\/"<>]/g, "_").slice(0, 160),
  };
}
