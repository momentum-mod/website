-- Custom migration to add rank points extension and column to LeaderboardRun table

ALTER TABLE "public"."LeaderboardRun"
    ADD COLUMN "rankPoints" INTEGER NOT NULL DEFAULT 0;

CREATE EXTENSION IF NOT EXISTS rank_points;

DO
$$
    BEGIN
        IF get_points_for_rank(1, 1000) IS NULL THEN
            RAISE EXCEPTION 'momentum_xp extension not working correctly';
        END IF;
    END
$$;