"use client";

import { useState, useEffect } from "react";
import { type Attendee } from "@prisma/client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";
import { useWorkspaceContext } from "../../contexts/WorkspaceContext";

interface MatchVotingProps {
  eventId: string;
  attendee: Attendee;
  isJudge?: boolean;
}

export function MatchVoting({
  eventId,
  attendee,
  isJudge = false,
}: MatchVotingProps) {
  const { event } = useWorkspaceContext();
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const { data: matches, refetch } = api.match.all.useQuery(
    { eventId },
    { refetchInterval: 3000 },
  );

  const { data: myVotes } = api.vote.all.useQuery(
    {
      eventId,
      attendeeId: attendee.id,
    },
    { refetchInterval: 2000 },
  );

  // Find the "Match Vote" award - this is created automatically when matches are created
  // This award is used exclusively for match voting and is hidden from regular voting
  const matchAward = event.awards.find((a) => a.name === "Match Vote");
  const matchAwardId = matchAward?.id;

  const upsertVote = api.vote.upsert.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const activeMatch = matches?.find((m) => m.isActive);

  useEffect(() => {
    if (!activeMatch) {
      setSelectedDemo(null);
      return;
    }

    // Check if user already voted in this match
    const existingVote = myVotes?.find((v) => v.matchId === activeMatch.id);
    if (existingVote) {
      setSelectedDemo(existingVote.demoId);
    }
  }, [activeMatch, myVotes]);

  if (!activeMatch) {
    return (
      <div className="flex size-full items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-gray-500">
              No active match at the moment
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Please wait for the next round to begin!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!matchAwardId) {
    return (
      <div className="flex size-full items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-red-600">
              Match Vote award not found
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Please contact the administrator to set up match voting.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleVote = (demoId: string) => {
    if (!activeMatch || !matchAwardId) return;

    setSelectedDemo(demoId);

    // Vote for the selected startup in this matchup
    // The vote is linked to the match via matchId
    upsertVote.mutate({
      eventId,
      attendeeId: attendee.id,
      awardId: matchAwardId,
      demoId,
      matchId: activeMatch.id,
    });
  };

  return (
    <div className="flex size-full flex-col items-center justify-center gap-6 p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Match Header */}
        <Card className="border-2 border-blue-500">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔴</span>
                <div>
                  <div className="text-xl font-bold">
                    LIVE MATCH: {activeMatch.roundType ?? "Current Match"}
                  </div>
                  <div className="text-sm font-normal opacity-90">
                    Choose your favorite startup
                  </div>
                </div>
              </div>
              {isJudge && (
                <span className="rounded-full bg-purple-600 px-3 py-1 text-sm font-semibold text-white">
                  Judge Vote
                </span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Matchup Cards */}
        <div className="space-y-4">
          <p className="text-center text-lg font-semibold text-gray-700">
            Vote for your favorite startup in this matchup:
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Startup A */}
            <Card
              className={`h-full cursor-pointer transition-all duration-200 ${
                selectedDemo === activeMatch.startupAId
                  ? "ring-4 ring-blue-500 shadow-xl scale-105"
                  : "hover:shadow-lg hover:scale-102"
              }`}
              onClick={() => handleVote(activeMatch.startupAId)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-center text-xl">
                  {activeMatch.startupA.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col">
                {activeMatch.startupA.description && (
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600">
                    {activeMatch.startupA.description}
                  </p>
                )}
                <Button
                  className="w-full"
                  size="lg"
                  variant={
                    selectedDemo === activeMatch.startupAId
                      ? "default"
                      : "outline"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote(activeMatch.startupAId);
                  }}
                >
                  {selectedDemo === activeMatch.startupAId
                    ? "✓ Voted"
                    : "Vote for this Startup"}
                </Button>
              </CardContent>
            </Card>

            {/* Startup B */}
            <Card
              className={`h-full cursor-pointer transition-all duration-200 ${
                selectedDemo === activeMatch.startupBId
                  ? "ring-4 ring-blue-500 shadow-xl scale-105"
                  : "hover:shadow-lg hover:scale-102"
              }`}
              onClick={() => handleVote(activeMatch.startupBId)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-center text-xl">
                  {activeMatch.startupB.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col">
                {activeMatch.startupB.description && (
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600">
                    {activeMatch.startupB.description}
                  </p>
                )}
                <Button
                  className="w-full"
                  size="lg"
                  variant={
                    selectedDemo === activeMatch.startupBId
                      ? "default"
                      : "outline"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote(activeMatch.startupBId);
                  }}
                >
                  {selectedDemo === activeMatch.startupBId
                    ? "✓ Voted"
                    : "Vote for this Startup"}
                </Button>
              </CardContent>
            </Card>

            {/* Startup C (Optional) */}
            {activeMatch.startupC && (
              <Card
                className={`h-full cursor-pointer transition-all duration-200 ${
                  selectedDemo === activeMatch.startupCId
                    ? "ring-4 ring-blue-500 shadow-xl scale-105"
                    : "hover:shadow-lg hover:scale-102"
                }`}
                onClick={() => activeMatch.startupCId && handleVote(activeMatch.startupCId)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-center text-xl">
                    {activeMatch.startupC.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col">
                  {activeMatch.startupC.description && (
                    <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600">
                      {activeMatch.startupC.description}
                    </p>
                  )}
                  <Button
                    className="w-full"
                    size="lg"
                    variant={
                      selectedDemo === activeMatch.startupCId
                        ? "default"
                        : "outline"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeMatch.startupCId) handleVote(activeMatch.startupCId);
                    }}
                  >
                    {selectedDemo === activeMatch.startupCId
                      ? "✓ Voted"
                      : "Vote for this Startup"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {selectedDemo && (
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-sm font-semibold text-green-700">
                ✓ Your vote has been recorded!
              </p>
              <p className="mt-1 text-xs text-green-600">
                You can change your vote by selecting a different startup
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
