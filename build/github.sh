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
# Two channels go out side by side from that one Worker: the released one at
# the root, built from the "release" branch, and a testing one under /testing/,
# built from "main". A run rebuilds whichever of the two has moved and brings
# the other one's files over as they are, because the deploy replaces the whole
# site. If they cannot be brought over, nothing is published at all: a channel
# must never disappear from under the copies that follow it.
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

# A channel is a branch of the plugin and a folder on the site. The released
# one has no folder of its own: it sits at the root, where every installed copy
# and both install commands already look.
RELEASE_REF="release"
TESTING_REF="main"
TESTING_DIR="testing"

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

# What each channel is handing out now, which is also what the copies that
# follow it are being told to download. Nothing means nothing is published
# there yet, and what this run builds becomes the first.
published() { # folder on the site, "" for the root
    local path="build.json"
    [ -n "$1" ] && path="$1/build.json"

    curl -fsS --retry 3 --max-time 30 "$SITE/$path" |
        sed -n 's/.*"build" *: *"\([^"]*\)".*/\1/p' || true
}

live_release=$(published "")
live_testing=$(published "$TESTING_DIR")

# A build is named after what went into it: Vencord's commit, then the plugin's.
vencord=$(git ls-remote "$VENCORD_REPO" refs/heads/main | cut -c1-7)
head_release=$(git ls-remote "$PLUGIN_REPO" "refs/heads/$RELEASE_REF" | cut -c1-7)
head_testing=$(git ls-remote "$PLUGIN_REPO" "refs/heads/$TESTING_REF" | cut -c1-7)

if [ -z "$vencord" ] || [ -z "$head_release" ] || [ -z "$head_testing" ]; then
    echo "Could not reach Vencord or the plugin's branches."
    exit 1
fi

if [ "$vencord-$head_release" = "$live_release" ] &&
    [ "$vencord-$head_testing" = "$live_testing" ]; then
    echo "Both channels are already out. Nothing to do."
    exit 0
fi

work=$(mktemp -d)
site="$work/site"
mkdir -p "$site"

cat > "$work/header.mjs" <<'JS'
import { readFileSync, writeFileSync } from "fs";

// "site" is this channel's own address, which the script updates itself from;
// "root" is where the files both channels share are, the icon among them.
const [source, script, metadata, build, vencord, plugin, site, root, channel] = process.argv.slice(2);

const SET = {
    "@name": "AI Translate",
    "@namespace": "https://gitlab.com/mozumidesu/ai-translate",
    "@description": "Translate Discord messages with an AI model of your choice. Vencord with the AI Translate plugin inside.",
    "@author": "mozumidesu",
    "@homepageURL": "https://github.com/mozumidesu/ai-translate",
    "@supportURL": "https://github.com/mozumidesu/ai-translate/issues",
    "@updateURL": `${site}/ai-translate.meta.js`,
    "@downloadURL": `${site}/ai-translate.user.js`,
    "@icon": `${root}/favicon.svg`
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
    ...channel === "testing" ? [
        "//",
        "// A testing build: the plugin's main branch, published before it is released,",
        "// so something in it may not work."
    ] : [],
    "//",
    `//   build     ${build}`,
    `//   channel   ${channel}`,
    `//   Vencord   https://github.com/Vendicated/Vencord/tree/${vencord}`,
    `//   plugin    https://github.com/mozumidesu/ai-translate/tree/${plugin}`,
    "//",
    `// GPL-3.0-or-later, the same as both. Licence text: ${root}/LICENSE.txt`,
    ""
].join("\n");

writeFileSync(metadata, header + note);
writeFileSync(script, header + note + text.slice(at + CLOSE.length));
JS

# Builds one channel: Vencord with the plugin at the given ref, laid out in the
# site under the given folder, which is empty for the released channel at the
# root. What was built comes back in BUILD, VENCORD_FULL and PLUGIN_FULL.
build_channel() { # ref, folder on the site, channel name, the build it replaces
    local ref=$1 dir=$2 channel=$3 was=$4
    local root="$work/$channel"

    git clone --quiet --depth 1 "$VENCORD_REPO" "$root/vencord"
    git clone --quiet --depth 1 --branch "$ref" "$PLUGIN_REPO" "$root/vencord/src/userplugins/aiTranslate"

    # Either may have moved since the check above; the name follows what was cloned.
    VENCORD_FULL=$(git -C "$root/vencord" rev-parse HEAD)
    PLUGIN_FULL=$(git -C "$root/vencord/src/userplugins/aiTranslate" rev-parse HEAD)
    BUILD="${VENCORD_FULL:0:7}-${PLUGIN_FULL:0:7}"

    echo "Building the $channel channel as $BUILD."
    cd "$root/vencord"

    # The runner's own Node.js does the build. Should it ever fall behind what
    # Vencord asks for, say so plainly rather than fail somewhere deep inside.
    local have need
    have=$(node -p 'process.versions.node.split(".")[0]')
    need=$(node -p '(String(require("./package.json").engines?.node ?? "").match(/\d+/) ?? [0])[0]')
    echo "Using Node.js $(node --version)."
    if [ "$have" -lt "$need" ]; then
        echo "Vencord needs Node.js $need or newer, and this runner has $have."
        exit 1
    fi

    # The pnpm version Vencord asks for, so its lockfile is read the way it was written.
    local pnpm
    pnpm="$(node -p 'require("./package.json").packageManager || "pnpm"')"
    pnpm="${pnpm%%+*}"
    npx --yes "$pnpm" install --frozen-lockfile

    # A copy running in a browser has no build.json on a disk to read, so the
    # name of this build and the channel it came from are written into the
    # plugin here, where both are known. A support report from the browser then
    # names the same things a desktop one would.
    local stamp="src/userplugins/aiTranslate/core/bridge.ts"
    sed -i "s|^const BROWSER_BUILD = \"web\";\$|const BROWSER_BUILD = \"$BUILD\";|" "$stamp"
    grep -q "const BROWSER_BUILD = \"$BUILD\";" "$stamp" || {
        echo "Could not write the build name into bridge.ts. Has the line moved?"
        exit 1
    }

    # The channel line went in later than the build name, so a branch from
    # before it has none, and this script is fetched from release while it
    # builds main as well: it must not assume the branch is as new as itself.
    # Worth saying, not worth failing a build over, because all it costs is a
    # browser copy that cannot name its channel in a support report.
    sed -i "s|^const BROWSER_CHANNEL: string = \"dev\";\$|const BROWSER_CHANNEL: string = \"$channel\";|" "$stamp"
    grep -q "const BROWSER_CHANNEL: string = \"$channel\";" "$stamp" ||
        echo "No BROWSER_CHANNEL line in bridge.ts on $ref: this build cannot name its channel."

    # The standalone build is the kind Vencord's own installer hands out. Its
    # updater stays off: it would swap these files for plain Vencord and the
    # plugin would be gone. The plugin updates the whole build itself.
    npx --yes "$pnpm" build --standalone --disable-updater

    # The same thing for Discord in a browser tab: Vencord's own userscript
    # build, with the plugin inside. --skip-extension leaves out the two packed
    # browser extensions, which are not handed out yet.
    npx --yes "$pnpm" buildWeb --standalone --skip-extension

    # --- what the site hands out ---

    local out="$site" base="$SITE"
    if [ -n "$dir" ]; then
        out="$site/$dir"
        base="$SITE/$dir"
    fi

    mkdir -p "$out/$BUILD"
    (cd dist && cp "${FILES[@]}" "$out/$BUILD/")

    # The userscript gets a name of its own, its own channel's address to
    # update itself from and a note saying what it is. Two files come out: the
    # script, and the metadata on its own, which is what a userscript manager
    # reads when it checks for a new version, so a daily check costs a few
    # hundred bytes instead of a megabyte.
    node "$work/header.mjs" dist/Vencord.user.js \
        "$out/ai-translate.user.js" "$out/ai-translate.meta.js" \
        "$BUILD" "$VENCORD_FULL" "$PLUGIN_FULL" "$base" "$SITE" "$channel"

    local made
    made=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    printf '{"build":"%s","channel":"%s","vencord":"%s","plugin":"%s","date":"%s"}\n' \
        "$BUILD" "$channel" "$VENCORD_FULL" "$PLUGIN_FULL" "$made" > "$out/build.json"

    # A download that began a moment ago still has somewhere to finish: the
    # build that was on the site stays beside the new one. Whole, or not at all.
    if [ -n "$was" ] && [ "$was" != "$BUILD" ]; then
        mkdir -p "$out/$was"
        for name in "${FILES[@]}"; do
            curl -fsSL --retry 3 --max-time 300 -o "$out/$was/$name" "$base/$was/$name" || true
            [ -s "$out/$was/$name" ] || { rm -rf "${out:?}/${was:?}"; break; }
        done
    fi
}

# The deploy replaces the whole site, so a channel that was not rebuilt has to
# be brought over as it is. A file that cannot be fetched stops the run before
# anything is published: better an hour on the build that is already out than a
# channel that has lost its files.
carry() { # path on the site
    local path=$1
    mkdir -p "$site/$(dirname "$path")"
    curl -fsSL --retry 3 --max-time 300 -o "$site/$path" "$SITE/$path" || {
        echo "Could not fetch $SITE/$path, which is live now. Publishing nothing."
        exit 1
    }
    [ -s "$site/$path" ] || {
        echo "$SITE/$path came back empty. Publishing nothing."
        exit 1
    }
}

carry_channel() { # folder on the site, the build it is handing out
    local dir=$1 was=$2 prefix=""
    [ -n "$dir" ] && prefix="$dir/"

    if [ -z "$was" ]; then
        echo "Nothing is published in the ${dir:-released} channel yet."
        return 0
    fi

    echo "Keeping the ${dir:-released} channel on $was."
    carry "${prefix}build.json"
    carry "${prefix}ai-translate.user.js"
    carry "${prefix}ai-translate.meta.js"
    for name in "${FILES[@]}"; do carry "${prefix}$was/$name"; done
}

release_built=""
testing_built=""

if [ "$vencord-$head_release" != "$live_release" ]; then
    build_channel "$RELEASE_REF" "" release "$live_release"
    release_built=1
    release_vencord=$VENCORD_FULL
    release_plugin=$PLUGIN_FULL
    release_clone="$work/release/vencord/src/userplugins/aiTranslate"
else
    carry_channel "" "$live_release"
fi

if [ "$vencord-$head_testing" != "$live_testing" ]; then
    build_channel "$TESTING_REF" "$TESTING_DIR" testing "$live_testing"
    testing_built=1
else
    carry_channel "$TESTING_DIR" "$live_testing"
fi

# The licence travels with the files it covers, and the install commands point
# here rather than at a repository on somebody else's site: an address of our
# own cannot be renamed out from under it, and nobody else can ever claim it.
# All three come from the release branch, so what people install is what was
# released; when nothing was released this run they are brought over.
if [ -n "$release_built" ]; then
    cp "$release_clone/LICENSE" "$site/LICENSE.txt"
    cp "$release_clone/install/install.ps1" "$site/install.ps1"
    cp "$release_clone/install/install.sh" "$site/install.sh"
else
    carry LICENSE.txt
    carry install.ps1
    carry install.sh
fi

# Copies installed before the rename still ask for the old name. The line
# below can go once nobody is running one of those any more.
if [ -f "$site/build.json" ]; then
    cp "$site/build.json" "$site/ait-build.json"
fi

# Whether a channel was rebuilt or brought over, what it is handing out is
# written in its own build.json, and that is where the page below reads it.
field() { # file under the site, key
    [ -f "$site/$1" ] || return 0
    sed -n "s/.*\"$2\" *: *\"\([^\"]*\)\".*/\1/p" "$site/$1"
}

release_build=$(field build.json build)
release_date=$(field build.json date)
release_vencord_full=$(field build.json vencord)
release_plugin_full=$(field build.json plugin)

testing_build=$(field "$TESTING_DIR/build.json" build)
testing_date=$(field "$TESTING_DIR/build.json" date)
testing_vencord_full=$(field "$TESTING_DIR/build.json" vencord)
testing_plugin_full=$(field "$TESTING_DIR/build.json" plugin)

# The page a person sees. It names the exact source every file here was built
# from, which is what the licence asks of whoever hands out the files.
list=""
for name in "${FILES[@]}"; do
    list="$list
  <li><a href=\"$release_build/$name\">$name</a></li>"
done

shown=""
if [ -n "$release_date" ]; then
    shown=$(date -u -d "$release_date" "+%-d %B %Y, %H:%M UTC")
fi

# The install commands are shown only when the ones being published understand
# AIT_CHANNEL. They come from the release branch, which can be older than this
# script, and a command that quietly installs the released build instead would
# be worse than no command at all. The userscript is a plain download and needs
# nothing from them.
testing_install=""
if grep -q AIT_CHANNEL "$site/install.sh" && grep -q AIT_CHANNEL "$site/install.ps1"; then
    testing_install=$(cat <<HTML
  <p class="note">On Windows:</p>
  <pre><code>\$env:AIT_CHANNEL = "testing"; irm $SITE/install.ps1 | iex</code></pre>
  <p class="note">On macOS and Linux:</p>
  <pre><code>AIT_CHANNEL=testing sh -c "\$(curl -fsSL $SITE/install.sh)"</code></pre>
HTML
)
else
    testing_install='  <p class="note">The install command does not know about this channel yet, so for now the
  userscript below is the only way in.</p>'
fi

# The one place the testing channel is written down. It is not on
# translate.zolatau.com and not in the README: whoever reads this came looking.
testing_block=""
if [ -n "$testing_build" ]; then
    testing_shown=$(date -u -d "$testing_date" "+%-d %B %Y, %H:%M UTC")
    testing_block=$(cat <<HTML
<h2>Testing builds</h2>
<div class="card">
  <div class="build">$testing_build</div>
  <div class="when">built $testing_shown</div>
  <p class="note">The plugin's main branch, built the same way and published here before it is
  released, so something in it may not work.</p>
$testing_install
  <p class="note">For a browser tab, <a href="$TESTING_DIR/ai-translate.user.js">this userscript</a>
  takes the place of the released one and keeps itself up to date from here.</p>
  <p class="note">An installed copy says which builds it follows under the update button in the
  plugin's settings, and switches back there. Its version line names the channel too.</p>
  <p class="note">Built from Vencord
  <a href="https://github.com/Vendicated/Vencord/tree/$testing_vencord_full"><code>${testing_vencord_full:0:7}</code></a>
  and AI Translate
  <a href="https://github.com/mozumidesu/ai-translate/tree/$testing_plugin_full"><code>${testing_plugin_full:0:7}</code></a>.</p>
</div>
HTML
)
fi

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
  pre { margin: .6rem 0 0; padding: .7rem .9rem; overflow-x: auto; background: rgba(0, 0, 0, .25); border: 1px solid var(--line); border-radius: 12px; }
  pre code { color: var(--ink); }
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
  <div class="build">$release_build</div>
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

$testing_block

<h2>Built from</h2>
<ul class="src">
  <li>Vencord <a href="https://github.com/Vendicated/Vencord/tree/$release_vencord_full"><code>${release_vencord_full:0:7}</code></a></li>
  <li>AI Translate <a href="https://github.com/mozumidesu/ai-translate/tree/$release_plugin_full"><code>${release_plugin_full:0:7}</code></a></li>
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

echo "Published $release_build on $SITE/."
if [ -n "$testing_build" ]; then
    echo "The testing channel is on $testing_build."
fi

# --- a release on GitHub, for the version rather than for the build ---
#
# The site hands out the newest build and keeps one before it; GitHub keeps the
# versions. These are not the same thing: a build happens whenever Vencord
# moves, and that is not a new version of this plugin, so a release is made
# only when the plugin's own number has changed. The testing channel never makes
# one at all: its number is the one the last release carries. Everything here
# is allowed to fail without undoing a build that is already published.

# Nothing was released this run, so there is no new number to tag either.
version=""
if [ -n "$release_built" ]; then
    version=$(sed -n 's/^export const VERSION = "\(.*\)";$/\1/p' \
        "$release_clone/core/version.ts")
fi

if [ -z "$release_built" ]; then
    echo "The released channel did not move, so no release is made."
elif [ -z "$version" ]; then
    echo "Could not read the version out of core/version.ts. Has the line moved?"
elif gh release view --repo "$GITHUB_REPOSITORY" "v$version" >/dev/null 2>&1; then
    echo "Version v$version is already released; only the build is new."
else
    # What changed, in the words a person would use, out of the section of
    # CHANGELOG.md whose heading is this version. Commit subjects are written
    # for whoever reads the history, not for whoever installs the plugin, and
    # nothing in them says which were features and which were repairs.
    changes=$(awk -v want="## $version" '
        $0 == want { on = 1; next }
        on && /^## / { exit }
        on { print }
    ' "$release_clone/CHANGELOG.md" 2>/dev/null | sed -e :a -e '/^[[:space:]]*$/{$d;N;ba' -e '}' || true)

    # A version with no section of its own falls back to the subjects, which is
    # what every release before the file had. GitHub's own generator lists pull
    # requests, and this repository is pushed to directly, so it would leave
    # nothing but a link to the comparison.
    previous=$(gh release list --repo "$GITHUB_REPOSITORY" --limit 1 \
        --json tagName --jq '.[0].tagName' 2>/dev/null || true)

    if [ -z "$changes" ] && [ -n "$previous" ]; then
        changes=$(gh api "repos/$GITHUB_REPOSITORY/compare/$previous...$release_plugin" \
            --jq '.commits[].commit.message | split("\n")[0]' 2>/dev/null |
            grep -v "^v\?$version\$" | sed 's/^/* /' || true)
        [ -n "$changes" ] && changes=$(printf '## Changes since %s\n\n%s' "$previous" "$changes")
    fi

    # The first release has nothing to compare against, and a repository
    # without releases answers nothing above; GitHub's own link covers both.
    if [ -z "$changes" ]; then
        changes=$(gh api --method POST "repos/$GITHUB_REPOSITORY/releases/generate-notes" \
            -f tag_name="v$version" -f target_commitish="$release_plugin" --jq .body 2>/dev/null || true)
    fi

    cat > "$work/notes.md" <<NOTES
Built as \`$release_build\` and published on $SITE.

* Vencord [\`${release_vencord:0:7}\`](https://github.com/Vendicated/Vencord/tree/$release_vencord)
* AI Translate [\`${release_plugin:0:7}\`](https://github.com/$GITHUB_REPOSITORY/tree/$release_plugin)

The files below are the same ones the site hands out. The one-command install
and the plugin's own updater take them from $SITE rather than from here, so
nothing has to be downloaded by hand.

$changes
NOTES

    # A number that still carries a letter is an alpha or a beta, and GitHub
    # has a word for that of its own.
    early=""
    case "$version" in
        *[a-z]) early="--prerelease" ;;
    esac

    # shellcheck disable=SC2086
    # Named outright: the workflow runs this script on its own, with no
    # checkout anywhere, so gh has no git remote to work the repository out of.
    if gh release create "v$version" $early \
        --repo "$GITHUB_REPOSITORY" \
        --target "$release_plugin" \
        --title "v$version" \
        --notes-file "$work/notes.md" \
        "$site/$release_build/patcher.js" \
        "$site/$release_build/preload.js" \
        "$site/$release_build/renderer.js" \
        "$site/$release_build/renderer.css" \
        "$site/ai-translate.user.js" \
        "$site/ai-translate.meta.js"; then
        echo "Released v$version."
    else
        echo "Could not create the release for v$version. The build is out all the same."
    fi
fi

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
echo "$release_build" > "$note/latest.txt"
printf '%s\n' "$testing_build" > "$note/testing.txt"
git -C "$note" add latest.txt testing.txt
git -C "$note" \
    -c user.name="github-actions[bot]" \
    -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    commit --quiet --allow-empty -m "Build $release_build, testing ${testing_build:-none}"
git -C "$note" push --quiet origin HEAD:refs/heads/robot ||
    echo "Could not note build $release_build on the robot branch."
