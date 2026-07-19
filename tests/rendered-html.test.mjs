import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the complete round creation and public sharing surfaces", async () => {
  const [landing, creator, publicRound] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/RoundCreator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/PublicRound.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(landing, /Share your round, hole by hole\./);
  assert.match(landing, /16,800\+ US courses/);
  assert.match(creator, /Can’t find your course\?/);
  assert.match(creator, /Save &amp; see share card/);
  assert.match(publicRound, /The scorecard/);
  assert.match(publicRound, /Create your round/);
});

test("keeps server secrets out of client-facing code", async () => {
  const [envExample, creator, shareActions] = await Promise.all([
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
    readFile(new URL("../components/RoundCreator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ShareActions.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(envExample, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(creator, /SUPABASE_SERVICE_ROLE_KEY|createClient\(/);
  assert.doesNotMatch(shareActions, /SUPABASE_SERVICE_ROLE_KEY|createClient\(/);
});

test("provides both the iOS share sheet and direct Apple Messages handoff", async () => {
  const shareActions = await readFile(
    new URL("../components/ShareActions.tsx", import.meta.url),
    "utf8",
  );

  assert.match(shareActions, /navigator\.share/);
  assert.match(shareActions, /Open in Messages/);
  assert.match(shareActions, /window\.location\.assign\("sms:"\)/);
  assert.match(shareActions, /Copies your recap, then opens Messages/);
});
