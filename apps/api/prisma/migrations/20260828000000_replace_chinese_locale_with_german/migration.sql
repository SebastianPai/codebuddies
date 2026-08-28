-- Replace the Chinese (zh / zh-Hans) locale with German (de).
--
-- CodeBuddies dropped Chinese as a supported language and added German in its
-- place. This migration keeps existing users' preferences and existing
-- localized content working by remapping the old locale code in place. It is
-- non-destructive: no rows are deleted, and every statement is a no-op when
-- there is no Chinese data.

-- 1. Per-account UI language (shared by apps/web and apps/game).
UPDATE "User" SET "uiLanguage" = 'de' WHERE "uiLanguage" = 'zh-Hans';

-- 2. Content-language catalog used by every *Translation table (modules,
--    courses, lessons, exercises, items, rooms, ...). The row keeps its
--    primary key (uuid), so every FK / translation row that pointed at it
--    stays valid -- only the code/name label changes. Guarded so a DB that
--    was already seeded with 'de' does not hit the code unique constraint.
UPDATE "Language"
SET "code" = 'de', "name" = 'Deutsch'
WHERE "code" = 'zh-Hans'
  AND NOT EXISTS (SELECT 1 FROM "Language" l WHERE l."code" = 'de');

-- 3. PricingPlan localized JSON ({ es, en, zh } objects, plus a features
--    array of the same). Rename the "zh" key to "de" in place so the admin
--    editor and any plan.name.de / plan.ctaLabel.de / feature.de read keeps
--    working immediately after deploy. The value is carried over as-is (old
--    Chinese text) as a placeholder; re-running prisma/seed.ts afterwards
--    overwrites it with the real German copy.
UPDATE "PricingPlan"
SET "name" = ("name" - 'zh') || jsonb_build_object('de', "name" -> 'zh')
WHERE jsonb_typeof("name") = 'object' AND "name" ? 'zh';

UPDATE "PricingPlan"
SET "ctaLabel" = ("ctaLabel" - 'zh') || jsonb_build_object('de', "ctaLabel" -> 'zh')
WHERE jsonb_typeof("ctaLabel") = 'object' AND "ctaLabel" ? 'zh';

UPDATE "PricingPlan"
SET "features" = (
  SELECT jsonb_agg(
    CASE
      WHEN elem ? 'zh' THEN (elem - 'zh') || jsonb_build_object('de', elem -> 'zh')
      ELSE elem
    END
  )
  FROM jsonb_array_elements("features") AS elem
)
WHERE jsonb_typeof("features") = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements("features") e WHERE e ? 'zh');
