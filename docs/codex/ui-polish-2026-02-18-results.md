# UI Polish Results (2026-02-19)

## Summary of what changed
- Centered winner spotlight in the true middle of the infield area and changed content order to:
  - Person icon + winner nickname + loons won on one line
  - Horse name next line
  - Horse image next line
- Heat and leaderboard overlays now support drag handles with bounded movement inside infield-safe area.
- Heat panel was narrowed and horse sprites were increased in size.
- Track bounds and panel/pen safe areas were tightened to reduce overlap risk.
- Start/finish line behavior updated:
  - Green start line fades out on race start
  - Red finish line fades in 1 second later at the same line location
  - Nose alignment offset changed to 3px behind line target
- Pens were restyled to a paddock/corral vibe and winners pen presentation was improved.
- Horse pen now hides currently active race horses while the race is in betting/running states.
- Dashboard layout changed:
  - Bet tiles move directly below lease loons area
  - Winner/history/order/leaderboard panels are below bets
  - Current heat order now includes horse sprites
  - Added past heat winner history list with top loon winner + loon amount
  - Reduced bet tile flicker by avoiding periodic bet state re-initialization
- Admin UI changes:
  - Removed clear race button from admin buttons/header
  - Generate button now shows context labels for Final Race / New Tournament
  - Start button now shows Start Final Race in heat 5
  - Generate New Tournament flow now does reset-tournament + generate-race in one click
- Backend reset safety:
  - reset-tournament, reset-dev, and seed-reset now clear replay runtime/session before reset to avoid stuck replay visuals.

## Files touched
- `frontend/src/components/track/drawFinishLine.js`
- `frontend/src/components/track/drawTrack.js`
- `frontend/src/utils/raceMath.js`
- `frontend/src/utils/generateRacePacingPlan.js`
- `frontend/src/components/track/initRaceListeners.js`
- `frontend/src/components/track/HorseRankingOverlay.jsx`
- `frontend/src/components/track/LeaderboardOverlay.jsx`
- `frontend/src/components/RaceTrack.jsx`
- `frontend/src/index.css`
- `frontend/src/pages/users/DashboardPage.jsx`
- `frontend/src/pages/admin/AdminButtons.jsx`
- `frontend/src/pages/admin/AdminHeader.jsx`
- `frontend/src/pages/admin/AdminPage.jsx`
- `api/routes/admin.ts`

## Manual test checklist
- Admin window:
  - Login and verify final-race/new-tournament button labels based on current heat
  - Generate race, open bets, start race
  - Confirm no Clear Race button in main controls/header
  - Start replay from race table and verify replay starts globally
  - Run Reset Races and Horses and confirm replay visuals clear
- Race window:
  - Verify leaderboard panel is inside left infield
  - Verify heat panel is inside right infield and draggable
  - Verify winner spotlight appears centered in infield center
  - Confirm start line green, fades out at start; finish line red fades in after 1s
  - Confirm horse noses line up behind start line target
  - Confirm horse pen removes active race horses while race is active
- Dashboard window:
  - Verify bet tiles are directly under balance when betting is open
  - Verify most recent/past winners show loon winner names and loon amounts
  - Verify current heat order includes horse images
  - Verify live leaderboard style and ordering refresh
  - Verify replay panel appears only during replay and updates order live
- Multi-window sync:
  - Open admin/race/dashboard simultaneously and validate shared session state transitions
  - Validate replay start/stop/clear propagates correctly to all windows

## Known follow-ups
- Admin replay speed slider and timeline scrubber UI were not implemented in this cluster.
- In very small viewports, extra-large panel content can still require scrolling inside the panel containers.
