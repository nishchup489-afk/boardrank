const PAGE_META = {
  "/": {
    title: "SSC 2026 Chattogram Board Rankings & Result Search | SSC Rank",
    description: "Search available SSC 2026 Chattogram Board result records by roll number, student name, or school. Explore unofficial Science and Business Studies rankings.",
  },
  "/rankings/": {
    title: "SSC 2026 Chattogram Board Rankings | SSC Rank",
    description: "Browse unofficial SSC 2026 Chattogram Board rankings and search available Science and Business Studies result records.",
  },
  "/school/": {
    title: "SSC 2026 School Rankings — Chattogram Board | SSC Rank",
    description: "Find a school and explore its available SSC 2026 Chattogram Board student rankings by group.",
  },
  "/methodology/": {
    title: "How SSC Rank Calculates Unofficial Rankings | SSC Rank",
    description: "Learn how SSC Rank presents available SSC result data and calculates unofficial board and school positions.",
  },
  "/about/": {
    title: "About SSC Rank | Independent SSC Result Explorer",
    description: "Learn about SSC Rank, an independent project that helps students explore available SSC result data.",
  },
};

function setMeta(selector, attribute, value) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    const name = selector.match(/\[name="([^"]+)"\]/)?.[1] || selector.match(/\[property="([^"]+)"\]/)?.[1];
    element.setAttribute(selector.includes("property=") ? "property" : "name", name);
    document.head.append(element);
  }
  element.setAttribute(attribute, value);
}

function addSchema(schema) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  document.head.append(script);
}

const path = window.location.pathname.endsWith("/") ? window.location.pathname : `${window.location.pathname}/`;
const meta = PAGE_META[path];
const origin = window.location.origin;
const canonicalPath = ["/result/", "/compare/"].includes(path) ? "/" : path;
const canonicalUrl = `${origin}${canonicalPath}`;

let canonical = document.head.querySelector('link[rel="canonical"]');
if (!canonical) {
  canonical = document.createElement("link");
  canonical.rel = "canonical";
  document.head.append(canonical);
}
canonical.href = canonicalUrl;

if (meta) {
  document.title = meta.title;
  setMeta('meta[name="description"]', "content", meta.description);
  setMeta('meta[property="og:title"]', "content", meta.title);
  setMeta('meta[property="og:description"]', "content", meta.description);
  setMeta('meta[name="twitter:title"]', "content", meta.title);
  setMeta('meta[name="twitter:description"]', "content", meta.description);
}

setMeta('meta[property="og:type"]', "content", "website");
setMeta('meta[property="og:url"]', "content", canonicalUrl);
setMeta('meta[name="twitter:card"]', "content", "summary");

if (["/result/", "/compare/"].includes(path)) {
  setMeta('meta[name="robots"]', "content", "noindex,follow");
}

addSchema({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${origin}/#organization`,
      name: "SSC Rank",
      url: origin,
      description: "An independent project for exploring available SSC result data.",
    },
    {
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      name: "SSC Rank",
      url: origin,
      inLanguage: "en",
      publisher: { "@id": `${origin}/#organization` },
    },
    {
      "@type": "WebPage",
      "@id": `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: meta?.title || document.title,
      description: meta?.description || document.querySelector('meta[name="description"]')?.content,
      isPartOf: { "@id": `${origin}/#website` },
      inLanguage: "en",
    },
  ],
});
