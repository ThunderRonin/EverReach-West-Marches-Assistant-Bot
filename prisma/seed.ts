import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Load items from JSON file
  const itemsPath = path.join(__dirname, '..', 'data', 'items.json');
  const itemsData = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));

  // Create items in database
  for (const item of itemsData) {
    await prisma.item.upsert({
      where: { key: item.key },
      update: {},
      create: {
        key: item.key,
        name: item.name,
        baseValue: item.baseValue,
      },
    });
  }

  console.log(`Seeded ${itemsData.length} items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
