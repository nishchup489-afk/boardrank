export function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isRollQuery(value) {
  return /^\d+$/.test(String(value || "").trim());
}

export function debounce(callback, delay = 180) {
  let timerId = 0;
  return (...args) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => callback(...args), delay);
  };
}

export function filterStudents(students, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return { kind: "empty", results: [] };
  }

  if (isRollQuery(normalizedQuery)) {
    const match = students.find((student) => String(student.roll) === normalizedQuery);
    return { kind: "roll", results: match ? [match] : [] };
  }

  const results = students.filter((student) => normalizeText(student.name).includes(normalizedQuery));
  return { kind: "name", results };
}
