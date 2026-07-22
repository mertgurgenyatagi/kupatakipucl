// One-off asset prep: crop the three leaderboard hero shots to a 3:2
// height:width portrait box (centered), then downsize for a background
// image (no need to ship multi-megapixel source files). Run once; sharp
// can be removed from devDependencies afterward if nothing else needs it.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC_DIR = "assets/leaderboard_hero_webps";
const OUT_DIR = "public/hero";
const FILES = ["harry_kane.webp", "mbappe.webp", "dembele.webp"];
const OUT_WIDTH = 800;
const OUT_HEIGHT = 1200; // 3:2 height:width

mkdirSync(OUT_DIR, { recursive: true });

for (const file of FILES) {
  const input = sharp(`${SRC_DIR}/${file}`);
  const meta = await input.metadata();
  const targetRatio = 2 / 3; // width:height
  let cropWidth = meta.width;
  let cropHeight = Math.round(meta.width / targetRatio);
  if (cropHeight > meta.height) {
    cropHeight = meta.height;
    cropWidth = Math.round(meta.height * targetRatio);
  }
  const left = Math.round((meta.width - cropWidth) / 2);
  const top = Math.round((meta.height - cropHeight) / 2);

  await sharp(`${SRC_DIR}/${file}`)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(OUT_WIDTH, OUT_HEIGHT)
    .webp({ quality: 82 })
    .toFile(`${OUT_DIR}/${file}`);

  console.log(`${file}: ${meta.width}x${meta.height} -> crop ${cropWidth}x${cropHeight} -> ${OUT_WIDTH}x${OUT_HEIGHT}`);
}
