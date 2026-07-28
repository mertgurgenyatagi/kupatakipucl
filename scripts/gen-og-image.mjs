import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const logoSvg = readFileSync(new URL("../public/brand/kupatakip-logo-white.svg", import.meta.url), "utf8");
const LOGO_PATHS = [...logoSvg.matchAll(/<path[\s\S]*?\/>/g)].map((m) => m[0]).join("\n");

// Reads colors.css directly rather than hardcoding hex here a second time —
// this file is the single source of truth (see its own header comment); a
// plain regex is enough since we only need a handful of simple hex values,
// not a full CSS parser.
const colorsCss = readFileSync(new URL("../src/styles/colors.css", import.meta.url), "utf8");
function readColor(name) {
  const match = colorsCss.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`colors.css: --${name} not found`);
  return match[1].trim();
}
const COLOR_SHARE = readColor("color_share");
const COLOR_MAIN = readColor("color_main");
const COLOR_TEXT = readColor("color_text");
const COLOR_GOLD = readColor("color_gold");
const COLOR_SHARETEXT = readColor("color_sharetext");

const WIDTH = 1200;
const HEIGHT = 630;
const LOGO_SIZE = 176;
const LOGO_X = (WIDTH - LOGO_SIZE) / 2;
const LOGO_Y = 118;

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="50%" cy="38%" r="65%">
      <stop offset="0%" stop-color="${COLOR_SHARE}" />
      <stop offset="100%" stop-color="${COLOR_MAIN}" />
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)" />
  <g transform="translate(${LOGO_X}, ${LOGO_Y}) scale(${LOGO_SIZE / 172.014})" fill="${COLOR_TEXT}">
    ${LOGO_PATHS}
  </g>
  <text x="50%" y="368" text-anchor="middle" font-family="Arial, sans-serif" font-size="58" font-weight="700" fill="${COLOR_TEXT}" letter-spacing="-1">#kupatakipucl</text>
  <text x="50%" y="424" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="${COLOR_GOLD}">Sampiyonlar Ligi tahmin turnuvasi</text>
  <text x="50%" y="472" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="${COLOR_SHARETEXT}">36 takim. Bir tahmin. Arkadaslarinla yaris.</text>
</svg>
`;

const outPath = fileURLToPath(new URL("../public/og-image.png", import.meta.url));
await sharp(Buffer.from(svg)).png().toFile(outPath);
console.log("wrote", outPath);
