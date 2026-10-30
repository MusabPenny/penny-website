import assert from "node:assert/strict";
import { test } from "node:test";
import { MailError, sendGraphMail } from "../lib/mail/graph";

test("Graph mail accepts 202, separates rejected sends from uncertain timeouts, and never attaches candidate documents", async () => {
  const fetchOriginal = globalThis.fetch;
  try {
    for (const outcome of [202, 403, 503, "timeout"] as const) {
      globalThis.fetch = async (url, options) => {
        if (String(url).includes("/token")) return Response.json({ access_token: "test-token" });
        assert.match(
          String(url),
          /graph.microsoft.com\/v1.0\/users\/sender%40example.invalid\/sendMail/,
        );
        const body = JSON.parse(String(options?.body));
        assert.equal(body.message.body.contentType, "Text");
        assert.equal(body.message.attachments, undefined);
        assert.deepEqual(body.message.toRecipients, [
          { emailAddress: { address: "hr@example.invalid" } },
        ]);
        if (outcome === "timeout") throw new Error("Timeout");
        return new Response(null, { status: outcome });
      };
      const send = () =>
        sendGraphMail(
          { tenant: "test", clientId: "test", secret: "test" },
          "sender@example.invalid",
          ["hr@example.invalid"],
          "Prijava",
          "Poveznica na panel",
        );
      if (outcome === 202) await send();
      else
        await assert.rejects(
          send,
          (error) =>
            error instanceof MailError &&
            error.outcome === (outcome === 403 ? "failed" : "uncertain"),
        );
    }
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});
