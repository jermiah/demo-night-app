import { type Feedback, PrismaClient, SubmissionStatus } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Comprehensive seed script for Demo Night App
 * 
 * Seeds:
 * - Test admin user
 * - Event with match mode enabled
 * - Multiple demos/startups
 * - Matches (active and inactive) for testing voting flow
 * - Match Vote award
 * - Regular awards for legacy voting
 * - Test attendees (audience and judges) - preserved from existing
 * - Sample votes for testing
 */
async function main() {
  console.log("🌱 Starting database seed...");

  // Create test admin user
  await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      name: "Test User",
      email: "test@example.com",
    },
  });
  console.log("✅ Created test admin user");

  // Demo/Startup information
  const demosInfo = [
    {
      name: "Cofactory",
      description: "The future of value creation in an AI-based economy.",
      url: "https://cofactory.ai/",
    },
    {
      name: "Revamp",
      description:
        "The future of email + SMS personalization for brands and customers is here.",
      url: "https://getrevamp.ai/",
    },
    {
      name: "Cognition",
      description:
        "We are an applied AI lab focused on reasoning, and code is just the beginning.",
      url: "https://cognition.ai/",
    },
    {
      name: "Cursor",
      description: "The AI-first Code Editor.",
      url: "https://cursor.sh/",
    },
    {
      name: "Paradigm.ai",
      description: "Perfectly human-in-the-loop agents that work for you.",
      url: "https://paradigm.ai/",
    },
    {
      name: "Marblism",
      description: "Launch your React and Node.js app in minutes.",
      url: "https://marblism.com/",
    },
    {
      name: "Mercor",
      description:
        "An AI-powered platform that sources, vets, and pays your next employees.",
      url: "https://mercor.com/",
    },
    {
      name: "LlamaIndex",
      description: "The central interface between LLMs and your external data.",
      url: "https://www.llamaindex.ai/",
    },
    {
      name: "Higgsfield AI",
      description:
        "Using video AI to democratize social media video creation for all.",
      url: "https://higgsfield.ai/",
    },
    {
      name: "Software Applications Inc.",
      description: "Rethinking the personal computing experience",
      url: "https://software.inc/",
    },
  ];

  const demos = demosInfo.map((demo, index) => ({
    id: `demo-${index + 1}`,
    name: demo.name,
    description: demo.description,
    index: index,
    email: `demo-${index + 1}@example.com`,
    url: demo.url,
    votable: true,
  }));

  const submissions = demos.map((demo) => ({
    id: `submission-${demo.id}`,
    name: demo.name,
    tagline: demo.description.split(".")[0]?.trim() ?? demo.name,
    description: demo.description,
    email: demo.email,
    url: demo.url,
    pocName: "Ada Lovelace",
    demoUrl: demo.url,
    status: SubmissionStatus.CONFIRMED,
    flagged: false,
    rating: Math.floor(Math.random() * 3) + 3,
    comment: "",
  }));

  // Regular awards for legacy voting
  const awardsInfo = [
    {
      name: "🏆 Best Overall",
      description: "Award for the best overall demo!",
    },
    {
      name: "🤖 Best Technology",
      description: "Award for the most technically impressive demo!",
    },
    {
      name: "🎨 Best Design",
      description: "Award for the most visually appealing demo!",
    },
  ];

  const awards = awardsInfo.map((award, index) => ({
    id: `award-${index + 1}`,
    name: award.name,
    description: award.description,
    winnerId: `demo-${index + 1}`,
    index: index,
    votable: true,
  }));

  type AttendeeSeed = {
    name: string;
    email?: string | null;
    linkedin?: string | null;
    type?: string | null;
  };

  // Test users for voting flow - Audience members (preserved)
  const audienceMembers: AttendeeSeed[] = [
    {
      name: "Alice Johnson",
      email: "alice@example.com",
      type: "AUDIENCE",
    },
    {
      name: "Bob Smith",
      email: "bob@example.com",
      type: "AUDIENCE",
    },
    {
      name: "Carol Williams",
      email: "carol@example.com",
      type: "AUDIENCE",
    },
  ];

  // Test users for voting flow - Judges (preserved)
  const judges: AttendeeSeed[] = [
    {
      name: "Judge Sarah Chen",
      email: "judge.sarah@example.com",
      type: "JUDGE",
    },
    {
      name: "Judge Michael Park",
      email: "judge.michael@example.com",
      type: "JUDGE",
    },
  ];

  // Legacy attendees (for backward compatibility)
  const legacyAttendeesInfo: AttendeeSeed[] = [
    {
      name: "Chappy Asel",
      email: "chappy@aicollective.com",
      linkedin: "https://linkedin.com/in/chappyasel",
      type: "Founder",
    },
    {
      name: "Tim Cook",
      email: "tim@apple.com",
      type: null,
    },
    {
      name: "Elon Musk",
      type: "Investor",
    },
  ];

  // Combine all attendees
  const allAttendeesInfo = [
    ...audienceMembers,
    ...judges,
    ...legacyAttendeesInfo,
  ] satisfies AttendeeSeed[];

  const attendees = allAttendeesInfo.map((attendee, index) => ({
    id: `attendee-${index + 1}`,
    name: attendee.name,
    email: attendee.email ?? null,
    linkedin: attendee.linkedin ?? null,
    type: attendee.type ?? null,
  }));

  // Create or update event with match mode enabled
  // First, ensure attendees exist
  const createdAttendees: {
    id: string;
    name: string | null;
    email: string | null;
    linkedin: string | null;
    type: string | null;
  }[] = [];
  for (const attendeeData of attendees) {
    const attendee = await prisma.attendee.upsert({
      where: { id: attendeeData.id },
      update: {
        name: attendeeData.name,
        email: attendeeData.email,
        linkedin: attendeeData.linkedin,
        type: attendeeData.type,
      },
      create: {
        id: attendeeData.id,
        name: attendeeData.name,
        email: attendeeData.email,
        linkedin: attendeeData.linkedin,
        type: attendeeData.type,
      },
    });
    createdAttendees.push(attendee);
  }
  console.log(`✅ Created/updated ${createdAttendees.length} attendees`);

  // Create or update event
  const event = await prisma.event.upsert({
    where: { id: "sf-demo" },
    update: {
      oneVsOneMode: true, // Enable match mode
      attendees: {
        connect: createdAttendees.map((a) => ({ id: a.id })),
      },
    },
    create: {
      id: "sf-demo",
      name: "SF Demo Night 🚀",
      date: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      url: "https://lu.ma/demo-night",
      oneVsOneMode: true, // Enable match mode
      submissions: { create: submissions },
      demos: { create: demos },
      awards: { create: awards },
      attendees: {
        connect: createdAttendees.map((a) => ({ id: a.id })),
      },
    },
  });
  console.log("✅ Created/updated event with match mode enabled");

  // Get the created demos for match creation
  const createdDemos = await prisma.demo.findMany({
    where: { eventId: event.id },
    orderBy: { index: "asc" },
  });

  // Find audience and judge attendees
  const audienceAttendees = createdAttendees.filter(
    (a) => a.type === "AUDIENCE",
  );
  const judgeAttendees = createdAttendees.filter((a) => a.type === "JUDGE");

  // Ensure "Match Vote" award exists
  let matchAward = await prisma.award.findFirst({
    where: {
      eventId: event.id,
      name: "Match Vote",
    },
  });

  if (!matchAward) {
    const awardCount = await prisma.award.count({
      where: { eventId: event.id },
    });
    matchAward = await prisma.award.create({
      data: {
        eventId: event.id,
        index: awardCount,
        name: "Match Vote",
        description: "Vote for your favorite startup in this matchup",
        votable: false, // Hidden from regular voting interface
      },
    });
    console.log("✅ Created Match Vote award");
  } else {
    console.log("✅ Match Vote award already exists");
  }

  // Create matches for testing
  const matches = [
    {
      // Active match - Round 1 (2 startups)
      startupAId: createdDemos[0]!.id, // Cofactory
      startupBId: createdDemos[1]!.id, // Revamp
      startupCId: null,
      roundType: "Round 1",
      isActive: true,
      votingWindow: 300, // 5 minutes
    },
    {
      // Inactive match - Round 1 (2 startups)
      startupAId: createdDemos[2]!.id, // Cognition
      startupBId: createdDemos[3]!.id, // Cursor
      startupCId: null,
      roundType: "Round 1",
      isActive: false,
      votingWindow: 300,
    },
    {
      // Inactive match - Round 1 (3 startups)
      startupAId: createdDemos[4]!.id, // Paradigm.ai
      startupBId: createdDemos[5]!.id, // Marblism
      startupCId: createdDemos[6]!.id, // Mercor
      roundType: "Round 1",
      isActive: false,
      votingWindow: 300,
    },
    {
      // Inactive match - Round 2 (2 startups)
      startupAId: createdDemos[7]!.id, // LlamaIndex
      startupBId: createdDemos[8]!.id, // Higgsfield AI
      startupCId: null,
      roundType: "Round 2",
      isActive: false,
      votingWindow: 300,
    },
  ];

  // Delete existing matches for clean seed
  await prisma.match.deleteMany({
    where: { eventId: event.id },
  });
  console.log("🧹 Cleaned up existing matches");

  // Create matches
  const createdMatches = [];
  for (const matchData of matches) {
    const match = await prisma.match.create({
      data: {
        eventId: event.id,
        startupAId: matchData.startupAId,
        startupBId: matchData.startupBId,
        startupCId: matchData.startupCId ?? undefined,
        roundType: matchData.roundType,
        isActive: matchData.isActive,
        votingWindow: matchData.votingWindow,
        startTime: matchData.isActive ? new Date() : null,
      },
    });
    createdMatches.push(match);
    console.log(
      `✅ Created ${matchData.roundType} match: ${matchData.isActive ? "ACTIVE" : "inactive"}`,
    );
  }

  // Create sample votes for the active match (for testing)
  const activeMatch = createdMatches.find((m) => m.isActive);
  if (activeMatch && matchAward) {
    const sampleVotes = [];

    // Audience votes for active match
    if (audienceAttendees.length > 0 && createdDemos.length >= 2) {
      // Alice votes for startup A
      if (audienceAttendees[0]) {
        sampleVotes.push({
          eventId: event.id,
          attendeeId: audienceAttendees[0].id,
          awardId: matchAward.id,
          demoId: activeMatch.startupAId,
          matchId: activeMatch.id,
          voteType: "audience",
        });
      }
      // Bob votes for startup B
      if (audienceAttendees[1]) {
        sampleVotes.push({
          eventId: event.id,
          attendeeId: audienceAttendees[1].id,
          awardId: matchAward.id,
          demoId: activeMatch.startupBId,
          matchId: activeMatch.id,
          voteType: "audience",
        });
      }
    }

    // Judge votes for active match
    if (judgeAttendees.length > 0) {
      // Judge Sarah votes for startup A
      if (judgeAttendees[0]) {
        sampleVotes.push({
          eventId: event.id,
          attendeeId: judgeAttendees[0].id,
          awardId: matchAward.id,
          demoId: activeMatch.startupAId,
          matchId: activeMatch.id,
          voteType: "judge",
        });
      }
    }

    // Create votes
    if (sampleVotes.length > 0) {
      await prisma.vote.createMany({
        data: sampleVotes,
        skipDuplicates: true,
      });
      console.log(`✅ Created ${sampleVotes.length} sample votes for active match`);
    }
  }

  // Create some legacy votes for regular awards (for backward compatibility)
  const legacyVotes = Array.from({ length: 3 }, (_, index) => ({
    eventId: event.id,
    attendeeId: createdAttendees[index]?.id ?? createdAttendees[0]!.id,
    awardId: awards[index]?.id ?? awards[0]!.id,
    demoId: createdDemos[index]?.id ?? createdDemos[0]!.id,
    voteType: "audience" as const,
  }));

  await prisma.vote.createMany({
    data: legacyVotes,
    skipDuplicates: true,
  });
  console.log(`✅ Created ${legacyVotes.length} legacy votes for regular awards`);

  // Create feedback
  const feedbackInfo = [
    {
      rating: 5,
      claps: 7,
      tellMeMore: true,
      comment: "Great demo! Please tell me more! 😄",
    },
    {
      rating: 4,
      claps: 2,
      quickActions: ["invest"],
      comment: "Well done!",
    },
    {
      rating: 1,
      claps: 0,
      comment: "Interesting idea. Terrible execution.",
    },
  ];

  const feedback = feedbackInfo.map((feedback, index) => ({
    eventId: event.id,
    attendeeId: createdAttendees[index]?.id ?? createdAttendees[0]!.id,
    demoId: createdDemos[0]!.id,
    rating: feedback.rating,
    claps: feedback.claps,
    tellMeMore: feedback.tellMeMore ?? false,
    comment: feedback.comment,
  }));

  await prisma.feedback.createMany({
    data: feedback,
    skipDuplicates: true,
  });
  console.log(`✅ Created ${feedback.length} feedback entries`);

  // Create event feedback
  const eventFeedbackInfo = [
    {
      comment:
        "Amazing event! The demos were incredibly inspiring. Looking forward to the next one!",
    },
    {
      comment:
        "Great organization and fantastic lineup of demos. The voting system worked smoothly.",
    },
  ];

  const eventFeedback = eventFeedbackInfo.map((feedback, index) => ({
    eventId: event.id,
    attendeeId: createdAttendees[index]?.id ?? createdAttendees[0]!.id,
    comment: feedback.comment,
  }));

  await prisma.eventFeedback.createMany({
    data: eventFeedback,
    skipDuplicates: true,
  });
  console.log(`✅ Created ${eventFeedback.length} event feedback entries`);

  // Summary
  console.log("\n📊 Seed Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Event: ${event.name} (${event.id})`);
  console.log(`   Match Mode: ${event.oneVsOneMode ? "ENABLED" : "DISABLED"}`);
  console.log(`✅ Demos: ${createdDemos.length}`);
  console.log(`✅ Matches: ${createdMatches.length}`);
  console.log(`   Active: ${createdMatches.filter((m) => m.isActive).length}`);
  console.log(`   Inactive: ${createdMatches.filter((m) => !m.isActive).length}`);
  console.log(`✅ Awards: ${awards.length + 1} (${awards.length} regular + 1 Match Vote)`);
  console.log(`✅ Attendees: ${createdAttendees.length}`);
  console.log(`   Audience: ${audienceAttendees.length}`);
  console.log(`   Judges: ${judgeAttendees.length}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n🎉 Database seeded successfully!");
  console.log("\n💡 Testing Instructions:");
  console.log("   1. Login as audience: http://localhost:3000/login/audience");
  console.log("      - Email: alice@example.com");
  console.log("   2. Login as judge: http://localhost:3000/login/judge");
  console.log("      - Email: judge.sarah@example.com");
  console.log("   3. Navigate to voting page to see active match");
}

main()
  .then(() => {
    console.log("Seeded data");
  })
  .catch((e) => {
    console.error(e);
  })
  .finally(() => {
    prisma.$disconnect();
  });
