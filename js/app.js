export const PAGE_SIZE = 100;

export const DISCLAIMER =
  "Unofficial ranking based on available SSC result data. It is not issued or endorsed by the education board.";

export const DEFAULT_CONTEXT = {
  exam: "ssc",
  year: "2026",
  board: "chattogram",
  group: "science"
};

export const SUPPORTED_EXAMS = [
  {
    exam: "ssc",
    year: "2026",
    label: "SSC 2026",
    status: "active",
    note: "Chattogram Board mock rankings are available now."
  },
  { exam: "ssc", year: "2025", label: "SSC 2025", status: "soon", note: "Coming soon" },
  { exam: "hsc", year: "2026", label: "HSC 2026", status: "soon", note: "Coming soon" },
  { exam: "hsc", year: "2025", label: "HSC 2025", status: "soon", note: "Coming soon" }
];

export const SUPPORTED_BOARDS = [
  { id: "chattogram", label: "Chattogram", status: "active" },
  { id: "dhaka", label: "Dhaka", status: "soon" },
  { id: "cumilla", label: "Cumilla", status: "soon" },
  { id: "rajshahi", label: "Rajshahi", status: "soon" },
  { id: "jessore", label: "Jessore", status: "soon" },
  { id: "barishal", label: "Barishal", status: "soon" },
  { id: "sylhet", label: "Sylhet", status: "soon" },
  { id: "dinajpur", label: "Dinajpur", status: "soon" },
  { id: "mymensingh", label: "Mymensingh", status: "soon" }
];

export const SUPPORTED_GROUPS = [
  {
    id: "science",
    label: "Science",
    shortLabel: "Science",
    description: "Science group rankings with physics, chemistry, biology, and higher mathematics marks."
  },
  {
    id: "humanities",
    label: "Humanities / Arts",
    shortLabel: "Humanities",
    description: "Humanities group rankings with social science-focused mock subjects."
  },
  {
    id: "commerce",
    label: "Business Studies / Commerce",
    shortLabel: "Business Studies",
    description: "Commerce group rankings with accounting, finance, and business studies mock subjects."
  }
];

export function getQueryParams() {
  return new URLSearchParams(window.location.search);
}

export function getParam(name, fallback = "") {
  const rawValue = getQueryParams().get(name);
  const value = rawValue === null ? fallback : rawValue;
  return String(value).trim().toLowerCase();
}

export function getContext(overrides = {}) {
  return {
    exam: getParam("exam", DEFAULT_CONTEXT.exam),
    year: getParam("year", DEFAULT_CONTEXT.year),
    board: getParam("board", DEFAULT_CONTEXT.board),
    group: getParam("group", DEFAULT_CONTEXT.group),
    ...overrides
  };
}

export function getExamConfig(exam, year) {
  return SUPPORTED_EXAMS.find((item) => item.exam === exam && item.year === year) || null;
}

export function getBoardConfig(board) {
  return SUPPORTED_BOARDS.find((item) => item.id === board) || null;
}

export function getGroupConfig(group) {
  return SUPPORTED_GROUPS.find((item) => item.id === group) || null;
}

export function isActiveExam(exam, year) {
  const config = getExamConfig(exam, year);
  return Boolean(config && config.status === "active");
}

export function isActiveBoard(board) {
  const config = getBoardConfig(board);
  return Boolean(config && config.status === "active");
}

export function isSupportedGroup(group) {
  return Boolean(getGroupConfig(group));
}

export function titleCase(value) {
  return String(value)
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatExam(context) {
  return `${context.exam.toUpperCase()} ${context.year}`;
}

export function formatBoard(board) {
  const config = getBoardConfig(board);
  return config ? `${config.label} Board` : `${titleCase(board)} Board`;
}

export function formatGroup(group) {
  const config = getGroupConfig(group);
  return config ? config.shortLabel : titleCase(group);
}

export function buildUrl(path, params = {}) {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return `${url.pathname}${url.search}`;
}

export function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  return element;
}

export function setText(selector, value, root = document) {
  const element = root.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

export function setStatus(element, message, type = "info") {
  if (!element) return;
  element.className = `status-box ${type === "error" ? "error" : ""}`.trim();
  element.textContent = message;
  element.hidden = false;
}

export function clearStatus(element) {
  if (!element) return;
  element.textContent = "";
  element.hidden = true;
}

export function persistRecentSelection(context) {
  try {
    localStorage.setItem("sscRank:lastSelection", JSON.stringify(context));
  } catch {
    // localStorage is optional; the site should work without it.
  }
}

export function validateContext(context, options = {}) {
  const requireGroup = options.requireGroup !== false;

  if (!isActiveExam(context.exam, context.year)) {
    return { ok: false, message: "That examination is not available yet." };
  }

  if (!isActiveBoard(context.board)) {
    return { ok: false, message: "That education board is not available yet." };
  }

  if (requireGroup && !isSupportedGroup(context.group)) {
    return { ok: false, message: "That group is not available." };
  }

  return { ok: true };
}

function initChrome() {
  const page = document.body.dataset.page || "";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const activePage = page === "result" ? "rankings" : page === "school" ? "schools" : page;
    if (link.dataset.nav === activePage) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });

  document.querySelectorAll("[data-disclaimer]").forEach((element) => {
    element.textContent = DISCLAIMER;
  });

  initMobileChrome(page);
  initIcons();
}

function initMobileChrome(page) {
  const context = getContext();
  const header = document.querySelector(".header-inner");
  if (header && !header.querySelector(".mobile-header-context")) {
    const chip = createTextElement("span", "mobile-header-context", formatExam(context));
    header.append(chip);
  }

  if (document.querySelector(".mobile-nav")) return;

  const rankingsUrl = buildUrl("/rankings/", context);
  const schoolUrl = buildUrl("/school/", { ...context, id: 1 });
  const activePage = page === "result" ? "rankings" : page === "school" ? "schools" : page;
  const nav = document.createElement("nav");
  nav.className = "mobile-nav";
  nav.setAttribute("aria-label", "Mobile navigation");
  nav.innerHTML = `
    <a class="${activePage === "home" ? "is-active" : ""}" href="/" ${activePage === "home" ? 'aria-current="page"' : ""}>
      <i data-lucide="home" aria-hidden="true"></i><span>Home</span>
    </a>
    <a class="${activePage === "rankings" ? "is-active" : ""}" href="${rankingsUrl}" ${activePage === "rankings" ? 'aria-current="page"' : ""}>
      <i data-lucide="trophy" aria-hidden="true"></i><span>Rankings</span>
    </a>
    <a class="${activePage === "schools" ? "is-active" : ""}" href="${schoolUrl}" ${activePage === "schools" ? 'aria-current="page"' : ""}>
      <i data-lucide="school" aria-hidden="true"></i><span>Schools</span>
    </a>
    <details class="mobile-more ${activePage === "methodology" || activePage === "privacy" ? "is-active" : ""}">
      <summary><i data-lucide="menu" aria-hidden="true"></i><span>More</span></summary>
      <div class="mobile-more-menu">
        <a href="/methodology/"><i data-lucide="list-checks" aria-hidden="true"></i><span>Methodology</span></a>
        <a href="/privacy/"><i data-lucide="lock-keyhole" aria-hidden="true"></i><span>Privacy</span></a>
      </div>
    </details>`;
  document.body.append(nav);

  const more = nav.querySelector(".mobile-more");
  document.addEventListener("click", (event) => {
    if (more.open && !more.contains(event.target)) {
      more.removeAttribute("open");
    }
  });
}

function initIcons() {
  const icons = {
    search: '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>',
    x: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
    home: '<path d="m3 10 9-7 9 7"></path><path d="M5 9v12h14V9"></path><path d="M9 21v-7h6v7"></path>',
    trophy: '<path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10v4a5 5 0 0 1-10 0Z"></path><path d="M7 6H4v1a4 4 0 0 0 4 4"></path><path d="M17 6h3v1a4 4 0 0 1-4 4"></path>',
    school: '<path d="M3 21h18"></path><path d="M5 21V9l7-5 7 5v12"></path><path d="M9 21v-6h6v6"></path><path d="M8 11h.01"></path><path d="M16 11h.01"></path>',
    menu: '<path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h16"></path>',
    "list-checks": '<path d="m3 6 2 2 4-4"></path><path d="M11 6h10"></path><path d="m3 12 2 2 4-4"></path><path d="M11 12h10"></path><path d="m3 18 2 2 4-4"></path><path d="M11 18h10"></path>',
    "lock-keyhole": '<rect width="18" height="11" x="3" y="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path><path d="M12 15v3"></path>',
    "shield-check": '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z"></path><path d="m9 12 2 2 4-4"></path>',
    "flask-conical": '<path d="M9 3h6"></path><path d="M10 9V3"></path><path d="M14 9V3"></path><path d="m8 9-5 9a2 2 0 0 0 2 3h14a2 2 0 0 0 2-3l-5-9"></path><path d="M6 15h12"></path>',
    "book-open": '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2Z"></path><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z"></path>',
    "chart-no-axes-combined": '<path d="m3 17 6-6 4 4 8-8"></path><path d="M17 7h4v4"></path><path d="M5 21h14"></path>',
    "list-ordered": '<path d="M10 6h11"></path><path d="M10 12h11"></path><path d="M10 18h11"></path><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-1 2-3 0-1-.5-2-2-2"></path>',
    "share-2": '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.6 10.5 6.8-4"></path><path d="m8.6 13.5 6.8 4"></path>'
  };

  document.querySelectorAll("i[data-lucide]").forEach((placeholder) => {
    const markup = icons[placeholder.dataset.lucide];
    if (!markup) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("lucide", `lucide-${placeholder.dataset.lucide}`);
    svg.innerHTML = markup;
    placeholder.replaceWith(svg);
  });
}

function initHomeFinder() {
  const form = document.querySelector("[data-home-search]");
  if (!form) return;

  const input = form.querySelector("[data-home-query]");
  const label = form.querySelector("[data-home-query-label]");
  const group = form.querySelector("[data-home-group]");
  const error = form.querySelector("[data-home-error]");
  const modeButtons = [...form.querySelectorAll("[data-home-mode]")];
  let mode = "roll";

  const setMode = (nextMode) => {
    mode = nextMode;
    modeButtons.forEach((button) => {
      const active = button.dataset.homeMode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    label.textContent = mode === "roll" ? "Roll number" : "Student name";
    input.placeholder = mode === "roll" ? "Enter roll number" : "Enter student name";
    input.setAttribute("inputmode", mode === "roll" ? "numeric" : "search");
    input.value = "";
    error.hidden = true;
    input.focus();
  };

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.homeMode));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    error.hidden = true;

    if (!query) {
      error.textContent = mode === "roll" ? "Enter a roll number." : "Enter a student name.";
      error.hidden = false;
      input.focus();
      return;
    }

    if (mode === "roll" && !/^\d+$/.test(query)) {
      error.textContent = "Roll numbers can contain digits only.";
      error.hidden = false;
      input.focus();
      return;
    }

    const params = {
      exam: DEFAULT_CONTEXT.exam,
      year: DEFAULT_CONTEXT.year,
      board: DEFAULT_CONTEXT.board,
      group: group.value
    };

    if (mode === "roll") {
      window.location.href = buildUrl("/result/", { ...params, roll: query });
      return;
    }

    window.location.href = buildUrl("/rankings/", { ...params, q: query });
  });
}

function initExamSelection() {
  document.querySelectorAll("[data-ssc-2026-link]").forEach((link) => {
    link.setAttribute("href", buildUrl("/board/", { exam: "ssc", year: "2026" }));
  });
}

function renderBoardSelection() {
  const context = getContext({ board: DEFAULT_CONTEXT.board });
  const container = document.querySelector("[data-board-grid]");
  const status = document.querySelector("[data-page-status]");
  const contextText = document.querySelector("[data-board-context]");

  if (!container) return;
  container.textContent = "";

  if (contextText) {
    contextText.textContent = formatExam(context);
  }

  if (!isActiveExam(context.exam, context.year)) {
    setStatus(status, "That examination is not available yet. Please choose SSC 2026.", "error");
  } else {
    clearStatus(status);
  }

  SUPPORTED_BOARDS.forEach((board) => {
    const active = board.status === "active" && isActiveExam(context.exam, context.year);
    const card = active ? document.createElement("a") : document.createElement("article");
    card.className = `selection-card ${active ? "is-active" : "is-disabled"}`;
    if (active) {
      card.href = buildUrl("/group/", { exam: context.exam, year: context.year, board: board.id });
      card.addEventListener("click", () => persistRecentSelection({ ...context, board: board.id }));
    } else {
      card.setAttribute("aria-disabled", "true");
    }

    const content = document.createElement("div");
    content.className = "selection-meta";
    content.append(createTextElement("h2", "", board.label));
    content.append(
      createTextElement(
        "p",
        "",
        active ? "Available for the V1 mock-data prototype." : "Ranking support for this board is coming soon."
      )
    );

    const footer = document.createElement("div");
    footer.className = "selection-card-footer";
    footer.append(createTextElement("span", "badge", active ? "Available" : "Coming Soon"));
    footer.append(createTextElement("span", "", active ? "Continue" : "Not available"));

    card.append(content, footer);
    container.append(card);
  });
}

function renderGroupSelection() {
  const context = getContext();
  const container = document.querySelector("[data-group-grid]");
  const status = document.querySelector("[data-page-status]");

  if (!container) return;
  container.textContent = "";

  setText("[data-group-exam]", formatExam(context));
  setText("[data-group-board]", formatBoard(context.board));

  const validation = validateContext(context, { requireGroup: false });
  if (!validation.ok) {
    setStatus(status, validation.message, "error");
  } else {
    clearStatus(status);
  }

  SUPPORTED_GROUPS.forEach((group) => {
    const active = validation.ok;
    const card = active ? document.createElement("a") : document.createElement("article");
    card.className = `selection-card ${active ? "is-active" : "is-disabled"}`;

    if (active) {
      card.href = buildUrl("/rankings/", {
        exam: context.exam,
        year: context.year,
        board: context.board,
        group: group.id
      });
      card.addEventListener("click", () => persistRecentSelection({ ...context, group: group.id }));
    } else {
      card.setAttribute("aria-disabled", "true");
    }

    const content = document.createElement("div");
    content.className = "selection-meta";
    content.append(createTextElement("h2", "", group.label));
    content.append(createTextElement("p", "", group.description));

    const footer = document.createElement("div");
    footer.className = "selection-card-footer";
    footer.append(createTextElement("span", "badge", "Mock Data Ready"));
    footer.append(createTextElement("span", "", active ? "Open rankings" : "Unavailable"));

    card.append(content, footer);
    container.append(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initChrome();

  const page = document.body.dataset.page;
  if (page === "home" || page === "exam") {
    initExamSelection();
  }

  if (page === "home") {
    initHomeFinder();
  }

  if (page === "board") {
    renderBoardSelection();
  }

  if (page === "group") {
    renderGroupSelection();
  }
});
