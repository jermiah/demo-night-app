import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const matchRouter = createTRPCRouter({
  // Get all matches for an event
  all: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input }) => {
      return db.match.findMany({
        where: { eventId: input.eventId },
        include: {
          startupA: true,
          startupB: true,
          startupC: true,
          votes: {
            include: {
              attendee: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Get a specific match
  get: publicProcedure
    .input(z.object({ matchId: z.string() }))
    .query(async ({ input }) => {
      return db.match.findUnique({
        where: { id: input.matchId },
        include: {
          startupA: true,
          startupB: true,
          startupC: true,
          votes: {
            include: {
              attendee: true,
            },
          },
        },
      });
    }),

  // Create a new match
  create: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        startupAId: z.string(),
        startupBId: z.string(),
        startupCId: z.string().optional(),
        roundType: z.string().optional(),
        votingWindow: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Automatically enable oneVsOneMode when a match is created
      await db.event.update({
        where: { id: input.eventId },
        data: { oneVsOneMode: true },
      });

      // Ensure a "Match Vote" award exists for this event
      // This award is used exclusively for match voting (not shown in regular voting)
      const existingMatchAward = await db.award.findFirst({
        where: {
          eventId: input.eventId,
          name: "Match Vote",
        },
      });

      if (!existingMatchAward) {
        const awardCount = await db.award.count({
          where: { eventId: input.eventId },
        });
        await db.award.create({
          data: {
            eventId: input.eventId,
            index: awardCount,
            name: "Match Vote",
            description: "Vote for your favorite startup in this matchup",
            votable: false, // Hidden from regular voting interface
          },
        });
      }

      return db.match.create({
        data: {
          eventId: input.eventId,
          startupAId: input.startupAId,
          startupBId: input.startupBId,
          startupCId: input.startupCId,
          roundType: input.roundType,
          votingWindow: input.votingWindow,
        },
        include: {
          startupA: true,
          startupB: true,
          startupC: true,
        },
      });
    }),

  // Start a match
  start: publicProcedure
    .input(z.object({ matchId: z.string() }))
    .mutation(async ({ input }) => {
      return db.match.update({
        where: { id: input.matchId },
        data: {
          isActive: true,
          startTime: new Date(),
        },
      });
    }),

  // Close voting for a match and compute winner
  closeVoting: publicProcedure
    .input(z.object({ matchId: z.string() }))
    .mutation(async ({ input }) => {
      const match = await db.match.findUnique({
        where: { id: input.matchId },
        include: {
          votes: {
            include: {
              attendee: true,
            },
          },
          startupA: true,
          startupB: true,
          startupC: true,
        },
      });

      if (!match) throw new Error("Match not found");

      // Compute weighted scores
      const result = computeMatchWinner(match);

      return db.match.update({
        where: { id: input.matchId },
        data: {
          isActive: false,
          endTime: new Date(),
          winnerId: result.winnerId,
        },
      });
    }),

  // Get match results with weighted scoring
  getResults: publicProcedure
    .input(z.object({ matchId: z.string() }))
    .query(async ({ input }) => {
      const match = await db.match.findUnique({
        where: { id: input.matchId },
        include: {
          votes: {
            include: {
              attendee: true,
            },
          },
          startupA: true,
          startupB: true,
          startupC: true,
        },
      });

      if (!match) throw new Error("Match not found");

      return computeMatchWinner(match);
    }),

  // Delete a match
  delete: publicProcedure
    .input(z.object({ matchId: z.string() }))
    .mutation(async ({ input }) => {
      return db.match.delete({
        where: { id: input.matchId },
      });
    }),
});

// Helper function to compute match winner with weighted voting
type MatchWithVotes = Prisma.MatchGetPayload<{
  include: {
    votes: {
      include: {
        attendee: true;
      };
    };
    startupA: true;
    startupB: true;
    startupC: true;
  };
}>;

function computeMatchWinner(match: MatchWithVotes) {
  const votesA = match.votes.filter(
    (v) => v.demoId === match.startupAId,
  );
  const votesB = match.votes.filter(
    (v) => v.demoId === match.startupBId,
  );
  const votesC = match.startupCId
    ? match.votes.filter((v) => v.demoId === match.startupCId)
    : [];

  // Separate audience and judge votes
  const audienceVotesA = votesA.filter((v) => v.voteType === "audience");
  const audienceVotesB = votesB.filter((v) => v.voteType === "audience");
  const audienceVotesC = votesC.filter((v) => v.voteType === "audience");

  const judgeVotesA = votesA.filter((v) => v.voteType === "judge");
  const judgeVotesB = votesB.filter((v) => v.voteType === "judge");
  const judgeVotesC = votesC.filter((v) => v.voteType === "judge");

  const totalAudienceVotes =
    audienceVotesA.length + audienceVotesB.length + audienceVotesC.length;
  const totalJudgeVotes =
    judgeVotesA.length + judgeVotesB.length + judgeVotesC.length;

  let finalScoreA = 0;
  let finalScoreB = 0;
  let finalScoreC = 0;

  // Calculate weighted scores (50% audience, 50% judge)
  if (totalAudienceVotes > 0) {
    finalScoreA += (audienceVotesA.length / totalAudienceVotes) * 0.5;
    finalScoreB += (audienceVotesB.length / totalAudienceVotes) * 0.5;
    finalScoreC += (audienceVotesC.length / totalAudienceVotes) * 0.5;
  }

  if (totalJudgeVotes > 0) {
    finalScoreA += (judgeVotesA.length / totalJudgeVotes) * 0.5;
    finalScoreB += (judgeVotesB.length / totalJudgeVotes) * 0.5;
    finalScoreC += (judgeVotesC.length / totalJudgeVotes) * 0.5;
  }

  // If no judges, give full weight to audience
  if (totalJudgeVotes === 0 && totalAudienceVotes > 0) {
    finalScoreA = audienceVotesA.length / totalAudienceVotes;
    finalScoreB = audienceVotesB.length / totalAudienceVotes;
    finalScoreC = audienceVotesC.length / totalAudienceVotes;
  }

  let winnerId = null;
  if (finalScoreA > finalScoreB && finalScoreA > finalScoreC) {
    winnerId = match.startupAId;
  } else if (finalScoreB > finalScoreA && finalScoreB > finalScoreC) {
    winnerId = match.startupBId;
  } else if (finalScoreC > finalScoreA && finalScoreC > finalScoreB) {
    winnerId = match.startupCId;
  }

  return {
    matchId: match.id,
    startupA: match.startupA,
    startupB: match.startupB,
    startupC: match.startupC,
    votesA: {
      total: votesA.length,
      audience: audienceVotesA.length,
      judge: judgeVotesA.length,
    },
    votesB: {
      total: votesB.length,
      audience: audienceVotesB.length,
      judge: judgeVotesB.length,
    },
    votesC: {
      total: votesC.length,
      audience: audienceVotesC.length,
      judge: judgeVotesC.length,
    },
    finalScoreA,
    finalScoreB,
    finalScoreC,
    winnerId,
    winner:
      winnerId === match.startupAId
        ? match.startupA
        : winnerId === match.startupBId
          ? match.startupB
          : winnerId === match.startupCId
            ? match.startupC
            : null,
  };
}
