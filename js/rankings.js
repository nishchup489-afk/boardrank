import {
  PAGE_SIZE,
  SUPPORTED_GROUPS,
  buildUrl,
  formatBoard,
  formatExam,
  formatGroup,
  getContext,
  getParam,
  persistRecentSelection,
  setStatus,
  validateContext
} from "./app.js?v=13";
import { getLeaderboardPageFromData, loadGroupData } from "./mock-data.js?v=3";
import { debounce, filterStudents } from "./search.js";

const MOBILE_PAGE_SIZE = 25;
const mobilePageQuery = window.matchMedia("(max-width: 760px)");

let context = null;
let groupData = null;
let currentPage = 1;
let activeSearch = null;
let searchMode = "roll";

const elements = {};

function cacheElements() {
  Object.assign(elements, {
    breadcrumb: document.querySelector("[data-breadcrumb]"),
    title: document.querySelector("[data-dashboard-title]"),
    subtitle: document.querySelector("[data-dashboard-subtitle]"),
    summary: document.querySelector("[data-dashboard-summary]"),
    groupSwitch: document.querySelector("[data-group-switch]"),
    loading: document.querySelector("[data-loading-state]"),
    error: document.querySelector("[data-error-state]"),
    content: document.querySelector("[data-rankings-content]"),
    podium: document.querySelector("[data-podium]"),
    tableBody: document.querySelector("[data-leaderboard-body]"),
    mobileList: document.querySelector("[data-mobile-leaderboard]"),
    pagination: document.querySelector("[data-pagination]"),
    first: document.querySelector("[data-page-first]"),
    prev: document.querySelector("[data-page-prev]"),
    next: document.querySelector("[data-page-next]"),
    last: document.querySelector("[data-page-last]"),
    pageStatus: document.querySelector("[data-page-status-text]"),
    leaderboardNote: document.querySelector("[data-leaderboard-note]"),
    searchForm: document.querySelector("[data-search-form]"),
    searchInput: document.querySelector("[data-search-input]"),
    searchLabel: document.querySelector("[data-search-label]"),
    searchModes: document.querySelector("[data-search-modes]"),
    clearSearch: document.querySelector("[data-clear-search]"),
    searchFeedback: document.querySelector("[data-search-feedback]")
  });
}

function showLoading() {
  elements.loading.hidden = false;
  elements.error.hidden = true;
  elements.content.hidden = true;
}

function showError(message) {
  elements.loading.hidden = true;
  elements.content.hidden = true;
  setStatus(elements.error, message, "error");
}

function showContent() {
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.content.hidden = false;
}

function appendCrumb(label, href) {
  const item = href ? document.createElement("a") : document.createElement("span");
  item.textContent = label;
  if (href) {
    item.href = href;
  } else {
    item.setAttribute("aria-current", "page");
  }
  elements.breadcrumb.append(item);
}

function renderBreadcrumb() {
  elements.breadcrumb.textContent = "";
  appendCrumb(formatExam(context), buildUrl("/board/", { exam: context.exam, year: context.year }));
  elements.breadcrumb.append("/");
  appendCrumb(
    formatBoard(context.board),
    buildUrl("/group/", { exam: context.exam, year: context.year, board: context.board })
  );
  elements.breadcrumb.append("/");
  appendCrumb(formatGroup(context.group));
}

function getPageSize() {
  return mobilePageQuery.matches ? MOBILE_PAGE_SIZE : PAGE_SIZE;
}

function renderHeader() {
  elements.title.textContent = `${formatGroup(context.group)} rankings`;
  elements.subtitle.textContent = `${formatExam(context)} / ${formatBoard(context.board)}`;
  elements.summary.textContent = "";

  [
    ["Students", groupData.students.length.toLocaleString("en-US")],
    ["Results per page", getPageSize()]
  ].forEach(([label, value]) => {
    const stat = document.createElement("div");
    stat.className = "summary-stat";
    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    stat.append(labelNode, strong);
    elements.summary.append(stat);
  });
}

function renderGroupSwitch() {
  elements.groupSwitch.textContent = "";
  SUPPORTED_GROUPS.forEach((group) => {
    const active = group.status === "active";
    const item = active ? document.createElement("a") : document.createElement("span");
    if (active) {
      item.href = buildUrl("/rankings/", {
        exam: context.exam,
        year: context.year,
        board: context.board,
        group: group.id
      });
    } else {
      item.className = "is-disabled";
      item.setAttribute("aria-disabled", "true");
      item.title = "Coming within the next 24 hours";
    }
    item.textContent = active ? group.shortLabel : `${group.shortLabel} - Soon`;
    if (group.id === context.group) {
      item.classList.add("is-active");
      item.setAttribute("aria-current", "page");
    }
    elements.groupSwitch.append(item);
  });

  const activeItem = elements.groupSwitch.querySelector(".is-active");
  requestAnimationFrame(() => {
    if (!activeItem || elements.groupSwitch.scrollWidth <= elements.groupSwitch.clientWidth) return;
    const switchBox = elements.groupSwitch.getBoundingClientRect();
    const activeBox = activeItem.getBoundingClientRect();
    const centeredLeft = elements.groupSwitch.scrollLeft
      + activeBox.left
      - switchBox.left
      - ((elements.groupSwitch.clientWidth - activeBox.width) / 2);
    elements.groupSwitch.scrollLeft = Math.max(0, centeredLeft);
  });
}

function getStudentUrl(student) {
  return buildUrl("/result/", {
    exam: context.exam,
    year: context.year,
    board: context.board,
    group: context.group,
    roll: student.roll
  });
}

function getSchoolUrl(student) {
  return buildUrl("/school/", {
    exam: context.exam,
    year: context.year,
    board: context.board,
    group: context.group,
    id: student.schoolId
  });
}

function renderMetrics(student) {
  const fragment = document.createDocumentFragment();
  [
    ["GPA", student.gpa.toFixed(2)],
    ["Total", student.total],
    ["School rank", student.schoolRank > 0 ? `#${student.schoolRank}` : "\u2014"]
  ].forEach(([label, value]) => {
    const metric = document.createElement("span");
    metric.className = "metric";
    const small = document.createElement("span");
    small.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    metric.append(small, strong);
    fragment.append(metric);
  });
  return fragment;
}

function createPodiumCrown(rank) {
  const crown = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  crown.setAttribute("viewBox", "0 0 64 42");
  crown.setAttribute("aria-hidden", "true");
  crown.classList.add("podium-crown", `crown-${rank}`);
  crown.innerHTML = '<path d="M6 33 2 10l15 10L32 3l15 17 15-10-4 23H6Z"></path><path d="M7 37h50"></path>';
  return crown;
}

function renderPodium() {
  elements.podium.textContent = "";
  groupData.students.slice(0, 3).forEach((student) => {
    const card = document.createElement("a");
    card.className = `rank-card rank-${student.rank}`;
    card.href = getStudentUrl(student);
    card.setAttribute("aria-label", `View ${student.name}, board rank ${student.rank}`);

    const rankBadge = document.createElement("span");
    rankBadge.className = `badge ${student.rank === 1 ? "gold" : student.rank === 2 ? "silver" : "bronze"}`;
    rankBadge.textContent = `Board rank #${student.rank}`;

    const rankNumber = document.createElement("div");
    rankNumber.className = "rank-number";
    rankNumber.textContent = `#${student.rank}`;

    const copy = document.createElement("div");
    copy.className = "rank-card-copy";
    const title = document.createElement("h3");
    title.textContent = student.name;
    const school = document.createElement("p");
    school.textContent = student.school || "Institution unavailable";
    copy.append(title, school);

    const metrics = document.createElement("div");
    metrics.className = "student-metrics";
    metrics.append(renderMetrics(student));

    const linkLabel = document.createElement("span");
    linkLabel.className = "rank-card-link";
    const label = document.createElement("span");
    label.textContent = "View result";
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "->";
    linkLabel.append(label, arrow);

    card.append(createPodiumCrown(student.rank), rankBadge, rankNumber, copy, metrics, linkLabel);
    elements.podium.append(card);
  });
}

function addStudentNameCell(cell, student) {
  const wrapper = document.createElement("div");
  wrapper.className = "student-name";

  const link = document.createElement("a");
  link.href = getStudentUrl(student);
  link.textContent = student.name;
  wrapper.append(link);

  if (activeSearch && activeSearch.roll === student.roll) {
    const label = document.createElement("span");
    label.className = "badge";
    label.textContent = "Search result";
    wrapper.append(label);
  }

  cell.append(wrapper);
}

function renderTableRows(rows) {
  elements.tableBody.textContent = "";
  const fragment = document.createDocumentFragment();

  rows.forEach((student) => {
    const row = document.createElement("tr");
    row.dataset.roll = student.roll;
    row.tabIndex = -1;
    if (activeSearch && activeSearch.roll === student.roll) row.classList.add("highlight-row");

    const rank = document.createElement("td");
    rank.textContent = `#${student.rank}`;

    const name = document.createElement("td");
    addStudentNameCell(name, student);

    const roll = document.createElement("td");
    roll.textContent = student.roll;

    const gpa = document.createElement("td");
    gpa.textContent = student.gpa.toFixed(2);

    const total = document.createElement("td");
    total.textContent = String(student.total);

    const school = document.createElement("td");
    if (student.schoolId > 0 && student.school) {
      const schoolLink = document.createElement("a");
      schoolLink.className = "school-link";
      schoolLink.href = getSchoolUrl(student);
      schoolLink.textContent = student.school;
      school.append(schoolLink);
    } else {
      school.textContent = "Institution unavailable";
    }

    const action = document.createElement("td");
    const detailLink = document.createElement("a");
    detailLink.className = "button small secondary";
    detailLink.href = getStudentUrl(student);
    detailLink.textContent = "View result";
    action.append(detailLink);

    row.append(rank, name, roll, gpa, total, school, action);
    fragment.append(row);
  });

  elements.tableBody.append(fragment);
}

function renderMobileRows(rows) {
  elements.mobileList.textContent = "";
  const fragment = document.createDocumentFragment();

  rows.forEach((student) => {
    const row = document.createElement("a");
    row.className = "mobile-student-row";
    row.href = getStudentUrl(student);
    row.dataset.roll = student.roll;
    row.tabIndex = -1;
    if (activeSearch && activeSearch.roll === student.roll) row.classList.add("highlight-card");

    const rank = document.createElement("span");
    rank.className = "mobile-rank";
    rank.textContent = `#${student.rank}`;

    const main = document.createElement("div");
    main.className = "mobile-student-main";
    const title = document.createElement("h3");
    title.textContent = student.name;
    const meta = document.createElement("p");
    meta.textContent = `${student.school || "Institution unavailable"} / Roll ${student.roll}`;
    main.append(title, meta);

    const score = document.createElement("div");
    score.className = "mobile-score";
    const gpa = document.createElement("strong");
    gpa.textContent = student.gpa.toFixed(2);
    const total = document.createElement("span");
    total.textContent = `${student.total} marks`;
    score.append(gpa, total);

    const chevron = document.createElement("span");
    chevron.className = "mobile-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = ">";

    row.append(rank, main, score, chevron);
    fragment.append(row);
  });

  elements.mobileList.append(fragment);
}

function getVisibleRows() {
  const pageSize = getPageSize();
  if (activeSearch && activeSearch.kind === "name") {
    return getLeaderboardPageFromData(activeSearch.results, currentPage, pageSize);
  }

  if (activeSearch && activeSearch.kind === "roll" && !activeSearch.results.length) {
    return { page: 1, totalPages: 1, totalRows: 0, rows: [] };
  }

  return getLeaderboardPageFromData(groupData.students, currentPage, pageSize);
}

function renderPagination(pageData) {
  elements.first.disabled = pageData.page <= 1;
  elements.prev.disabled = pageData.page <= 1;
  elements.next.disabled = pageData.page >= pageData.totalPages;
  elements.last.disabled = pageData.page >= pageData.totalPages;
  elements.pageStatus.textContent = `Page ${pageData.page} of ${pageData.totalPages}`;
  elements.pagination.hidden = pageData.totalRows === 0;
}

function renderLeaderboard() {
  const pageData = getVisibleRows();
  currentPage = pageData.page;

  if (pageData.totalRows === 0) {
    elements.leaderboardNote.textContent = "No student found. Check the roll or name and try again.";
  } else if (activeSearch && activeSearch.kind === "name") {
    elements.leaderboardNote.textContent = `${pageData.totalRows} matching student${pageData.totalRows === 1 ? "" : "s"} found.`;
  } else if (activeSearch && activeSearch.kind === "roll") {
    const student = activeSearch.results[0];
    elements.leaderboardNote.textContent = `Exact roll match: ${student.name}, board rank #${student.rank}.`;
  } else {
    elements.leaderboardNote.textContent = `Showing ${pageData.rows.length} of ${pageData.totalRows} students.`;
  }

  renderTableRows(pageData.rows);
  renderMobileRows(pageData.rows);
  renderPagination(pageData);

  if (activeSearch && activeSearch.roll && window.CSS && CSS.escape) {
    window.requestAnimationFrame(() => {
      const targets = document.querySelectorAll(`[data-roll="${CSS.escape(activeSearch.roll)}"]`);
      const target = [...targets].find((item) => item.offsetParent !== null) || targets[0];
      if (target) {
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    });
  }
}

function setSearchFeedback(message) {
  elements.searchFeedback.textContent = message;
}

function setSearchMode(mode, options = {}) {
  searchMode = mode;
  elements.searchModes.querySelectorAll("[data-search-mode]").forEach((button) => {
    const active = button.dataset.searchMode === searchMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const label = searchMode === "roll" ? "Roll number" : "Student name";
  elements.searchLabel.textContent = label;
  elements.searchInput.placeholder = searchMode === "roll" ? "Enter roll number" : "Enter student name";
  elements.searchInput.setAttribute("inputmode", searchMode === "roll" ? "numeric" : "search");
  if (options.focus !== false) elements.searchInput.focus();
}

function updateClearButton() {
  elements.clearSearch.hidden = !elements.searchInput.value;
}

function applySearch(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    activeSearch = null;
    currentPage = 1;
    setSearchFeedback("");
    renderLeaderboard();
    return;
  }

  const result = filterStudents(groupData.students, trimmed);

  if (result.kind === "roll") {
    const student = result.results[0];
    activeSearch = {
      kind: "roll",
      query: trimmed,
      results: result.results,
      roll: student ? student.roll : trimmed
    };
    currentPage = student ? Math.ceil(student.rank / getPageSize()) : 1;
    setSearchFeedback(
      student
        ? `Found ${student.name} at board rank #${student.rank}.`
        : "No student found. Check the roll number and try again."
    );
  } else {
    activeSearch = {
      kind: "name",
      query: trimmed,
      results: result.results,
      roll: result.results.length === 1 ? result.results[0].roll : ""
    };
    currentPage = 1;
    setSearchFeedback(
      result.results.length
        ? `${result.results.length} matching student${result.results.length === 1 ? "" : "s"} found.`
        : "No student found. Check the name and try again."
    );
  }

  renderLeaderboard();
}

function bindEvents() {
  const debouncedSearch = debounce(() => {
    if (searchMode === "name" && elements.searchInput.value.trim().length >= 2) {
      applySearch(elements.searchInput.value);
    }
  }, 220);

  elements.searchInput.addEventListener("input", () => {
    updateClearButton();
    if (!elements.searchInput.value.trim()) {
      applySearch("");
      return;
    }
    debouncedSearch();
  });

  elements.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    applySearch(elements.searchInput.value);
  });

  elements.clearSearch.addEventListener("click", () => {
    elements.searchInput.value = "";
    updateClearButton();
    applySearch("");
    elements.searchInput.focus();
  });

  elements.searchModes.querySelectorAll("[data-search-mode]").forEach((button) => {
    button.addEventListener("click", () => setSearchMode(button.dataset.searchMode));
  });

  elements.prev.addEventListener("click", () => {
    currentPage -= 1;
    renderLeaderboard();
  });

  elements.first.addEventListener("click", () => {
    currentPage = 1;
    renderLeaderboard();
  });

  elements.next.addEventListener("click", () => {
    currentPage += 1;
    renderLeaderboard();
  });

  elements.last.addEventListener("click", () => {
    currentPage = getVisibleRows().totalPages;
    renderLeaderboard();
  });

  mobilePageQuery.addEventListener("change", () => {
    currentPage = activeSearch?.kind === "roll" && activeSearch.results[0]
      ? Math.ceil(activeSearch.results[0].rank / getPageSize())
      : 1;
    renderHeader();
    renderLeaderboard();
  });
}

async function init() {
  cacheElements();
  showLoading();
  context = getContext();

  const validation = validateContext(context);
  if (!validation.ok) {
    showError(validation.message);
    return;
  }

  persistRecentSelection(context);

  try {
    groupData = await loadGroupData(context.group);
    groupData = {
      ...groupData,
      students: groupData.students
        .filter((student) => student.rank > 0)
        .sort((a, b) => a.rank - b.rank)
    };
    renderBreadcrumb();
    renderHeader();
    renderGroupSwitch();
    renderPodium();
    bindEvents();
    showContent();

    const initialQuery = getParam("q", "");
    if (initialQuery) {
      elements.searchInput.value = initialQuery;
      setSearchMode(/^\d+$/.test(initialQuery) ? "roll" : "name", { focus: false });
      updateClearButton();
      applySearch(initialQuery);
    } else {
      renderLeaderboard();
    }
  } catch (error) {
    showError(error.message || "Unable to load ranking data. Please refresh and try again.");
  }
}

document.addEventListener("DOMContentLoaded", init);
