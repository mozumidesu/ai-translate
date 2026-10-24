#!/usr/bin/env bash
# AI Translate - the build robot's instructions.
#
# Vencord only runs plugins built into it, so people get Vencord with AI
# Translate already inside, built here rather than on their own computers.
# This runs on GitHub Actions every hour and on demand. When Vencord has moved
# on, or release.cmd has pointed the "release" branch somewhere new, it builds
# the two together and publishes the finished files on builds.zolatau.com,
# where the install command and the plugin's updater download them.
#
# Publishing is a Cloudflare Worker of its own that hands out files and does
# nothing else: a build is uploaded as that Worker's static assets. The newest
# build is kept and the one before it, which is all an installed copy ever
# asks for; it is only ever told the newest one's name.
#
# The workflow, .github/workflows/build.yml in this same repository, only
# fetches this file from the release branch and runs it, so everything about
# the build is changed here.

set -euo pipefail

VENCORD_REPO="https://github.com/Vendicated/Vencord.git"
PLUGIN_REPO="https://github.com/mozumidesu/ai-translate.git"

# Where the builds are handed out, and the Cloudflare Worker that hands them out.
SITE="https://builds.zolatau.com"
WORKER="ai-translate-builds"
DOMAIN="builds.zolatau.com"

# What Discord loads, as Vencord's own updater names them.
FILES=(patcher.js preload.js renderer.js renderer.css)

: "${GITHUB_REPOSITORY:?run this from GitHub Actions}"
: "${GH_TOKEN:?the workflow passes GH_TOKEN}"
: "${CLOUDFLARE_API_TOKEN:?add CLOUDFLARE_API_TOKEN to the repository secrets on GitHub}"
: "${CLOUDFLARE_ACCOUNT_ID:?add CLOUDFLARE_ACCOUNT_ID to the repository secrets on GitHub}"

# A secret pasted into GitHub with a stray space or line break still arrives
# here, and the token goes straight into an HTTP header, where a line break is
# refused outright. Both are one word, so anything else is a slip of the mouse.
CLOUDFLARE_API_TOKEN=$(printf %s "$CLOUDFLARE_API_TOKEN" | tr -d '[:space:]')
CLOUDFLARE_ACCOUNT_ID=$(printf %s "$CLOUDFLARE_ACCOUNT_ID" | tr -d '[:space:]')
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID

# GitHub switches off the hourly schedule in a public repository that has seen
# no activity for 60 days. Every run asks it to keep the schedule on; if that
# is refused, the build still goes ahead.
gh api --method PUT "repos/$GITHUB_REPOSITORY/actions/workflows/build.yml/enable" >/dev/null 2>&1 ||
    echo "Could not ask GitHub to keep the hourly schedule on."

# What is on the site now, which is also what installed copies are being told
# to download. Nothing means nothing is published yet, and the build below
# becomes the first.
live=$(curl -fsS --retry 3 --max-time 30 "$SITE/build.json" |
    sed -n 's/.*"build" *: *"\([^"]*\)".*/\1/p' || true)

# A build is named after what went into it: Vencord's commit, then the plugin's.
vencord=$(git ls-remote "$VENCORD_REPO" refs/heads/main | cut -c1-7)
plugin=$(git ls-remote "$PLUGIN_REPO" refs/heads/release | cut -c1-7)

if [ -z "$vencord" ] || [ -z "$plugin" ]; then
    echo "Could not reach Vencord or the plugin's release branch."
    exit 1
fi

if [ "$vencord-$plugin" = "$live" ]; then
    echo "Build $live is already out. Nothing to do."
    exit 0
fi

work=$(mktemp -d)
git clone --quiet --depth 1 "$VENCORD_REPO" "$work/vencord"
git clone --quiet --depth 1 --branch release "$PLUGIN_REPO" "$work/vencord/src/userplugins/aiTranslate"

# Either may have moved since the check above; the name follows what was cloned.
vencord_full=$(git -C "$work/vencord" rev-parse HEAD)
plugin_full=$(git -C "$work/vencord/src/userplugins/aiTranslate" rev-parse HEAD)
build="${vencord_full:0:7}-${plugin_full:0:7}"

if [ "$build" = "$live" ]; then
    echo "Build $build is already out. Nothing to do."
    exit 0
fi

cd "$work/vencord"

# The runner's own Node.js does the build. Should it ever fall behind what
# Vencord asks for, say so plainly rather than fail somewhere deep inside.
have=$(node -p 'process.versions.node.split(".")[0]')
need=$(node -p '(String(require("./package.json").engines?.node ?? "").match(/\d+/) ?? [0])[0]')
echo "Using Node.js $(node --version)."
if [ "$have" -lt "$need" ]; then
    echo "Vencord needs Node.js $need or newer, and this runner has $have."
    exit 1
fi

# The pnpm version Vencord asks for, so its lockfile is read the way it was written.
pnpm="$(node -p 'require("./package.json").packageManager || "pnpm"')"
pnpm="${pnpm%%+*}"
npx --yes "$pnpm" install --frozen-lockfile

# A copy running in a browser has no build.json on a disk to read, so the name
# of this build is written into the plugin here, where it is known. A support
# report from the browser then names the same build a desktop one would.
stamp="src/userplugins/aiTranslate/bridge.ts"
sed -i "s|^const BROWSER_BUILD = \"web\";\$|const BROWSER_BUILD = \"$build\";|" "$stamp"
grep -q "const BROWSER_BUILD = \"$build\";" "$stamp" || {
    echo "Could not write the build name into bridge.ts. Has the line moved?"
    exit 1
}

# The standalone build is the kind Vencord's own installer hands out. Its
# updater stays off: it would swap these files for plain Vencord and the
# plugin would be gone. The plugin updates the whole build itself.
npx --yes "$pnpm" build --standalone --disable-updater

# The same thing for Discord in a browser tab: Vencord's own userscript build,
# with the plugin inside. --skip-extension leaves out the two packed browser
# extensions, which are not handed out yet.
npx --yes "$pnpm" buildWeb --standalone --skip-extension

# --- what the site hands out ---

cd dist

site="$work/site"
mkdir -p "$site/$build"
cp "${FILES[@]}" "$site/$build/"

# The userscript gets a name of its own, an address to update itself from and
# a note saying what it is. Two files come out: the script, and the metadata
# on its own, which is what a userscript manager reads when it checks for a
# new version, so a daily check costs a few hundred bytes instead of a
# megabyte.
cat > "$work/header.mjs" <<'JS'
import { readFileSync, writeFileSync } from "fs";

const [source, script, metadata, build, vencord, plugin, site] = process.argv.slice(2);

const SET = {
    "@name": "AI Translate",
    "@namespace": "https://gitlab.com/mozumidesu/ai-translate",
    "@description": "Translate Discord messages with an AI model of your choice. Vencord with the AI Translate plugin inside.",
    "@author": "mozumidesu",
    "@homepageURL": "https://github.com/mozumidesu/ai-translate",
    "@supportURL": "https://github.com/mozumidesu/ai-translate/issues",
    "@updateURL": `${site}/ai-translate.meta.js`,
    "@downloadURL": `${site}/ai-translate.user.js`,
    "@icon": `${site}/favicon.svg`
};

const OPEN = "// ==UserScript==";
const CLOSE = "// ==/UserScript==";

const text = readFileSync(source, "utf8");
const at = text.indexOf(CLOSE);
if (at === -1 || !text.startsWith(OPEN)) throw new Error(`no userscript metadata in ${source}`);

const line = (key, value) => `// ${key.padEnd(15)} ${value}`;

const lines = [];
const written = new Set();

for (const row of text.slice(0, at).split("\n")) {
    const found = row.match(/^\/\/\s+(@[A-Za-z-]+)\s+(.*)$/);

    if (!found) {
        // The opening line, and any blank or prose line inside the block.
        if (row.trim() !== "") lines.push(row);
        continue;
    }

    const [, key, value] = found;

    // Vencord lists @grant and @compatible more than once on purpose. The
    // keys named above are single, and are replaced rather than repeated.
    if (!(key in SET)) lines.push(line(key, value));
    else if (!written.has(key)) {
        written.add(key);
        lines.push(line(key, SET[key]));
    }
}

for (const [key, value] of Object.entries(SET))
    if (!written.has(key)) lines.push(line(key, value));

const header = lines.join("\n") + "\n" + CLOSE + "\n";

const note = [
    "",
    "// Vencord with the AI Translate plugin built into it, made by the build robot",
    "// on GitHub. This is a modified Vencord, not Vencord itself.",
    "//",
    `//   build     ${build}`,
    `//   Vencord   https://github.com/Vendicated/Vencord/tree/${vencord}`,
    `//   plugin    https://github.com/mozumidesu/ai-translate/tree/${plugin}`,
    "//",
    `// GPL-3.0-or-later, the same as both. Licence text: ${site}/LICENSE.txt`,
    ""
].join("\n");

writeFileSync(metadata, header + note);
writeFileSync(script, header + note + text.slice(at + CLOSE.length));
JS

node "$work/header.mjs" Vencord.user.js \
    "$site/ai-translate.user.js" "$site/ai-translate.meta.js" \
    "$build" "$vencord_full" "$plugin_full" "$SITE"

made=$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf '{"build":"%s","vencord":"%s","plugin":"%s","date":"%s"}\n' \
    "$build" "$vencord_full" "$plugin_full" "$made" > "$site/build.json"

# Copies installed before the rename still ask for the old name. The line
# below can go once nobody is running one of those any more.
cp "$site/build.json" "$site/ait-build.json"

# The licence travels with the files it covers.
cp "$work/vencord/src/userplugins/aiTranslate/LICENSE" "$site/LICENSE.txt"

# The install command points here rather than at a repository on somebody
# else's site: an address of our own cannot be renamed out from under it, and
# nobody else can ever claim it. These come from the release branch, like
# everything else in this build, so what people install is what was released.
cp "$work/vencord/src/userplugins/aiTranslate/install/install.ps1" "$site/install.ps1"
cp "$work/vencord/src/userplugins/aiTranslate/install/install.sh" "$site/install.sh"

# A download that began a moment ago still has somewhere to finish: the build
# that was on the site stays beside the new one. Whole, or not at all.
if [ -n "$live" ]; then
    mkdir -p "$site/$live"
    for name in "${FILES[@]}"; do
        curl -fsSL --retry 3 --max-time 300 -o "$site/$live/$name" "$SITE/$live/$name" || true
        [ -s "$site/$live/$name" ] || { rm -rf "$site/$live"; break; }
    done
fi

# The page a person sees. It names the exact source every file here was built
# from, which is what the licence asks of whoever hands out the files.
list=""
for name in "${FILES[@]}"; do
    list="$list
  <li><a href=\"$build/$name\">$name</a></li>"
done

shown=$(date -u -d "$made" "+%-d %B %Y, %H:%M UTC")

# The plugin's own mark: the page wears it, and so does the browser tab.
MARK='<svg class="mark" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B274FF"/><stop offset=".45" stop-color="#8B2BFF"/><stop offset="1" stop-color="#6E00D6"/></linearGradient></defs><rect x="4" y="4" width="112" height="112" rx="30" fill="url(#g)"/><svg x="29" y="29" width="62" height="62" viewBox="0 96 960 960"><path fill="#FFFFFF" d="m475 976 181-480h82l186 480h-87l-41-126H604l-47 126h-82Zm151-196h142l-70-194h-2l-70 194Zm-466 76-55-55 204-204q-38-44-67.5-88.5T190 416h87q17 33 37.5 62.5T361 539q45-47 75-97.5T487 336H40v-80h280v-80h80v80h280v80H567q-22 69-58.5 135.5T419 598l98 99-30 81-127-122-200 200Z"/></svg></svg>'
printf '%s\n' "$MARK" > "$site/favicon.svg"

cat > "$site/index.html" <<HTML
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0D1038">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<title>AI Translate builds</title>
<style>
  :root {
    --bg: #0D1038;
    --surface: #1A1B55;
    --ink: #EEEAF8;
    --ink-2: #B7ADDC;
    --ink-3: #8379B3;
    --line: rgba(183, 173, 220, .13);
    --acc-text: #C6A3FF;
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font: 16px/1.65 "PingFang SC", "Hiragino Sans GB", system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(62% 46% at 50% -12%, rgba(139, 43, 255, .30), transparent 70%),
      radial-gradient(42% 32% at 88% 8%, rgba(76, 202, 210, .08), transparent 70%);
  }
  main { position: relative; max-width: 39rem; margin: 0 auto; padding: 4rem 1.25rem 5rem; }
  .mark { width: 60px; height: 60px; display: block; filter: drop-shadow(0 14px 26px rgba(139, 43, 255, .45)); }
  h1 { font-size: 1.8rem; letter-spacing: -.015em; margin: 1.4rem 0 .9rem; }
  h2 { font-size: .72rem; text-transform: uppercase; letter-spacing: .13em; color: var(--ink-3); margin: 2.6rem 0 .8rem; }
  p { color: var(--ink-2); margin: 0 0 1rem; }
  a { color: var(--acc-text); text-decoration: none; border-bottom: 1px solid rgba(198, 163, 255, .28); }
  a:hover { color: #fff; border-bottom-color: #fff; }
  code { font-family: ui-monospace, "Cascadia Mono", SFMono-Regular, Menlo, Consolas, monospace; font-size: .92em; }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 1.3rem 1.5rem; }
  .build { font-family: ui-monospace, "Cascadia Mono", SFMono-Regular, Menlo, Consolas, monospace; font-size: 1.15rem; }
  .when { color: var(--ink-3); font-size: .85rem; margin-top: .15rem; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .45rem; }
  .files { margin-top: 1.1rem; padding-top: 1.1rem; border-top: 1px solid var(--line); }
  .files li::before { content: "↓"; color: var(--ink-3); margin-right: .55rem; }
  .src li { color: var(--ink-3); }
  .bare { margin: 0; padding: 0; border: 0; }
  .note { margin: 1.1rem 0 0; font-size: .93rem; }
  .note + .note { margin-top: .6rem; }
  footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--line); color: var(--ink-3); font-size: .87rem; }
</style>

<main>
$MARK

<h1>AI Translate builds</h1>

<p><a href="https://github.com/mozumidesu/ai-translate">AI Translate</a> is a Vencord plugin that
translates Discord messages with an AI model of your choice. Vencord only runs plugins that were
built into it, so what is here is Vencord with the plugin already inside.</p>

<p>The plugin itself, its instructions and the install command live on GitHub. These files are what
the install command and the plugin's own updater download, and there is nothing here to fetch by
hand.</p>

<h2>Newest build</h2>
<div class="card">
  <div class="build">$build</div>
  <div class="when">built $shown</div>
  <ul class="files">$list
    <li><a href="build.json">build.json</a></li>
  </ul>
</div>

<h2>In the browser</h2>
<div class="card">
  <ul class="files bare">
    <li><a href="ai-translate.user.js">ai-translate.user.js</a></li>
  </ul>
  <p class="note">Discord in a browser tab, with the plugin, as a userscript. Install it in
  Tampermonkey and open <code>discord.com</code>; it keeps itself up to date from here.</p>
  <p class="note">Inside it is the same Vencord as above, so switch off the Vencord Web extension
  if you have it: two of them in one tab do not get along. Tampermonkey is the one to use, and
  under Firefox it is the only one that can do this at all.</p>
</div>

<h2>Built from</h2>
<ul class="src">
  <li>Vencord <a href="https://github.com/Vendicated/Vencord/tree/$vencord_full"><code>${vencord_full:0:7}</code></a></li>
  <li>AI Translate <a href="https://github.com/mozumidesu/ai-translate/tree/$plugin_full"><code>${plugin_full:0:7}</code></a></li>
  <li>The build steps <a href="https://github.com/mozumidesu/ai-translate/blob/release/build/github.sh"><code>build/github.sh</code></a></li>
</ul>

<footer>GPL-3.0-or-later, the same as Vencord and AI Translate: <a href="LICENSE.txt">LICENSE.txt</a>.
The complete source these files were built from is linked above.</footer>
</main>
HTML

# --- publishing ---

# Hands out the files and nothing else. The /builds/ prefix is understood too,
# so the same Worker can sit behind translate.zolatau.com/builds/ one day.
cat > "$work/worker.js" <<'JS'
export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === "/builds" || url.pathname.startsWith("/builds/")) {
            url.pathname = url.pathname.slice("/builds".length) || "/";
            return env.ASSETS.fetch(new Request(url, request));
        }

        return env.ASSETS.fetch(request);
    }
};
JS

cat > "$work/wrangler.json" <<JSON
{
    "name": "$WORKER",
    "main": "worker.js",
    "compatibility_date": "2026-09-22",
    "workers_dev": false,
    "assets": { "directory": "./site", "binding": "ASSETS" },
    "routes": [{ "pattern": "$DOMAIN", "custom_domain": true }]
}
JSON

cd "$work"
npx --yes wrangler deploy

echo "Published build $build on $SITE/."

# The newest build is also noted on a branch of its own, "robot", so the
# repository sees activity whenever something is built, without the robot ever
# committing to the branches people work on. A note that fails to go up does
# not undo a build that is already out.
note="$work/robot"
remote="https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
if ! git clone --quiet --depth 1 --branch robot "$remote" "$note" 2>/dev/null; then
    git init --quiet --initial-branch=robot "$note"
    git -C "$note" remote add origin "$remote"
fi
echo "$build" > "$note/latest.txt"
git -C "$note" add latest.txt
git -C "$note" \
    -c user.name="github-actions[bot]" \
    -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    commit --quiet -m "Build $build"
git -C "$note" push --quiet origin HEAD:refs/heads/robot ||
    echo "Could not note build $build on the robot branch."
