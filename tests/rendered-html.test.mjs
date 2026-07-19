import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeOpenGolfHoles } from "../lib/opengolf.ts";

test("normalizes a malformed native nine-hole OpenGolf scorecard", () => {
  const actualPars = [4, 4, 4, 3, 4, 5, 4, 3, 4];
  const trailingPlaceholders = Array.from({ length: 17 }, (_, index) => ({
    number: index + 10,
    par: 4,
  }));

  const holes = normalizeOpenGolfHoles({
    id: "nine-hole-fixture",
    holes: 9,
    par: 35,
    holes_data: [
      ...actualPars.map((par, index) => ({ number: index + 1, par })),
      ...trailingPlaceholders,
    ],
  });

  assert.equal(holes.length, 9);
  assert.deepEqual(holes.map((hole) => hole.par), actualPars);
});

test("rejects an OpenGolf card whose hole pars disagree with total par", () => {
  const holes = normalizeOpenGolfHoles({
    id: "bad-total-fixture",
    holes: 9,
    par: 35,
    holes_data: Array.from({ length: 9 }, (_, index) => ({
      number: index + 1,
      par: 4,
    })),
  });

  assert.deepEqual(holes, []);
});

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
