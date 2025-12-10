"use client";

import { useWorkspaceContext } from "../../contexts/WorkspaceContext";
import { api } from "~/trpc/react";

import { MatchVotingWorkspace } from "./MatchVotingWorkspace";
import { LegacyVotingWorkspace } from "./LegacyVotingWorkspace";

/**
 * Voting Workspace Router
 * 
 * This component decides which voting interface to show:
 * - Match Voting: When there's an active match (1v1 voting)
 * - Legacy Voting: Traditional award-based voting (Best Overall, etc.)
 * 
 * The decision is made by checking for active matches first,
 * which is the most reliable indicator.
 */
export default function VotingWorkspace() {
  const { currentEvent, event } = useWorkspaceContext();
  
  // Safety check: ensure event is loaded
  if (!event) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-500">Loading event data...</p>
        </div>
      </div>
    );
  }
  
  // Check for active matches directly - this is the most reliable indicator
  // This bypasses any issues with oneVsOneMode flag not being set/returned correctly
  const { data: matches } = api.match.all.useQuery(
    { eventId: currentEvent.id },
    { refetchInterval: 3000 },
  );
  
  const hasActiveMatch = matches?.some((m: { isActive: boolean }) => m.isActive) ?? false;

  // Priority 1: If there's an active match, show match voting
  if (hasActiveMatch) {
    return <MatchVotingWorkspace />;
  }
  
  // Priority 2: If match mode is enabled but no active match, show waiting message
  if (event.oneVsOneMode && !hasActiveMatch) {
    return (
      <div className="flex size-full items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold">Match Mode Active</h1>
          <p className="text-lg text-gray-500">
            Waiting for the next match to begin...
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Please check back soon or ask the admin to start a match.
          </p>
        </div>
      </div>
    );
  }

  // Priority 3: Fall back to legacy award-based voting
  return <LegacyVotingWorkspace />;
}
