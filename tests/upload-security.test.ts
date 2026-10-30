import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { smallJson } from "../lib/request-json";
process.env.AUTH_SECRET = "test-only-upload-receipt-secret-at-least-32-characters";
// Next resolves the server-only marker at build time. Stub only that marker
// while executing the actual production signing module under Node's test runner.
const exports: {
  signReceipt: (value: Record<string, unknown>) => string;
  readReceipt: <T>(value: string) => T;
} = {} as never;
const nativeRequire = createRequire(import.meta.url);
runInNewContext(
  ts.transpileModule(readFileSync("lib/upload-receipt.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  {
    exports,
    require: (id: string) => (id === "server-only" ? {} : nativeRequire(id)),
    process,
    Buffer,
    Date,
  },
);
const { signReceipt, readReceipt } = exports;
test("upload receipts reject tampering, expiry and forged payloads", () => {
  const token = signReceipt({ id: "example", hash: "payload-hash" });
  assert.equal(readReceipt<{ id: string }>(token).id, "example");
  const [body, sig] = token.split(".");
  assert.throws(() => readReceipt(`${body}.${sig.slice(0, -1)}x`));
  assert.throws(() =>
    readReceipt(
      `${Buffer.from(JSON.stringify({ id: "changed", expires: Date.now() + 100000 })).toString("base64url")}.${sig}`,
    ),
  );
  const real = Date.now;
  Date.now = () => real() + 21 * 60 * 1000;
  try {
    assert.throws(() => readReceipt(token), /istekao/);
  } finally {
    Date.now = real;
  }
});
test("upload metadata requests have a hard streaming size limit", async () => {
  assert.deepEqual(
    await smallJson(new Request("http://localhost", { method: "POST", body: '{"valid":true}' })),
    { valid: true },
  );
  await assert.rejects(
    smallJson(new Request("http://localhost", { method: "POST", body: "x".repeat(65537) })),
    /prevelik/,
  );
});
