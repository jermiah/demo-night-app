// Create test data for match mode demo
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create or get the sf-demo event
  const event = await prisma.event.upsert({
    where: { id: 'sf-demo' },
    update: { oneVsOneMode: true },
    create: {
      id: 'sf-demo',
      name: 'SF Demo Night',
      date: new Date(),
      url: 'sf-demo',
      secret: 'test-secret',
      oneVsOneMode: true,
    },
  });

  console.log('✅ Event created:', event.name);

  // Delete existing demos to ensure clean state
  await prisma.demo.deleteMany({
    where: { eventId: 'sf-demo' },
  });
  console.log('🗑️ Deleted existing demos');

  // Create some demo startups sequentially to avoid potential locking issues
  const demosData = [
    {
      id: 'demo-1',
      index: 1,
      name: 'AI Chatbot Pro',
      description: 'Advanced AI-powered customer service chatbot',
      email: 'demo1@example.com',
      url: 'https://example.com/demo1',
    },
    {
      id: 'demo-2',
      index: 2,
      name: 'CloudSync',
      description: 'Real-time cloud synchronization platform',
      email: 'demo2@example.com',
      url: 'https://example.com/demo2',
    },
    {
      id: 'demo-3',
      index: 3,
      name: 'DataViz Pro',
      description: 'Beautiful data visualization tool',
      email: 'demo3@example.com',
      url: 'https://example.com/demo3',
    },
    {
      id: 'demo-4',
      index: 4,
      name: 'SecureAuth',
      description: 'Next-gen authentication system',
      email: 'demo4@example.com',
      url: 'https://example.com/demo4',
    },
  ];

  const demos = [];
  for (const demo of demosData) {
    const result = await prisma.demo.upsert({
      where: { id: demo.id },
      update: {
        // Update fields if it exists, to ensure data is correct
        eventId: 'sf-demo',
        index: demo.index,
        name: demo.name,
        description: demo.description,
        email: demo.email,
        url: demo.url,
        votable: true,
      },
      create: {
        id: demo.id,
        eventId: 'sf-demo',
        index: demo.index,
        name: demo.name,
        description: demo.description,
        email: demo.email,
        url: demo.url,
        votable: true,
      },
    });
    demos.push(result);
    console.log(`✅ Created/Updated demo: ${demo.name}`);

    const count = await prisma.demo.count({ where: { eventId: 'sf-demo' } });
    console.log(`   Current demo count: ${count}`);
  }

  console.log(`✅ Created ${demos.length} demo startups`);

  // Create a default award for voting
  const award = await prisma.award.upsert({
    where: { id: 'match-vote-award' },
    update: {},
    create: {
      id: 'match-vote-award',
      eventId: 'sf-demo',
      index: 1,
      name: 'Match Vote',
      description: 'Vote in match mode',
      votable: true,
    },
  });

  console.log('✅ Award created:', award.name);

  console.log('\n🎉 All test data created successfully!\n');
  console.log('You can now:');
  console.log('1. Refresh http://localhost:3000/admin/test-match');
  console.log('2. Select two startups from the dropdowns');
  console.log('3. Create a match and start testing!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
