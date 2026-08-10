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
} from "./app.js";
import { getSchoolById, getStudentByRoll, loadGroupData } from "./mock-data.js";

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

  const profile = document.querySelector("[data-profile-list]");
  profile.textContent = "";
  profile.append(
    createProfileItem("Roll", student.roll),
    createProfileItem("Exam", formatExam(context)),
    createProfileItem("Board", formatBoard(context.board)),
    createProfileItem("Group", formatGroup(context.group)),
    createProfileItem("Institution", student.school),
    createProfileItem("Dataset", "Fictional demo data")
  );

  renderSubjectRows(student, data.meta.subjectLabels || {});
}

async function shareResult(student) {
  const feedback = document.querySelector("[data-share-feedback]");
  feedback.textContent = "Preparing share...";
  const shareData = {
    title: `${student.name} | SSC Rank`,
    text: `${student.name} is board rank #${student.rank} in this unofficial SSC Rank demo.`,
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
    details.textContent = `Board rank #${student.rank} / Roll ${student.roll}`;
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
    meta.textContent = `Roll ${student.roll} / Board rank #${student.rank}`;
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

async function initSchoolPage() {
  const status = document.querySelector("[data-status]");
  const content = document.querySelector("[data-school-content]");
  const schoolId = Number(getParam("id", "1"));

  const validation = validateContext(context);
  if (!validation.ok) {
    setStatus(status, validation.message, "error");
    return;
  }

  try {
    data = await loadGroupData(context.group);
    const school = getSchoolById(data, schoolId);
    const students = data.students
      .filter((student) => student.schoolId === schoolId)
      .sort((a, b) => a.schoolRank - b.schoolRank || a.rank - b.rank);

    if (!school || !students.length) {
      setStatus(status, "School not found for this group.", "error");
      return;
    }

    clearStatus(status);
    content.hidden = false;
    const schoolName = school.name || school.school;
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
