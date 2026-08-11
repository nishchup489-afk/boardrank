import {
  SUPPORTED_GROUPS,
  clearStatus,
  createTextElement,
  formatGroup,
  setStatus
} from "./app.js?v=13";
import { getStudentByRoll, loadGroupData } from "./mock-data.js?v=3";
import {
  MAX_COMPARE_STUDENTS,
  buildComparisonPath,
  comparisonSelectionKey,
  parseComparisonParam,
  saveComparisonSelections
} from "./compare-state.js";

const EMPTY_VALUE = "\u2014";
const elements = {};

let slots = [null, null];
let records = [null, null];
let slotErrors = ["", ""];

function cacheElements() {
  Object.assign(elements, {
    status: document.querySelector("[data-compare-status]"),
    selectorGrid: document.querySelector("[data-selector-grid]"),
    selectorCount: document.querySelector("[data-selector-count]"),
    addStudent: document.querySelector("[data-add-student]"),
    comparisonSection: document.querySelector("[data-comparison-section]"),
    comparisonTable: document.querySelector("[data-comparison-table]"),
    shareButton: document.querySelector("[data-share-comparison]"),
    shareFeedback: document.querySelector("[data-comparison-feedback]")
  });
}

function loadedRecords() {
  return records.filter(Boolean);
}

function createGroupSelect(index, selectedGroup) {
  const select = document.createElement("select");
  select.id = `compare-group-${index}`;
  select.name = "group";
  select.setAttribute("aria-label", `Student ${index + 1} group`);
  SUPPORTED_GROUPS.forEach((group) => {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.label;
    option.selected = group.id === selectedGroup;
    select.append(option);
  });
  return select;
}

function createSelectorCard(index) {
  const selection = slots[index];
  const record = records[index];
  const card = document.createElement("article");
  card.className = "student-selector";

  const header = document.createElement("div");
  header.className = "selector-header";
  header.append(createTextElement("h3", "", `Student ${index + 1}`));

  if (selection || slots.length > 2) {
    const remove = createTextElement("button", "selector-remove", "Remove");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove student ${index + 1}`);
    remove.addEventListener("click", () => removeSlot(index));
    header.append(remove);
  }

  const form = document.createElement("form");
  form.className = "selector-form";

  const groupField = document.createElement("div");
  const groupLabel = createTextElement("label", "", "Student group");
  groupLabel.htmlFor = `compare-group-${index}`;
  const groupSelect = createGroupSelect(index, selection?.group || "science");
  groupField.append(groupLabel, groupSelect);

  const rollField = document.createElement("div");
  const rollLabel = createTextElement("label", "", "Roll number");
  rollLabel.htmlFor = `compare-roll-${index}`;
  const rollInput = document.createElement("input");
  rollInput.id = `compare-roll-${index}`;
  rollInput.name = "roll";
  rollInput.type = "search";
  rollInput.inputMode = "numeric";
  rollInput.autocomplete = "off";
  rollInput.placeholder = "Enter roll number";
  rollInput.value = selection?.roll || "";
  rollInput.required = true;
  rollField.append(rollLabel, rollInput);

  const submit = document.createElement("button");
  submit.className = "button selector-submit";
  submit.type = "submit";
  submit.textContent = record ? "Change student" : "Load student";

  const error = createTextElement("p", "selector-error", slotErrors[index] || "");
  error.setAttribute("role", "alert");
  error.hidden = !slotErrors[index];

  form.append(groupField, rollField, submit, error);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    loadStudentIntoSlot(index, groupSelect.value, rollInput.value, submit);
  });

  card.append(header, form);

  if (record) {
    const summary = document.createElement("div");
    summary.className = "loaded-student";
    summary.append(
      createTextElement("strong", "", record.student.name),
      createTextElement(
        "span",
        "",
        `${formatGroup(record.selection.group)} / Roll ${record.student.roll} / ${record.student.school}`
      )
    );
    card.append(summary);
  }

  return card;
}

function renderSelectors() {
  elements.selectorGrid.textContent = "";
  slots.forEach((_, index) => elements.selectorGrid.append(createSelectorCard(index)));
  const selectedCount = loadedRecords().length;
  elements.selectorCount.textContent = `${selectedCount} of ${MAX_COMPARE_STUDENTS} selected`;
  elements.addStudent.hidden = slots.length >= MAX_COMPARE_STUDENTS;
}

function addSectionRow(body, label, columnCount) {
  const row = document.createElement("tr");
  row.className = "comparison-section-row";
  const heading = createTextElement("th", "", label);
  heading.scope = "rowgroup";
  heading.colSpan = columnCount + 1;
  row.append(heading);
  body.append(row);
}

function displayNumber(value, digits = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : EMPTY_VALUE;
}

function displayRank(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `#${number}` : EMPTY_VALUE;
}

function addMetricRow(body, label, values, options = {}) {
  const row = document.createElement("tr");
  const heading = createTextElement("th", "metric-column", label);
  heading.scope = "row";
  row.append(heading);

  const numericValues = options.highlightHighest
    ? values.map(Number).filter((value) => Number.isFinite(value))
    : [];
  const highest = numericValues.length ? Math.max(...numericValues) : null;

  values.forEach((value) => {
    const cell = document.createElement("td");
    cell.textContent = options.format ? options.format(value) : String(value || EMPTY_VALUE);
    if (highest !== null && Number(value) === highest) cell.classList.add("is-best");
    row.append(cell);
  });
  body.append(row);
}

function subjectLabel(key, activeRecords) {
  for (const record of activeRecords) {
    const label = record.data.meta?.subjectLabels?.[key];
    if (label) return label;
  }
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase());
}

function renderComparison() {
  const activeRecords = loadedRecords();
  elements.comparisonSection.hidden = activeRecords.length < 2;
  elements.shareButton.disabled = activeRecords.length < 2;
  if (activeRecords.length < 2) {
    elements.comparisonTable.textContent = "";
    return;
  }

  const table = elements.comparisonTable;
  table.textContent = "";
  const caption = createTextElement("caption", "sr-only", "SSC 2026 student result comparison");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const metricHeading = createTextElement("th", "metric-column", "Metric");
  metricHeading.scope = "col";
  headRow.append(metricHeading);

  activeRecords.forEach((record) => {
    const heading = createTextElement("th", "", record.student.name);
    heading.scope = "col";
    heading.append(createTextElement("span", "", `${formatGroup(record.selection.group)} / ${record.student.roll}`));
    headRow.append(heading);
  });
  head.append(headRow);

  const body = document.createElement("tbody");
  addSectionRow(body, "General information", activeRecords.length);
  addMetricRow(body, "Name", activeRecords.map((record) => record.student.name));
  addMetricRow(body, "Roll", activeRecords.map((record) => record.student.roll));
  addMetricRow(body, "Group", activeRecords.map((record) => formatGroup(record.selection.group)));
  addMetricRow(body, "School", activeRecords.map((record) => record.student.school));
  addMetricRow(body, "GPA", activeRecords.map((record) => record.student.gpa), {
    highlightHighest: true,
    format: (value) => displayNumber(value, 2)
  });
  addMetricRow(body, "Total marks", activeRecords.map((record) => record.student.total), {
    highlightHighest: true,
    format: displayNumber
  });
  addMetricRow(body, "Board rank", activeRecords.map((record) => record.student.rank), { format: displayRank });
  addMetricRow(body, "School rank", activeRecords.map((record) => record.student.schoolRank), { format: displayRank });

  const subjectKeys = [];
  const seenSubjects = new Set();
  activeRecords.forEach((record) => {
    if (record.data.meta?.subjectMarksAvailable === false) return;
    Object.keys(record.student.subjects || {}).forEach((key) => {
      if (seenSubjects.has(key)) return;
      seenSubjects.add(key);
      subjectKeys.push(key);
    });
  });

  if (subjectKeys.length) {
    addSectionRow(body, "Subject marks", activeRecords.length);
    subjectKeys.forEach((key) => {
      addMetricRow(
        body,
        subjectLabel(key, activeRecords),
        activeRecords.map((record) =>
          record.data.meta?.subjectMarksAvailable === false ? undefined : record.student.subjects?.[key]
        ),
        { highlightHighest: true, format: displayNumber }
      );
    });
  }

  table.append(caption, head, body);
}

function renderAll() {
  renderSelectors();
  renderComparison();
}

function currentSelections() {
  return loadedRecords().map((record) => record.selection);
}

function syncState(historyMode = "push") {
  const selections = saveComparisonSelections(currentSelections());
  const path = buildComparisonPath(selections);
  if (`${window.location.pathname}${window.location.search}` !== path) {
    window.history[historyMode === "replace" ? "replaceState" : "pushState"]({}, "", path);
  }
}

async function loadStudentIntoSlot(index, group, rollValue, submitButton) {
  const roll = String(rollValue || "").trim();
  slotErrors[index] = "";

  if (!/^\d+$/.test(roll)) {
    slotErrors[index] = "Enter a valid numeric roll number.";
    renderSelectors();
    return;
  }

  const key = `${group}:${roll}`;
  const duplicate = slots.some(
    (selection, slotIndex) => slotIndex !== index && selection && comparisonSelectionKey(selection) === key
  );
  if (duplicate) {
    slotErrors[index] = "That student is already in this comparison.";
    renderSelectors();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Loading...";
  try {
    const data = await loadGroupData(group);
    const student = await getStudentByRoll(roll, group);
    if (!student) {
      slotErrors[index] = `No ${formatGroup(group)} student was found with roll ${roll}.`;
      renderSelectors();
      return;
    }

    const selection = { group, roll: student.roll };
    slots[index] = selection;
    records[index] = { selection, student, data };
    slotErrors[index] = "";
    clearStatus(elements.status);
    syncState("push");
    renderAll();
  } catch (error) {
    slotErrors[index] = error.message || "Unable to load that student.";
    renderSelectors();
  } finally {
    if (submitButton.isConnected) {
      submitButton.disabled = false;
      submitButton.textContent = records[index] ? "Change student" : "Load student";
    }
  }
}

function removeSlot(index) {
  if (slots.length > 2) {
    slots.splice(index, 1);
    records.splice(index, 1);
    slotErrors.splice(index, 1);
  } else {
    slots[index] = null;
    records[index] = null;
    slotErrors[index] = "";
  }
  while (slots.length < 2) {
    slots.push(null);
    records.push(null);
    slotErrors.push("");
  }
  syncState("push");
  renderAll();
}

async function hydrateSelections(selections, errors = [], options = {}) {
  const initial = selections.slice(0, MAX_COMPARE_STUDENTS);
  slots = initial.length ? [...initial] : [];
  while (slots.length < 2) slots.push(null);
  records = new Array(slots.length).fill(null);
  slotErrors = new Array(slots.length).fill("");

  await Promise.all(
    slots.map(async (selection, index) => {
      if (!selection) return;
      try {
        const data = await loadGroupData(selection.group);
        const student = await getStudentByRoll(selection.roll, selection.group);
        if (!student) {
          slotErrors[index] = `Roll ${selection.roll} was not found in ${formatGroup(selection.group)}.`;
          slots[index] = null;
          return;
        }
        records[index] = { selection: { ...selection, roll: student.roll }, student, data };
        slots[index] = records[index].selection;
      } catch (error) {
        slotErrors[index] = error.message || "Unable to load this student.";
        slots[index] = null;
      }
    })
  );

  saveComparisonSelections(currentSelections());
  if (errors.length) {
    setStatus(elements.status, errors.join(" "), "error");
  } else {
    clearStatus(elements.status);
  }
  if (options.updateUrl) syncState("replace");
  renderAll();
}

async function loadFromLocation({ updateUrl = false } = {}) {
  const params = new URLSearchParams(window.location.search);
  if (params.has("students")) {
    const parsed = parseComparisonParam(params.get("students"));
    await hydrateSelections(parsed.selections, parsed.errors, { updateUrl });
    return;
  }
  await hydrateSelections([], [], { updateUrl });
}

async function shareComparison() {
  const selections = currentSelections();
  if (selections.length < 2) return;
  const url = new URL(buildComparisonPath(selections), window.location.origin).href;
  elements.shareFeedback.textContent = "Preparing comparison link...";

  try {
    if (navigator.share) {
      await navigator.share({
        title: "SSC 2026 student comparison",
        text: "Compare these SSC 2026 student results side by side.",
        url
      });
      elements.shareFeedback.textContent = "Share sheet opened";
      return;
    }
    await navigator.clipboard.writeText(url);
    elements.shareFeedback.textContent = "Comparison link copied";
  } catch {
    elements.shareFeedback.textContent = "Sharing was cancelled or unavailable";
  }
}

async function init() {
  cacheElements();
  elements.addStudent.addEventListener("click", () => {
    if (slots.length >= MAX_COMPARE_STUDENTS) return;
    slots.push(null);
    records.push(null);
    slotErrors.push("");
    renderAll();
  });
  elements.shareButton.addEventListener("click", shareComparison);
  window.addEventListener("popstate", () => loadFromLocation({ updateUrl: false }));
  await loadFromLocation({ updateUrl: true });
}

document.addEventListener("DOMContentLoaded", init);
