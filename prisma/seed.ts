import "../lib/env";

import { generateApiKey, generateWebhookSecret } from "../lib/utils";
import prisma from "../lib/db";

async function main() {
  const devApiKey =
    process.env.DEV_API_KEY ?? generateApiKey("test");

  const merchant = await prisma.merchant.upsert({
    where: { apiKey: devApiKey },
    update: {},
    create: {
      name: "Unseen Dev Merchant",
      email: "dev@unseen.finance",
      walletAddress: null,
      apiKey: devApiKey,
      apiKeyPrefix: devApiKey.slice(0, 16) + "...",
      network: "devnet",
      webhookUrl: null,
      webhookSecret: generateWebhookSecret(),
    },
  });

  console.log("\n✅ Seeded dev merchant:");
  console.log(`   ID:       ${merchant.id}`);
  console.log(`   Name:     ${merchant.name}`);
  console.log(`   API Key:  ${devApiKey}`);
  console.log(`   Network:  ${merchant.network}`);
  console.log(`\n   Authorization header for testing:`);
  console.log(`   Bearer ${devApiKey}\n`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
