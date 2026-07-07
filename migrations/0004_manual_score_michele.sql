-- Manual leaderboard entry for a player whose score was lost to the
-- magic-link round-trip bug: the result-screen sign-in form emailed a login
-- link, but the finished game's score lived only in browser memory and was
-- discarded when the link redirected back to a fresh app load, so it was
-- never POSTed to /api/scores. (The same change that adds this migration
-- fixes that flow going forward.)
--
-- Seeds the player's Better Auth `user` row so a future magic-link sign-in
-- with the same email attaches to this account and finds the score already
-- there, then links one energy-mode `game_result` to whichever user row holds
-- that email — the seeded one, or a pre-existing one if the player already had
-- an account. Cuneo has 247 comuni; the run scored 14020 points, found 70,
-- elapsed 10:37 (637000 ms). `missed`/`mistakes` weren't reported, so they're
-- recorded as 0; neither affects energy ranking (score DESC, found DESC,
-- elapsedMs ASC). Both inserts use OR IGNORE to stay safe if re-applied.

INSERT OR IGNORE INTO "user"
  ("id","name","email","emailVerified","image","createdAt","updatedAt")
VALUES (
  '895f9e21-36e1-4560-ba93-cc0c591087b5',
  'Michele',
  'michele@produzionelenta.it',
  0,
  NULL,
  '2026-07-07T00:00:00.000Z',
  '2026-07-07T00:00:00.000Z'
);

INSERT OR IGNORE INTO "game_result"
  ("id","userId","provinceId","modeKind","modeDurationSeconds","totalRegions","found","missed","mistakes","elapsedMs","score","actionLog","createdAt")
SELECT
  'e340f708-50af-4d62-8a4a-3ca083fecb3a',
  u."id",
  'cn',
  'energy',
  NULL,
  247,
  70,
  0,
  0,
  637000,
  14020,
  '[]',
  1783382400000
FROM "user" u
WHERE u."email" = 'michele@produzionelenta.it';
