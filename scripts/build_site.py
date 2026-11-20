# Team capacity. Copyright (c) 2026 Robert Tomkowski <rtom@kth.se>
# MIT License (see the LICENSE file). Developed with the assistance of Claude Code (Anthropic).

"""Build the static website in website/ (published with GitHub Pages).

Usage: npm run build && node scripts/screenshots.cjs && python3 scripts/build_site.py

Needs pandoc (online guide) and Node with Playwright (guide PDF). Output:
  website/index.html                     landing page (from docs/site/index.html)
  website/guide.html                     the user guide as a web page (from docs/user-guide.md)
  website/app/index.html                 the app (dist/index.html); it opens with the Northfield demo team
  website/images/                        screenshots (docs/images)
  website/downloads/Team capacity.html   the app, to save on its own
  website/downloads/Team-capacity.zip    the app, demo teams, guide PDF, licence and a short read-me
  website/downloads/*.json               the fictional demo teams
  website/downloads/Team-capacity-User-Guide.pdf
"""

import os
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_SRC = os.path.join(ROOT, "docs", "site")
OUT = os.path.join(ROOT, "website")
APP = os.path.join(ROOT, "dist", "index.html")
DEMOS = [os.path.join(ROOT, "demo-data", n) for n in
         ("northfield-demo-team.json", "experimental-engineering-demo-team.json")]
APP_NAME = "Team capacity.html"
PDF_NAME = "Team-capacity-User-Guide.pdf"

README_TXT = """Team capacity
=============

See who works on what, and how full everyone's plate is.

1. Double-click "Team capacity.html". It opens in your web browser (Chrome or Edge work best).
2. It starts with the fictional Northfield demo team. Click the team name at the top of the
   menu to create your own team, add the second demo team, or load a team file.
3. Click "Save team" now and then and keep the .json file in a shared folder.

The user guide is in Team-capacity-User-Guide.pdf, and online at
https://rtomkowski.github.io/teamcapacity/guide.html

demo-data/ holds the two fictional demo teams as files you can load.

MIT License, Copyright (c) 2026 Robert Tomkowski (rtom@kth.se). See LICENSE.txt.
Source: https://github.com/rtomkowski/teamcapacity
"""

PDF_SCRIPT = """
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto("file://" + process.argv[1]);
  await p.emulateMedia({ media: "print", colorScheme: "light" });
  await p.pdf({ path: process.argv[2], format: "A4", printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" } });
  await b.close();
})();
"""


def node_path():
    """Where a globally installed Playwright lives, so the PDF step finds it."""
    try:
        root = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        root = ""
    paths = [os.path.join(ROOT, "node_modules"), root, os.environ.get("NODE_PATH", "")]
    return os.pathsep.join(p for p in paths if p)


def main():
    if not shutil.which("pandoc"):
        raise SystemExit("pandoc is needed to build the online guide.")
    if not os.path.isfile(APP):
        raise SystemExit("dist/index.html is missing: run npm run build first.")
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    for sub in ("app", "images", "downloads"):
        os.makedirs(os.path.join(OUT, sub))

    shutil.copy(os.path.join(SITE_SRC, "index.html"), OUT)
    shutil.copy(os.path.join(SITE_SRC, "site.css"), OUT)
    open(os.path.join(OUT, ".nojekyll"), "w").close()  # serve files as they are

    for name in sorted(os.listdir(os.path.join(ROOT, "docs", "images"))):
        if name.endswith(".png"):
            shutil.copy(os.path.join(ROOT, "docs", "images", name), os.path.join(OUT, "images"))

    shutil.copy(APP, os.path.join(OUT, "app", "index.html"))
    shutil.copy(APP, os.path.join(OUT, "downloads", APP_NAME))
    for demo in DEMOS:
        shutil.copy(demo, os.path.join(OUT, "downloads"))

    guide = os.path.join(OUT, "guide.html")
    subprocess.run([
        "pandoc", os.path.join(ROOT, "docs", "user-guide.md"), "-s", "-o", guide,
        "--css=site.css",  # with --css pandoc leaves out its own page styling
        "--include-in-header=" + os.path.join(SITE_SRC, "guide-head.html"),
        "--include-before-body=" + os.path.join(SITE_SRC, "guide-header.html"),
        "--include-after-body=" + os.path.join(SITE_SRC, "guide-footer.html"),
        "--metadata=pagetitle:Team capacity: user guide", "--metadata=lang:en",
    ], check=True)

    pdf = os.path.join(OUT, "downloads", PDF_NAME)
    env = dict(os.environ, NODE_PATH=node_path())
    subprocess.run(["node", "-e", PDF_SCRIPT, guide, pdf], check=True, env=env)

    with zipfile.ZipFile(os.path.join(OUT, "downloads", "Team-capacity.zip"), "w", zipfile.ZIP_DEFLATED) as z:
        top = "Team capacity/"
        z.write(APP, top + APP_NAME)
        z.write(pdf, top + PDF_NAME)
        z.write(os.path.join(ROOT, "LICENSE"), top + "LICENSE.txt")
        z.writestr(top + "READ ME.txt", README_TXT)
        for demo in DEMOS:
            z.write(demo, top + "demo-data/" + os.path.basename(demo))

    total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(OUT) for f in fs)
    print("built website/ (%.1f MB)" % (total / 1e6))
    return 0


if __name__ == "__main__":
    sys.exit(main())
