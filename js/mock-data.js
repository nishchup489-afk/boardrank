import { PAGE_SIZE, getGroupConfig } from "./app.js?v=12";
import { filterStudents } from "./search.js";

const cache = new Map();
const rollIndexCache = new Map();

function normalizeStudent(student) {
  const rank = Number(student.rank);
  return {
    ...student,
    rank,
    roll: String(student.roll),
    gpa: Number(student.gpa),
    total: Number(student.total),
    schoolId: Number(student.schoolId),
    schoolRank: Number(student.schoolRank),
    leaderboardPage: Math.ceil(rank / PAGE_SIZE)
  };
}

function normalizeData(group, data) {
  const students = Array.isArray(data.students) ? data.students.map(normalizeStudent) : [];
  return {
    ...data,
    group,
    students,
    schools: data.schools || []
  };
}

export async function loadGroupData(group) {
  const config = getGroupConfig(group);
  if (!config) {
    const error = new Error("That group is not available.");
    error.code = "INVALID_GROUP";
    throw error;
  }

  if (cache.has(group)) {
    return cache.get(group);
  }

  const response = await fetch(`/data/mock/${group}.json`, { cache: "no-store" });
  if (!response.ok) {
    const error = new Error("Unable to load ranking data. Please refresh and try again.");
    error.code = "FETCH_FAILED";
    throw error;
  }

  const data = normalizeData(group, await response.json());
  cache.set(group, data);
  return data;
}

export async function getStudentByRoll(roll, group) {
  const data = await loadGroupData(group);
  if (!rollIndexCache.has(group)) {
    rollIndexCache.set(group, new Map(data.students.map((student) => [String(student.roll), student])));
  }
  return rollIndexCache.get(group).get(String(roll).trim()) || null;
}

export async function searchStudents(query, group) {
  const data = await loadGroupData(group);
  return filterStudents(data.students, query);
}

export async function getLeaderboardPage(group, page = 1, pageSize = PAGE_SIZE) {
  const data = await loadGroupData(group);
  return getLeaderboardPageFromData(data.students, page, pageSize);
}

export function getLeaderboardPageFromData(students, page = 1, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    totalRows: students.length,
    rows: students.slice(start, start + pageSize)
  };
}

export async function getSchoolStudents(schoolId, group) {
  const data = await loadGroupData(group);
  const numericSchoolId = Number(schoolId);
  return data.students
    .filter((student) => student.schoolId === numericSchoolId)
    .sort((a, b) => a.schoolRank - b.schoolRank || a.rank - b.rank);
}

export function getSchoolById(data, schoolId) {
  const numericSchoolId = Number(schoolId);
  return (
    data.schools.find((school) => Number(school.id) === numericSchoolId) ||
    data.students.find((student) => student.schoolId === numericSchoolId) ||
    null
  );
}
