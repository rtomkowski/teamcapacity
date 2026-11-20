import {
  addWeeks,
  clone,
  monday,
  uid,
  validatePlan,
  type Plan,
} from "./model.ts";

export interface Team {
  id: string;
  name: string;
  plan: Plan;
}
export interface TeamWorkspace {
  format: "pem-team-workspace";
  version: 1;
  activeTeamId: string;
  teams: Team[];
}
export type TeamSetup = "sample" | "empty";

export function createWorkspace(plan: Plan, name = "My team"): TeamWorkspace {
  return {
    format: "pem-team-workspace",
    version: 1,
    activeTeamId: "first-team",
    teams: [{ id: "first-team", name, plan: validatePlan(plan) }],
  };
}

export function createTeamPlan(setup: TeamSetup, week = monday()): Plan {
  const plan: Plan = {
    version: 1,
    people: [],
    projects: [],
    assignments: [],
    allocations: [],
    capacityOverrides: [],
    settings: { weekCount: 8 },
    source: setup === "sample" ? "Starter dummy data" : "Empty team setup",
  };
  if (setup === "empty") return plan;
  const roles = ["Researcher", "PhD student", "Research engineer"];
  plan.people = ["Alex Morgan", "Jamie Lee", "Sam Taylor"].map((name, i) => ({
    id: uid(),
    name,
    role: roles[i],
    capacityHours: 40,
    reservedHours: 8,
    notes: "Dummy team member. Replace with your own details.",
  }));
  plan.projects = [
    {
      id: uid(),
      name: "Example project",
      status: "ongoing",
      notes: "Dummy project. Rename or remove it to get started.",
      type: "Research",
      funder: "Example funder",
      startYear: Number(monday(week).slice(0, 4)),
      endYear: Number(monday(week).slice(0, 4)) + 2,
      description: "An example research project. Edit it to add your own type, funder, years and description.",
    },
    {
      id: uid(),
      name: "Upcoming initiative",
      status: "proposal",
      notes: "Dummy proposal with a tentative assignment.",
      type: "Development",
      startYear: Number(monday(week).slice(0, 4)) + 1,
      description: "A proposal still in preparation, with one tentative assignment.",
    },
  ];
  plan.assignments = plan.people.map((person, index) => ({
    id: uid(),
    personId: person.id,
    projectId: plan.projects[index === 2 ? 1 : 0].id,
    status: index === 2 ? "planned" : "ongoing",
    estimated: true,
    notes: "Dummy allocation for the first four weeks.",
  }));
  plan.allocations = plan.assignments.flatMap((assignment, index) =>
    Array.from({ length: 4 }, (_, offset) => ({
      id: uid(),
      assignmentId: assignment.id,
      week: addWeeks(monday(week), offset),
      hours: [16, 12, 8][index],
    })),
  );
  return plan;
}

export function addTeam(
  workspace: TeamWorkspace,
  name: string,
  setup: TeamSetup,
  week = monday(),
): TeamWorkspace {
  if (workspace.teams.length >= 1000)
    throw new Error("This workspace already has the maximum of 1,000 teams.");
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80)
    throw new Error("Enter a team name between 1 and 80 characters.");
  if (
    workspace.teams.some(
      (team) => team.name.toLowerCase() === trimmed.toLowerCase(),
    )
  )
    throw new Error(
      "A team with this name already exists. Choose another name.",
    );
  const team = { id: uid(), name: trimmed, plan: createTeamPlan(setup, week) };
  return {
    ...workspace,
    activeTeamId: team.id,
    teams: [...workspace.teams, team],
  };
}

/** Add a team loaded from a single-team JSON file and make it the active team (v27). */
export function addTeamFromPlan(
  workspace: TeamWorkspace,
  plan: Plan,
  fileName = "",
  teamName = "",
): TeamWorkspace {
  if (workspace.teams.length >= 1000)
    throw new Error("This workspace already has the maximum of 1,000 teams.");
  const base = (
    teamName.trim() ||
    plan.profile?.abbreviation?.trim() ||
    plan.profile?.fullName?.trim() ||
    fileName.replace(/\.json$/i, "").replace(/[-_]+/g, " ").trim() ||
    "Loaded team"
  ).slice(0, 70);
  const taken = new Set(workspace.teams.map((t) => t.name.toLowerCase()));
  let name = base;
  for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${base} (${i})`;
  const team = { id: uid(), name, plan: validatePlan(clone(plan)) };
  return { ...workspace, activeTeamId: team.id, teams: [...workspace.teams, team] };
}

export function switchTeam(
  workspace: TeamWorkspace,
  id: string,
): TeamWorkspace {
  if (!workspace.teams.some((team) => team.id === id))
    throw new Error("This team could not be found.");
  return { ...workspace, activeTeamId: id };
}

export function updateTeamPlan(
  workspace: TeamWorkspace,
  plan: Plan,
): TeamWorkspace {
  return {
    ...workspace,
    teams: workspace.teams.map((team) =>
      team.id === workspace.activeTeamId ? { ...team, plan } : team,
    ),
  };
}

export function validateWorkspace(value: unknown): TeamWorkspace {
  if (!value || typeof value !== "object")
    throw new Error("The backup is not a valid team workspace.");
  const workspace = value as TeamWorkspace;
  if (
    workspace.format !== "pem-team-workspace" ||
    workspace.version !== 1 ||
    !Array.isArray(workspace.teams) ||
    !workspace.teams.length ||
    workspace.teams.length > 1000 ||
    typeof workspace.activeTeamId !== "string"
  )
    throw new Error("Unsupported or incomplete team workspace.");
  if (
    workspace.teams.some(
      (team) =>
        !team ||
        typeof team.id !== "string" ||
        !team.id ||
        team.id.length > 200 ||
        typeof team.name !== "string" ||
        !team.name.trim() ||
        team.name.length > 80,
    )
  )
    throw new Error("Invalid team name or ID.");
  if (
    new Set(workspace.teams.map((team) => team.id)).size !==
      workspace.teams.length ||
    new Set(workspace.teams.map((team) => team.name.trim().toLowerCase()))
      .size !== workspace.teams.length ||
    !workspace.teams.some((team) => team.id === workspace.activeTeamId)
  )
    throw new Error("Duplicate teams or missing active team.");
  return {
    ...clone(workspace),
    teams: workspace.teams.map((team) => ({
      id: team.id,
      name: team.name.trim(),
      plan: validatePlan(team.plan),
    })),
  };
}

export function restoreWorkspace(
  saved: unknown,
  legacyPlan: unknown,
  initialPlan: Plan,
  initialName?: string,
): TeamWorkspace {
  if (saved !== undefined) return validateWorkspace(saved);
  // A plan saved by the first, single-team version is kept as "My team".
  return legacyPlan === undefined
    ? createWorkspace(initialPlan, initialName)
    : createWorkspace(validatePlan(legacyPlan));
}

/**
 * Removes a team from this browser (v40). The last team cannot be removed. When the open team is
 * removed, the first remaining one opens. Returns the new workspace and what is needed to undo.
 */
export function removeTeam(
  workspace: TeamWorkspace,
  id: string,
): { workspace: TeamWorkspace; removed: Team; index: number; wasActive: boolean } {
  const index = workspace.teams.findIndex((t) => t.id === id);
  if (index < 0) throw new Error("This team could not be found.");
  if (workspace.teams.length === 1) throw new Error("The last team cannot be removed. Create or load another team first.");
  const teams = workspace.teams.filter((t) => t.id !== id);
  const wasActive = workspace.activeTeamId === id;
  return {
    workspace: { ...workspace, teams, activeTeamId: wasActive ? teams[0].id : workspace.activeTeamId },
    removed: workspace.teams[index],
    index,
    wasActive,
  };
}
/** Puts a removed team back where it was. */
export function restoreTeam(workspace: TeamWorkspace, removed: Team, index: number, makeActive: boolean): TeamWorkspace {
  if (workspace.teams.some((t) => t.id === removed.id)) return workspace;
  const teams = [...workspace.teams];
  teams.splice(Math.min(index, teams.length), 0, removed);
  return { ...workspace, teams, activeTeamId: makeActive ? removed.id : workspace.activeTeamId };
}
