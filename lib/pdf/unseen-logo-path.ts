import fs from "fs";
import path from "path";

/**
 * Absolute path to a PNG in `public/brand/` for @react-pdf Image (Node only).
 * Replace files with your real `unseen-logo-dark.png` / `unseen-icon.png` assets.
 */
export function resolveUnseenPdfLogoPath(): string | undefined {
  const dir = path.join(process.cwd(), "public", "brand");
  for (const name of ["unseen-logo-dark.png", "unseen-icon.png"]) {
    const full = path.join(dir, name);
    if (fs.existsSync(full)) return full;
  }
  return undefined;
}
