import { loadGroupData } from "./mock-data.js?v=2";

const loadedGroups = new Set();

function schoolName(school) {
  return String(school?.name || school?.school || "").trim();
}

async function loadInstitutionSuggestions() {
  const form = document.querySelector("[data-home-search]");
  const input = form?.querySelector("[data-home-query]");
  const group = form?.querySelector("[data-home-group]")?.value;
  const options = form?.querySelector("[data-home-institution-options]");
  const error = form?.querySelector("[data-home-error]");
  const institutionMode = form?.querySelector('[data-home-mode="institution"]');
  if (!form || !input || !group || !options || institutionMode?.getAttribute("aria-pressed") !== "true") return;

  input.setAttribute("list", options.id);
  if (loadedGroups.has(group)) return;
  input.setAttribute("aria-busy", "true");

  try {
    const data = await loadGroupData(group);
    const rankedSchoolIds = new Set(
      data.students
        .filter((student) => student.rank > 0 && student.schoolRank > 0)
        .map((student) => Number(student.schoolId))
    );
    const names = [...new Set(
      data.schools
        .filter((school) => rankedSchoolIds.has(Number(school.id)))
        .map(schoolName)
        .filter((name) => name.length > 2 && /[a-z0-9]/i.test(name))
    )].sort((a, b) => a.localeCompare(b));

    const fragment = document.createDocumentFragment();
    names.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      fragment.append(option);
    });
    options.textContent = "";
    options.append(fragment);
    loadedGroups.add(group);
  } catch {
    error.textContent = "Institution suggestions are unavailable. You can still type the institution name.";
    error.hidden = false;
  } finally {
    input.removeAttribute("aria-busy");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-home-search]");
  if (!form) return;
  form.querySelector('[data-home-mode="institution"]')?.addEventListener("click", loadInstitutionSuggestions);
  form.querySelector("[data-home-group]")?.addEventListener("change", loadInstitutionSuggestions);
  form.querySelector("[data-home-query]")?.addEventListener("focus", loadInstitutionSuggestions);
});
