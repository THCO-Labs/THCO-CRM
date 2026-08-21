# Crowther OS, Sprint 1: fixes and open decisions

**Status:** all items below are done as of 21 August 2026. Decisions D1 to D5 were
answered and are recorded in section D. Pinned by `backend/tests/test_sprint1_fixes.py`,
33 checks, alongside the 41 lifecycle and 31 artefact checks already there.

**Written:** 21 August 2026
**Source:** `crowther_os_rants.pdf`, walked through against the running local build.

Numbering follows the PDF where it has numbers.
Section A is broken behaviour with a root cause found; I would just fix these.
Section B is design work that is specified well enough to build.
Section C is where the flow has a genuine hole and a recommendation is asked for.
Section D is the short list of things I should not decide alone.

---

## A. Broken, root cause found

### A1. Uploaded files do not open

Clicking an uploaded architecture image lands on the dashboard.

**Cause.** `ProjectWorkspace` renders `<a href={a.file_url}>`, and `file_url` is `/api/delivery/files/...`.
A plain link cannot carry the `Authorization: Bearer` header this client signs requests with, and in development the relative URL hits the dev server on :3000, which has no such route and falls through to the single-page app.
That is why it lands on the dashboard rather than failing.

This exact trap is already recorded in PROJECT_STATE.md section 8, and the app already solves it three times over: CVs, task attachments and thumbnails are all fetched as blobs for the same reason.

**Fix.** Fetch through `apiClient` with `responseType: 'blob'`, hand the browser a `URL.createObjectURL`, and revoke it on unmount.
Add an inline preview for images and PDFs in the drawer, and a separate download control.
Same treatment for the Documents drawer, which has the identical bug in two more places.

### A2. Uploading reloads everything

Uploading refetches the whole workspace, so the drawer closes and the reader loses their place.

**Fix.** The upload response already returns the created row. Push it into local state and leave the drawer open. Only refetch the parent project when something the header shows has actually changed.

### A3. Changing the TSD does not update the header

The toast says "Chidi Bello now manages this project", the card underneath says the same, and the header still reads "TSD: Anabel Emekene".
On a fresh project the header says "No TSD assigned" while the dropdown below already shows a name, which is the same bug seen from the other side.

**Fix.** The header reads from parent state that the change never wrote back. Update it from the response.
The dropdown should also show "not assigned" as its resting value rather than defaulting to the first person in the list, because showing a name nobody chose is how this got confusing.

### A4. The progress bar on Tasks is wrong and misleading

`progress = stage / 10 * 100`, still dividing by ten after the move to seventeen stages.
Anything past stage 10 reads 100%, which is why a project sits at "100%" beside "0 boards, 0 tasks".

**Fix.** On a Tasks page, progress should mean task completion: done cards over total cards, and nothing at all when there are no cards.
Lifecycle position is already on the card as a chip. See D4.

### A5. The Tasks card names the wrong owner field

`coordinator_name` reads `delivery_owner_name`, which the migration retires. It currently falls through to whoever created the project.

**Fix.** Read `tsd_name`, and label it TSD.

### A6. Activity log entries say only "created"

**Fix.** The audit row already carries `entity_type`, the renderer just prints `action`. Render "Requirement created", "Architecture uploaded v2", "Demo round 2 validated". No schema change.

### A7. A gate condition says something untrue

"Initial requirements captured" turns red with two requirements on the project, because the check is `>= 3`.

**Fix.** Say what it means: "At least three requirements captured". A condition a person cannot evaluate from its own wording is worse than no condition.

---

## B. Design work, specified well enough to build

### B1. Phase selector should read as a filter

The row of phase names is styled as tabs, so it looks like six destinations rather than one filter over the board.

**Fix.** Make it a filter: an "All phases" default, chips that visibly toggle, and a clear active state distinct from tab styling.

### B2. Remove the old business units from the sidebar

"BUSINESS UNITS" still lists Crowther OS and Technology & Build. Units no longer own projects, and decision 8 already said the sidebar changes now.

**Fix.** Drop the group. Crowther OS is the product, not a unit inside it.

### B3. The project page, restructured

This is the largest piece and it is specified clearly.

1. **Overview is what opens.** The project description and everything currently floating above the tabs moves into it.
2. **Lifecycle moves to the top**, directly under the project name, as one horizontal roadmap line.
3. **Stage markers inside each phase.** Small dashes for each stage in that phase, a longer one for where the project actually is, so a number line reads through the whole thing rather than only the phase.
4. **Only the line by default.** Hover or click a marker to reveal what that stage involves and what happens next; it disappears on leaving.
5. **A small advance button beside the line.** The existing flow is unchanged: if the gate is unmet, the current dialog appears and asks for the reason.
6. **The separate client section goes.** Contacts becomes an icon in the rail with the others.
7. **Keep the client creation button** at the foot of Overview.

Net effect: opening a project shows Overview, a compact lifecycle line, and an icon rail. Everything else is consolidated or behind an icon.

### B4. Documents at project creation

The intake form takes pasted transcripts but no files, so a brief that arrived as a PDF cannot be attached at the point it is being described.

**Fix.** Add file upload to the create form and attach on save, alongside the transcripts already captured. This is the "create the project at once, upload all necessary documents" note.

### B5. Stage 2 becomes conditional

If a TSD was chosen on the creation form, stage 2 has nothing left to do and should be marked complete on creation.
If none was chosen, stage 2 stands and waits.

**Fix.** Add a TSD selector to the create form's staffing section, and auto-complete stage 2 when it is used. See D1, which decides whether stage 3 survives this.

### B6. The advance dialog message should match who is reading it

"The Senior Partner will be emailed" is shown to the Senior Partner, in their own account.

**Fix.** Vary the line by viewer. For the Senior Partner it should say the force is recorded, not that they will be told about their own action.

### B7. Stage 10 needs a way back to stage 9

The backend already treats 10 to 9 as the one backward move that needs no written reason, because iterating on a demo is the design rather than a correction. There is no button for it.

**Fix.** Put "Another demo round" beside "Validation and Readiness" on the stage 10 panel.

---

## C. Holes in the flow, with recommendations

### C1. The demo flow

Four separate problems, and the biggest one is real: the gate asks for materials and there is nowhere to put any.

- Creating a round needs a manual refresh, then the button has to be found again.
- "Iterate" does not explain itself.
- The gate wants "a demo round with materials", but nothing anywhere accepts wireframes or a prototype.
- Marking "demo held with the client" does not unblock the stage.

That last one has an honest cause: stage 9 needs both materials **and** a held date. With no way to attach materials, the gate can never be satisfied, so marking it held changes nothing visible.

**Recommendation.**

**Materials are documents, not a new concept.** A demo round takes a link and any number of files. A prototype built in Emergent or an app builder is a URL; wireframes and exported decks are files. Both hang off the round, stored with `doc_type: "demo"` so they also appear in Documents.

Concretely the round becomes: date, materials (link plus files), notes, then **Mark held**, then an outcome.

**Rename "iterate".** It means the client wants changes and there will be another round. The three outcomes read better as:

- **Needs another round** (currently "iterate")
- **Client validated**
- **Client declined**

Choosing "needs another round" should offer to open round N+1 there and then, which is also the answer to B7.

**And it stops refreshing.** New rounds appear in the list in place, drawer open.

### C2. User journeys cannot be edited

Asked directly: what should the flow be.

**Recommendation.** Treat them exactly like requirements, because they are the same kind of thing: a working statement of what the product must do, argued over during discovery and settled at scope freeze.

- Inline edit on the row: title, persona, steps.
- Optionally link the requirements a journey covers, which makes "what breaks if we drop R-04" answerable later.
- Not versioned. They are working notes until stage 11, and then they lock the way requirements do.

Adding a `PATCH` endpoint is a few lines; the collection and permissions already exist.

### C3. Requirements are half-built

Three things are missing and one label is unexplained.

**Recommendation.**

- **Inline edit** on each row, matching journeys.
- **A status control** on the row: proposed, committed, open question, rejected.
- **"Committed" means agreed with the client and inside scope.** It is the set that scope freeze locks, and the set Legal reads to write a contract. Right now nothing can reach that state, which is why the Overview reads "2 requirements, 0 committed" with no way forward. Add a one-click commit per row, and a "commit everything still proposed" step when moving to stage 11, since that is the moment it actually means something.
- **A real Product Brief editor on the Product tab.** The Overview says the brief is written there and it is not, which is the sharpest version of this complaint. The backend is already versioned and working; only the editor is missing: problem, outcomes, success metrics, in scope, out of scope, assumptions, with the version history beside it.
- **"Refine requirements" and "define user journeys"** become the actions on that tab, which is what the stage 7 gate is asking for.

### C4. Requesting a Solution Architect does nothing

There is no way for the TSD to request one, and no way for the Senior Partner to pick one.

The backend already has all three endpoints (`request-architect`, `architect-candidates`, `select-architect`) with the rule that only the Senior Partner may select. Nothing in the interface calls any of them.

**Recommendation.** Wire it into the stage 6 panel, showing different things to different people:

- **TSD sees** a "Request an architect" button. After requesting, the panel reads "Waiting for the Senior Partner" with the time it was asked.
- **Senior Partner sees** the architect-capable engineers, each with a Select button.
- **Everybody else sees** who it is waiting on.

On selection the stage advances immediately rather than waiting to be pushed. Stage 6 should be a gate, not a room people sit in: the wait is worth showing precisely because it blocks, and it should end the moment the block clears.

---

## D. Decisions, now taken

**D1. Which intake stages are removed.**
**None.** All seventeen stages stay. Instead, a TSD may be named on the intake form:
when one is, stage 2 has nothing left to do and the project opens at stage 3 already
assigned. When one is not, stage 2 stands and waits as before. Stage 3 stays because
it may prove useful.

**D2. Lifecycle colours.**
**Keep the phase colours, add the stage markers.** Each phase bar now carries a marker
per stage inside it, so the line reads as a number line: which phase, and how far
through it. Gold on Validation still means "waiting on the client", which recolouring
by completion would have thrown away.

**D3. "Open the full pipeline instead".**
Clarification only. Left as it is.

**D4. What the Tasks page progress bar measures.**
**Task completion.** Cards in a Done column over total cards. A project with no cards
reports no progress at all, rather than a bar at 0% that looks the same as a bar that
means nothing.

**D5. "Needs another round".**
Confirmed. The three demo outcomes now read: **Needs another round**, **Client
validated**, **Client declined**. Choosing the first opens the next round immediately.

**Also decided: THCO becomes Crowther.**
Applied to the product's own text, the sidebar, the control room, emails, and the
prefix on newly issued project references (`CROW-2026-...`).

Deliberately not renamed, and each for a reason:

- **Client presentation decks.** They say "Prepared by THCO" because that is who
  prepared them, and they were already sent. Rewriting a document after the fact
  misrepresents what the client received.
- **Reference numbers already issued.** `THCO-2026-A17C3D` is quoted in emails and
  written down. New projects get the new prefix; the ones already out keep theirs.
- **Domains, the database, Azure resources, the repository.** Renaming any of those
  is a migration, not a find and replace.

## Order I would work in

1. **A1 to A7.** Small, self-contained, and A1 and A4 are actively misleading people.
2. **C3 then C1.** Requirements, the Product Brief editor, then the demo flow. These unblock the lifecycle: without them a project cannot honestly pass stage 5, 7 or 9.
3. **C4 and B7.** Architect selection and the way back to stage 9. Both are wiring to endpoints that already exist.
4. **B3.** The page restructure, once the pieces it arranges have stopped moving.
5. **B1, B2, B4, B5, B6, C2.** The rest.

B3 last is deliberate. Rearranging the page before the demo and requirements flows settle would mean doing it twice.
