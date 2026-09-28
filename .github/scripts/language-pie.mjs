import fs from "node:fs";

const token = process.env.STATS_TOKEN;
const username = "loczek7";

if (!token) {
  console.error("Brak STATS_TOKEN w zmiennych środowiskowych.");
  process.exit(1);
}

const res = await fetch(
  "https://api.github.com/user/repos?per_page=100&affiliation=owner&visibility=all",
  {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "language-pie-script",
    },
  },
);

if (!res.ok) {
  console.error("Błąd GitHub API:", res.status, await res.text());
  process.exit(1);
}

const repos = await res.json();
console.log(`Pobrano ${repos.length} repozytoriów (właściciel: ${username}).`);

const counts = {};
for (const repo of repos) {
  if (repo.fork) continue;
  const lang = repo.language;
  if (!lang) continue;
  counts[lang] = (counts[lang] || 0) + 1;
}

const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
const total = entries.reduce((sum, [, c]) => sum + c, 0);

console.log("Języki:", entries.map(([l, c]) => `${l}: ${c}`).join(", "));

if (total === 0) {
  console.error("Nie znaleziono żadnych repozytoriów z przypisanym językiem.");
  process.exit(1);
}

const knownColors = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Vue: "#41b883",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Python: "#3572A5",
  Dockerfile: "#384d54",
  Shell: "#89e051",
  SCSS: "#c6538c",
  Astro: "#ff5a03",
  EJS: "#a91e50",
};
const fallbackPalette = [
  "#7aa2f7",
  "#bb9af7",
  "#7dcfff",
  "#9ece6a",
  "#e0af68",
  "#f7768e",
  "#73daca",
];

function colorFor(lang, idx) {
  return knownColors[lang] || fallbackPalette[idx % fallbackPalette.length];
}

const cx = 100;
const cy = 110;
const r = 70;
const innerR = 40;
const width = 440;
const height = Math.max(220, 60 + entries.length * 24);

function polar(cx, cy, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(cx, cy, r, innerR, startAngle, endAngle) {
  const [x1, y1] = polar(cx, cy, r, startAngle);
  const [x2, y2] = polar(cx, cy, r, endAngle);
  const [x3, y3] = polar(cx, cy, innerR, endAngle);
  const [x4, y4] = polar(cx, cy, innerR, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}

let angleStart = -90;
let slices = "";
let legend = "";
let legendY = 46;

entries.forEach(([lang, count], idx) => {
  const angle = (count / total) * 360;
  const endAngle = angleStart + angle;
  const color = colorFor(lang, idx);
  if (entries.length === 1) {
    slices += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" /><circle cx="${cx}" cy="${cy}" r="${innerR}" fill="#1a1b27" />`;
  } else {
    slices += `<path d="${arcPath(cx, cy, r, innerR, angleStart, endAngle)}" fill="${color}" />`;
  }
  const pct = Math.round((count / total) * 100);
  legend += `<rect x="230" y="${legendY - 12}" width="12" height="12" fill="${color}" rx="2"/><text x="248" y="${legendY - 2}" fill="#c0caf5" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="13">${lang} — ${count} (${pct}%)</text>`;
  legendY += 24;
  angleStart = endAngle;
});

const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" rx="12" fill="#1a1b27" />
  <text x="20" y="28" fill="#7aa2f7" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="18" font-weight="600">Top Languages by Repo</text>
  <g>${slices}</g>
  <g>${legend}</g>
</svg>`;

fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync("dist/language-pie.svg", svg);
console.log("Zapisano dist/language-pie.svg");
