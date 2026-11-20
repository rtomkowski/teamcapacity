# Changes

Team capacity grew in small steps, each one a version the team used before the next. Version 40
is the first public release (1.0). Older team files open in every later version: new fields are
optional and the file version stays 1.

## v40: remove a team

In the team switcher (top of the menu), each team has a bin button. It asks first, in the list itself,
and offers "Download a copy first". Removing deletes the team from this browser only; files saved on
disk or OneDrive are not touched. The toast that follows has Undo. The last team cannot be removed.
`removeTeam` and `restoreTeam` in teams.ts, tests in tests/v40.test.ts.

## v39: portraits that fit the names

The v38 portraits were assigned at random, so some men got women's looks and the other way round.
Each fictional person now has a chosen look (hair style, skin and hair colour, glasses, beard,
earrings) in the `LOOK` table of `scripts/build-portraits.cjs`.

## v38: portraits in the demo team

Every person in the Experimental Engineering demo team has an illustrated, clearly fictional portrait
(drawn shapes, not photos of anyone). They are made by `scripts/build-portraits.cjs` (Node + Playwright)
into `demo-data/portraits/`, and `scripts/build-demo-ee.py` embeds them as small JPEGs (about 5 kB each).
An existing demo team keeps its old copy: add the demo team again to see the portraits.

## v37: the person's own word counts

Before, the involvement colour looked only at the numbers, so someone at 65% with an own level of 50%
stayed red even after saying "Has room". Now (`involvementSignal` in model.ts):
- Above the full-plate level and the person has not said Steady or Has room: red, "over".
- Above the level but the person says Steady or Has room: amber, "check", and Home lists it as a
  question ("the numbers and the person's own view differ"), not as a warning.
- Saying Full plate makes it at least amber, even when the numbers are lower.
- A person with their own level shows it next to the percentage ("65% / 50"); the tooltip says which
  level applies and what the person said.
Home, Analytics, the Needs attention count and Your chart use the same rule. Tests: tests/v37.test.ts.

## v36: Bento Home, takeaways, Paper palette

- Home is a grid of tiles in mixed sizes. The large headline tile says in one sentence how many things
  may be worth a look, lists them (above the full-plate level, overdue or soon-due milestones, projects
  past their end or without people, who has room), each linking to the right place, and shows the next
  four dates. The Coming up card is folded into it. Team details sit beside it in a narrower tile.
- Every chart has a one-line takeaway in plain words above it: the four At a glance cards, Involvement
  per person, Your chart, Team workload, What the team works on and Where the work goes
  (`src/insights.ts`, tested in tests/v36.test.ts).
- Settings, Appearance: choose the Calm (cool grey) or Paper (warm off-white) palette, per browser,
  in both light and dark. Light or dark is still the moon/sun button.
- Contrast was checked again on all six pages in Calm and Paper, light and dark: no text below
  WCAG AA.

## v35: a calmer design

The look was reworked as one system, in a new style sheet (`src/calm.css`, loaded last).

- Colour: neutral grey surfaces with one blue accent. The radial glow and the coloured top edges on
  cards are gone; a project's or person's colour now lives only in tags, dots and charts.
- Charts and tags use a colour-blind-checked categorical palette (separate steps for light and dark).
  Text drawn in a series colour is blended towards the text colour so it stays readable.
- Shapes: 8 px rounding on buttons and fields, 12 px on cards, 16 px on dialogs. Hairline borders and a
  very light shadow instead of glows.
- Type: the computer's own system font at 14 px, page titles 24 px, numbers in tabular figures so
  columns line up.
- Theme follows the computer's light or dark setting until you pick one with the moon/sun button.
- Engagement: short project names in the header (full name on hover), and each cell shows the
  involvement % (filled = ongoing, outlined = planned, tick = finished) instead of the letters O and P.
- Filters: one-box search fields, compact selects sized to their text.
- Footer and the sidebar credit name the app and author on one line. The Help guide was rewritten for
  the app as it is now (it still described the first setup and hour steps).
- A team without an abbreviation shows its initials on Home instead of a cut-off name.

Review: every text element on the six main pages was checked for contrast in both themes (WCAG AA,
4.5:1 for normal text). Light had four kinds of grey text below that (menu caption, greeting time,
small avatar initials); all fixed, both themes now pass. Keyboard focus shows a 2 px blue ring with a
2 px gap on every control, and animations stop when the computer asks for reduced motion.

Sources for the choices: Radix Colors (scale and contrast steps), current dashboard design system
write-ups (neutral surfaces, one accent, 8-point spacing), and data-visualisation guidance on
categorical palettes and colour-blind safety.

## v34: logic review, shortcuts, license

Fixed after reviewing the logic:
- Meetings every 2 or more weeks drifted by a week after the summer-time change (week numbers were counted
  in hours, one hour short). They are now counted in whole days.
- Weekly hours on finished or rejected projects still counted in the capacity view. They now follow the
  same rule as involvement %: only work on open projects counts.
- "Unstaffed projects" counted finished and rejected projects. Now only open ones count.
- Two saves to the shared file could run at once (the timed save and "Merge and save now"). Saves now
  wait for each other.
- A failed write to the shared file is now dropped instead of leaving a half-written file.
- Downloads use a link placed in the page, which older Firefox versions need.
- New ids work in browsers without crypto.randomUUID (older Safari).

New review hints under Needs attention (indications, nothing is changed for you):
- People above their own full-plate level (involvement %), when hours are not tracked.
- Projects still marked ongoing or granted after their end date.

Looked at and left as is:
- Involvement % counts every ongoing assignment, whatever the project dates. Planned work is left out
  unless you ask for it.
- Teaching on "variable days" with hours per week spreads the hours over Monday to Friday.
- In Safari and Firefox the timed auto-save downloads a new copy each time something changed.
- The merge works per record (person, project, assignment), not per field.

Keyboard shortcuts: press `?` to see them. Change them, or switch them off, in Settings, Shortcuts
(saved per computer). Defaults: `/` search, `A` add assignment, `P` add person, `N` new project,
`Ctrl/Cmd+S` save team, `T` switch team, `,` Settings, `D` theme, `1` to `6` pages.

About and license: License at the bottom of the menu shows the author and the MIT License.

## v33: greeting on every page

- The slim greeting line (greeting, time and date, weather when switched on) now shows at the top of
  every page, not only Home.

## v32: Team side by side

- The Team page now opens with a column of small person cards on the left and the selected person's
  full card, involvement, deadlines, tasks and assignments on the right, one after another.
  The two columns scroll separately, so scrolling the people list leaves the details where they are.
  Clicking a person shows their details from the top. The coordinator is still first, with the gold frame.
- The big cards and the list are still there (layout buttons next to Sort). In those layouts a click
  on a person now scrolls down to their details.
- On narrow windows the two columns stack.

## v31: demo team and research centres

- **Demo team "Experimental Engineering".** Click the team name, then **Add demo team**. It adds a fictional
  team of 24 people next to your own teams (your data is not touched): 1 professor, 1 associate and
  1 assistant professor, 2 researchers, 2 postdocs, 3 research engineers, 3 PhD candidates,
  4 industrial PhD candidates (50% plate), 3 amanuenses (20% plate), 1 visiting researcher and
  3 visiting students. It has 13 research projects with different timelines (finished, ongoing, granted,
  planned, submitted), 4 courses in different teaching periods, guest lectures in 4 other courses,
  PhD supervision and a visiting programme, with % involvement and tasks on every assignment.
  The same data is in `demo-data/experimental-engineering-demo-team.json` (load it with
  "Load team from JSON file").
- **Research centre per project** (optional field in the project dialog). 7 of the 13 demo projects run in
  two centres (CFS and DMC). The centre's short name (the part before a colon) shows on project cards,
  the full name on the project page. Projects can be filtered and sorted by centre, and Analytics can
  group by research centre.

## v30: several people editing

The app is a file each person opens on their own computer, so there is no live server keeping everyone in step. Instead, saving now **merges** before it writes, so one person's save no longer wipes out another's work.

- **Auto-save to a shared file (Chrome, Edge, Arc, Opera).** Before each save the app reads the shared file (for example on OneDrive), and if someone else saved in the meantime it merges their version with this computer's, record by record, then writes the result. It also checks the file when nothing changed here, so colleagues' changes arrive at the next auto-save. *Merge and save now* in Settings > Data does it at once.
- **Merge a colleague's file (all browsers, including Safari and Firefox).** Settings > Data and the team switcher have *Merge a colleague's file*: pick their saved file (a whole workspace or one team) and it is merged into what is here. Then save to share the result.
- **How the merge decides.** People, projects, assignments, weekly hours, capacity adjustments, shared work and task groups are merged one by one against the version this computer last read or wrote. A record changed on one side only takes that change; records added on either side are all kept; a record removed on one side and untouched on the other is removed.
- **Nothing is lost.** If the same record was changed differently on both sides, this computer's version is kept and the other is set aside under *Set aside while merging* in Settings > Data, with *Use this version* to put it back. A record removed on one side but changed on the other is kept.

What it does not do: it does not show other people's changes live while you work, and two people editing different fields of the same project at the same time count as a conflict on that project (one version is set aside, not combined field by field). OneDrive's own "conflicted copy" files can also be merged with *Merge a colleague's file*.

## v29

- **Analytics: choose what to show.** A row of *Show* chips at the top switches each section on or off: Your chart, At a glance, Involvement per person, Team workload, Tasks overview (or Outlook), Hours or people per project, Needs attention. The choice is remembered on this computer.
- **Analytics: choose how.** *Your chart* lets you pick a measure (Involvement %, Assignments, Projects, People, Task groups, Open detailed tasks), group it (by person, project, type or kind, funder, stage, person's role or task group), limit it to research projects or activities, include planned work, show the top 5 to all, and draw it as bars, columns, a donut or a table. People above their full plate level show in red in the bars.

## v28

- **Involvement in percent.** The assignment window has *Involvement in this project* (percent of full time, optional). Each task group can carry its own % as well, to show what makes up the share; when the involvement is left empty, the tasks' sum is used. It is an indication for planning and estimating, not a timesheet, and a person's total can go past 100%.
- **Shown where people are.** Team cards and the Team list show each person's total with a small bar (sortable by *Involvement %*). The person panel lists the % per project with its tasks, planned work and their full plate level. The person card PDF and Excel include it.
- **Most involved on Home.** A *Most involved* card ranks people by their current involvement (or by projects and tasks while no % is set).
- **Analytics.** *Involvement per person* shows every person's projects as blocks, planned work striped, and a tick at their full plate level.
- **Warning level and own plate.** Settings > General has *Involvement warning level* (default 100%). Each person can set *My plate is full at* in their details (for example 80% part time). Above it the bar turns red with "over"; it is only an indication.

## v27

- **Team coordinator first, in gold.** Settings > Team (or Edit team details on Home) has a *Team coordinator* field. When it is not set, the team lead is the coordinator. The coordinator always comes first on the Team page (cards and list, whatever the sort) and in the Home people list, with a gold frame and a "Coordinator" badge.
- **Slim greeting.** The greeting, time, date and weather are now one small line at the very top of Home, without a frame.
- **Switch or load a team.** Clicking the team name opens *Switch or load a team*: pick a team, *Load team from JSON file* (it is added as a new team next to the others and opened; a file with all teams goes through the restore review), or *Save this team as JSON*.
- **Save team button.** A *Save team* button in the top bar downloads the current team as JSON (people, projects, assignments, settings). The Backup link at the bottom stays.
- **Project abbreviation and full title.** The project window has *Abbreviation* and *Full title* (both optional). The abbreviation is shown on project cards and in the timelines; the project page shows abbreviation, name and full title.

## v26

- **People in roles for every activity.** Like the PI on research projects, each activity type now has its own optional role fields in the edit window: *Course responsible* for teaching, *Supervisor* and *Assistant supervisor* for supervision, *Host* for networking, and for other activities a role you name yourself (for example *Facilitator*) with its person. Pick someone from the team or type the name of someone outside it. The roles show in the card header, the project overview, the list view, the person card exports (PDF and Excel, "Roles" column) and the team Excel export.
- **Teaching with irregular days.** Teaching has a *Variable days* checkbox for courses whose teaching days change from week to week; the weekday picker is then hidden.
- **Teaching hours per week.** An optional *Hours per week* field. It shows in the schedule line and is used by "Fill weekly hours from this schedule" (spread over the chosen weekdays, or Monday to Friday when the days vary).
- **Time of day folded.** The from and to times for teaching are folded by default; the folded line shows the times when they are set.
- Older files open unchanged: `roles`, `variableDays` and `weekHours` are optional.

## v25

**Moved milestones and deadlines say so.** When a date changes (by hand in the dialog, or with the project end after an extension), the point remembers its earlier date. Everywhere it is shown you see "Moved from 31 Oct 2028", and after a second move also "originally ..." with the first date:

- project overview, the Milestones layout, Home and a person's Deadlines list (amber line under the title);
- project cards (badge tooltip), assignment rows and the Projects list column;
- timeline tooltips, the person card PDF and Excel, the editable slide, the team Excel export (Moved from, First date) and Markwhen (as a description line).
- Moving a point back to its first date clears the note. Done points no longer show it in the lists. Stored as `movedFrom`, `originalDate` and `movedOn` on the point, all optional.

**Project PI.** The project dialog has "Project PI (optional)", a pick from the team. It shows under the project name on the card and in the project overview (with the role), next to the funder in the Projects list, and in the person card PDF and Excel (new PI column). Stored as `project.piId`, optional; if that person leaves the team the PI line simply disappears.

## v24

**Deadlines at a glance.**

- **Person panel:** a "Deadlines and milestones" list under the numbers, with everything overdue or due in the next three months across the person's current projects and activities. Tick to mark done; click a project name to open it. It is part of the picture and picture-slide exports.
- **Project cards:** a small badge under the funder instead of the full text line: "1 overdue" (red), "2 due in 30 days" (amber) or "Next 4 Dec 2026". Hover for the list.
- **Projects list view:** a "Next deadline" column with the date, title and how far away it is (red when overdue, "+2" when more are open). Sort by it with the column heading or "Sort: Next deadline or milestone"; projects without open points go last.
- A person's assignment rows keep the one-line next deadline.

## v23

**Extensions move the project end, and the dates tied to it.**

- Under the extension rows, the dialog shows the chain: Project end → Extension 1 → New project end, with how many months each adds. Two (or more) extensions chain the same way.
- When the project end moves (a new or changed extension, or a changed contract end), the dialog lists the open milestones and deadlines that sit on or after the old end, or within a month before it, such as a final report. They are ticked to move by the same number of days (12 months later for a one-year extension); untick any that should keep their date. Done points, and points you already changed in the dialog, are left alone.
- Moved points go into the project History, with your reason or "Moved with the project end".
- The original contract end is kept, so the timeline still shows the original period and each extension. The project overview shows "Original end" and "Extended to", and every list, the Home card, timelines and exports use the new end.

## v22

**Dates that fit the stage.** In a research project's edit dialog, the Dates box now opens only the dates that matter for the stage you pick, and folds the rest under "Other dates". The fold line names the folded groups and shows any dates already filled there, so nothing is hidden by surprise. Changing the stage in the dialog updates the view at once. Folded dates are kept and saved as before.

- Proposal: Application, Proposed period. Submitted: Application, Funding decision, Proposed period.
- Granted: Funding decision, Contract period. Ongoing: Contract period (with Add extension).
- Finished: Contract period, Closing (Finished on). Rejected: Application, Funding decision.
- Planned: Proposed period, Contract period. Stage not set: everything open.
- Your own stages (Settings > Project lists) follow the stage they work like.

**Adding an extension:** Edit the project, make sure the Contract period has an End date, press "+ Add extension", set the new end (a year later is offered), add a reason and the approval date if you like, and Save. Each extension must end after the previous one; the timeline shows it as a hatched bar and History records it.

## v21

**Milestones and deadlines.** Any project or activity can have dated points: a **milestone** (something reached, such as "Test rig ready") or a **deadline** (something due, such as "Mid-term report"). They are optional; add as many or as few as help.

- **Add and edit** them in the project dialog, under "Milestones and deadlines": kind, title, date, an optional note and a Done tick. A row with a title but no date (or the other way round) is pointed out on Save; a blank row is ignored. Moving the date of an existing one goes into the project's History, with the reason if you give one.
- **Tick when reached or delivered** wherever they are listed (project overview, Home, the Milestones layout). Ticking saves at once, with Undo in the message.
- **Project overview:** a "Milestones and deadlines" section with all of them in date order, how far away each is, and Add or Edit.
- **Project cards and a person's Projects list:** one line with the next open point (red when overdue), plus how many more are open.
- **Projects, new Milestones layout** (flag button next to Cards, List and Timeline): every point of the projects shown, grouped by month with overdue ones first. Open, Overdue, Done or All. The filters (type, stage, team member, year, funder, search and the projects or activities tabs) apply, and projects without points are listed at the end.
- **Timelines** (Projects and a person's Timeline): a teal diamond for a milestone, an orange triangle for a deadline, red when overdue, faded when done. Hover for the title, date and note. A project with only milestones now gets a line too.
- **Home:** a "Milestones and deadlines" card with what is overdue or due in the next three months, and a link to the full list. Finished and rejected projects are left out.
- **Exports:** Markwhen (`#Milestone` and `#Deadline` lines, `#Done` when ticked, notes as descriptions; checked with `@markwhen/parser` 1.3.1, no messages), the person card PDF (under each project's period) and Excel (new sheet "Milestones and deadlines"), the editable slide (open and coming points under each project), the team Excel export (new sheet), and the picture and picture slide (they show what is on screen, so the next-point lines are in them).
- Stored as `project.milestones` (`{id, kind: "milestone" | "deadline", title, date, note?, done?}`), optional, so older files open unchanged and the file version stays 1.

## v20

**Editable slide.** The person card's download menu has a third slide choice, "Editable slide (PowerPoint)". Instead of a picture it builds the card from real text boxes, shapes and a table: name, role, photo (or initials), the three numbers, capacity bar and legend (or status and note when hours are off), and every listed assignment with its type, funder, dates, task groups, detailed tasks (ticked or not), note, hours and status. Colours follow the theme you are in. Long lists continue on more slides. It follows the type filter of the Assignments panel. Close to the app, not pixel-identical; the picture slide stays for that.

Pictures and picture slides (v19) no longer have shadows or glows.

## v19

**Person card as a picture or a slide.** The download menu on a person's card (Team, open a person) has two new choices next to PDF and Excel:

- **Picture (PNG):** the card and the Assignments panel exactly as shown, in the current view (Projects, Tasks or Timeline), filter and theme, at three times screen resolution. App-only buttons (download, edit, Assign, Export to Markwhen) are left out, and a Timeline shows its whole range without scrollbars.
- **Slide (PowerPoint):** the same picture on a 16:9 slide in the page colour, with the team name and date in the corner. Opens in PowerPoint, Keynote and Google Slides.
- Everything is made in the browser, offline (html-to-image and pptxgenjs are bundled). Safari draws the picture twice, because it can leave photos out on the first pass.
- Tip: a long list makes a small slide. The Tasks view or a type filter gives a tighter picture.

## v18

**Export to Markwhen.** The Projects timeline (and a person's timeline) has an "Export to Markwhen" button. It downloads a `.mw` text file in the [Markwhen](https://markwhen.com) format, for the Markwhen/Meridiem editor, the VS Code extension, or keeping under git.

- One heading per kind (Research projects, Teaching, Supervision, Networking, Other), one sub-heading per project, tagged with its stage, type and funder.
- Research projects: application, waiting for decision, proposed and contract periods and extensions (with notes), plus milestones (submitted, decision, extension approved, finished), in date order.
- Activities: teaching periods with their weekly lessons, spans, single meetings, events, and recurring meetings as Markwhen repeats (`every week on Monday until ...`). Open-ended series stop half a year ahead, as on the timeline.
- Exactly what the timeline shows: filters and the projects or activities scope apply. Projects without dates are listed in a comment at the end.
- Checked against the official `@markwhen/parser` (1.3.1): the demo team exports with no parse messages. Markwhen tags allow only letters, digits and `_`, so "Research council" becomes `#Research_council` and accents are dropped.

## v17

Settings has a new **Project lists** tab for the choices in the Projects filters (All types, All stages, All funders) and in the project form.

- **Project types and funders:** add, rename, reorder (or sort A to Z) and remove. Renaming an entry renames it on every project that uses it. Removing one leaves those projects as they are, and the entry stays in the filters while a project still uses it. Each row shows how many projects use it.
- **Stages:** the built-in stages drive the timeline and charts, so they can be renamed, reordered or hidden from the stage picker, but not removed. You can add your own stages, each working like a built-in one (for example "Under negotiation" works like Submitted), so the timeline and colours still make sense. Removing an own stage moves its projects back to the stage it works like.
- Stored in `settings.projectTypes`, `settings.funders`, `settings.stages` and `project.stage`, all optional, so older files open unchanged.

## v16

- The Assignments panel next to a person's card has three views: Projects (as before), Tasks (the person's work by task group across projects, with each project's detailed tasks to tick) and Timeline (the person's own projects and activities on the timeline). The choice is remembered.
- Filter by type: All, Research, Teaching, Supervision, Networking or Other, with counts. It applies to all three views.

## v15

- Updating an assignment from "Add assignment". If you pick a person and a project they are already on, the dialog says so (with a link to edit the current assignment instead). Saving then shows what would change: status, note, task groups added or removed (with their detailed tasks and shared work links), detailed tasks added, removed or ticked. "Update assignment" replaces the current one; "Keep editing" and "Keep the current assignment" leave it as it is. Planned hours are kept, and Undo works after saving.
- Larger portraits: photos on the Team cards and in the person panel are twice the size (also in v14).

## v14

- Task groups per project. In the project editor, "Task groups" lists the groups this project uses (Writing, Measurement, Reporting...). Click to add or remove; "+ New group" adds one to the task library too. The groups show in the project overview with the number of open detailed tasks.
- When you assign someone, the project's groups are offered first; "More groups" shows the rest. A group picked outside the list joins the project's list.
- Detailed tasks. Under each group a person holds, "Add detailed tasks" opens a numbered list: type and press Enter, or paste a whole list (numbers and bullets are removed). Tick when finished, reorder with the arrows, edit in place, remove with the cross, and "Clear finished" when you like.
- The lists show, with tick boxes, on the person's assignments in Team and in the project overview; ticking saves at once with Undo. The map shows them when you click a task box, and the person's card export (PDF and Excel) includes them.
- Older files open unchanged; the new fields are optional.

## v13

- Dependency map. Shared work has a Cards and Map switch. On the map each project is a column with its tasks as boxes; a solid blue line means the tasks work together (one shared work item), a dashed amber arrow points at what a task waits on. Links that skip a column run below the boxes so they never cross one.
- Hover a box to trace everything it is part of. Click a line to see which shared work it belongs to, edit it, remove a waits-on link or take one side out. Click a box for the people on it and its shared work. On a card, the map button opens the map focused on that work.
- Build on the map: drag from one box to a box in another project (on a phone, drag the dot on the right of the box), then pick Work together or which side waits on the other. "Add to map" puts any project or task on the map so you can connect it. Everything saves as ordinary shared work, so the cards, the assignment dialog and the map always agree, and Undo works as usual.
- Open shows open work only; All adds finished work, drawn faded.

## v12

- Connect tasks across projects. In the assignment dialog, under each person's tasks, press "Connect a task". Pick the task here, how it connects (Works together with, or Waits on), the other project and, if you like, the task there. Example: Experiment design in one project works together with Sensor and clamping design in another.
- "Works together with" is stored as shared work: the task joins an existing shared work item, or a new one is created, and people doing the matching task in the other project join it too. "Waits on" adds the other project as something this work waits for. Both show in the Shared work tab, on the project cards and in the project overview. The Shared work tab is unchanged and still the place to edit or remove a connection.
- Fix: clicking a person in the project overview now opens that person's engagement for editing (it used to open "Add an assignment" and complain the person was already assigned). The same fix is in v11.

## v11

- **Whole team on an activity in one step.** When you add a project or activity, tick **Add the whole team**. On an existing one, use **Add whole team** in its overview or edit dialog. Everyone not yet on it is added (Ongoing if the work is running, otherwise Planned) without hours, so you can add tasks or remove people afterwards.
- **Home header** with a greeting, the time and date, a short description of the tool and, optionally, the weather. Your name for the greeting and the weather are set in **Settings > General** and are saved on this computer only.
- **Weather (optional, off by default).** Search for a city in Settings and pick it. The app then asks Open-Meteo (open-meteo.com: free, no account or key) for the current weather of that place every 30 minutes while Home is open, and caches it for 20 minutes. Only the coordinates of the place are sent, never team data. Offline or blocked, Home simply says the weather is not available.
- **Photos on people's cards.** In a person's dialog, **Add photo** crops the picture to a square and shrinks it to about 15 kB before it is saved in the team file, so backups stay small. Photos show in the tiles, the member panel, Home, project overviews and the PDF person card. **Remove** takes it out again.
- **Overview beside the cards.** In the Projects card layout, clicking a project or activity opens its overview in a panel on the right; the cards shrink to compact tiles (kind, status, name, dates, people) so they fit next to it. Close (or Esc, or clicking the same tile again) brings back the full cards. On windows narrower than 900 px the overview opens as a dialog instead.
- **Project overview.** Clicking a project or activity elsewhere (list, timeline, Home) opens a larger card: stage, type or kind, funder, dates, people, hours this week, its own timeline, the team with tasks and status, shared work, notes and history. **Edit** switches to the form; Save or Cancel returns to the overview. The **✕** at the end of a person's row takes them off the project or activity, together with the hours planned for it; the message that follows has **Undo**.

## v10

A spacing pass over the whole app, checked automatically for overlapping or spilling text in every view, dialog and Settings tab at three widths (1440, 1100 and 420 px), in light and dark:

- Project cards: long "waits on" lines wrap inside the card (they ran past its edge and made the page scroll sideways). The footer keeps avatars, years and Details on one line; more than three people shows as "+1", and the separate people count is gone.
- Member panel: assignment rows give hours and status their own room, and on phones they sit on a line under the title. The third counter is now "Not estimated" and wraps instead of spilling.
- Analytics: the hours column fits values such as "49h*", and Capacity outlook labels every other week when the chart is narrow.
- Opening a dialog on a phone closes the side menu first.

## v9

**Settings has tabs:** General (capacity tracking, and weeks shown in the planner when tracking is on), Team details (abbreviation, full name, organisation, description, focus areas, team lead, email, website; edited right here, and **Edit team details** on Home opens this tab), Teaching periods, Task library and Data and backups (auto-save, download backups, import or restore, export to Excel, workspace information; this replaces the old Data & backups page in the left menu, and the quick Backup link stays at the bottom of the menu). Counts on the tabs show how many periods and tasks there are. Everything except auto-save is saved together with **Save settings**; auto-save applies right away on this computer.

## v8

**Download a person's card.** In the Team view, open a person and click the download icon next to the pencil:

- **PDF or print:** opens the print dialog with a clean one-page card (team, name, role, status, each project or activity with its period or schedule, the person's part and tasks with notes and shared work, finished work, and planned hours for the next 8 weeks when capacity tracking is on). Choose "Save as PDF" to keep it. Works in every browser.
- **Excel:** `TEAM-Name-card.xlsx` with a Profile sheet, a "Projects and tasks" sheet (one row per task, with a filter) and, when tracking is on, "Planned hours".

Everyone can export their own card; nothing is sent anywhere.

## v7

**Home** is the new front page and opens first. It shows the team's abbreviation, full name, organisation, a short description, focus areas, team lead, website and contact email, then the same donut charts as Analytics ("At a glance"), everyone on the team with their role, and **Coming up**: meetings and events in the next 30 days and application deadlines, funding decisions, project starts and ends in the next 60.

Fill it in with **Edit team details** on Home (or **Settings > Team details**). The abbreviation (for example NML for Northfield Manufacturing Lab) names the team in the left menu, the breadcrumb and the team list; the full name heads the Home page. Left empty, both use the team's existing name. The details are saved with the team (`profile` in the plan, optional, plan version stays 1), so they travel with backups and auto-save.

**Timeline, easier to read:** each line keeps its project's colour and the pattern shows the stage: dots for application writing, a dotted line while waiting for the decision, vertical hatching for the proposed (applied for) period, solid for the ongoing contract period, 45 degree hatching for extensions (with "+6 mo"), a dashed outline when only years are known, grey for finished or rejected projects. Recurring meetings are a dashed line, meetings and events short solid marks. Each name shows the stage and how long it runs ("Ongoing · to Jun 2027 (extended)"), or the schedule for activities, and the axis has quarter lines and a "Today" marker.

**Tasks by project:** in the Team view, a person's "Current tasks" lists each project with its tasks (planned assignments marked), so you see where every task belongs. In the Team list the task chips show their projects on hover.

The left menu is now Home, Team, Projects, Shared work, Capacity (when tracking is on), Engagement and, last, Analytics.

## v6

Activities now get dates and times that fit their kind (research projects keep the v5 dates: application, proposed and contract period, extensions):

- **Teaching:** pick one or more teaching periods, plus optional weekly days and time (for example Period 2 and 4, Tue and Thu 10:00 to 12:00). Periods and their dates are set once in **Settings > Teaching periods**.
- **Supervision:** a time span (from, optional to).
- **Networking:** a single meeting (date, optional from and to time), a recurring meeting, or an event or conference over one or more days (optional daily time).
- **Other activities:** from date and time to date and time, or a single meeting, recurring meeting or event.
- **Recurring meetings:** weekly on chosen weekdays (every 1 to 4 weeks) or monthly on the same date, with a time and an optional end. Example: Team pulse, every Monday 09:30 to 09:50.

Cards and the member panel show a one-line summary ("Every Monday 09:30 to 09:50"), the Timeline draws activities too (teaching periods as blocks, recurring meetings striped, meetings and events as short marks), and schedule changes go into the History. With capacity tracking on, **Fill weekly hours from this schedule** in the activity dialog writes the scheduled hours into each team member's plan for the next 26 weeks (events without times count 8 hours a day). Nothing is filled automatically.

The demo team has four placeholder teaching periods and examples of every kind.

### Auto-save to a file (v6)

**Settings > Auto-save to a file** saves all teams to one JSON file at the interval you pick (every 1, 2, 5, 10, 15, 30 or 60 minutes), only when something changed since the last save. The setting is per computer and applies right away. To restore, use **Settings > Data and backups > Choose a file** and pick that file.

- **Chrome, Edge, Arc, Opera:** choose the file once (it can be in OneDrive); the app overwrites it each time. After you reopen the app the browser asks again for permission, so click **Resume auto-save** in the top bar once. **Save now** and **Forget file** are in Settings.
- **Safari, Firefox:** these browsers cannot write to a chosen file, so each auto-save downloads a copy named with date and time (`team-capacity-autosave-2026-11-17-1430.json`) to Downloads.

The top bar shows "File saved 14:30" after each save, or "Auto-save failed" (opens Settings) if writing did not work.

## v5

**Shared work** (new view in the sidebar) is for work several projects build on, such as a batch of test pieces that one project machines and another measures. Each project joins through its people's tasks, so every project keeps its own focus: CleanCut does Machining on "Ti test coupons batch A", NOVA Surface Lab does Measurement on the same batch.

Quick entry: in an assignment, each selected task has a "Shared work" box next to its note. Pick an existing name or type a new one, and a new shared work item is created when you save. The dialog shows who else works on it ("Also: Measurement in NOVA Surface Lab (Elin)").

In the shared work dialog you pick the projects and tasks from lists: one row per project with its task (from the task library) and, optionally, the person. Picking someone who is not yet on that project adds them as Planned. Rows without a person are kept as project and task links until someone takes them on.

Each shared work item has a status (Planned, In progress, Done), an optional note and **waits on** links: to other shared work, to a whole project, or to one task in a project. A project counts as done when it is Finished (or Rejected); a task when everyone on it in that project has finished. The app refuses links that would go in a circle. Open items show as a light badge on project cards and in the member panel, with "shared with" the other projects and "waits on" anything not yet done. Done items drop off the cards.

Removing a shared work item keeps the tasks; only the link goes. All new fields are optional and the plan version stays 1, so v4 backups open unchanged. The demo team has six examples.

### Project timeline (v5)

Projects has a third layout button, **Timeline**: one line per project on a shared year axis with a red "today" line. Each line shows:

- application preparation (violet stripes) from "start writing" to the submission, marked with a diamond;
- a dotted line while waiting for the funding decision (open diamond);
- the proposed period, hatched and dashed, while the project is tentative (Proposal, Submitted, Planned or Rejected);
- the contract period in the project colour once it is confirmed;
- each extension in amber stripes on the same line, labelled with its length;
- finished and rejected projects greyed out, cut at the "Finished on" date.

Projects with only years show as an approximate bar from 1 January to 31 December until you add dates.

Dates are entered in the project dialog (Application, Proposed period, Contract period, Decision and closing) with **Add extension** (new end date, reason, approved on). The original end date is kept. When a project moves to Granted or Ongoing without a contract period, the proposed period is copied in. Moving it to Finished before its end date records today as the finish date. Every change to dates, extensions or status goes into the project's **History** with the date and an optional reason. Start and end years stay in sync, so the year filter still works.

Status model: Proposal (preparing) → Submitted → Granted or Rejected → Ongoing (with any extensions) → Finished. Planned is for internal work without an application.

## v4

The tool is now framed around what people work on, not how many hours they log.

**Settings** (sidebar) holds team-wide options. The first is **Capacity tracking**, off by default. While it is off, weekly hours, capacity and % busy are hidden everywhere and the Capacity view is removed from the menu. Each person instead sets their own status: **Full plate**, **Steady** or **Has room**, with an optional short note. Switching tracking on brings the hours back; nothing is deleted while it is off.

**Tasks on assignments.** When you assign a person to a project or activity, pick one or more tasks as chips (Setup preparation, Machining, Measurement, Testing, Data analysis, and so on) and add an optional one-line note per task. Type a name in "+ New task" to add one to the library on the spot. The library (name, category, colour) is edited in Settings. Tasks appear on person tiles, in the member panel, on project cards, in the list views and on Analytics ("What the team works on").

Everyone can edit everything: there are no roles or permissions. Shared work items across projects and "waits on" dependencies are planned for the next version; the data model leaves room for them.

All new fields are optional and the plan version stays 1, so v3 backups open unchanged.

## v3

A dark card design (a light variant is one click away in the top bar). **Team** shows every person as a tile with this week's load and open estimates; pick one to see their capacity split by project and their assignments. **Projects** is a card grid with filters for type, stage, team member, year and funder. **Analytics** is the overview.

People can have an optional **role**; projects an optional **type**, **funder**, **start and end year** and a short **description**. All are optional and blank by default, older backups load unchanged, and the Excel export has extra columns for them.
