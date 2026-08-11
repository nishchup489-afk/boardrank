import {
  buildUrl,
  clearStatus,
  formatBoard,
  formatExam,
  formatGroup,
  getContext,
  getParam,
  setStatus,
  validateContext
} from "./app.js?v=12";
import { getSchoolById, getStudentByRoll, loadGroupData } from "./mock-data.js?v=2";
import { addComparisonSelection, buildComparisonPath } from "./compare-state.js";

let context = null;
let data = null;

function appendCrumb(container, label, href) {
  const item = href ? document.createElement("a") : document.createElement("span");
  item.textContent = label;
  if (href) {
    item.href = href;
  } else {
    item.setAttribute("aria-current", "page");
  }
  container.append(item);
}

function renderBreadcrumb(container, currentLabel) {
  container.textContent = "";
  appendCrumb(container, formatExam(context), buildUrl("/board/", { exam: context.exam, year: context.year }));
  container.append("/");
  appendCrumb(
    container,
    formatBoard(context.board),
    buildUrl("/group/", { exam: context.exam, year: context.year, board: context.board })
  );
  container.append("/");
  appendCrumb(
    container,
    formatGroup(context.group),
    buildUrl("/rankings/", {
      exam: context.exam,
      year: context.year,
      board: context.board,
      group: context.group
    })
  );
  container.append("/");
  appendCrumb(container, currentLabel);
}

function createProfileItem(label, value) {
  const wrapper = document.createElement("div");
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  wrapper.append(dt, dd);
  return wrapper;
}

function createMetric(label, value) {
  const metric = document.createElement("span");
  metric.className = "metric";
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = value;
  metric.append(labelNode, strong);
  return metric;
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

function renderSubjectRows(student, labels) {
  const body = document.querySelector("[data-subject-body]");
  body.textContent = "";
  Object.entries(student.subjects || {}).forEach(([key, mark]) => {
    const row = document.createElement("tr");
    const subject = document.createElement("td");
    subject.textContent = labels[key] || key;
    const score = document.createElement("td");
    score.textContent = String(mark);
    row.append(subject, score);
    body.append(row);
  });
}

function renderTopperCelebration(student) {
  if (student.rank !== 1) return;

  const shoutout = document.querySelector("[data-topper-shoutout]");
  const modal = document.querySelector("[data-topper-modal]");
  const topperLabel = `TOPPER OF SSC 2K${String(context.year).slice(-2)} ${formatGroup(context.group).toUpperCase()}`;

  document.querySelector("[data-topper-name]").textContent = student.name;
  document.querySelector("[data-topper-school]").textContent = student.school;
  document.querySelector("[data-topper-title]").textContent = topperLabel;
  document.querySelector("[data-topper-modal-name]").textContent = student.name;
  document.querySelector("[data-topper-modal-school]").textContent = student.school;
  document.querySelector("[data-topper-modal-title]").textContent = topperLabel;
  shoutout.hidden = false;
  modal.hidden = false;
  document.body.classList.add("has-open-modal");

  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove("has-open-modal");
  };

  modal.querySelectorAll("[data-topper-close]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
  modal.querySelector(".topper-modal-close").focus();
}

function renderResult(student) {
  renderBreadcrumb(document.querySelector("[data-breadcrumb]"), student.roll);
  document.title = `${student.name} | SSC Rank`;

  document.querySelector("[data-student-name]").textContent = student.name;
  document.querySelector("[data-student-subtitle]").textContent = `Roll ${student.roll} / ${student.school}`;
  document.querySelector("[data-board-rank]").textContent = `#${student.rank}`;
  document.querySelector("[data-school-rank]").textContent = `#${student.schoolRank}`;
  document.querySelector("[data-result-gpa]").textContent = student.gpa.toFixed(2);
  document.querySelector("[data-result-total]").textContent = String(student.total);
  document.querySelector("[data-school-link]").href = buildUrl("/school/", {
    exam: context.exam,
    year: context.year,
    board: context.board,
    group: context.group,
    id: student.schoolId
  });
  document.querySelector("[data-rankings-link]").href = buildUrl("/rankings/", {
    exam: context.exam,
    year: context.year,
    board: context.board,
    group: context.group
  });

  const profile = document.querySelector("[data-profile-list]");
  profile.textContent = "";
  profile.append(
    createProfileItem("Roll", student.roll),
    createProfileItem("Exam", formatExam(context)),
    createProfileItem("Board", formatBoard(context.board)),
    createProfileItem("Group", formatGroup(context.group)),
    createProfileItem("Institution", student.school),
    createProfileItem("Dataset", "Available SSC result data")
  );

  renderSubjectRows(student, data.meta.subjectLabels || {});
  renderTopperCelebration(student);
}

async function shareResult(student) {
  const feedback = document.querySelector("[data-share-feedback]");
  feedback.textContent = "Preparing share...";
  const shareData = {
    title: `${student.name} | SSC Rank`,
    text: `${student.name} is board rank #${student.rank} in this unofficial SSC Rank listing.`,
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      feedback.textContent = "Share sheet opened";
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    feedback.textContent = "Link copied";
  } catch {
    feedback.textContent = "Sharing was cancelled or unavailable";
  }
}

function addResultToComparison(student) {
  const feedback = document.querySelector("[data-share-feedback]");
  const outcome = addComparisonSelection({ group: context.group, roll: student.roll });

  if (outcome.reason === "full") {
    feedback.textContent = "Comparison already has three students. Remove one before adding another.";
    return;
  }
  if (outcome.reason === "invalid") {
    feedback.textContent = "This student could not be added to the comparison.";
    return;
  }

  window.location.href = buildComparisonPath(outcome.selections);
}

async function initResultPage() {
  const status = document.querySelector("[data-status]");
  const content = document.querySelector("[data-result-content]");
  const roll = getParam("roll", "");

  const validation = validateContext(context);
  if (!validation.ok) {
    setStatus(status, validation.message, "error");
    return;
  }

  if (!roll) {
    setStatus(status, "No roll number was provided.", "error");
    return;
  }

  try {
    data = await loadGroupData(context.group);
    const student = await getStudentByRoll(roll, context.group);

    if (!student) {
      setStatus(status, "Student not found for this roll and group.", "error");
      return;
    }

    clearStatus(status);
    content.hidden = false;
    renderResult(student);
    document.querySelector("[data-share-button]").addEventListener("click", () => shareResult(student));
    document.querySelector("[data-add-to-compare]").addEventListener("click", () => addResultToComparison(student));
  } catch (error) {
    setStatus(status, error.message || "Unable to load the student result.", "error");
  }
}

function renderSchoolTopStudents(students) {
  const topContainer = document.querySelector("[data-school-top]");
  topContainer.textContent = "";
  students.slice(0, 3).forEach((student) => {
    const item = document.createElement("a");
    item.className = `rank-card rank-${student.schoolRank}`;
    item.href = getStudentUrl(student);
    item.setAttribute("aria-label", `View ${student.name}, school rank ${student.schoolRank}`);

    const badge = document.createElement("span");
    badge.className = `badge ${student.schoolRank === 1 ? "gold" : student.schoolRank === 2 ? "silver" : "bronze"}`;
    badge.textContent = `School rank #${student.schoolRank}`;

    const rankNumber = document.createElement("div");
    rankNumber.className = "rank-number";
    rankNumber.textContent = `#${student.schoolRank}`;

    const copy = document.createElement("div");
    copy.className = "rank-card-copy";
    const title = document.createElement("h3");
    title.textContent = student.name;
    const details = document.createElement("p");
    details.textContent = `Total marks ${student.total} / Board rank #${student.rank}`;
    copy.append(title, details);

    const metrics = document.createElement("div");
    metrics.className = "student-metrics";
    metrics.append(createMetric("GPA", student.gpa.toFixed(2)), createMetric("Total", String(student.total)));

    const linkLabel = document.createElement("span");
    linkLabel.className = "rank-card-link";
    const label = document.createElement("span");
    label.textContent = "View result";
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "->";
    linkLabel.append(label, arrow);

    item.append(badge, rankNumber, copy, metrics, linkLabel);
    topContainer.append(item);
  });
}

function renderSchoolLeaderboard(students) {
  const container = document.querySelector("[data-school-leaderboard]");
  container.textContent = "";
  students.forEach((student) => {
    const row = document.createElement("a");
    row.className = "school-student-row";
    row.href = getStudentUrl(student);

    const rank = document.createElement("div");
    rank.className = "school-rank";
    rank.textContent = `#${student.schoolRank}`;

    const main = document.createElement("div");
    main.className = "school-student-main";
    const title = document.createElement("h3");
    title.textContent = student.name;
    const meta = document.createElement("p");
    meta.textContent = `Total marks ${student.total} / Board rank #${student.rank}`;
    main.append(title, meta);

    const score = document.createElement("div");
    score.className = "student-metrics";
    score.append(createMetric("GPA", student.gpa.toFixed(2)), createMetric("Total", String(student.total)));

    const chevron = document.createElement("span");
    chevron.className = "school-row-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = ">";

    row.append(rank, main, score, chevron);
    container.append(row);
  });
}

function getSchoolName(school) {
  return String(school?.name || school?.school || "").trim();
}

function isSearchableSchool(school) {
  const name = getSchoolName(school);
  return name.length > 2 && /[a-z0-9]/i.test(name);
}

function findSchoolByQuery(schools, value) {
  const query = String(value || "").trim().toLowerCase();
  if (!query) return null;
  return schools.find((school) => getSchoolName(school).toLowerCase() === query)
    || schools.find((school) => getSchoolName(school).toLowerCase().includes(query))
    || null;
}

function initSchoolSearch(schools, selectedSchool = null) {
  const form = document.querySelector("[data-school-search-form]");
  const input = document.querySelector("[data-school-search-input]");
  const options = document.querySelector("[data-school-options]");
  const feedback = document.querySelector("[data-school-search-feedback]");
  if (!form || !input || !options) return;

  options.textContent = "";
  schools.forEach((school) => {
    const option = document.createElement("option");
    option.value = getSchoolName(school);
    options.append(option);
  });
  if (selectedSchool) input.value = getSchoolName(selectedSchool);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    feedback.hidden = true;
    const match = findSchoolByQuery(schools, query);

    if (!match) {
      feedback.textContent = "No ranked school matched that name. Try another spelling.";
      feedback.hidden = false;
      input.focus();
      return;
    }

    window.location.href = buildUrl("/school/", {
      exam: context.exam,
      year: context.year,
      board: context.board,
      group: context.group,
      id: match.id
    });
  });
}

async function initSchoolPage() {
  const status = document.querySelector("[data-status]");
  const content = document.querySelector("[data-school-content]");
  const schoolIdParam = getParam("id", "");
  const schoolQuery = getParam("q", "");
  let schoolId = schoolIdParam ? Number(schoolIdParam) : null;

  const validation = validateContext(context);
  if (!validation.ok) {
    setStatus(status, validation.message, "error");
    return;
  }

  try {
    data = await loadGroupData(context.group);
    const rankedSchoolIds = new Set(
      data.students
        .filter((student) => student.rank > 0 && student.schoolRank > 0)
        .map((student) => student.schoolId)
    );
    const schools = data.schools.filter((school) => isSearchableSchool(school) && rankedSchoolIds.has(Number(school.id)));
    let school = schoolId ? getSchoolById(data, schoolId) : null;

    if (!schoolId && schoolQuery) {
      school = findSchoolByQuery(schools, schoolQuery);
      if (!school) {
        renderBreadcrumb(document.querySelector("[data-breadcrumb]"), "Schools");
        initSchoolSearch(schools);
        setStatus(status, "No ranked school matched that name. Try another spelling.", "error");
        return;
      }
      schoolId = Number(school.id);
      window.history.replaceState({}, "", buildUrl("/school/", {
        exam: context.exam,
        year: context.year,
        board: context.board,
        group: context.group,
        id: schoolId
      }));
    }

    renderBreadcrumb(document.querySelector("[data-breadcrumb]"), "Schools");
    initSchoolSearch(schools, school && isSearchableSchool(school) ? school : null);

    if (!schoolId) {
      clearStatus(status);
      return;
    }

    const students = data.students
      .filter(
        (student) =>
          student.schoolId === schoolId && student.rank > 0 && student.schoolRank > 0
      )
      .sort((a, b) => a.schoolRank - b.schoolRank || a.rank - b.rank);

    if (!school || !isSearchableSchool(school) || !students.length) {
      setStatus(status, "No ranked students were found for that school. Search for another school above.", "error");
      return;
    }

    clearStatus(status);
    content.hidden = false;
    const schoolName = getSchoolName(school);
    document.title = `${schoolName} | SSC Rank`;
    renderBreadcrumb(document.querySelector("[data-breadcrumb]"), schoolName);
    document.querySelector("[data-school-name]").textContent = schoolName;
    document.querySelector("[data-school-subtitle]").textContent = `${formatExam(context)} / ${formatBoard(context.board)} / ${formatGroup(context.group)}`;
    document.querySelector("[data-school-count]").textContent = String(students.length);
    document.querySelector("[data-school-group]").textContent = formatGroup(context.group);
    document.querySelector("[data-school-best]").textContent = `#${students[0].rank}`;
    renderSchoolTopStudents(students);
    renderSchoolLeaderboard(students);
  } catch (error) {
    setStatus(status, error.message || "Unable to load the school ranking.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  context = getContext();
  const page = document.body.dataset.page;

  if (page === "result") initResultPage();
  if (page === "school") initSchoolPage();
});
