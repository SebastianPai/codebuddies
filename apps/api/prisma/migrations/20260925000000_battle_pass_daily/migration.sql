-- Battle Pass por días: cada día que el usuario entra desbloquea el
-- siguiente. Las temporadas existentes pasan a DAILY (default); el nivel
-- que cada usuario ya ganó con XP se respeta y sigue sumando por días.
CREATE TYPE "BattlePassProgressMode" AS ENUM ('XP', 'DAILY');

ALTER TABLE "BattlePassSeason" ADD COLUMN "progressMode" "BattlePassProgressMode" NOT NULL DEFAULT 'DAILY';

ALTER TABLE "UserBattlePassProgress" ADD COLUMN "lastCheckInDay" TEXT;
