import "server-only";
import { sendGraphMail } from "./mail/graph";
export { MailError } from "./mail/graph";
export function microsoftMailConfigured() {
  return ["M365_MAIL_TENANT_ID", "M365_MAIL_CLIENT_ID", "M365_MAIL_CLIENT_SECRET"].every((key) =>
    Boolean(process.env[key]),
  );
}
export async function sendMicrosoftMail(
  sender: string,
  recipients: string[],
  subject: string,
  body: string,
) {
  return sendGraphMail(
    {
      tenant: process.env.M365_MAIL_TENANT_ID ?? "",
      clientId: process.env.M365_MAIL_CLIENT_ID ?? "",
      secret: process.env.M365_MAIL_CLIENT_SECRET ?? "",
    },
    sender,
    recipients,
    subject,
    body,
  );
}
