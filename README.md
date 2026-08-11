# SSC Rank

SSC Rank is a mobile-first, unofficial examination ranking prototype for SSC result exploration.

## Current status

Static frontend prototype using fictional demo data. The primary journey supports direct roll lookup, student-name search, board rankings, school rankings, and subject-level result details.

## Architecture

Python data pipeline -> static generated datasets -> HTML/CSS/JavaScript -> Cloudflare Pages.

The public ranking path is intentionally static so generated JSON can be served by a CDN without querying a live backend for every visitor.

## Shared website traffic counter

The homepage traffic panel uses a Cloudflare Pages Function at `/api/traffic` and a D1 database. A visit is counted once per browser tab session across the entire website. Active sessions are those that have sent a heartbeat in the last 60 seconds; daily totals use UTC.

Create and initialize the D1 database before deploying:

```sh
npx wrangler d1 create ssc-rank-traffic
npx wrangler d1 execute ssc-rank-traffic --remote --file=migrations/0001_traffic.sql
```

In the Cloudflare Pages project settings, add a D1 binding named `DB` that points to `ssc-rank-traffic`, then redeploy the project. Local static servers do not run Pages Functions, so the traffic panel will show an unavailable state unless Pages Functions and D1 are available.

## Run locally

```powershell
python -m http.server 8000
```

Run the command from the site directory, then open `http://localhost:8000`.

## Current support

- SSC 2026
- Chattogram Board
- Science
- Humanities
- Business Studies
- Roll-number and student-name search
- Responsive ranking lists: 25 results per mobile page and 100 per desktop page
- Fictional demo data only

## Planned production data flow

Collector -> SQLite -> validation -> ranking -> JSON shards -> CDN.

Possible future shard layout:

```text
data/ssc/2026/chattogram/science/top.json
data/ssc/2026/chattogram/science/leaderboard/001.json
data/ssc/2026/chattogram/science/lookup/000.json
data/ssc/2026/chattogram/science/schools/1.json
```

## Disclaimer

Unofficial ranking based on available SSC result data. It is not issued or endorsed by the education board.
