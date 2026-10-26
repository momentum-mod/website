-- Existing aliases become the user's "real" (Steam) alias, which gets updated
-- to their current Steam name next time they authenticate.
ALTER TABLE "User" RENAME COLUMN "alias" TO "realAlias";

ALTER TABLE "User" ADD COLUMN "customAlias" TEXT;

-- Prisma doesn't support generated columns, so this is hand-written. Don't let
-- future migrations try to turn this into a regular column with a default!
ALTER TABLE "User"
    ADD COLUMN "alias" TEXT NOT NULL
    GENERATED ALWAYS AS (COALESCE("customAlias", "realAlias")) STORED;
