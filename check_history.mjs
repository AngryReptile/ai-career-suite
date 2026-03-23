import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHistory() {
  const history = await prisma.scoutHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(history, null, 2));
}

checkHistory()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
