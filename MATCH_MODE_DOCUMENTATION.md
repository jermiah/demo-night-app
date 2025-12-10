# Match Mode (1v1 Voting) Documentation

## Overview

Match Mode is a bracket-style voting system where demos compete head-to-head in individual matches. This is enabled by setting `Event.oneVsOneMode = true` on an event.

---

## Database Schema

### Event Model
```prisma
model Event {
  // ... other fields
  oneVsOneMode Boolean @default(false)  // Toggle for match mode
}
```

### Match Model
```prisma
model Match {
  id           String    @id @default(cuid())
  event        Event     @relation(fields: [eventId], references: [id])
  eventId      String
  
  // Competing demos (2-3 demos per match)
  startupA     Demo      @relation("MatchStartupA", fields: [startupAId])
  startupAId   String
  startupB     Demo      @relation("MatchStartupB", fields: [startupBId])
  startupBId   String
  startupC     Demo?     @relation("MatchStartupC", fields: [startupCId])  // Optional third demo
  startupCId   String?
  
  // Match metadata
  roundType    String?        // "Round 1", "Round 2", "Semi-Final", "Final"
  startTime    DateTime?
  endTime      DateTime?
  isActive     Boolean   @default(false)  // When true, voting is open
  votingWindow Int?            // Voting duration in seconds (e.g., 300 = 5 minutes)
  winnerId     String?         // Set when match closes
  
  votes        Vote[]         // All votes cast for this match
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@index([eventId])
}
```

### Vote Model (Extended for Matches)
```prisma
model Vote {
  // ... other fields
  matchId    String?  // Links vote to a match (null for traditional voting)
  voteType   String   @default("audience")  // "audience" or "judge"
  
  // Unique constraint ensures one vote per attendee per match
  @@unique([eventId, attendeeId, awardId, demoId])
  @@index([matchId])
}
```

**Key Points:**
- `matchId` is nullable - when `null`, vote is for traditional award-based voting
- When `matchId` is set, vote is for a specific match
- `voteType` distinguishes audience vs judge votes (used in weighted scoring)

---

## How Match Mode is Enabled

### 1. **Setting `oneVsOneMode` on Event**

The `oneVsOneMode` flag is stored in the `Event` table:

```typescript
// In Prisma schema
model Event {
  oneVsOneMode Boolean @default(false)
}
```

**How to enable:**
- Via admin UI: Event settings/configuration
- Via database: `UPDATE "Event" SET "oneVsOneMode" = true WHERE id = 'sf-demo';`
- Via Prisma: `prisma.event.update({ where: { id }, data: { oneVsOneMode: true } })`

**Note:** Currently, the UI doesn't automatically switch to `MatchVoting` component when `oneVsOneMode` is enabled. The `VotingWorkspace` component needs to check this flag and conditionally render `MatchVoting`.

---

## Data Storage

### Match Creation Flow

1. **Admin Creates Match** (`/admin/[eventId]/match-mode`):
   ```typescript
   // Admin selects:
   - Startup A (required)
   - Startup B (required)
   - Startup C (optional)
   - Round Type ("Round 1", "Round 2", "Semi-Final", "Final")
   - Voting Window (default: 300 seconds = 5 minutes)
   
   // Calls: api.match.create.mutate({
   //   eventId,
   //   startupAId,
   //   startupBId,
   //   startupCId?,  // Optional
   //   roundType,
   //   votingWindow: 300
   // })
   ```

2. **Database Record Created**:
   ```sql
   INSERT INTO "Match" (
     id, eventId, startupAId, startupBId, startupCId,
     roundType, votingWindow, isActive
   ) VALUES (
     'match-123', 'sf-demo', 'demo-1', 'demo-2', NULL,
     'Round 1', 300, false
   );
   ```

3. **Match States**:
   - **Created** (`isActive: false`) - Match exists but voting not open
   - **Active** (`isActive: true`) - Voting is open, attendees can vote
   - **Closed** (`isActive: false`, `winnerId` set) - Voting closed, winner computed

---

## Voting Flow

### 1. **Admin Starts Match**

```typescript
// Admin clicks "Start Match" button
api.match.start.mutate({ matchId: 'match-123' })

// Updates database:
UPDATE "Match" 
SET isActive = true, startTime = NOW() 
WHERE id = 'match-123';
```

### 2. **Attendee Votes**

When a match is active (`isActive: true`), attendees see the match voting interface:

```typescript
// Attendee selects a demo (startupA, startupB, or startupC)
api.vote.upsert.mutate({
  eventId: 'sf-demo',
  attendeeId: 'attendee-123',
  awardId: 'match-vote',  // Special award ID for match votes
  demoId: 'demo-1',        // Selected demo
  matchId: 'match-123',    // Links vote to match
  voteType: 'audience'     // or 'judge' if user is a judge
})
```

**Database Record:**
```sql
INSERT INTO "Vote" (
  eventId, attendeeId, awardId, demoId, matchId, voteType
) VALUES (
  'sf-demo', 'attendee-123', 'match-vote', 'demo-1', 'match-123', 'audience'
);
```

**Key Constraints:**
- One vote per attendee per match (enforced by unique constraint)
- Vote can be changed (upsert updates existing vote)
- `voteType` is automatically set based on session role (`"AUDIENCE"` or `"JUDGE"`)

### 3. **Real-Time Vote Counts**

```typescript
// Frontend polls every 2-3 seconds when match is active
api.vote.getMatchVotes.useQuery(
  { matchId: 'match-123' },
  { refetchInterval: 2000 }
)

// Returns all votes for the match with attendee info
// Frontend filters by demoId to show counts per startup
```

### 4. **Admin Closes Match**

```typescript
// Admin clicks "Close Voting"
api.match.closeVoting.mutate({ matchId: 'match-123' })

// Backend:
// 1. Fetches all votes for the match
// 2. Computes weighted scores (50% audience + 50% judge)
// 3. Determines winner
// 4. Updates match:
UPDATE "Match" 
SET isActive = false, endTime = NOW(), winnerId = 'demo-1'
WHERE id = 'match-123';
```

---

## Winner Calculation Algorithm

Located in `src/server/api/routers/match.ts`:

```typescript
function computeMatchWinner(match) {
  // 1. Separate votes by demo
  const votesA = match.votes.filter(v => v.demoId === match.startupAId);
  const votesB = match.votes.filter(v => v.demoId === match.startupBId);
  const votesC = match.startupCId 
    ? match.votes.filter(v => v.demoId === match.startupCId)
    : [];

  // 2. Separate by vote type (audience vs judge)
  const audienceVotesA = votesA.filter(v => v.voteType === "audience");
  const audienceVotesB = votesB.filter(v => v.voteType === "audience");
  const audienceVotesC = votesC.filter(v => v.voteType === "audience");

  const judgeVotesA = votesA.filter(v => v.voteType === "judge");
  const judgeVotesB = votesB.filter(v => v.voteType === "judge");
  const judgeVotesC = votesC.filter(v => v.voteType === "judge");

  // 3. Calculate totals
  const totalAudienceVotes = audienceVotesA.length + audienceVotesB.length + audienceVotesC.length;
  const totalJudgeVotes = judgeVotesA.length + judgeVotesB.length + judgeVotesC.length;

  // 4. Calculate weighted scores (50/50 split)
  let finalScoreA = 0;
  let finalScoreB = 0;
  let finalScoreC = 0;

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

  // 5. If no judges, give full weight to audience
  if (totalJudgeVotes === 0 && totalAudienceVotes > 0) {
    finalScoreA = audienceVotesA.length / totalAudienceVotes;
    finalScoreB = audienceVotesB.length / totalAudienceVotes;
    finalScoreC = audienceVotesC.length / totalAudienceVotes;
  }

  // 6. Determine winner (highest score)
  let winnerId = null;
  if (finalScoreA > finalScoreB && finalScoreA > finalScoreC) {
    winnerId = match.startupAId;
  } else if (finalScoreB > finalScoreA && finalScoreB > finalScoreC) {
    winnerId = match.startupBId;
  } else if (finalScoreC > finalScoreA && finalScoreC > finalScoreB) {
    winnerId = match.startupCId;
  }

  return { winnerId, finalScoreA, finalScoreB, finalScoreC, ... };
}
```

**Example Calculation:**
- Startup A: 60 audience votes, 4 judge votes
- Startup B: 40 audience votes, 6 judge votes
- Total: 100 audience, 10 judges

**Scores:**
- Startup A: `(60/100 × 0.5) + (4/10 × 0.5) = 0.30 + 0.20 = 0.50` (50%)
- Startup B: `(40/100 × 0.5) + (6/10 × 0.5) = 0.20 + 0.30 = 0.50` (50%)
- **Result:** Tie (or winner determined by admin override)

---

## API Endpoints (tRPC Router)

### `match.all`
```typescript
// Get all matches for an event
api.match.all.useQuery({ eventId: 'sf-demo' })

// Returns: Match[] with startupA, startupB, startupC, votes included
```

### `match.get`
```typescript
// Get specific match
api.match.get.useQuery({ matchId: 'match-123' })
```

### `match.create`
```typescript
// Create new match
api.match.create.mutate({
  eventId: 'sf-demo',
  startupAId: 'demo-1',
  startupBId: 'demo-2',
  startupCId?: 'demo-3',  // Optional
  roundType?: 'Round 1',
  votingWindow?: 300
})
```

### `match.start`
```typescript
// Start voting for a match
api.match.start.mutate({ matchId: 'match-123' })

// Sets: isActive = true, startTime = now()
```

### `match.closeVoting`
```typescript
// Close voting and compute winner
api.match.closeVoting.mutate({ matchId: 'match-123' })

// Sets: isActive = false, endTime = now(), winnerId = computed winner
```

### `match.getResults`
```typescript
// Get match results with weighted scores
api.match.getResults.useQuery({ matchId: 'match-123' })

// Returns: {
//   winnerId, winner,
//   votesA: { total, audience, judge },
//   votesB: { total, audience, judge },
//   finalScoreA, finalScoreB, finalScoreC
// }
```

### `match.delete`
```typescript
// Delete a match
api.match.delete.mutate({ matchId: 'match-123' })
```

### `vote.getMatchVotes`
```typescript
// Get all votes for a specific match (for live counts)
api.vote.getMatchVotes.useQuery({ matchId: 'match-123' })

// Returns: Vote[] with attendee and demo info
```

---

## Frontend Components

### Admin: Match Management

**Location:** `src/app/admin/[eventId]/components/MatchMode/MatchModeTab.tsx`

**Features:**
- Create matches (select 2-3 demos)
- View all matches
- Start/stop matches
- View live vote counts
- See match results

**Key Code:**
```typescript
// Create match
const createMatch = api.match.create.useMutation({
  onSuccess: () => refetchMatches()
});

// Start match
const startMatch = api.match.start.useMutation({
  onSuccess: onUpdate
});

// Close voting
const closeVoting = api.match.closeVoting.useMutation({
  onSuccess: () => {
    onUpdate();
    setShowResults(true);
  }
});
```

### Attendee: Match Voting

**Location:** `src/app/(attendee)/components/MatchVoting/index.tsx`

**Features:**
- Shows active match (`isActive: true`)
- Displays competing demos (2-3 cards)
- Allows voting for one demo
- Shows "✓ Voted" confirmation
- Real-time vote counts (refreshes every 3 seconds)

**Key Code:**
```typescript
// Find active match
const { data: matches } = api.match.all.useQuery(
  { eventId },
  { refetchInterval: 3000 }
);
const activeMatch = matches?.find(m => m.isActive);

// Get user's existing vote
const { data: myVotes } = api.vote.all.useQuery({
  eventId,
  attendeeId: attendee.id
});
const existingVote = myVotes?.find(v => v.matchId === activeMatch.id);

// Cast vote
upsertVote.mutate({
  eventId,
  attendeeId: attendee.id,
  awardId: "match-vote",  // Special award ID
  demoId: selectedDemoId,
  matchId: activeMatch.id,
  voteType: isJudge ? "judge" : "audience"
});
```

**Note:** Currently, `MatchVoting` is not automatically shown when `oneVsOneMode` is enabled. The `VotingWorkspace` component needs to check `event.oneVsOneMode` and conditionally render `MatchVoting` instead of the traditional voting interface.

---

## Integration with VotingWorkspace

**Current State:** `VotingWorkspace` doesn't check for match mode. It always shows traditional award-based voting.

**Expected Behavior:**
```typescript
// In VotingWorkspace/index.tsx
export default function VotingWorkspace() {
  const { currentEvent, event, attendee } = useWorkspaceContext();
  
  // Check if match mode is enabled
  if (event.oneVsOneMode) {
    // Check if there's an active match
    const { data: matches } = api.match.all.useQuery({ eventId: currentEvent.id });
    const activeMatch = matches?.find(m => m.isActive);
    
    if (activeMatch) {
      // Show match voting interface
      return <MatchVoting 
        eventId={currentEvent.id} 
        attendee={attendee}
        isJudge={attendee.type === "JUDGE"}
      />;
    }
  }
  
  // Otherwise show traditional voting
  return <TraditionalVotingInterface />;
}
```

---

## Data Flow Summary

### Match Creation
```
Admin UI → api.match.create → Prisma → Match table
```

### Starting Match
```
Admin clicks "Start Match" → api.match.start → UPDATE Match SET isActive=true
```

### Voting
```
Attendee selects demo → api.vote.upsert({ matchId, demoId, voteType }) 
→ Prisma → Vote table (with matchId set)
```

### Live Counts
```
Frontend polls api.vote.getMatchVotes({ matchId }) 
→ Returns Vote[] → Filter by demoId → Display counts
```

### Closing Match
```
Admin clicks "Close Voting" → api.match.closeVoting 
→ computeMatchWinner() → UPDATE Match SET winnerId, isActive=false
```

---

## Key Database Queries

### Get Active Match
```sql
SELECT * FROM "Match" 
WHERE eventId = 'sf-demo' AND isActive = true 
LIMIT 1;
```

### Get Votes for Match
```sql
SELECT v.*, a.type as attendeeType, d.name as demoName
FROM "Vote" v
JOIN "Attendee" a ON v.attendeeId = a.id
JOIN "Demo" d ON v.demoId = d.id
WHERE v.matchId = 'match-123';
```

### Count Votes by Type
```sql
SELECT 
  demoId,
  voteType,
  COUNT(*) as voteCount
FROM "Vote"
WHERE matchId = 'match-123'
GROUP BY demoId, voteType;
```

### Get Match Winner
```sql
SELECT winnerId, startupA.name as winnerName
FROM "Match" m
JOIN "Demo" startupA ON m.winnerId = startupA.id
WHERE m.id = 'match-123';
```

---

## Important Notes

1. **Award ID for Match Votes:**
   - Match votes use a special `awardId: "match-vote"` 
   - This award must exist in the database for match voting to work
   - Consider creating this award automatically when enabling match mode

2. **One Vote Per Match:**
   - The unique constraint `[eventId, attendeeId, awardId, demoId]` ensures one vote per attendee per match
   - Changing vote updates the existing record (upsert)

3. **Match Mode vs Traditional Voting:**
   - When `matchId` is `null`: Traditional award-based voting
   - When `matchId` is set: Match voting
   - Both can coexist in the same event (different votes)

4. **Real-Time Updates:**
   - Admin dashboard: Refreshes every 2 seconds when match is active
   - Attendee interface: Refreshes every 3 seconds
   - Uses React Query's `refetchInterval`

5. **Winner Storage:**
   - `Match.winnerId` stores the winning demo's ID
   - Can be manually overridden by admin if needed
   - Used for bracket progression (winners advance to next round)

---

## Testing Match Mode

1. **Enable Match Mode:**
   ```sql
   UPDATE "Event" SET "oneVsOneMode" = true WHERE id = 'sf-demo';
   ```

2. **Create Match Award:**
   ```sql
   INSERT INTO "Award" (id, eventId, name, description, votable, index)
   VALUES ('match-vote', 'sf-demo', 'Match Vote', 'Vote for match winner', true, 0);
   ```

3. **Create Match:**
   - Go to `/admin/sf-demo/match-mode`
   - Select demos and create match

4. **Start Match:**
   - Click "Start Match" button
   - Match becomes active (`isActive: true`)

5. **Vote:**
   - Login as attendee/judge
   - Should see match voting interface (if integrated)
   - Cast vote

6. **Close Match:**
   - Admin clicks "Close Voting"
   - Winner is computed and stored

---

## Future Improvements

1. **Automatic Integration:**
   - `VotingWorkspace` should check `event.oneVsOneMode` and show `MatchVoting` when enabled

2. **Bracket Management:**
   - Automatically advance winners to next round
   - Generate bracket visualization

3. **Match Scheduling:**
   - Use `votingWindow` to auto-close matches after time limit
   - Queue matches for sequential voting

4. **Match History:**
   - Show all past matches and winners
   - Bracket view showing progression

