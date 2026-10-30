export class MailError extends Error {
  constructor(public outcome: "failed" | "uncertain") {
    super("Microsoft 365 slanje nije potvrđeno.");
  }
}
export async function sendGraphMail(
  config: { tenant: string; clientId: string; secret: string },
  sender: string,
  recipients: string[],
  subject: string,
  body: string,
) {
  if (!config.tenant || !config.clientId || !config.secret) throw new MailError("failed");
  let token: string;
  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(config.tenant)}/oauth2/v2.0/token`,
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.secret,
          grant_type: "client_credentials",
          scope: "https://graph.microsoft.com/.default",
        }),
      },
    );
    if (!response.ok) throw new Error("Token");
    token = (await response.json()).access_token;
    if (!token) throw new Error("Token");
  } catch {
    throw new MailError("failed");
  }
  let response: Response;
  try {
    response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            subject,
            body: { contentType: "Text", content: body },
            toRecipients: recipients.map((address) => ({ emailAddress: { address } })),
          },
          saveToSentItems: true,
        }),
      },
    );
  } catch {
    throw new MailError("uncertain");
  }
  if (response.status !== 202) throw new MailError(response.status >= 500 ? "uncertain" : "failed");
}
