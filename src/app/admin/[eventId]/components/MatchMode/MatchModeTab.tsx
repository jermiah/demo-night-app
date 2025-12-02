"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { MatchView } from "./MatchView";

interface MatchModeTabProps {
  eventId: string;
}

export function MatchModeTab({ eventId }: MatchModeTabProps) {
  const [selectedDemoA, setSelectedDemoA] = useState<string>("");
  const [selectedDemoB, setSelectedDemoB] = useState<string>("");
  const [selectedDemoC, setSelectedDemoC] = useState<string>("none");
  const [roundType, setRoundType] = useState<string>("Round 1");

  const { data: demos } = api.demo.all.useQuery({ eventId });
  const { data: matches, refetch: refetchMatches } = api.match.all.useQuery({
    eventId,
  });

  // Get winners from previous rounds
  const winners = matches
    ?.filter((m) => m.winnerId)
    .map((m) => m.winnerId);

  const filteredDemos = demos?.filter((demo) => {
    if (roundType === "Round 1") return true;
    // For subsequent rounds, only show winners or allow all if manually selected?
    // User asked for "automatically goes", so let's prioritize winners but maybe keep all for flexibility?
    // Or strictly filter? "automatically goes" implies strictness or at least grouping.
    // Let's sort winners to the top.
    return true;
  }).sort((a, b) => {
    const aWon = winners?.includes(a.id);
    const bWon = winners?.includes(b.id);
    if (aWon && !bWon) return -1;
    if (!aWon && bWon) return 1;
    return 0;
  });
  const createMatch = api.match.create.useMutation({
    onSuccess: () => {
      refetchMatches();
      setSelectedDemoA("");
      setSelectedDemoB("");
      setSelectedDemoC("none");
    },
  });

  const handleCreateMatch = () => {
    if (!selectedDemoA || !selectedDemoB) return;
    if (selectedDemoA === selectedDemoB) {
      alert("Please select different startups");
      return;
    }

    createMatch.mutate({
      eventId,
      startupAId: selectedDemoA,
      startupBId: selectedDemoB,
      startupCId: selectedDemoC === "none" ? undefined : selectedDemoC,
      roundType,
      votingWindow: 300, // 5 minutes default
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Match</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {demos?.length === 0 && (
            <div className="mb-4 rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    No demos found
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      No demos found for this event. Run the test data script:
                      <code className="ml-1 rounded bg-yellow-100 px-1 py-0.5">
                        node create-test-data.js
                      </code>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Startup A
              </label>
              <Select value={selectedDemoA} onValueChange={setSelectedDemoA}>
                <SelectTrigger>
                  <SelectValue placeholder="Select startup A" />
                </SelectTrigger>
                <SelectContent>
                  {filteredDemos?.map((demo) => (
                    <SelectItem key={demo.id} value={demo.id}>
                      {demo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Startup B
              </label>
              <Select value={selectedDemoB} onValueChange={setSelectedDemoB}>
                <SelectTrigger>
                  <SelectValue placeholder="Select startup B" />
                </SelectTrigger>
                <SelectContent>
                  {filteredDemos?.map((demo) => (
                    <SelectItem key={demo.id} value={demo.id}>
                      {demo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Startup C (Optional/Wildcard)
              </label>
              <Select value={selectedDemoC} onValueChange={setSelectedDemoC}>
                <SelectTrigger>
                  <SelectValue placeholder="Select startup C" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {filteredDemos?.map((demo) => (
                    <SelectItem key={demo.id} value={demo.id}>
                      {demo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Round</label>
              <Select value={roundType} onValueChange={setRoundType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select round" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Round 1">Round 1</SelectItem>
                  <SelectItem value="Round 2">Round 2</SelectItem>
                  <SelectItem value="Semi-Final">Semi-Final</SelectItem>
                  <SelectItem value="Final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleCreateMatch}
            disabled={!selectedDemoA || !selectedDemoB}
            className="w-full"
          >
            Create Match
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Matches</h2>
        {matches?.map((match) => (
          <MatchView
            key={match.id}
            match={match}
            onUpdate={() => refetchMatches()}
          />
        ))}
      </div>
    </div>
  );
}
