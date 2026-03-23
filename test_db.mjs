import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const resumes = await prisma.userResume.findMany({
    where: { isSelected: true },
    select: { id: true, userId: true, filename: true, content: true }
  });
  console.log("Active Resumes:");
  for(const r of resumes) {
    console.log(`- ID: ${r.id} | User: ${r.userId} | Content: ${r.content ? String(r.content).substring(0, 100) : "NO CONTENT"}`);
  }
}
run().finally(() => prisma.$disconnect());
