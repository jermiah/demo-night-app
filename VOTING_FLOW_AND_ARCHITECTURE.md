# Voting Flow & Application Architecture

## Overview

The Demo Night App is segmented into **three distinct user types**, each with different authentication flows and access levels:

1. **Admin Users** (`User` model) - Event organizers/managers
2. **Audience Members** (`Attendee` model with `type="AUDIENCE"`) - Regular voters
3. **Judges** (`Attendee` model with `type="JUDGE"`) - Weighted voters

---

## Application Segmentation

### 1. **Admin Users** (`/admin/*`)

**Authentication:**
- Uses NextAuth with Google OAuth OR credentials provider
- Stored in `User` table (separate from attendees)
- Access via `/api/auth/signin` (standard NextAuth login)
- Example: `test@example.com` (development only)

**Access:**
- Full admin dashboard at `/admin/[eventId]`
- Can create/manage events, demos, awards, matches
- Can control event phases (Pre → Demos → Voting → Results → Recap)
- Can view analytics and submissions
- Protected by middleware - redirects to signin if not authenticated

**Key Features:**
- Event management
- Demo management
- Award creation/management
- Match mode control (1v1 battles)
- Real-time control center
- Results dashboard

---

### 2. **Audience Members** (`/` - Attendee Routes)

**Authentication Flow:**
1. User visits `/` (root) or `/login/audience`
2. Middleware checks for session cookie
3. If no session → redirects to `/login/audience`
4. User fills out simple form:
   - Name
   - Email
   - Role: `"AUDIENCE"` (pre-filled)
   - Event ID (auto-detected from current event)
5. Submits → calls `signIn("voter-auth", {...})`
6. NextAuth creates/updates `Attendee` record with `type="AUDIENCE"`
7. Session created with JWT containing `role: "AUDIENCE"`
8. Redirected to `/` (main attendee page)

**Database:**
- Stored in `Attendee` table
- `type` field = `"AUDIENCE"`
- Linked to `Event` via many-to-many relationship (`_AttendeeToEvent`)

**Access:**
- Main voting interface at `/`
- Can view demos, vote, provide feedback
- Cannot access admin routes
- Session-based (JWT) - no password required

**Voting:**
- Votes stored with `voteType: "audience"`
- Each vote counts as 1 point
- Weighted at 50% in final calculations (when judges present)

---

### 3. **Judges** (`/login/judge`)

**Authentication Flow:**
1. User visits `/login/judge`
2. Same flow as audience, but:
   - Role: `"JUDGE"` (pre-filled)
   - Uses same `voter-auth` provider
3. Creates/updates `Attendee` with `type="JUDGE"`
4. Session contains `role: "JUDGE"`

**Database:**
- Stored in `Attendee` table
- `type` field = `"JUDGE"`
- Same table as audience, differentiated by `type` field

**Access:**
- Same interface as audience (`/`)
- UI may show "Judge" badge
- Cannot access admin routes

**Voting:**
- Votes stored with `voteType: "judge"`
- Each vote counts as 1 point
- Weighted at 50% in final calculations
- **Important:** Judges and audience votes are weighted equally (50/50), but counted separately

---

## Voting Flow During Active Session

### Traditional Voting Mode (`oneVsOneMode: false`)

**Phase: Voting** (`EventPhase.Voting`)

1. **User Signs Up:**
   ```
   Audience: /login/audience → Enter name/email → Join Event
   Judge:    /login/judge    → Enter name/email → Join Event
   ```

2. **Voting Interface** (`VotingWorkspace`):
   - Shows all votable awards
   - For each award, user selects ONE demo
   - Can change vote anytime (last vote wins)
   - Real-time updates via tRPC subscriptions

3. **Vote Storage:**
   ```typescript
   Vote {
     eventId: string
     attendeeId: string
     awardId: string
     demoId: string
     voteType: "audience" | "judge"  // Determined from session.role
     amount?: number  // For pitch night ($100k allocation)
   }
   ```

4. **Vote Calculation:**
   - Separate counts for audience vs judge votes
   - Final score = (audienceScore × 0.5) + (judgeScore × 0.5)
   - If no judges: 100% audience weight
   - If no audience: 100% judge weight

5. **Results Display:**
   - Shows weighted scores
   - Admin can manually override winners
   - Displayed in Results phase

---

### Match Mode (`oneVsOneMode: true`)

**Phase: Voting** with active matches

1. **Admin Creates Match:**
   - Admin creates match with 2-3 demos
   - Sets match as "active"
   - Match appears in voting interface

2. **User Votes:**
   - Sees active match with competing demos
   - Selects ONE demo to vote for
   - Vote stored with `matchId` reference
   - Real-time vote counts (refreshes every 2-3 seconds)

3. **Match Winner Calculation:**
   ```typescript
   // Weighted scoring (50/50)
   audienceScore = audienceVotesA / totalAudienceVotes * 0.5
   judgeScore = judgeVotesA / totalJudgeVotes * 0.5
   finalScoreA = audienceScore + judgeScore
   ```

4. **Admin Closes Match:**
   - Admin closes voting
   - Winner automatically computed
   - Next match can begin

---

## Key Code Locations

### Authentication

```12:118:src/server/auth.ts
// Voter authentication provider
CredentialsProvider({
  id: "voter-auth",
  // Creates/updates Attendee record
  // Returns JWT with role from Attendee.type
})
```

### Vote Type Determination

```38:41:src/server/api/routers/vote.ts
// Determines vote type from session role
const role = ctx.session.user.role;
const voteType = role === "JUDGE" ? "judge" : "audience";
```

### Login Forms

```16:64:src/app/login/components/LoginForm.tsx
// Single form component used for both audience and judge
// Role prop determines which type of attendee is created
```

### Middleware Protection

```5:40:src/middleware.ts
// Protects admin routes and root route
// Redirects unauthenticated users to /login/audience
```

### Workspace Routing

```43:61:src/app/(attendee)/components/Workspaces.tsx
// Routes users to appropriate workspace based on event phase:
// - Pre: PreWorkspace
// - Demos: DemosWorkspace
// - Voting: VotingWorkspace (or MatchVoting if match mode)
// - Results: ResultsWorkspace
// - Recap: RecapWorkspace
```

---

## Database Schema

### User Types

```prisma
// Admin users (separate table)
model User {
  id        String   @id
  email     String?  @unique
  isJudge   Boolean  // Legacy field, not used for voting judges
  // ... NextAuth fields
}

// Voters (audience + judges)
model Attendee {
  id     String  @id
  name   String?
  email  String?
  type   String?  // "AUDIENCE" or "JUDGE"
  events Event[] // Many-to-many
}

// Votes
model Vote {
  id         String
  eventId    String
  attendeeId String
  awardId    String
  demoId     String?
  voteType   String  @default("audience") // "audience" | "judge"
  matchId    String? // For match mode
  amount     Int?    // For pitch night ($100k allocation)
}
```

---

## Event Phases

Events progress through phases controlled by admin:

1. **Pre** - Waiting for event to start
2. **Demos** - Demos are being presented, feedback collection
3. **Voting** - Active voting period
4. **Results** - Results displayed
5. **Recap** - Final recap/hall of fame

---

## Important Notes

### Judge vs Audience Distinction

- **Both use `Attendee` table** - differentiated by `type` field
- **Both use same login flow** - just different route (`/login/audience` vs `/login/judge`)
- **Both see same UI** - judges may have badge indicator
- **Votes weighted equally** - 50% audience + 50% judges
- **Cannot switch roles** - if attendee exists with one type, cannot login as other type

### Admin vs Attendee Distinction

- **Completely separate** - `User` table vs `Attendee` table
- **Different auth** - Google OAuth/credentials vs simple name/email
- **Different routes** - `/admin/*` vs `/`
- **Different permissions** - full control vs voting only

### Session Management

- Uses NextAuth with JWT strategy
- Session contains `role` from `Attendee.type` or `User` record
- No password required for attendees (just name/email)
- Session persists across page refreshes

---

## Example Flow: Audience Member Voting

1. **Event Admin** creates event and sets phase to "Voting"
2. **Audience Member** visits `http://localhost:3000`
3. **Middleware** redirects to `/login/audience` (no session)
4. **User enters:**
   - Name: "John Doe"
   - Email: "john@example.com"
5. **Form submits** → `signIn("voter-auth", { name, email, role: "AUDIENCE", eventId })`
6. **Backend:**
   - Checks if `Attendee` with email exists for this event
   - Creates new `Attendee` if not exists
   - Links to event
   - Returns JWT with `role: "AUDIENCE"`
7. **Frontend redirects** to `/`
8. **Workspaces component** detects `EventPhase.Voting`
9. **Renders `VotingWorkspace`** with awards and demos
10. **User votes** → `vote.upsert` mutation
11. **Backend stores vote** with `voteType: "audience"`
12. **Results calculated** with 50% weight (if judges present)

---

## Example Flow: Judge Voting

Same as audience, but:
- Visits `/login/judge` instead
- `role: "JUDGE"` in signIn call
- `Attendee.type = "JUDGE"`
- Votes stored with `voteType: "judge"`
- Votes weighted at 50% in calculations

---

## Match Mode Flow

1. **Admin** enables `oneVsOneMode: true` on event
2. **Admin** creates matches via `/admin/[eventId]/match-mode`
3. **Admin** starts a match (sets `isActive: true`)
4. **Attendees** see active match in voting interface
5. **Attendees vote** for one demo in the match
6. **Votes refresh** every 2-3 seconds showing live counts
7. **Admin closes** match → winner computed automatically
8. **Next match** can begin

---

## Security Considerations

1. **Vote Validation:**
   - Users can only vote for themselves (`attendeeId === session.user.id`)
   - Vote type determined from session (cannot be spoofed)

2. **Role Enforcement:**
   - Cannot switch from AUDIENCE to JUDGE (or vice versa) once registered
   - Role stored in database (`Attendee.type`)

3. **Admin Protection:**
   - Admin routes require `User` record (not `Attendee`)
   - Protected by middleware

4. **Event Linking:**
   - Attendees must be linked to event
   - Votes validated against event

---

## Testing

### Create Test Users

```bash
# Create admin user
node create-test-user.js

# Creates:
# - test@example.com (admin)
# - judge@example.com (admin with isJudge=true, but not used for voting)
```

### Test Voting Flow

1. Start dev server: `yarn dev`
2. Visit `/login/audience` or `/login/judge`
3. Enter name/email
4. Should redirect to `/` and show voting interface
5. Cast votes and see results

---

## Summary

The application uses a **three-tier segmentation**:

1. **Admin** (`User` table) - Full control, Google OAuth
2. **Audience** (`Attendee` with `type="AUDIENCE"`) - Simple login, voting
3. **Judges** (`Attendee` with `type="JUDGE"`) - Simple login, weighted voting

All voting flows through the same `Vote` table, differentiated by `voteType` field, with weighted calculations (50/50) when both audience and judges are present.

