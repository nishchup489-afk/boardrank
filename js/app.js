export const PAGE_SIZE = 100;

export const DISCLAIMER =
  "Unofficial ranking based on available SSC result data. It is not issued or endorsed by the education board.";

const CONSENT_STORAGE_KEY = "boardrank-consent-v3";
const CONSENT_VERSION = 3;

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
    note: "Chattogram Board Science rankings are available now."
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
    status: "active",
    description: "Science group rankings with physics, chemistry, biology, and higher mathematics marks."
  },
  {
    id: "humanities",
    label: "Humanities / Arts",
    shortLabel: "Humanities",
    status: "soon",
    description: "Humanities / Arts rankings are coming within the next 24 hours."
  },
  {
    id: "commerce",
    label: "Business Studies / Commerce",
    shortLabel: "Business Studies",
    status: "soon",
    description: "Business Studies / Commerce rankings are coming within the next 24 hours."
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
  const config = getGroupConfig(group);
  return Boolean(config && config.status === "active");
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
    const group = getGroupConfig(context.group);
    return {
      ok: false,
      message: group?.status === "soon"
        ? `${group.label} rankings are coming within the next 24 hours.`
        : "That group is not available."
    };
  }

  return { ok: true };
}

function getConsentRecord() {
  const read = (storage) => {
    try {
      const record = JSON.parse(storage.getItem(CONSENT_STORAGE_KEY) || "null");
      return record?.version === CONSENT_VERSION && record?.agreedAt ? record : null;
    } catch {
      return null;
    }
  };
  return read(localStorage) || read(sessionStorage);
}

function saveConsentRecord() {
  const record = { version: CONSENT_VERSION, agreedAt: new Date().toISOString() };
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    try {
      sessionStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // The current page can continue even when browser storage is unavailable.
    }
  }
  return record;
}

function bindConsentForm(form, onAccept) {
  if (!form) return;
  const checks = [...form.querySelectorAll('input[type="checkbox"]')];
  const submit = form.querySelector('button[type="submit"]');
  const update = () => {
    submit.disabled = !checks.every((check) => check.checked);
  };
  checks.forEach((check) => check.addEventListener("change", update));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!checks.every((check) => check.checked)) return;
    onAccept(saveConsentRecord());
  });
  update();
}

function createConsentGate() {
  const gate = document.createElement("div");
  gate.className = "consent-gate";
  gate.innerHTML = `
    <section class="consent-dialog" role="dialog" aria-modal="true" aria-labelledby="consent-title" aria-describedby="consent-summary">
      <p class="consent-kicker">Before you continue</p>
      <h2 id="consent-title">BoardRank Disclaimer and Data Notice</h2>
      <p id="consent-summary" class="consent-summary">BoardRank is independent and unofficial. Its rankings are BoardRank calculations based on publicly accessible result information and may contain errors or omissions.</p>
      <p class="consent-contact">Need a correction or removal? Email <a href="mailto:nishchup489@gmail.com">nishchup489@gmail.com</a>.</p>
      <form class="consent-form" data-consent-form>
        <label class="consent-choice">
          <input type="checkbox" name="identity" required>
          <span>I confirm that I am the person identified by this result, or I am authorized to act on their behalf.</span>
        </label>
        <label class="consent-choice">
          <input type="checkbox" name="processing" required>
          <span>I consent to BoardRank processing the information I provide for the purposes in the Privacy Notice.</span>
        </label>
        <div class="consent-actions">
          <a href="/agreement/">Read more</a>
          <button class="button" type="submit" disabled>Agree and continue</button>
        </div>
      </form>
    </section>`;

  document.body.append(gate);
  [...document.body.children].forEach((child) => {
    if (child === gate) return;
    child.inert = true;
    child.setAttribute("inert", "");
    child.setAttribute("aria-hidden", "true");
  });
  document.body.classList.add("has-consent-gate");
  bindConsentForm(gate.querySelector("[data-consent-form]"), () => window.location.reload());
  gate.querySelector('input[type="checkbox"]').focus();
}

function initConsentGate(page) {
  if (page === "agreement" || getConsentRecord()) return true;
  createConsentGate();
  return false;
}

function initAgreementPage() {
  const status = document.querySelector("[data-agreement-status]");
  const badge = document.querySelector("[data-agreement-badge]");
  const detail = document.querySelector("[data-agreement-detail]");
  const form = document.querySelector("[data-agreement-form]");

  const render = (record) => {
    const agreed = Boolean(record);
    status.classList.toggle("is-agreed", agreed);
    badge.textContent = agreed ? "Agreed" : "Action required";
    detail.textContent = agreed
      ? `Accepted on ${new Date(record.agreedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.`
      : "Review the notice and confirm both statements to continue using BoardRank.";
    form.hidden = agreed;
  };

  render(getConsentRecord());
  bindConsentForm(form, render);
}

function initChrome() {
  const page = document.body.dataset.page || "";
  const context = getContext();
  const siteNav = document.querySelector(".site-nav");
  document.querySelectorAll('[data-nav="methodology"]').forEach((link) => {
    link.dataset.nav = "college";
    link.href = "/college/";
    link.textContent = "College selection";
  });
  if (siteNav && !siteNav.querySelector('[data-nav="about"]')) {
    const aboutLink = createTextElement("a", "", "About us");
    aboutLink.href = "/about/";
    aboutLink.dataset.nav = "about";
    siteNav.append(aboutLink);
  }
  if (siteNav && !siteNav.querySelector('[data-nav="compare"]')) {
    const compareLink = createTextElement("a", "", "Compare");
    compareLink.href = "/compare/";
    compareLink.dataset.nav = "compare";
    const rankingsLink = siteNav.querySelector('[data-nav="rankings"]');
    if (rankingsLink) {
      rankingsLink.after(compareLink);
    } else {
      siteNav.prepend(compareLink);
    }
  }
  if (siteNav && !siteNav.querySelector('[data-nav="agreement"]')) {
    const agreementLink = createTextElement("a", "", "Agreement");
    agreementLink.href = "/agreement/";
    agreementLink.dataset.nav = "agreement";
    const aboutLink = siteNav.querySelector('[data-nav="about"]');
    if (aboutLink) {
      aboutLink.before(agreementLink);
    } else {
      siteNav.append(agreementLink);
    }
  }

  document.querySelectorAll('[data-nav="schools"]').forEach((link) => {
    link.href = buildUrl("/school/", context);
  });

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
  const schoolUrl = buildUrl("/school/", context);
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
    <a class="${activePage === "compare" ? "is-active" : ""}" href="/compare/" ${activePage === "compare" ? 'aria-current="page"' : ""}>
      <i data-lucide="git-compare-arrows" aria-hidden="true"></i><span>Compare</span>
    </a>
    <a class="${activePage === "schools" ? "is-active" : ""}" href="${schoolUrl}" ${activePage === "schools" ? 'aria-current="page"' : ""}>
      <i data-lucide="school" aria-hidden="true"></i><span>Schools</span>
    </a>
    <details class="mobile-more ${["college", "privacy", "agreement", "about"].includes(activePage) ? "is-active" : ""}">
      <summary><i data-lucide="menu" aria-hidden="true"></i><span>More</span></summary>
      <div class="mobile-more-menu">
        <a href="/college/"><i data-lucide="graduation-cap" aria-hidden="true"></i><span>College selection</span></a>
        <a href="/privacy/"><i data-lucide="lock-keyhole" aria-hidden="true"></i><span>Privacy</span></a>
        <a href="/agreement/"><i data-lucide="file-check-2" aria-hidden="true"></i><span>Agreement</span></a>
        <a href="/about/"><i data-lucide="users" aria-hidden="true"></i><span>About us</span></a>
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
    "git-compare-arrows": '<path d="m16 3 4 4-4 4"></path><path d="M20 7H4"></path><path d="m8 21-4-4 4-4"></path><path d="M4 17h16"></path>',
    school: '<path d="M3 21h18"></path><path d="M5 21V9l7-5 7 5v12"></path><path d="M9 21v-6h6v6"></path><path d="M8 11h.01"></path><path d="M16 11h.01"></path>',
    menu: '<path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h16"></path>',
    "list-checks": '<path d="m3 6 2 2 4-4"></path><path d="M11 6h10"></path><path d="m3 12 2 2 4-4"></path><path d="M11 12h10"></path><path d="m3 18 2 2 4-4"></path><path d="M11 18h10"></path>',
    "lock-keyhole": '<rect width="18" height="11" x="3" y="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path><path d="M12 15v3"></path>',
    "file-check-2": '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5Z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="m9 15 2 2 4-4"></path>',
    "shield-check": '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z"></path><path d="m9 12 2 2 4-4"></path>',
    "flask-conical": '<path d="M9 3h6"></path><path d="M10 9V3"></path><path d="M14 9V3"></path><path d="m8 9-5 9a2 2 0 0 0 2 3h14a2 2 0 0 0 2-3l-5-9"></path><path d="M6 15h12"></path>',
    "book-open": '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2Z"></path><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z"></path>',
    "chart-no-axes-combined": '<path d="m3 17 6-6 4 4 8-8"></path><path d="M17 7h4v4"></path><path d="M5 21h14"></path>',
    "list-ordered": '<path d="M10 6h11"></path><path d="M10 12h11"></path><path d="M10 18h11"></path><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-1 2-3 0-1-.5-2-2-2"></path>',
    "share-2": '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.6 10.5 6.8-4"></path><path d="m8.6 13.5 6.8 4"></path>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    "graduation-cap": '<path d="M22 10 12 5 2 10l10 5 10-5Z"></path><path d="M6 12v5c3 2 9 2 12 0v-5"></path><path d="M22 10v6"></path>'
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

function initActivityCounters() {
  const visitKey = "ssc-rank-visits-v1";
  const presenceKey = "ssc-rank-presence-v1";
  const today = new Date().toISOString().slice(0, 10);
  const sessionVisitKey = `ssc-rank-visit-${today}`;
  const setCount = (selector, value) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = Number(value).toLocaleString("en-US");
    });
  };
  const parseStoredObject = (value) => {
    try {
      return JSON.parse(value || "{}") || {};
    } catch {
      return {};
    }
  };

  try {
    const visits = parseStoredObject(localStorage.getItem(visitKey));
    visits.total = Number(visits.total) || 0;
    if (visits.date !== today) {
      visits.date = today;
      visits.daily = 0;
    }
    visits.daily = Number(visits.daily) || 0;

    if (!sessionStorage.getItem(sessionVisitKey)) {
      visits.total += 1;
      visits.daily += 1;
      sessionStorage.setItem(sessionVisitKey, "1");
      localStorage.setItem(visitKey, JSON.stringify(visits));
    }

    setCount("[data-total-visits]", Math.max(visits.total, 1));
    setCount("[data-daily-visits]", Math.max(visits.daily, 1));
  } catch {
    setCount("[data-total-visits]", 1);
    setCount("[data-daily-visits]", 1);
  }

  let tabId = "";
  try {
    tabId = sessionStorage.getItem("ssc-rank-tab-id-v1") || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("ssc-rank-tab-id-v1", tabId);
  } catch {
    setCount("[data-online-visits]", 1);
    return;
  }

  const refreshPresence = () => {
    try {
      const now = Date.now();
      const presence = parseStoredObject(localStorage.getItem(presenceKey));
      Object.keys(presence).forEach((id) => {
        if (now - Number(presence[id]) > 30000) delete presence[id];
      });
      presence[tabId] = now;
      localStorage.setItem(presenceKey, JSON.stringify(presence));
      setCount("[data-online-visits]", Math.max(Object.keys(presence).length, 1));
    } catch {
      setCount("[data-online-visits]", 1);
    }
  };

  refreshPresence();
  window.setInterval(refreshPresence, 10000);
  window.addEventListener("storage", (event) => {
    if (event.key !== presenceKey) return;
    const presence = parseStoredObject(event.newValue);
    const now = Date.now();
    const activeCount = Object.values(presence).filter((timestamp) => now - Number(timestamp) <= 30000).length;
    setCount("[data-online-visits]", Math.max(activeCount, 1));
  });
  window.addEventListener("beforeunload", () => {
    try {
      const presence = parseStoredObject(localStorage.getItem(presenceKey));
      delete presence[tabId];
      localStorage.setItem(presenceKey, JSON.stringify(presence));
    } catch {
      // Storage may be unavailable during page teardown.
    }
  });
}

function initHomeFinder() {
  const form = document.querySelector("[data-home-search]");
  if (!form) return;

  const input = form.querySelector("[data-home-query]");
  const label = form.querySelector("[data-home-query-label]");
  const board = form.querySelector("[data-home-board]");
  const group = form.querySelector("[data-home-group]");
  const error = form.querySelector("[data-home-error]");
  const modeButtons = [...form.querySelectorAll("[data-home-mode]")];
  let mode = "roll";
  const modeContent = {
    roll: { label: "Roll number", placeholder: "Enter roll number", inputMode: "numeric", empty: "Enter a roll number." },
    name: { label: "Student name", placeholder: "Enter student name", inputMode: "search", empty: "Enter a student name." },
    institution: {
      label: "Institution name",
      placeholder: "Enter school or institution name",
      inputMode: "search",
      empty: "Enter an institution name."
    }
  };

  const setMode = (nextMode) => {
    mode = modeContent[nextMode] ? nextMode : "roll";
    const content = modeContent[mode];
    modeButtons.forEach((button) => {
      const active = button.dataset.homeMode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    label.textContent = content.label;
    input.placeholder = content.placeholder;
    input.setAttribute("inputmode", content.inputMode);
    if (mode === "institution") {
      input.setAttribute("list", "home-institution-options");
    } else {
      input.removeAttribute("list");
    }
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
      error.textContent = modeContent[mode].empty;
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
      board: board?.value || DEFAULT_CONTEXT.board,
      group: group.value
    };

    if (mode === "roll") {
      window.location.href = buildUrl("/result/", { ...params, roll: query });
      return;
    }

    if (mode === "institution") {
      window.location.href = buildUrl("/school/", { ...params, q: query });
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
        active ? "Science rankings are available now." : "Ranking support for this board is coming soon."
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
    const active = validation.ok && group.status === "active";
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
    footer.append(createTextElement("span", "badge", active ? "Available" : "Within 24 hours"));
    footer.append(createTextElement("span", "", active ? "Open rankings" : "Coming soon"));

    card.append(content, footer);
    container.append(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.documentElement.dataset.sscAppInitialized === "true") return;
  document.documentElement.dataset.sscAppInitialized = "true";
  initChrome();
  const page = document.body.dataset.page;
  if (!initConsentGate(page)) return;
  initActivityCounters();

  if (page === "agreement") {
    initAgreementPage();
  }
  if (page === "home" || page === "exam") {
    initExamSelection();
  }

  if (page === "home") {
    initHomeFinder();
    renderBoardSelection();
  }

  if (page === "board") {
    renderBoardSelection();
  }

  if (page === "group") {
    renderGroupSelection();
  }
});
