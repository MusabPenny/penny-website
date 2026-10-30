export async function uploadWithTicket(file: File, ticket: { url: string }) {
  const types: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  const response = await fetch(ticket.url, {
    method: "PUT",
    headers: {
      "Content-Type":
        types[file.name.split(".").pop()?.toLowerCase() ?? ""] || "application/octet-stream",
      "x-upsert": "false",
    },
    body: file,
  });
  if (!response.ok) throw new Error("Upload nije uspio. Pokušajte ponovo.");
}
