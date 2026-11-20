// MIT License, Copyright (c) 2026 Robert Tomkowski <rtom@kth.se>. See LICENSE.
// Screenshots for the README, guide and website, taken from the built app (dist/index.html)
// with the fictional demo teams and a fixed date (20 November 2026, 10:00).
// Usage: npm run build && node scripts/screenshots.cjs   (needs Playwright with Chromium)
const { chromium } = require("playwright");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const APP = "file://" + path.join(ROOT, "dist", "index.html");
const OUT = path.join(ROOT, "docs", "images");
const TODAY = "2026-11-20T10:00:00";
const SHRINK = `
import os, sys
from PIL import Image
d = sys.argv[1]
for f in os.listdir(d):
    if f.endswith(".png"):
        p = os.path.join(d, f)
        Image.open(p).convert("RGB").quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(p, optimize=True)
`;

async function open(browser, theme) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.addInitScript(([today, theme]) => {
    const Real = Date, off = new Real(today).getTime() - Real.now();
    class Fixed extends Real {
      constructor(...a) { if (a.length) super(...a); else super(Real.now() + off); }
      static now() { return Real.now() + off; }
    }
    window.Date = Fixed;
    try { localStorage.setItem("tc-theme", theme); } catch {}
  }, [TODAY, theme]);
  await page.goto(APP);
  await page.waitForSelector("text=Home");
  await page.waitForTimeout(1200);
  return page;
}
const nav = async (page, label) => {
  await page.locator("nav, aside").getByRole("button", { name: new RegExp("^" + label) }).first().click();
  await page.waitForTimeout(900);
};
const shot = (page, name, opts = {}) => page.screenshot({ path: path.join(OUT, name + ".png"), ...opts });

(async () => {
  const browser = await chromium.launch();
  const page = await open(browser, "light");
  await shot(page, "home");
  for (const [label, name] of [["Projects", "projects"], ["Shared work", "shared-work"], ["Engagement", "engagement"], ["Analytics", "analytics"]]) {
    await nav(page, label);
    await shot(page, name);
  }
  await nav(page, "Settings"); // a dialog
  await shot(page, "settings");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  // A dialog: add an assignment.
  await nav(page, "Home");
  await page.getByRole("button", { name: "Add assignment" }).first().click();
  await page.waitForTimeout(700);
  await shot(page, "assignment");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  // The Experimental Engineering demo team, with illustrated portraits, for the Team page.
  await page.locator("aside button").first().click();
  await page.getByRole("button", { name: /Add demo team/ }).click();
  await page.waitForTimeout(500);
  const skip = page.getByRole("button", { name: "Continue without saving" });
  if (await skip.count()) await skip.click();
  await page.waitForTimeout(1200);
  await nav(page, "Team");
  await page.addStyleTag({ content: ".toast { display: none !important; }" });
  await shot(page, "team");
  await page.close();

  const dark = await open(browser, "dark");
  await shot(dark, "home-dark");
  await browser.close();
  // Shrink the PNGs to 256 colours (about a third of the size) when Python with Pillow is there.
  try {
    require("child_process").execFileSync("python3", ["-c", SHRINK, OUT], { stdio: "inherit" });
  } catch {
    console.log("(Pillow not found: screenshots left at full colour)");
  }
  console.log("screenshots written to docs/images/");
})();
