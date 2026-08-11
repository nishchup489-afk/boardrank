export const COMPARE_STORAGE_KEY = "ssc-rank-compare-v1";
export const MAX_COMPARE_STUDENTS = 3;

const VALID_GROUPS = new Set(["science", "humanities", "commerce"]);

export function normalizeComparisonSelection(value) {
  const group = String(value?.group || "").trim().toLowerCase();
  const roll = String(value?.roll || "").trim();
  if (!VALID_GROUPS.has(group) || !/^\d+$/.test(roll)) return null;
  return { group, roll };
}

export function comparisonSelectionKey(selection) {
  return `${selection.group}:${selection.roll}`;
}

export function getStoredComparisonSelections() {
  try {
    const stored = JSON.parse(localStorage.getItem(COMPARE_STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    const seen = new Set();
    return stored
      .map(normalizeComparisonSelection)
      .filter((selection) => {
        if (!selection) return false;
        const key = comparisonSelectionKey(selection);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_COMPARE_STUDENTS);
  } catch {
    return [];
  }
}

export function saveComparisonSelections(selections) {
  const seen = new Set();
  const normalized = selections
    .map(normalizeComparisonSelection)
    .filter((selection) => {
      if (!selection) return false;
      const key = comparisonSelectionKey(selection);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_COMPARE_STUDENTS);

  try {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Comparison still works for the current page when storage is unavailable.
  }
  return normalized;
}

export function addComparisonSelection(selection) {
  const normalized = normalizeComparisonSelection(selection);
  if (!normalized) return { ok: false, reason: "invalid", selections: getStoredComparisonSelections() };

  const selections = getStoredComparisonSelections();
  const key = comparisonSelectionKey(normalized);
  if (selections.some((item) => comparisonSelectionKey(item) === key)) {
    return { ok: false, reason: "duplicate", selections };
  }
  if (selections.length >= MAX_COMPARE_STUDENTS) {
    return { ok: false, reason: "full", selections };
  }

  selections.push(normalized);
  return { ok: true, reason: "added", selections: saveComparisonSelections(selections) };
}

export function serializeComparisonSelections(selections) {
  return saveComparisonSelections(selections).map(comparisonSelectionKey).join(",");
}

export function parseComparisonParam(value) {
  const rawItems = String(value || "").split(",").filter(Boolean);
  const selections = [];
  const errors = [];
  const seen = new Set();

  rawItems.forEach((item, index) => {
    if (index >= MAX_COMPARE_STUDENTS) {
      errors.push("Only the first three students can be compared.");
      return;
    }
    const separatorIndex = item.indexOf(":");
    const selection = normalizeComparisonSelection({
      group: separatorIndex > -1 ? item.slice(0, separatorIndex) : "",
      roll: separatorIndex > -1 ? item.slice(separatorIndex + 1) : ""
    });
    if (!selection) {
      errors.push(`Invalid comparison entry: ${item}`);
      return;
    }
    const key = comparisonSelectionKey(selection);
    if (seen.has(key)) {
      errors.push(`Duplicate comparison entry: ${item}`);
      return;
    }
    seen.add(key);
    selections.push(selection);
  });

  return { selections, errors };
}

export function buildComparisonPath(selections) {
  const serialized = serializeComparisonSelections(selections);
  return serialized ? `/compare/?students=${serialized}` : "/compare/";
}
