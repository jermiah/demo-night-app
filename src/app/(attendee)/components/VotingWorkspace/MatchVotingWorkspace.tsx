"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";
import { useWorkspaceContext } from "../../contexts/WorkspaceContext";

/**
 * Simplified Match Voting Workspace
 * 
 * This component directly handles match voting without complex dependencies.
 * It checks for active matches and displays them for voting.
 */
export function MatchVotingWorkspace() {
  const { currentEvent, attendee } = useWorkspaceContext();
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  // Fetch matches and votes directly
  const { data: matches, refetch: refetchMatches } = api.match.all.useQuery(
    { eventId: currentEvent.id },
    { refetchInterval: 3000 },
  );

  const { data: myVotes } = api.vote.all.useQuery(
    {
      eventId: currentEvent.id,
      attendeeId: attendee.id,
    },
    { refetchInterval: 2000 },
  );

  // Get event to find Match Vote award
  const { data: event } = api.event.get.useQuery(currentEvent.id);
  const matchAward = event?.awards.find((a) => a.name === "Match Vote");
  const matchAwardId = matchAward?.id ?? event?.awards[0]?.id;

  const upsertVote = api.vote.upsert.useMutation({
    onSuccess: () => {
      refetchMatches();
    },
  });

  const activeMatch = matches?.find((m) => m.isActive);
  const isJudge = attendee.type === "JUDGE";

  // Load existing vote for active match
  useEffect(() => {
    if (!activeMatch || !myVotes) {
      setSelectedDemo(null);
      return;
    }

    const existingVote = myVotes.find((v) => v.matchId === activeMatch.id);
    if (existingVote) {
      setSelectedDemo(existingVote.demoId);
    }
  }, [activeMatch, myVotes]);

  // No active match
  if (!activeMatch) {
    return (
      <div className="flex min-h-[calc(100dvh-120px)] w-full items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-lg border-border bg-card/50 shadow-2xl backdrop-blur-sm">
          <CardContent className="py-16 text-center md:py-20">
            <div className="mb-4 text-6xl animate-pulse">⏳</div>
            <p className="text-xl font-semibold text-foreground md:text-2xl">
              No active match at the moment
            </p>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              Please wait for the next round to begin!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No award found
  if (!matchAwardId) {
    return (
      <div className="flex min-h-[calc(100dvh-120px)] w-full items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-lg border-destructive/50 bg-destructive/10 shadow-2xl backdrop-blur-sm">
          <CardContent className="py-16 text-center md:py-20">
            <div className="mb-4 text-6xl">⚠️</div>
            <p className="text-xl font-semibold text-destructive md:text-2xl">
              Match Vote award not found
            </p>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
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

    upsertVote.mutate({
      eventId: currentEvent.id,
      attendeeId: attendee.id,
      awardId: matchAwardId,
      demoId,
      matchId: activeMatch.id,
    });
  };

  return (
    <div className="flex min-h-[calc(100dvh-120px)] w-full flex-col items-center justify-center gap-8 p-4 pb-8 md:gap-10 md:p-6 md:pb-12">
      <div className="w-full max-w-6xl space-y-8">
        {/* Match Header */}
        <Card className="border-border bg-card/50 shadow-2xl backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pointer-events-none" />
          <CardHeader className="relative px-6 py-5 md:px-8 md:py-6 border-b border-white/5">
            <CardTitle className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-4">
                <span className="text-4xl animate-pulse md:text-5xl drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">🔴</span>
                <div className="text-center sm:text-left">
                  <div className="text-2xl font-bold md:text-4xl text-foreground tracking-tight">
                    LIVE MATCH: <span className="text-primary">{activeMatch.roundType ?? "Current Match"}</span>
                  </div>
                  <div className="mt-2 text-base font-normal text-muted-foreground md:text-lg">
                    Choose your favorite startup
                  </div>
                </div>
              </div>
              {isJudge && (
                <span className="rounded-full bg-purple-600/20 border border-purple-500/50 px-5 py-2.5 text-base font-semibold text-purple-300 shadow-[0_0_15px_rgba(147,51,234,0.3)] md:px-6 md:py-3 md:text-lg backdrop-blur-md">
                  ⚖️ Judge Vote
                </span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Matchup Cards */}
        <div className="space-y-8">
          <p className="text-center text-xl font-medium text-muted-foreground md:text-2xl lg:text-3xl">
            Vote for your favorite startup in this matchup:
          </p>

          <div
            className={`grid w-full gap-8 md:gap-10 ${
              activeMatch.startupC
                ? "grid-cols-[repeat(auto-fit,minmax(320px,1fr))]"
                : "grid-cols-[repeat(auto-fit,minmax(360px,1fr))]"
            }`}
          >
            {/* Startup A */}
            <Card
              className={`group relative h-full min-h-[320px] min-w-[320px] cursor-pointer overflow-hidden transition-all duration-300 md:min-h-[380px] bg-card/40 backdrop-blur-sm ${
                selectedDemo === activeMatch.startupAId
                  ? "border-primary shadow-[0_0_30px_rgba(124,58,237,0.3)] scale-[1.02]"
                  : "border-white/10 hover:border-primary/50 hover:shadow-xl hover:scale-[1.01] hover:bg-card/60"
              }`}
              onClick={() => handleVote(activeMatch.startupAId)}
            >
              {selectedDemo === activeMatch.startupAId && (
                <div className="absolute right-3 top-3 z-10 rounded-full bg-primary p-2.5 shadow-[0_0_15px_rgba(124,58,237,0.5)] md:right-4 md:top-4 md:p-3">
                  <span className="text-2xl text-primary-foreground md:text-3xl">✓</span>
                </div>
              )}
              <CardHeader className="pb-6 pt-8 md:pb-8 md:pt-10">
                <CardTitle className="text-center text-3xl font-bold md:text-4xl lg:text-5xl text-foreground tracking-tight group-hover:text-primary transition-colors">
                  {activeMatch.startupA.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 px-8 pb-8 md:px-10 md:pb-10">
                {activeMatch.startupA.description && (
                  <p className="min-h-[120px] flex-1 text-lg leading-relaxed text-muted-foreground md:text-xl md:leading-8 lg:text-2xl lg:leading-9">
                    {activeMatch.startupA.description}
                  </p>
                )}
                <Button
                  className={`w-full text-lg font-semibold md:h-14 md:text-xl lg:h-16 lg:text-2xl transition-all duration-300 ${
                    selectedDemo === activeMatch.startupAId
                      ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:bg-primary/90"
                      : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                  }`}
                  size="lg"
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
              className={`group relative h-full min-h-[320px] min-w-[320px] cursor-pointer overflow-hidden transition-all duration-300 md:min-h-[380px] bg-card/40 backdrop-blur-sm ${
                selectedDemo === activeMatch.startupBId
                  ? "border-primary shadow-[0_0_30px_rgba(124,58,237,0.3)] scale-[1.02]"
                  : "border-white/10 hover:border-primary/50 hover:shadow-xl hover:scale-[1.01] hover:bg-card/60"
              }`}
              onClick={() => handleVote(activeMatch.startupBId)}
            >
              {selectedDemo === activeMatch.startupBId && (
                <div className="absolute right-3 top-3 z-10 rounded-full bg-primary p-2.5 shadow-[0_0_15px_rgba(124,58,237,0.5)] md:right-4 md:top-4 md:p-3">
                  <span className="text-2xl text-primary-foreground md:text-3xl">✓</span>
                </div>
              )}
              <CardHeader className="pb-6 pt-8 md:pb-8 md:pt-10">
                <CardTitle className="text-center text-3xl font-bold md:text-4xl lg:text-5xl text-foreground tracking-tight group-hover:text-primary transition-colors">
                  {activeMatch.startupB.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 px-8 pb-8 md:px-10 md:pb-10">
                {activeMatch.startupB.description && (
                  <p className="min-h-[120px] flex-1 text-lg leading-relaxed text-muted-foreground md:text-xl md:leading-8 lg:text-2xl lg:leading-9">
                    {activeMatch.startupB.description}
                  </p>
                )}
                <Button
                  className={`w-full text-lg font-semibold md:h-14 md:text-xl lg:h-16 lg:text-2xl transition-all duration-300 ${
                    selectedDemo === activeMatch.startupBId
                      ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:bg-primary/90"
                      : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                  }`}
                  size="lg"
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
                className={`group relative h-full min-h-[320px] min-w-[320px] cursor-pointer overflow-hidden transition-all duration-300 md:min-h-[380px] bg-card/40 backdrop-blur-sm ${
                  selectedDemo === activeMatch.startupCId
                    ? "border-primary shadow-[0_0_30px_rgba(124,58,237,0.3)] scale-[1.02]"
                    : "border-white/10 hover:border-primary/50 hover:shadow-xl hover:scale-[1.01] hover:bg-card/60"
                }`}
                onClick={() => activeMatch.startupCId && handleVote(activeMatch.startupCId)}
              >
                {selectedDemo === activeMatch.startupCId && (
                  <div className="absolute right-3 top-3 z-10 rounded-full bg-primary p-2.5 shadow-[0_0_15px_rgba(124,58,237,0.5)] md:right-4 md:top-4 md:p-3">
                    <span className="text-2xl text-primary-foreground md:text-3xl">✓</span>
                  </div>
                )}
                <CardHeader className="pb-6 pt-8 md:pb-8 md:pt-10">
                  <CardTitle className="text-center text-3xl font-bold md:text-4xl lg:text-5xl text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {activeMatch.startupC.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-6 px-8 pb-8 md:px-10 md:pb-10">
                  {activeMatch.startupC.description && (
                    <p className="min-h-[120px] flex-1 text-lg leading-relaxed text-muted-foreground md:text-xl md:leading-8 lg:text-2xl lg:leading-9">
                      {activeMatch.startupC.description}
                    </p>
                  )}
                  <Button
                    className={`w-full text-lg font-semibold md:h-14 md:text-xl lg:h-16 lg:text-2xl transition-all duration-300 ${
                      selectedDemo === activeMatch.startupCId
                        ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                    }`}
                    size="lg"
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
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center shadow-[0_0_30px_rgba(34,197,94,0.1)] backdrop-blur-md md:p-8">
              <p className="text-xl font-bold text-green-400 md:text-2xl drop-shadow-sm">
                ✓ Your vote has been recorded!
              </p>
              <p className="mt-3 text-base text-green-300/80 md:text-lg">
                You can change your vote by selecting a different startup
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

