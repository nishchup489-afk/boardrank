export function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function editDistance(left, right, limit) {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMinimum = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const value = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost
      );
      current.push(value);
      rowMinimum = Math.min(rowMinimum, value);
    }

    if (rowMinimum > limit) return limit + 1;
    previous = current;
  }

  return previous[right.length];
}

function scoreTextMatch(value, query) {
  const text = normalizeText(value);
  if (!text || !query) return Number.POSITIVE_INFINITY;
  if (text === query) return 0;
  if (text.startsWith(query)) return 1;

  const words = text.split(" ");
  if (words.some((word) => word.startsWith(query))) return 2;
  if (text.includes(query)) return 3;

  const queryWords = query.split(" ");
  if (queryWords.every((queryWord) => words.some((word) => word.startsWith(queryWord)))) return 4;
  if (query.length < 3) return Number.POSITIVE_INFINITY;

  let typoScore = 0;
  for (const queryWord of queryWords) {
    const limit = queryWord.length <= 7 ? 1 : 2;
    let closest = limit + 1;
    for (const word of words) {
      if (Math.abs(word.length - queryWord.length) > 1) continue;
      closest = Math.min(closest, editDistance(word, queryWord, limit));
      if (closest === 0) break;
    }
    if (closest > limit) return Number.POSITIVE_INFINITY;
    typoScore += closest;
  }

  return 10 + typoScore;
}

export function rankTextMatches(items, query, getText = (item) => item, limit = Number.POSITIVE_INFINITY) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return { total: 0, results: [] };

  const matches = items.reduce((ranked, item, index) => {
    const text = String(getText(item) || "");
    const score = scoreTextMatch(text, normalizedQuery);
    if (Number.isFinite(score)) ranked.push({ item, index, score, text: normalizeText(text) });
    return ranked;
  }, []);

  matches.sort((left, right) => (
    left.score - right.score
    || left.text.localeCompare(right.text)
    || left.index - right.index
  ));

  return {
    total: matches.length,
    results: matches.slice(0, limit).map((match) => match.item)
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

  const matches = rankTextMatches(students, normalizedQuery, (student) => student.name);
  return { kind: "name", results: matches.results };
}
