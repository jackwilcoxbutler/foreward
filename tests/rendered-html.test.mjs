import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Rounds landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Share your round, hole by hole\./);
  assert.match(html, /Create your round/i);
  assert.match(html, /16,800\+ US courses/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("server-renders the permanent demo round", async () => {
  const response = await render("/r/demo");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Hermitage Golf Course/);
  assert.match(html, /84/);
  assert.match(html, /Share round/i);
  assert.match(html, /The scorecard/i);
});

test("keeps server secrets out of client-facing configuration", async () => {
  const [layout, envExample, client] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
    readFile(new URL("../components/RoundCreator.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /og\.png/);
  assert.match(envExample, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY|createClient\(/);
});
