const RESPONSE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

// EASY-TO-EDIT TRAFFIC COUNTER ADJUSTMENTS
// Change `total` below when you want to manually add to or subtract from the
// displayed total. Keep it at 0 to show the exact live D1 total.
const TRAFFIC_COUNTER_ADJUSTMENTS = Object.freeze({
  total: 0, // <-- EDIT THIS NUMBER FOR THE TOTAL SITE VISITS DISPLAY
  today: 0,
  active: 0,
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

function getResultValue(result, key) {
  return Number(result?.results?.[0]?.[key]) || 0;
}

async function readTraffic(db, now) {
  const today = new Date(now).toISOString().slice(0, 10);
  const activeSince = now - 60_000;
  const [totalResult, dailyResult, activeResult, activeBaselineResult] = await db.batch([
    db.prepare("SELECT count FROM traffic_totals WHERE key = 'all'"),
    db.prepare("SELECT count FROM traffic_daily WHERE date = ?").bind(today),
    db.prepare("SELECT COUNT(*) AS count FROM traffic_presence WHERE last_seen >= ?").bind(activeSince),
    db.prepare("SELECT count FROM traffic_totals WHERE key = 'active-baseline'"),
  ]);

  return {
    total: Math.max(0, getResultValue(totalResult, "count") + TRAFFIC_COUNTER_ADJUSTMENTS.total),
    today: Math.max(0, getResultValue(dailyResult, "count") + TRAFFIC_COUNTER_ADJUSTMENTS.today),
    active: Math.max(
      0,
      getResultValue(activeBaselineResult, "count")
        + getResultValue(activeResult, "count")
        + TRAFFIC_COUNTER_ADJUSTMENTS.active,
    ),
    updatedAt: new Date(now).toISOString(),
  };
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "Traffic database is not configured." }, 503);

  try {
    return json(await readTraffic(env.DB, Date.now()));
  } catch (error) {
    console.error("Unable to read traffic totals", error);
    return json({ error: "Traffic totals are temporarily unavailable." }, 503);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "Traffic database is not configured." }, 503);

  const requestUrl = new URL(request.url);
  const requestOrigin = request.headers.get("Origin");
  if (requestOrigin && requestOrigin !== requestUrl.origin) {
    return json({ error: "Cross-origin traffic updates are not allowed." }, 403);
  }

  let sessionId = "";
  try {
    const body = await request.json();
    sessionId = String(body?.sessionId || "");
  } catch {
    return json({ error: "A JSON request body is required." }, 400);
  }

  if (!/^[a-zA-Z0-9-]{16,64}$/.test(sessionId)) {
    return json({ error: "A valid session ID is required." }, 400);
  }

  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);

  try {
    const visitResult = await env.DB.prepare(
      "INSERT OR IGNORE INTO traffic_visits (session_id, first_seen, first_seen_date) VALUES (?, ?, ?)",
    ).bind(sessionId, now, today).run();

    await env.DB.prepare(
      "INSERT INTO traffic_presence (session_id, last_seen) VALUES (?, ?) " +
      "ON CONFLICT(session_id) DO UPDATE SET last_seen = excluded.last_seen",
    ).bind(sessionId, now).run();

    if (Number(visitResult.meta?.changes) > 0) {
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO traffic_totals (key, count) VALUES ('all', 1) " +
          "ON CONFLICT(key) DO UPDATE SET count = count + 1",
        ),
        env.DB.prepare(
          "INSERT INTO traffic_daily (date, count) VALUES (?, 1) " +
          "ON CONFLICT(date) DO UPDATE SET count = count + 1",
        ).bind(today),
      ]);
    }

    await env.DB.prepare("DELETE FROM traffic_presence WHERE last_seen < ?")
      .bind(now - 86_400_000)
      .run();

    return json(await readTraffic(env.DB, now));
  } catch (error) {
    console.error("Unable to update traffic totals", error);
    return json({ error: "Traffic totals are temporarily unavailable." }, 503);
  }
}
