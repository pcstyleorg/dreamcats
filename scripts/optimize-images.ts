import sharp from "sharp";
import { stat } from "fs/promises";
import { join, extname, basename } from "path";

const ASSETS_DIR = "./public/assets";
const OUTPUT_DIR = "./public/assets";
const TARGET_WIDTH = 280; // 2x retina for max 140px display

// card images to optimize (excludes icons)
const CARD_FILES = [
  "0.png", "1.png", "2.png", "3.png", "4.png",
  "5.png", "6.png", "7.png", "8.png", "9.png",
  "back.png", "podjerzyj1.png", "wez2.png", "zamien2.png"
];

async function optimizeImages() {
  console.log("starting image optimization...\n");

  let totalOriginalSize = 0;
  let totalNewSize = 0;

  for (const file of CARD_FILES) {
    const inputPath = join(ASSETS_DIR, file);
    const name = basename(file, extname(file));
    const webpPath = join(OUTPUT_DIR, `${name}.webp`);
    const pngPath = join(OUTPUT_DIR, `${name}-optimized.png`);

    try {
      const originalStats = await stat(inputPath);
      totalOriginalSize += originalStats.size;

      console.log(`processing ${file}...`);

      // create webp version (small, high quality)
      await sharp(inputPath)
        .resize(TARGET_WIDTH, null, {
          fit: "inside",
          withoutEnlargement: true
        })
        .webp({
          quality: 85,
          effort: 6
        })
        .toFile(webpPath);

      const webpStats = await stat(webpPath);

      // create optimized png fallback
      await sharp(inputPath)
        .resize(TARGET_WIDTH, null, {
          fit: "inside",
          withoutEnlargement: true
        })
        .png({
          compressionLevel: 9,
          palette: true,
          quality: 90
        })
        .toFile(pngPath);

      const pngStats = await stat(pngPath);
      totalNewSize += webpStats.size;

      const originalKB = (originalStats.size / 1024).toFixed(0);
      const webpKB = (webpStats.size / 1024).toFixed(0);
      const pngKB = (pngStats.size / 1024).toFixed(0);
      const savings = ((1 - webpStats.size / originalStats.size) * 100).toFixed(1);

      console.log(`  original: ${originalKB}KB -> webp: ${webpKB}KB, png: ${pngKB}KB (${savings}% savings)\n`);

    } catch (error) {
      console.error(`error processing ${file}:`, error);
    }
  }

  console.log("\n--- summary ---");
  console.log(`total original: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`total webp: ${(totalNewSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`total savings: ${((1 - totalNewSize / totalOriginalSize) * 100).toFixed(1)}%`);
  console.log("\nnote: original png files kept as backup. after verifying, you can:");
  console.log("  1. rename *-optimized.png to *.png");
  console.log("  2. delete original large pngs");
}

optimizeImages().catch(console.error);
