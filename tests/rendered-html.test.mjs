import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getFeatureEntitlements, isHistoryItemLocked } from "../lib/features.ts";
import { normalizeOpenGolfHoles } from "../lib/opengolf.ts";
import { validHolePars } from "../lib/saved-courses.ts";

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
  assert.match(creator, /Create Custom Course/);
  assert.match(creator, /Save & Share/);
  assert.match(publicRound, /The scorecard/);
  assert.match(publicRound, /Create your round/);
});

test("keeps account creation as the final step and persists anonymous drafts", async () => {
  const creator = await readFile(new URL("../components/RoundCreator.tsx", import.meta.url), "utf8");
  assert.match(creator, /Your round is ready!/);
  assert.match(creator, /Save this round forever/);
  assert.match(creator, /Build your Golf Archive/);
  assert.match(creator, /rounds:creator-draft:v1/);
  assert.match(creator, /localStorage\.setItem\(DRAFT_KEY/);
  assert.match(creator, /localStorage\.removeItem\(DRAFT_KEY\)/);
  assert.match(creator, /signUp/);
});

test("abstracts free archive gating from future premium access", () => {
  const free = getFeatureEntitlements("free");
  const premium = getFeatureEntitlements("premium");
  assert.equal(isHistoryItemLocked(2, free), false);
  assert.equal(isHistoryItemLocked(3, free), true);
  assert.equal(isHistoryItemLocked(100, premium), false);
});

test("validates reusable custom course scorecards", () => {
  const valid = Array.from({ length: 9 }, (_, index) => ({ hole: index + 1, par: index === 2 ? 3 : 4 }));
  assert.deepEqual(validHolePars(valid), valid);
  assert.equal(validHolePars(valid.map((hole, index) => index === 4 ? { ...hole, par: 9 } : hole)), null);
});

test("adds ownership, privacy, account lifecycle, and saved course surfaces", async () => {
  const [migration, roundsRoute, roundRoute, history, savedCourses, account, authForm, editor] = await Promise.all([
    readFile(new URL("../supabase/migrations/20260719000000_v11_accounts_history_courses.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/rounds/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/rounds/[shareId]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/RoundsHistory.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SavedCoursesWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/AccountWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/AuthForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/RoundEditor.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /create table if not exists public\.profiles/);
  assert.match(migration, /create table if not exists public\.saved_courses/);
  assert.match(migration, /user_id uuid references auth\.users/);
  assert.match(migration, /is_public boolean not null default true/);
  assert.match(roundsRoute, /getAuthenticatedUser/);
  assert.match(roundRoute, /export async function DELETE/);
  assert.match(history, /Unlock your Golf Archive/);
  assert.match(history, /\$19\.99/);
  assert.match(savedCourses, /Create Custom Course/);
  assert.match(savedCourses, /toggleFavorite/);
  assert.match(account, /Delete account/);
  assert.match(account, /window\.confirm/);
  assert.match(authForm, /resetPasswordForEmail/);
  assert.match(authForm, /updateUser\(\{ password \}\)/);
  assert.match(editor, /isPublic/);
  assert.match(editor, /method: "PATCH"/);
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
  assert.match(shareActions, /sms:&body=/);
  assert.match(shareActions, /encodeURIComponent\(text\)/);
  assert.match(shareActions, /Your round recap will be ready to send/);
});
