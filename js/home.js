import { DEFAULT_CONTEXT, buildUrl } from "./app.js?v=17";
import { loadGroupData } from "./mock-data.js?v=8";
import { debounce, rankTextMatches } from "./search.js?v=4";

const groupDataCache = new Map();

function schoolName(school) {
  return String(school?.name || school?.school || "").trim();
}

function activeMode(form) {
  return form.querySelector('[data-home-mode][aria-pressed="true"]')?.dataset.homeMode || "roll";
}

async function getGroupData(group) {
  if (!groupDataCache.has(group)) {
    groupDataCache.set(group, loadGroupData(group).catch((error) => {
      groupDataCache.delete(group);
      throw error;
    }));
  }
  return groupDataCache.get(group);
}

function getRankedSchools(data) {
  const rankedSchoolIds = new Set(
    data.students
      .filter((student) => student.rank > 0 && student.schoolRank > 0)
      .map((student) => Number(student.schoolId))
  );
  const seen = new Set();
  return data.schools.filter((school) => {
    const name = schoolName(school);
    const key = name.toLowerCase();
    if (!rankedSchoolIds.has(Number(school.id)) || name.length <= 2 || !/[a-z0-9]/i.test(name) || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function resultContext(form) {
  return {
    exam: DEFAULT_CONTEXT.exam,
    year: DEFAULT_CONTEXT.year,
    board: form.querySelector("[data-home-board]")?.value || DEFAULT_CONTEXT.board,
    group: form.querySelector("[data-home-group]")?.value || DEFAULT_CONTEXT.group
  };
}

function studentInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return `${parts[0][0] || ""}${parts.length > 1 ? parts[parts.length - 1][0] || "" : ""}`.toUpperCase();
}

function createChampionCard(student) {
  const link = document.createElement("a");
  link.className = `champion-card champion-rank-${student.rank}`;
  link.href = buildUrl("/result/", {
    exam: DEFAULT_CONTEXT.exam,
    year: DEFAULT_CONTEXT.year,
    board: DEFAULT_CONTEXT.board,
    group: "science",
    roll: student.roll
  });
  link.setAttribute("aria-label", `View ${student.name}, Science board rank ${student.rank}`);

  const crown = document.createElement("span");
  crown.className = "champion-crown";
  crown.setAttribute("aria-hidden", "true");
  crown.textContent = "👑";

  const avatar = document.createElement("span");
  avatar.className = "champion-avatar";
  avatar.textContent = studentInitials(student.name);

  const position = document.createElement("span");
  position.className = "champion-position";
  position.textContent = student.rank === 1 ? "Science board topper" : `Science board #${student.rank}`;

  const name = document.createElement("strong");
  name.className = "champion-name";
  name.textContent = student.name;

  const school = document.createElement("span");
  school.className = "champion-school";
  school.textContent = student.school || "Institution unavailable";

  const stats = document.createElement("span");
  stats.className = "champion-stats";
  stats.innerHTML = `<span>GPA <strong>${student.gpa.toFixed(2)}</strong></span><span>Total <strong>${student.total}</strong></span>`;

  const action = document.createElement("span");
  action.className = "champion-action";
  action.textContent = "View result →";

  link.append(crown, avatar, position, name, school, stats, action);
  return link;
}

async function renderScienceTopThree() {
  const container = document.querySelector("[data-science-top-three]");
  if (!container) return;

  try {
    const data = await getGroupData("science");
    const students = data.students
      .filter((student) => student.rank > 0)
      .sort((left, right) => left.rank - right.rank)
      .slice(0, 3);

    if (students.length < 3) throw new Error("The Science top three are unavailable.");
    container.textContent = "";
    students.forEach((student) => container.append(createChampionCard(student)));
  } catch {
    const status = container.querySelector(".champions-status") || document.createElement("p");
    status.className = "champions-status is-error";
    status.textContent = "The Science board leaders are temporarily unavailable.";
    container.textContent = "";
    container.append(status);
  }
}

function renderSuggestionLink(item, mode, context) {
  const link = document.createElement("a");
  link.className = "search-suggestion-item";

  const primary = document.createElement("strong");
  primary.className = "search-suggestion-primary";
  const meta = document.createElement("span");
  meta.className = "search-suggestion-meta";

  if (mode === "name") {
    primary.textContent = item.name;
    meta.textContent = `Roll ${item.roll} · ${item.school || "Institution unavailable"}`;
    link.href = buildUrl("/result/", { ...context, roll: item.roll });
  } else {
    primary.textContent = schoolName(item);
    meta.textContent = "View this institution's ranked students";
    link.href = buildUrl("/school/", { ...context, id: item.id });
  }

  link.append(primary, meta);
  return link;
}

function setSuggestions(form, { message = "", results = [], mode = "name", context = null } = {}) {
  const panel = form.querySelector("[data-home-suggestions]");
  const feedback = form.querySelector("[data-home-feedback]");
  const input = form.querySelector("[data-home-query]");
  if (!panel || !feedback || !input) return;

  feedback.textContent = message;
  feedback.hidden = !message;
  panel.textContent = "";

  if (!results.length || !context) {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
    return;
  }

  const fragment = document.createDocumentFragment();
  results.forEach((item) => fragment.append(renderSuggestionLink(item, mode, context)));
  panel.append(fragment);
  panel.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

async function updateSuggestions(form) {
  const input = form.querySelector("[data-home-query]");
  const group = form.querySelector("[data-home-group]")?.value;
  const error = form.querySelector("[data-home-error]");
  const mode = activeMode(form);
  const query = input?.value.trim() || "";
  if (!input || !group) return;

  if (mode === "roll" || query.length < 2) {
    setSuggestions(form);
    return;
  }

  input.setAttribute("aria-busy", "true");
  try {
    const data = await getGroupData(group);
    if (input.value.trim() !== query || activeMode(form) !== mode || form.querySelector("[data-home-group]")?.value !== group) {
      return;
    }

    const source = mode === "name"
      ? data.students.filter((student) => student.rank > 0)
      : getRankedSchools(data);
    const matches = rankTextMatches(source, query, mode === "name" ? (student) => student.name : schoolName, 6);
    const noun = mode === "name" ? "student" : "institution";
    const message = matches.total
      ? `${matches.total.toLocaleString()} matching ${noun}${matches.total === 1 ? "" : "s"} found.`
      : `No matching ${noun}s found. Try another spelling.`;

    setSuggestions(form, {
      message,
      results: matches.results,
      mode,
      context: resultContext(form)
    });
  } catch {
    error.textContent = "Live suggestions are temporarily unavailable. You can still submit your search.";
    error.hidden = false;
    setSuggestions(form);
  } finally {
    input.removeAttribute("aria-busy");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderScienceTopThree();
  const form = document.querySelector("[data-home-search]");
  if (!form) return;

  const input = form.querySelector("[data-home-query]");
  const group = form.querySelector("[data-home-group]");
  const modes = form.querySelectorAll("[data-home-mode]");
  const panel = form.querySelector("[data-home-suggestions]");
  const debouncedUpdate = debounce(() => updateSuggestions(form), 140);

  input.addEventListener("input", debouncedUpdate);
  input.addEventListener("focus", () => updateSuggestions(form));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      panel.hidden = true;
      input.setAttribute("aria-expanded", "false");
    } else if (event.key === "ArrowDown" && !panel.hidden) {
      event.preventDefault();
      panel.querySelector("a")?.focus();
    }
  });

  group.addEventListener("change", () => updateSuggestions(form));
  modes.forEach((button) => {
    button.addEventListener("click", () => window.queueMicrotask(() => updateSuggestions(form)));
  });

  document.addEventListener("click", (event) => {
    if (!form.contains(event.target)) {
      panel.hidden = true;
      input.setAttribute("aria-expanded", "false");
    }
  });
});
