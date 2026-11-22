#!/bin/sh
# install/install.sh's functions run against a fake home, beside a fake of
# Vencord's installer CLI. Run through test/install-sh.mjs, once for each shell:
#
#   cases.sh <install.sh> <its functions, cut before the final case> <folder>
#
# The script is sourced afresh for every run, in a subshell, so a stop (which is
# an exit) ends only that run. Stubbed: the menu (scripted answers), curl, uname,
# id, sudo and doas, the last four as files on the PATH. Not stubbed: every
# other line, down to the fake CLI patching an app.asar the way WriteAppAsar
# does. HOME is a folder with Cyrillic, & and a space in its name.
#
# discords_macos is run here on Linux through a fake uname: its logic, not a
# Mac's folders. What reading from a terminal does is not checked.

SCRIPT=$1
FUNCS=$2
ROOT=$3
HERE=$(cd "$(dirname "$0")" && pwd)
PROFILE="Пётр & Co"

FAKE_CLI=$HERE/vencord-cli.mjs
FAKE_LOG=$ROOT/cli.log
FAKE_DOWNLOADS=$ROOT/downloads.log
ASKED=$ROOT/asked.log
LEFT=$ROOT/left.log
OUT=$ROOT/out.log
export NODE FAKE_CLI FAKE_LOG FAKE_DOWNLOADS

# --- The fakes on the PATH.
mkdir -p "$ROOT/bin"
cat > "$ROOT/bin/curl" << 'EOF'
#!/bin/sh
out=""
url=""
while [ $# -gt 0 ]; do
    case $1 in
        -o) out=$2; shift 2 ;;
        --retry) shift 2 ;;
        -*) shift ;;
        *) url=$1; shift ;;
    esac
done
printf '%s\n' "$url" >> "$FAKE_DOWNLOADS"
case $url in *"${FAKE_CURL_FAIL:-no such url}"*) exit 22 ;; esac
case $url in
    */VencordInstallerCli-*) printf '#!/bin/sh\nexec "%s" "%s" "$@"\n' "$NODE" "$FAKE_CLI" > "$out" ;;
    */build.json)
        if [ -n "${FAKE_BUILD_JSON+x}" ]; then printf '%s\n' "$FAKE_BUILD_JSON" > "$out"
        else printf '{"build":"b1"}\n' > "$out"; fi ;;
    *) printf 'new %s\n' "$url" > "$out" ;;
esac
EOF
cat > "$ROOT/bin/uname" << 'EOF'
#!/bin/sh
case ${1:-} in
    -s) printf '%s\n' "${FAKE_OS:-Linux}" ;;
    -m) printf '%s\n' "${FAKE_ARCH:-x86_64}" ;;
    *) printf 'Linux\n' ;;
esac
EOF
cat > "$ROOT/bin/id" << 'EOF'
#!/bin/sh
printf '%s\n' "${FAKE_UID:-1000}"
EOF
for as in sudo doas; do
    printf '#!/bin/sh\nprintf "via %s\\n" >> "$FAKE_LOG"\nexec "$@"\n' "$as" > "$ROOT/bin/$as"
done
chmod +x "$ROOT/bin/"*
PATH=$ROOT/bin:$PATH

# --- Checks.
pass=0
fail=0

# check <name> <command...>: the command's output, if it fails, is the detail.
check() {
    name=$1
    shift
    if detail=$("$@" 2>&1); then
        pass=$((pass + 1))
        printf '  ok   %s\n' "$name"
    else
        fail=$((fail + 1))
        printf '  FAIL %s\n' "$name"
        if [ -n "$detail" ]; then printf '%s\n' "$detail" | sed 's/^/       /'
        else sed -n '1,10s/^/       | /p' "$OUT"; fi
    fi
}

# same <actual> <expected>
same() {
    [ "$1" = "$2" ] && return 0
    printf 'expected: %s\ngot:      %s\n' "$2" "$1"
    return 1
}

is_file() { [ -e "$1" ]; }
no_file() { [ ! -e "$1" ]; }
# A line of the last run's output, whole.
said() { grep -qxF -- "$1" "$OUT"; }
not_said() { ! grep -qF -- "$1" "$OUT"; }
# The run ended in stop with this message.
stopped() { [ "$RC" = 1 ] && said "$1"; }
ended() { [ "$RC" = 0 ]; }

# The path an app.asar requires, as its JSON is read back.
required() { "$NODE" "$FAKE_CLI" read-asar "$1"; }
# A run's n-th question: the title and its options, with |.
asked() { sed -n "${1}p" "$ASKED" | tr '\t' '|'; }
asked_title() { sed -n "${1}p" "$ASKED" | cut -f 1; }
no_downloads() { [ ! -s "$FAKE_DOWNLOADS" ]; }
not_downloaded() { ! grep -qF -- "$1" "$FAKE_DOWNLOADS"; }
no_cli_log() { ! grep -qF -- "$1" "$FAKE_LOG"; }
# Wrappers for run, which needs one command: they call the script's functions.
pick_and_show() { pick_discord "$1"; printf 'DISCORD=%s\n' "$DISCORD"; }
show_homes() { printf '[%s][%s]\n' "$AIT_HOME" "$OLD_HOME"; }
all_branches() {
    for n in Discord DiscordPTB DiscordCanary DiscordDevelopment discord discordptb discordcanary discorddevelopment discord-ptb discord-canary discord-development com.discordapp.Discord com.discordapp.DiscordPTB com.discordapp.DiscordCanary com.discordapp.DiscordDevelopment; do
        printf '%s ' "$(branch "$n")"
    done
}
with_doas() { has() { [ "$1" = doas ]; }; vencord_installer "$@"; }
choose_bare() { choose "Which?" first second; printf 'CHOICE=%s\n' "$CHOICE"; }
# The four files, as the fake curl wrote them for a build.
arrived() {
    for f in patcher.js preload.js renderer.js renderer.css; do
        same "$(cat "$AIT/dist/$f")" "new https://builds.zolatau.com/$1/$f" || return 1
    done
}
escaped_not_raw() { grep -qF '\u0026' "$1" && ! grep -qF '& Co' "$1"; }
original_back() { grep -q 'original asar' "$1/app.asar" && [ ! -e "$1/_app.asar" ]; }
original_in() { grep -q 'original asar' "$1"; }
asked_count() { wc -l < "$ASKED" | tr -d ' '; }
cli_calls() { grep -c '^--' "$FAKE_LOG" || true; }
cli_downloads() { grep -c 'VencordInstallerCli' "$FAKE_DOWNLOADS" || true; }
# What discords printed: the labels in order, the first Discord's folder.
labels() { cut -f 2 "$OUT" | paste -s -d '|' -; }
# What pick_discord left in DISCORD.
picked() { sed -n 's/^DISCORD=//p' "$OUT"; }

# --- Fixtures.
orig() { { printf 'original asar\n'; head -c 70000 /dev/zero | tr '\0' 'a'; } > "$1"; }
# A Discord as Vencord's installer reads one that does not update itself.
flat() { mkdir -p "$1/resources" && orig "$1/resources/app.asar"; }
# One that does: app-* folders, with a resources folder in each.
updating() {
    base=$1
    shift
    for ver in "$@"; do mkdir -p "$base/$ver/resources" && orig "$base/$ver/resources/app.asar"; done
}
# What patching leaves in a resources folder: _app.asar, and app.asar requiring a patcher.
patch_asar() {
    mv "$1/app.asar" "$1/_app.asar"
    "$NODE" "$FAKE_CLI" write-asar "$1/app.asar" "$2"
}
flat_patched() { flat "$1" && patch_asar "$1/resources" "$2"; }
# A folder AI Translate was installed in.
home_with() {
    mkdir -p "$1/dist"
    printf '{"build":"old"}\n' > "$1/dist/build.json"
    printf 'x\n' > "$1/dist/patcher.js"
}

# A fresh home, and the fakes as they were.
profile() {
    P=$ROOT/$1
    rm -rf "$P"
    HOME=$P/home/${2:-$PROFILE}
    SYS=$P/sys
    mkdir -p "$HOME" "$SYS"
    XDG_CONFIG_HOME=$HOME/.config
    XDG_DATA_HOME=$HOME/.local/share
    XDG_CACHE_HOME=$HOME/.cache
    export HOME SYS XDG_CONFIG_HOME XDG_DATA_HOME XDG_CACHE_HOME
    FAKE_OS=Linux FAKE_ARCH=x86_64 FAKE_UID=1000 FAKE_FAIL="" FAKE_SILENT=""
    export FAKE_OS FAKE_ARCH FAKE_UID FAKE_FAIL FAKE_SILENT
    unset FAKE_CURL_FAIL FAKE_BUILD_JSON AIT_HOME AIT_CHANNEL
    ANSWERS=""
    RAW=""
    AIT=$HOME/.ai-translate
    OLD=$HOME/.aiTranslate
    S=$HOME/.local/share
}

# What install.sh's menu is, scripted: each choose takes the next answer.
stubs() {
    choose() {
        title=$1
        shift
        printf '%s' "$title" >> "$ASKED"
        for option in "$@"; do printf '\t%s' "$option" >> "$ASKED"; done
        printf '\n' >> "$ASKED"
        if [ -z "$ANSWERS" ]; then
            printf 'Unexpected question: %s\n' "$title" >&2
            exit 99
        fi
        CHOICE=${ANSWERS%% *}
        ANSWERS=${ANSWERS#"$CHOICE"}
        ANSWERS=${ANSWERS# }
        printf '%s' "$ANSWERS" > "$LEFT"
        [ "$CHOICE" -lt "$#" ] || { printf 'Answer %s is not an option of: %s\n' "$CHOICE" "$title" >&2; exit 98; }
    }
}

# run <command...>: the script's functions sourced afresh, in a subshell.
run() {
    : > "$ASKED"
    : > "$FAKE_LOG"
    : > "$FAKE_DOWNLOADS"
    printf '%s' "$ANSWERS" > "$LEFT"
    ( . "$FUNCS" && { [ "$RAW" = 1 ] || stubs; } && "$@" ) > "$OUT" 2>&1
    RC=$?
    UNUSED=$(cat "$LEFT")
}
used_all() { [ -z "$UNUSED" ] || { printf 'unused answers: %s\n' "$UNUSED"; return 1; }; }

heading() { printf '%s\n' "$1"; }

# --- Syntax, then the cases.
heading "Syntax: ${AIT_SH:-sh}"
check "parses with $AIT_SH -n" ${AIT_SH:-sh} -n "$SCRIPT"
check "has no controlling terminal, which the run needs" sh -c '! (: < /dev/tty) 2> /dev/null'

heading "0. the fake CLI writes app.asar as Vencord's does"
profile c0
mkdir -p "$HOME/.ai-translate"
flat "$S/Discord"
run vencord_installer --install "$S/Discord"
check "ran" ended
check "app.asar requires AIT_HOME/dist/patcher.js, read back from its JSON" same "$(required "$S/Discord/resources/app.asar")" "$AIT/dist/patcher.js"
check "the path is written with & as \\u0026, as json.Marshal does" escaped_not_raw "$S/Discord/resources/app.asar"
check "the original is kept as _app.asar" original_in "$S/Discord/resources/_app.asar"
check "the CLI took the call (it refuses one without VENCORD_DEV_INSTALL)" grep -qxF -- "--install $S/Discord" "$FAKE_LOG"
run vencord_installer --uninstall "$S/Discord"
check "uninstall puts the original back" original_back "$S/Discord/resources"
run vencord_installer --uninstall "$S/Discord"
check "uninstalling what is not patched fails, as Vencord's does" test "$RC" = 1

heading "1. no Discord: the menu is only Another folder"
profile c1
ANSWERS=0
run pick_and_show "Which Discord should be patched?"
check "the menu" same "$(asked 1)" "Which Discord should be patched?|Another folder"
check "nothing typed stops" stopped "Nothing was typed, so nothing was changed."
check "every answer used" used_all

heading "2. a folder without app-*/resources, or without app.asar, is not listed"
profile c2
mkdir -p "$HOME/.config/discord/app-1.0.1" "$HOME/.config/discordptb/resources" "$HOME/.config/discordcanary/App-1.0.1/resources" "$SYS/opt/Discord/resources"
flat "$S/DiscordDevelopment"
run discords
check "only Development is listed" same "$(labels)" "Development - ~/.local/share/DiscordDevelopment"
ANSWERS=0
run pick_and_show "Which Discord should be patched?"
check "menu: Development, Another folder" same "$(asked 1)" "Which Discord should be patched?|Development - ~/.local/share/DiscordDevelopment|Another folder"
check "picking it leaves its folder in DISCORD" same "$(picked)" "$S/DiscordDevelopment"

heading "3. app-1.0.9 against app-1.0.90 and app-1.0.10"
profile c3
mkdir -p "$HOME/.ai-translate"
updating "$HOME/.config/discord" app-1.0.90 app-1.0.9 app-1.0.10
run discords
# On Linux the path is compared as /resources, and "/" sorts below "0", so
# app-1.0.90 is the greatest. On Windows, where it is \, app-1.0.9 is.
check "the newest, as Go compares the paths" same "$(cut -f 3 "$OUT")" "$HOME/.config/discord/app-1.0.90/resources/app.asar"
check "one Discord is one line" same "$(wc -l < "$OUT" | tr -d ' ')" 1
run vencord_installer --install "$HOME/.config/discord"
check "the fake CLI picks the same one" same "$(required "$HOME/.config/discord/app-1.0.90/resources/app.asar")" "$AIT/dist/patcher.js"
check "and leaves the others" same "$(required "$HOME/.config/discord/app-1.0.9/resources/app.asar")" ""

heading "4. a Flatpak's label, and its folder"
profile c4
mkdir -p "$HOME/.ai-translate"
flat "$HOME/.local/share/flatpak/app/com.discordapp.DiscordPTB/current/active/files/discord-ptb"
flat "$HOME/.local/share/flatpak/app/com.discordapp.Discord/current/active/files/discord"
flat "$HOME/.local/share/flatpak/app/Discord/current/active/files/discord"
flat "$SYS/var/lib/flatpak/app/com.discordapp.DiscordDevelopment/current/active/files/discord-development"
updating "$HOME/.var/app/com.discordapp.DiscordCanary/config/discord" app-1.0.1
run discords
check "labels" same "$(labels)" "Development (Flatpak, system)|Stable (Flatpak)|PTB (Flatpak)|Canary - ~/.var/app/com.discordapp.DiscordCanary/config/discord"
check "a Flatpak is handed over as its app folder" same "$(sed -n 2p "$OUT" | cut -f 1)" "$HOME/.local/share/flatpak/app/com.discordapp.Discord"
check "and its app.asar is the one inside" same "$(sed -n 3p "$OUT" | cut -f 3)" "$HOME/.local/share/flatpak/app/com.discordapp.DiscordPTB/current/active/files/discord-ptb/resources/app.asar"
run vencord_installer --install "$HOME/.local/share/flatpak/app/com.discordapp.DiscordPTB"
check "the fake CLI resolves it to discord-ptb" same "$(required "$HOME/.local/share/flatpak/app/com.discordapp.DiscordPTB/current/active/files/discord-ptb/resources/app.asar")" "$AIT/dist/patcher.js"
check "and gives the Flatpak access to the files" grep -qx "flatpak override $HOME/.local/share/flatpak/app/com.discordapp.DiscordPTB" "$FAKE_LOG"
run vencord_installer --install "$HOME/.var/app/com.discordapp.DiscordCanary/config/discord"
check "the Flatpak that updates itself is patched in its app-*" same "$(required "$HOME/.var/app/com.discordapp.DiscordCanary/config/discord/app-1.0.1/resources/app.asar")" "$AIT/dist/patcher.js"

heading "5. every place, and no line wider than 80 columns"
profile c5
for dir in "$SYS/usr/share" "$SYS/usr/lib64" "$SYS/opt" "$S" "$HOME/.dvm"; do
    for name in Discord DiscordPTB DiscordCanary DiscordDevelopment discord-ptb discord-canary discord-development; do flat "$dir/$name"; done
done
for dir in "$SYS/var/lib/flatpak/app" "$S/flatpak/app"; do
    flat "$dir/com.discordapp.Discord/current/active/files/discord"
    for name in DiscordPTB DiscordCanary DiscordDevelopment; do
        inner=$(printf '%s' "$name" | tr '[:upper:]' '[:lower:]')
        flat "$dir/com.discordapp.$name/current/active/files/discord-${inner#discord}"
    done
done
for name in discord discordcanary discordptb; do updating "$HOME/.config/$name" app-1.0.1; done
for name in Discord DiscordCanary DiscordPTB; do updating "$HOME/.var/app/com.discordapp.$name/config/discord" app-1.0.1; done
run discords
check "all 49 are listed" same "$(wc -l < "$OUT" | tr -d ' ')" 49
check "each once" same "$(cut -f 1 "$OUT" | sort | uniq -d | wc -l | tr -d ' ')" 0
# The menu indents by four. Under /tmp the folders for /usr, /opt and /var
# are longer than a real one, so the fake root is taken out of what is measured.
longest=0
while IFS=$(printf '\t') read -r location label _; do
    case $label in *"$SYS"*) label=${label%%"$SYS"*}${label#*"$SYS"} ;; esac
    [ "${#label}" -gt "$longest" ] && longest=${#label}
done < "$OUT"
check "the longest line, indented, fits 80 columns ($((longest + 4)))" test $((longest + 4)) -le 80
check "no Flatpak line holds its long path" test "$(cut -f 2 "$OUT" | grep -c '/current/active' || true)" = 0
check "the Flatpaks are told apart from the rest by their label" same "$(cut -f 2 "$OUT" | grep -c 'Flatpak')" 8

heading "branch: which Discord a name says"
run all_branches
check "each of the 15 names" same "$(cat "$OUT")" "Stable PTB Canary Development Stable PTB Canary Development PTB Canary Development Stable PTB Canary Development "

# Two Discords on the folder from before 0.2.4a, with PTB the other.
old_setup() {
    profile "$1" "$2"
    home_with "$OLD"
    flat_patched "$S/Discord" "$OLD/dist/patcher.js"
    flat_patched "$S/DiscordPTB" "$OLD/dist/patcher.js"
}
two_menu="Which Discord should be patched?|Stable - ~/.local/share/Discord|PTB - ~/.local/share/DiscordPTB|Another folder"

heading "6. two Discords on the old folder, one picked, Yes"
old_setup c6
ANSWERS="0 0"
run install_or_update
check "not stopped" ended
check "the menu is Stable, PTB, Another folder" same "$(asked 1)" "$two_menu"
check "the second question is singular" same "$(asked 2)" "Patch that Discord too?|Yes|No"
check "PTB is named" said "  PTB - ~/.local/share/DiscordPTB"
check "Stable patched to the new folder" same "$(required "$S/Discord/resources/app.asar")" "$AIT/dist/patcher.js"
check "PTB patched to the new folder" same "$(required "$S/DiscordPTB/resources/app.asar")" "$AIT/dist/patcher.js"
check "old folder deleted" no_file "$OLD"
check "the CLI downloaded once, run twice" same "$(cli_downloads) $(cli_calls)" "1 2"
check "Done is said" said "Done. Quit Discord fully and start it again."
check "and nothing of a first install" not_said "already on"
check "every answer used" used_all

heading "6b. the same, No"
old_setup c6b
ANSWERS="0 1"
run install_or_update
check "stops with the kept line" stopped "So $OLD is kept. Run this again and patch that Discord too."
check "old folder kept" is_file "$OLD"
check "PTB is still on the old folder" same "$(required "$S/DiscordPTB/resources/app.asar")" "$OLD/dist/patcher.js"
check "Stable moved" same "$(required "$S/Discord/resources/app.asar")" "$AIT/dist/patcher.js"
check "every answer used" used_all
ANSWERS="1"
run install_or_update
check "the next run is not stopped" ended
check "and the folder is gone" no_file "$OLD"
check "and nothing more asked than which Discord" same "$(asked_count)" 1
check "PTB is on the new folder" same "$(required "$S/DiscordPTB/resources/app.asar")" "$AIT/dist/patcher.js"

heading "7. three on the old folder: the plural"
profile c7
home_with "$OLD"
for name in Discord DiscordPTB DiscordCanary; do flat_patched "$S/$name" "$OLD/dist/patcher.js"; done
ANSWERS="0 0"
run install_or_update
check "plural" same "$(asked 2)" "Patch those Discords too?|Yes|No"
check "PTB is named" said "  PTB - ~/.local/share/DiscordPTB"
check "Canary is named" said "  Canary - ~/.local/share/DiscordCanary"
check "all three moved" same "$(required "$S/Discord/resources/app.asar") $(required "$S/DiscordPTB/resources/app.asar") $(required "$S/DiscordCanary/resources/app.asar")" "$AIT/dist/patcher.js $AIT/dist/patcher.js $AIT/dist/patcher.js"
check "old folder deleted" no_file "$OLD"
check "the CLI downloaded once, run three times" same "$(cli_downloads) $(cli_calls)" "1 3"
check "every answer used" used_all

heading "8. none left: nothing more asked"
profile c8
home_with "$OLD"
flat_patched "$S/Discord" "$OLD/dist/patcher.js"
flat "$S/DiscordPTB"
ANSWERS="0"
run install_or_update
check "one question only" same "$(asked_count)" 1
check "old folder deleted" no_file "$OLD"
check "not stopped" ended
check "every answer used" used_all

heading "9. the second patch fails: the folder stays"
old_setup c9
ANSWERS="0 0"
FAKE_FAIL="$S/DiscordPTB"
run install_or_update
check "stops with the failure" stopped "Patching Discord failed."
check "old folder kept" is_file "$OLD"
check "every answer used" used_all

heading "9b. the second patch says it worked and did nothing"
old_setup c9b
ANSWERS="0 0"
FAKE_SILENT="$S/DiscordPTB"
run install_or_update
check "stops with the kept line" stopped "So $OLD is kept. Run this again and patch that Discord too."
check "and names the Discord" said "  PTB - ~/.local/share/DiscordPTB"
check "old folder kept" is_file "$OLD"
check "every answer used" used_all

heading "10. the first installer's Vencord folder, in AIT_HOME"
profile c10
home_with "$AIT"
mkdir -p "$AIT/Vencord/dist"
flat_patched "$S/Discord" "$AIT/Vencord/dist/patcher.js"
flat_patched "$S/DiscordPTB" "$AIT/Vencord/dist/patcher.js"
flat_patched "$S/DiscordCanary" "$AIT/dist/patcher.js"
ANSWERS="0 0"
run install_or_update
check "not stopped" ended
check "it asks in the singular" same "$(asked_title 2)" "Patch that Discord too?"
check "about PTB" said "  PTB - ~/.local/share/DiscordPTB"
check "and not about Canary, already on the new folder" not_said "  Canary"
check "the Vencord folder is deleted" no_file "$AIT/Vencord"
check "AIT_HOME stays" is_file "$AIT/dist"
check "PTB moved" same "$(required "$S/DiscordPTB/resources/app.asar")" "$AIT/dist/patcher.js"
check "every answer used" used_all

heading "10b. the first installer's Vencord folder, inside the old folder"
profile c10b
home_with "$OLD"
mkdir -p "$OLD/Vencord/dist"
flat_patched "$S/Discord" "$OLD/Vencord/dist/patcher.js"
flat_patched "$S/DiscordPTB" "$OLD/Vencord/dist/patcher.js"
ANSWERS="0 0"
run install_or_update
check "not stopped" ended
check "PTB is asked about" same "$(asked_count)" 2
check "old folder deleted" no_file "$OLD"
check "both on the new folder" same "$(required "$S/Discord/resources/app.asar") $(required "$S/DiscordPTB/resources/app.asar")" "$AIT/dist/patcher.js $AIT/dist/patcher.js"

heading "11. a sibling folder named like the old one plus a suffix"
profile c11
home_with "$OLD"
flat "$S/Discord"
flat_patched "$S/DiscordPTB" "$OLD/dist/patcher.js"
flat_patched "$S/DiscordCanary" "$HOME/.aiTranslate2/dist/patcher.js"
flat_patched "$S/DiscordDevelopment" "$AIT/Vencord2/dist/patcher.js"
run still_loading_from "$OLD"
check "only PTB loads from the old folder" same "$(cut -f 2 "$OUT")" "PTB - ~/.local/share/DiscordPTB"
run still_loading_from "$AIT/Vencord"
check "Vencord2 is not Vencord" same "$(wc -c < "$OUT" | tr -d ' ')" 0
ANSWERS="0 0"
run install_or_update
check "PTB patched" same "$(required "$S/DiscordPTB/resources/app.asar")" "$AIT/dist/patcher.js"
check "Canary left where it was" same "$(required "$S/DiscordCanary/resources/app.asar")" "$HOME/.aiTranslate2/dist/patcher.js"
check "old folder deleted" no_file "$OLD"
check "every answer used" used_all

heading "12. loads_from on what it is given"
profile c12
flat_patched "$S/Discord" "$AIT/dist/patcher.js"
flat "$S/DiscordPTB"
run loads_from "$S/Discord/resources/app.asar" "$AIT"
check "a patched app.asar loads from AIT_HOME" ended
run loads_from "$S/Discord/resources/app.asar" "$AIT-old"
check "not from a folder that only starts like it" test "$RC" = 1
run loads_from "$S/DiscordPTB/resources/app.asar" "$AIT"
check "Discord's own app.asar loads from nowhere" test "$RC" = 1
run loads_from "$S/Nothing/resources/app.asar" "$AIT"
check "a file that is not there loads from nowhere" test "$RC" = 1

heading "13. a home with \\ \" < > & in its name"
old_setup c13 'x"y\z <1> & 2'
ANSWERS="0 0"
run install_or_update
check "not stopped" ended
check "PTB is found on the old folder and asked about" same "$(asked 2)" "Patch that Discord too?|Yes|No"
check "old folder deleted" no_file "$OLD"
check "PTB moved" same "$(required "$S/DiscordPTB/resources/app.asar")" "$AIT/dist/patcher.js"

heading "14. remove one of two, delete Yes, then the other"
profile c14
home_with "$AIT"
flat_patched "$S/Discord" "$AIT/dist/patcher.js"
flat_patched "$S/DiscordPTB" "$AIT/dist/patcher.js"
ANSWERS="0 1"
run remove
check "stops with the remove line" stopped "So $AIT is kept. Run this again and remove the patch from that Discord too."
check "names PTB" said "  PTB - ~/.local/share/DiscordPTB"
check "files kept" is_file "$AIT"
check "Stable's patch is gone" original_back "$S/Discord/resources"
check "every answer used" used_all
ANSWERS="1 1"
run remove
check "the second run, which picks PTB, is not stopped" ended
check "the files are deleted" no_file "$AIT"
check "and it says so" said "Deleted $AIT."
check "the CLI downloaded once in that run" same "$(cli_downloads)" 1
check "every answer used" used_all

heading "14b. remove, files not deleted"
profile c14b
home_with "$AIT"
flat_patched "$S/Discord" "$AIT/dist/patcher.js"
ANSWERS="0 0"
run remove
check "not stopped" ended
check "files kept" is_file "$AIT"
check "question names the folder" same "$(asked 2)" "Also delete the downloaded files in $AIT?|No|Yes"

heading "15. remove with the old folder still loaded by another Discord"
profile c15
home_with "$AIT"
home_with "$OLD"
flat_patched "$S/Discord" "$AIT/dist/patcher.js"
flat_patched "$S/DiscordPTB" "$OLD/dist/patcher.js"
ANSWERS="0 1"
run remove
check "stops naming the old folder" stopped "So $OLD is kept. Run this again and remove the patch from that Discord too."
check "AIT_HOME kept" is_file "$AIT"
check "old folder kept" is_file "$OLD"
check "every answer used" used_all

heading "16. remove a copy never moved out of the old folder, and nothing to remove"
profile c16
home_with "$OLD"
flat_patched "$S/Discord" "$OLD/dist/patcher.js"
ANSWERS="0 1"
run remove
check "deleted where it was" no_file "$OLD"
check "and it says so" said "Deleted $OLD."
run remove
check "with nothing there it says so" stopped "Nothing to remove: $AIT does not exist."

heading "17. updating: a first install, a second, a legacy build file"
profile c17
flat "$S/Discord"
ANSWERS="0"
run install_or_update
check "a first install asks only which Discord" same "$(asked_count) $(asked 1)" "1 Which Discord should be patched?|Stable - ~/.local/share/Discord|Another folder"
check "Discord patched" same "$(required "$S/Discord/resources/app.asar")" "$AIT/dist/patcher.js"
check "all four files arrived with the build" arrived b1
check "build.json is the one downloaded" grep -q b1 "$AIT/dist/build.json"
check "the first-install lines are said" said "AI Translate is already on: open its settings, choose a provider and paste your key."
check "both of them" said "From now on it updates itself; this command is only needed to repair or remove it."
ANSWERS="0"
run install_or_update
check "a second run asks whether to patch again" same "$(asked 1)" "Patch Discord again? Only needed if AI Translate vanished after Discord updated.|No|Yes"
check "No: not stopped" ended
check "No downloads no CLI" same "$(cli_downloads)" 0
check "and says nothing of a first install" not_said "already on"
ANSWERS="1 0"
run install_or_update
check "Yes asks which Discord and patches it" same "$(asked_count) $(cli_calls)" "2 1"
printf '{"build":"legacy"}\n' > "$AIT/dist/ait-build.json"
rm "$AIT/dist/build.json"
ANSWERS="0"
run install_or_update
check "a legacy build file counts as installed" same "$(asked_title 1)" "Patch Discord again? Only needed if AI Translate vanished after Discord updated."
check "and is removed" no_file "$AIT/dist/ait-build.json"
AIT_CHANNEL=testing
ANSWERS="0"
run install_or_update
check "the testing channel downloads from /testing" grep -qxF 'https://builds.zolatau.com/testing/b1/renderer.js' "$FAKE_DOWNLOADS"
check "and from it alone" not_downloaded 'zolatau.com/b1'
unset AIT_CHANNEL

heading "18. updating: nothing is replaced until everything has arrived"
profile c18
home_with "$AIT"
flat "$S/Discord"
export FAKE_CURL_FAIL=renderer.css
run install_or_update
check "stops naming the file" stopped "Could not download https://builds.zolatau.com/b1/renderer.css. Check your connection and try again."
check "patcher.js is untouched" same "$(cat "$AIT/dist/patcher.js")" x
check "build.json is untouched" grep -q old "$AIT/dist/build.json"
export FAKE_CURL_FAIL=build.json
run install_or_update
check "a build.json that cannot be fetched stops" stopped "Could not download https://builds.zolatau.com/build.json. Check your connection and try again."
unset FAKE_CURL_FAIL
export FAKE_BUILD_JSON='{}'
run install_or_update
check "a build.json with no build stops" stopped "The download came back wrong. Try again in a few minutes."

heading "19. AIT_HOME from the environment is never moved"
profile c19
mkdir -p "$OLD"
AIT_HOME=$ROOT/elsewhere
run show_homes
check "OLD_HOME stays empty" same "$(cat "$OUT")" "[$ROOT/elsewhere][]"
unset AIT_HOME
run show_homes
check "without it, both folders are the defaults" same "$(cat "$OUT")" "[$AIT][$OLD]"

heading "20. the Vencord installer: sudo, doas, root, and what it will not run on"
profile c20
mkdir -p "$HOME/.ai-translate"
flat "$S/Discord"
run vencord_installer --install "$S/Discord"
check "not root, with sudo: it says a password may be asked" said "Your password may be asked for: patching Discord needs administrator rights."
check "and goes through sudo" grep -qxF 'via sudo' "$FAKE_LOG"
export FAKE_UID=0
run vencord_installer --install "$S/Discord"
check "root: no sudo" no_cli_log via
check "root: patched all the same" same "$(cli_calls)" 1
export FAKE_UID=1000
run with_doas --install "$S/Discord"
check "no sudo, with doas: through doas" grep -qxF 'via doas' "$FAKE_LOG"
check "and not through sudo" no_cli_log 'via sudo'
export FAKE_ARCH=aarch64
run vencord_installer --install "$S/Discord"
check "another processor stops" stopped "Vencord's installer only exists for 64-bit Intel and AMD processors on Linux."
check "before downloading anything" no_downloads
export FAKE_ARCH=x86_64 FAKE_OS=FreeBSD
run vencord_installer --install "$S/Discord"
check "another system stops" stopped "This system is not supported."
export FAKE_OS=Linux

heading "21. discords_macos, on Linux through a fake uname: the logic only"
profile c21
mkdir -p "$HOME/.ai-translate"
export FAKE_OS=Darwin
mkdir -p "$HOME/Library/Application Support"
mac() { mkdir -p "$1/Contents/Resources" && orig "$1/Contents/Resources/app.asar"; }
mac "$HOME/Applications/Discord.app"
mac "$HOME/Library/Application Support/discord/app-0.0.5/Discord.app"
mac "$SYS/Applications/Discord PTB.app"
mac "$HOME/Library/Application Support/discordptb/app-0.0.2/Discord PTB.app"
mac "$HOME/Library/Application Support/discordcanary/app-0.0.309/Discord Canary.app"
mac "$HOME/Library/Application Support/discordcanary/app-0.0.310/Discord Canary.app"
mac "$HOME/Applications/Discord Development.app"
mkdir -p "$HOME/Applications/Discord Broken.app" "$HOME/Library/Application Support/discorddev/app-1/Discord Development.app"
run discords
check "Applications first, app-* only where there is nothing there" same "$(labels)" "Stable - ~/Applications/Discord.app|PTB - $SYS/Applications/Discord PTB.app|Canary - ~/Library/Application Support/discordcanary/app-0.0.309|Canary - ~/Library/Application Support/discordcanary/app-0.0.310|Development - ~/Applications/Discord Development.app"
check "the location is the .app, its app.asar the one in Contents/Resources" same "$(sed -n 3p "$OUT" | cut -f 1,3 | tr '\t' '|')" "$HOME/Library/Application Support/discordcanary/app-0.0.309/Discord Canary.app|$HOME/Library/Application Support/discordcanary/app-0.0.309/Discord Canary.app/Contents/Resources/app.asar"
run vencord_installer --install "$HOME/Applications/Discord.app"
check "the Mac's installer is downloaded" grep -qF 'VencordInstallerCli-darwin' "$FAKE_DOWNLOADS"
check "and no sudo is used" no_cli_log via
check "app.asar patched" same "$(required "$HOME/Applications/Discord.app/Contents/Resources/app.asar")" "$AIT/dist/patcher.js"
export FAKE_OS=Linux

heading "22. choose with no terminal takes the first option"
profile c22
RAW=1
run choose_bare
check "the title is said and the first option taken" same "$(cat "$OUT")" "Which?
CHOICE=0"

echo ""
echo "$pass passed, $fail failed"
[ "$fail" = 0 ]
