// READ-ONLY inspection script -- only .findMany() calls, no writes. Temporary, deleted after use.
import { PrismaClient } from "@prisma/client";

const DATABASE_URL = process.env.PROD_DATABASE_URL;
const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL });

const webhookEvents = await prisma.webhookEvent.findMany({
  where: { provider: "PADDLE" },
  orderBy: { receivedAt: "desc" },
  take: 20,
});
console.log("=== WebhookEvent (provider=PADDLE) ===");
console.log(JSON.stringify(webhookEvents, null, 2));

const premiumSubs = await prisma.premiumSubscription.findMany({
  where: { provider: "PADDLE" },
  orderBy: { startedAt: "desc" },
  take: 20,
});
console.log("\n=== PremiumSubscription (provider=PADDLE) ===");
console.log(JSON.stringify(premiumSubs, null, 2));

const usersWithPaddleCustomer = await prisma.user.findMany({
  where: { paddleCustomerId: { not: null } },
  select: { id: true, email: true, username: true, paddleCustomerId: true },
});
console.log("\n=== Users con paddleCustomerId ===");
console.log(JSON.stringify(usersWithPaddleCustomer, null, 2));

const coinPurchases = await prisma.coinPurchase.findMany({
  orderBy: { createdAt: "desc" },
  take: 10,
});
console.log("\n=== CoinPurchase (ultimas 10) ===");
console.log(JSON.stringify(coinPurchases, null, 2));

await prisma.$disconnect();
