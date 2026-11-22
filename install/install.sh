#!/bin/sh
# AI Translate - install, update or remove it, on macOS and Linux.
#
#   sh -c "$(curl -fsSL https://builds.zolatau.com/install.sh)"
#
# Nothing is built here and nothing else needs installing. Vencord with AI
# Translate already inside comes ready-made from builds.zolatau.com, where a
# build robot puts it whenever Vencord or the plugin changes. Vencord's own
# installer then points Discord at it.
#
# Everything lives in ~/.ai-translate. Running this again updates the files, or
# removes them.

set -u

# A copy installed before 0.2.4a lives in OLD_HOME, and Discord loads it from
# there until it is patched again. Only the default folder is ever moved: one
# named in AIT_HOME stays where its owner put it.
OLD_HOME=""
if [ -z "${AIT_HOME:-}" ]; then
    AIT_HOME="$HOME/.ai-translate"
    # The folder's name before 0.2.4a, read only to move a copy out of it.
    [ -d "$HOME/.aiTranslate" ] && OLD_HOME="$HOME/.aiTranslate"
fi
DIST="$AIT_HOME/dist"
BUILDS="https://builds.zolatau.com"

# Released builds are handed out at the root, testing builds from a folder of
# their own. AIT_CHANNEL=testing installs those: the plugin's main branch,
# built the same way but not released. The plugin's own settings then say which
# builds a copy follows and switch it back.
if [ "${AIT_CHANNEL:-}" = "testing" ]; then
    BUILDS="$BUILDS/testing"
fi
VENCORD_INSTALLER="https://github.com/Vencord/Installer/releases/latest/download"

# What Discord loads, named as Vencord's own updater names them.
FILES="patcher.js preload.js renderer.js renderer.css"

TAB=$(printf '\t')
# The VencordInstallerCli already downloaded in this run.
CLI_READY=""

say() { printf '%s\n' "$*"; }

has_tty() { (: < /dev/tty) 2> /dev/null; }

stop() {
    printf '\n%s\n' "$*" >&2
    exit 1
}

# Up and down arrows move, Enter picks, a digit picks at once. The choice,
# counted from 0, is left in CHOICE. Keys are read from the terminal itself,
# so this still works when the script arrives through a pipe; with no
# terminal at all, the first option is taken.
choose() {
    title=$1
    shift
    count=$#
    CHOICE=0

    if ! old_stty=$(stty -g 2> /dev/null < /dev/tty); then
        say "$title"
        return 0
    fi

    esc=$(printf '\033')

    draw() {
        i=0
        for option in "$@"; do
            if [ "$i" -eq "$CHOICE" ]; then
                printf '\r  \033[36m> %s\033[0m\033[K\n' "$option"
            else
                printf '\r    %s\033[K\n' "$option"
            fi
            i=$((i + 1))
        done > /dev/tty
    }

    printf '%s\n\033[?25l' "$title" > /dev/tty
    stty -icanon -echo min 1 time 0 < /dev/tty
    trap 'stty "$old_stty" < /dev/tty; printf "\033[?25h\n" > /dev/tty; exit 130' INT
    draw "$@"

    while :; do
        key=$(dd bs=1 count=1 < /dev/tty 2> /dev/null)
        case "$key" in
            "$esc")
                # an arrow is ESC, then [ or O, then A (up) or B (down)
                dd bs=1 count=1 < /dev/tty > /dev/null 2>&1
                case "$(dd bs=1 count=1 < /dev/tty 2> /dev/null)" in
                    A) CHOICE=$(((CHOICE + count - 1) % count)) ;;
                    B) CHOICE=$(((CHOICE + 1) % count)) ;;
                    *) continue ;;
                esac
                ;;
            "") break ;;
            [1-9])
                [ "$key" -le "$count" ] || continue
                CHOICE=$((key - 1))
                ;;
            *) continue ;;
        esac

        printf '\033[%dA' "$count" > /dev/tty
        draw "$@"
        case "$key" in [1-9]) break ;; esac
    done

    stty "$old_stty" < /dev/tty
    printf '\033[?25h' > /dev/tty
    trap - INT
}

has() { command -v "$1" > /dev/null 2>&1; }

download() {
    curl -fsSL --retry 2 -o "$2" "$1" || stop "Could not download $1. Check your connection and try again."
}

# A path as a person reads it, with the home folder as ~.
short() {
    case "$1" in
        "$HOME"/*) printf '%s/%s' "~" "${1#"$HOME"/}" ;;
        *) printf '%s' "$1" ;;
    esac
}

# Which Discord a folder's name says, as Vencord's installer reads it.
branch() {
    case "$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')" in
        *canary) printf 'Canary' ;;
        *development) printf 'Development' ;;
        *ptb) printf 'PTB' ;;
        *) printf 'Stable' ;;
    esac
}

# The resources folder of the app-* a self-updating Discord runs, and the one
# Vencord's installer patches: the path that sorts last byte by byte, as Go
# compares it. Older app-* folders stay behind after an update.
newest_resources() {
    for dir in "$1"/app-*/; do
        [ -e "${dir}resources" ] && printf '%s\n' "${dir}resources"
    done | LC_ALL=C sort | tail -n 1
}

# One line for a Discord: what --location takes, its line in the menu, and
# the app.asar it runs.
found() {
    printf '%s\t%s\t%s\n' "$1" "$2" "$3"
}

# Each Discord in the places Vencord's installer looks, which are also the
# only places it could have patched without a typed folder.
discords() {
    if [ "$(uname -s)" = Darwin ]; then
        discords_macos Discord discord
        discords_macos "Discord PTB" discordptb
        discords_macos "Discord Canary" discordcanary
        discords_macos "Discord Development" discorddev
        return 0
    fi

    for dir in /usr/share /usr/lib64 /opt "$HOME/.local/share" "$HOME/.dvm" \
        /var/lib/flatpak/app "$HOME/.local/share/flatpak/app"; do
        for name in Discord DiscordPTB DiscordCanary DiscordDevelopment \
            discord discordptb discordcanary discorddevelopment \
            discord-ptb discord-canary discord-development \
            com.discordapp.Discord com.discordapp.DiscordPTB \
            com.discordapp.DiscordCanary com.discordapp.DiscordDevelopment; do
            [ -d "$dir/$name" ] || continue
            case "$dir/$name" in
                */flatpak/*)
                    # A Flatpak is handed over as its app folder, which tells
                    # the installer to let it read these files. Discord is
                    # inside, as .../current/active/files/discord-ptb.
                    case "$name" in com.discordapp.*) ;; *) continue ;; esac
                    inner=$(printf '%s' "${name#com.discordapp.}" | tr '[:upper:]' '[:lower:]')
                    [ "$inner" = discord ] || inner="discord-${inner#discord}"
                    files="$dir/$name/current/active/files/$inner"
                    label="$(branch "$name") (Flatpak)"
                    case "$dir" in /var/*) label="$(branch "$name") (Flatpak, system)" ;; esac
                    ;;
                *)
                    files="$dir/$name"
                    label="$(branch "$name") - $(short "$files")"
                    ;;
            esac
            [ -f "$files/resources/app.asar" ] && found "$dir/$name" "$label" "$files/resources/app.asar"
        done
    done

    # A Discord that updates itself keeps its versions in app-* folders.
    for base in "$HOME/.config/discord" "$HOME/.config/discordcanary" "$HOME/.config/discordptb" \
        "$HOME/.var/app/com.discordapp.Discord/config/discord" \
        "$HOME/.var/app/com.discordapp.DiscordCanary/config/discord" \
        "$HOME/.var/app/com.discordapp.DiscordPTB/config/discord"; do
        resources=$(newest_resources "$base")
        [ -n "$resources" ] || continue
        case "$base" in
            */.var/app/*) name=${base%/config/discord} ;;
            *) name=$base ;;
        esac
        found "$base" "$(branch "$name") - $(short "$base")" "$resources/app.asar"
    done
    return 0
}

# On macOS Vencord's installer looks in the Applications folders, and only
# where it finds nothing there, in the app-* folders Discord updates into.
discords_macos() {
    seen=0
    for app in "/Applications/$1.app" "$HOME/Applications/$1.app"; do
        [ -f "$app/Contents/Resources/app.asar" ] || continue
        found "$app" "$(branch "$1") - $(short "$app")" "$app/Contents/Resources/app.asar"
        seen=1
    done
    [ "$seen" = 1 ] && return 0
    for app in "$HOME/Library/Application Support/$2"/app-*/"$1.app"; do
        [ -f "$app/Contents/Resources/app.asar" ] || continue
        found "$app" "$(branch "$1") - $(short "${app%/*}")" "$app/Contents/Resources/app.asar"
    done
    return 0
}

# Asks which Discord to work on and leaves what --location takes in DISCORD.
# Vencord's installer has a menu of its own, but a line wider than the
# terminal makes it draw every frame a row lower, and it leaves on Ctrl+C as
# if it had patched. So the question is asked here, in lines that fit.
pick_discord() {
    title=$1
    list=$(discords)
    set --
    while IFS=$TAB read -r location label _; do
        [ -n "$location" ] && set -- "$@" "$label"
    done << EOF
$list
EOF

    choose "$title" "$@" "Another folder"
    if [ "$CHOICE" -lt "$#" ]; then
        DISCORD=$(printf '%s\n' "$list" | sed -n "$((CHOICE + 1))p" | cut -f 1)
        return 0
    fi

    # Without -r, read takes back the backslashes of a folder dragged into
    # the terminal; quotes around it go too, and ~ is the home folder.
    printf 'Path to the Discord folder: '
    typed=""
    # shellcheck disable=SC2162
    has_tty && read typed < /dev/tty
    case "$typed" in
        \"*\" | \'*\') typed=${typed#?}; typed=${typed%?} ;;
    esac
    case "$typed" in
        "~") typed=$HOME ;;
        "~"/*) typed="$HOME/${typed#"~"/}" ;;
    esac
    [ -n "$typed" ] || stop "Nothing was typed, so nothing was changed."
    [ -d "$typed" ] || stop "There is no folder $typed."
    DISCORD=$(cd "$typed" && pwd) || stop "There is no folder $typed."
}

# Vencord's own installer, told to point Discord at these files instead of
# downloading plain Vencord, and told which Discord to work on: $1 is
# --install or --uninstall, $2 what pick_discord left.
vencord_installer() {
    case "$(uname -s)" in
        Darwin) name="VencordInstallerCli-darwin" ;;
        Linux)
            case "$(uname -m)" in
                x86_64 | amd64) name="VencordInstallerCli-linux" ;;
                *) stop "Vencord's installer only exists for 64-bit Intel and AMD processors on Linux." ;;
            esac
            ;;
        *) stop "This system is not supported." ;;
    esac

    cli="$AIT_HOME/VencordInstallerCli"
    if [ "$CLI_READY" != "$cli" ]; then
        download "$VENCORD_INSTALLER/$name" "$cli"
        chmod +x "$cli"
        CLI_READY=$cli
    fi

    set -- env VENCORD_USER_DATA_DIR="$AIT_HOME" VENCORD_DEV_INSTALL=1 "$cli" "$1" --location "$2"

    # On Linux Discord usually sits where only an administrator can write, so
    # the installer runs with sudo, the way Vencord's own install script runs
    # it. It finds the right user again from SUDO_USER.
    if [ "$(uname -s)" = Linux ] && [ "$(id -u)" != 0 ]; then
        if has sudo; then
            say "Your password may be asked for: patching Discord needs administrator rights."
            set -- sudo "$@"
        elif has doas; then
            set -- doas "$@"
        fi
    fi

    # It asks nothing now, but never gets to read this script, should that
    # have come through a pipe.
    if has_tty; then
        "$@" < /dev/tty
    else
        "$@" < /dev/null
    fi
}

# A path as Vencord's installer writes it into app.asar, in Go's json.Marshal:
# \ and " escaped, and < > & as < > &.
as_json() {
    printf '%s\n' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/</\\u003c/g' -e 's/>/\\u003e/g' -e 's/&/\\u0026/g'
}

# Whether an app.asar loads AI Translate from inside a folder: Vencord's
# installer writes one that requires a patcher.js there by its full path.
loads_from() {
    [ -f "$1" ] && grep -qF "$(as_json "$2")/" "$1" 2> /dev/null
}

# The lines of discords for each Discord that still loads AI Translate from a
# folder.
still_loading_from() {
    discords | while IFS=$TAB read -r location label asar; do
        loads_from "$asar" "$1" && found "$location" "$label" "$asar"
    done
    return 0
}

# Their menu lines, indented.
labels() {
    printf '%s\n' "$1" | cut -f 2 | sed 's/^/  /'
}

# A folder about to go may still be loaded by another Discord on this
# computer (PTB, Canary, a Flatpak beside a native one), which would no longer
# start. Those Discords are named and, on Yes, patched too; on No the folder
# stays and the run stops, so the next one moves again.
patch_the_rest() {
    [ -d "$1" ] || return 0
    left=$(still_loading_from "$1")
    [ -n "$left" ] || return 0
    say ""
    say "A Discord still loads AI Translate from $1:"
    labels "$left"
    if [ "$(printf '%s\n' "$left" | wc -l)" -gt 1 ]; then
        choose "Patch those Discords too?" "Yes" "No"
    else
        choose "Patch that Discord too?" "Yes" "No"
    fi
    [ "$CHOICE" = 0 ] || stop "So $1 is kept. Run this again and patch that Discord too."
    while IFS=$TAB read -r location _; do
        vencord_installer --install "$location" || stop "Patching Discord failed."
    done << EOF
$left
EOF
}

# A folder about to be deleted stays while a Discord still loads AI Translate
# from it, and the run stops there, so the next one patches again. $2, when
# given, says so instead of the line about patching.
keep_while_loaded() {
    [ -d "$1" ] || return 0
    left=$(still_loading_from "$1")
    [ -n "$left" ] || return 0
    say ""
    say "A Discord still loads AI Translate from $1:"
    labels "$left"
    stop "${2:-"So $1 is kept. Run this again and patch that Discord too."}"
}

install_or_update() {
    first=0
    # "ait-build.json" is what the file was called before it was renamed.
    [ -f "$DIST/build.json" ] || [ -f "$DIST/ait-build.json" ] || [ -n "$OLD_HOME" ] || first=1

    # The first installer built Vencord in a folder of its own, and Discord
    # keeps pointing there until it is patched again. So does a copy in the
    # old folder: the files arrive in the new one, Discord is pointed at them,
    # and only then does the old folder go, so Discord never points at nothing.
    moving=0
    [ -d "$AIT_HOME/Vencord" ] && moving=1
    [ -n "$OLD_HOME" ] && moving=1

    mkdir -p "$DIST" || stop "Could not create $DIST."

    say "Downloading AI Translate..."
    download "$BUILDS/build.json" "$AIT_HOME/build.json"
    build=$(sed -n 's/.*"build" *: *"\([^"]*\)".*/\1/p' "$AIT_HOME/build.json")
    [ -n "$build" ] || stop "The download came back wrong. Try again in a few minutes."

    # Everything arrives before anything is replaced.
    for name in $FILES; do download "$BUILDS/$build/$name" "$DIST/$name.new"; done
    for name in $FILES; do mv -f "$DIST/$name.new" "$DIST/$name"; done
    mv -f "$AIT_HOME/build.json" "$DIST/build.json"
    rm -f "$DIST/ait-build.json"

    # Discord only needs patching once: after that it loads these files from
    # disk, so an update is simply new files. On the first install there is
    # nothing to ask about but which Discord. Only a Discord update of its own
    # can undo the patch, and that is the one case worth a question.
    if [ "$first" = 1 ] || [ "$moving" = 1 ]; then
        patch=1
    else
        choose "Patch Discord again? Only needed if AI Translate vanished after Discord updated." "No" "Yes"
        patch=$((CHOICE == 1))
    fi

    if [ "$patch" = 1 ]; then
        [ -n "$OLD_HOME" ] && say "AI Translate moves from $OLD_HOME to $AIT_HOME, so Discord is patched again."
        pick_discord "Which Discord should be patched?"
        vencord_installer --install "$DISCORD" || stop "Patching Discord failed."

        # Each folder goes only once no Discord loads from it any more.
        # keep_while_loaded looks again for itself: a patch can fail silently.
        patch_the_rest "$AIT_HOME/Vencord"
        keep_while_loaded "$AIT_HOME/Vencord"
        rm -rf "$AIT_HOME/Vencord"
        if [ -n "$OLD_HOME" ]; then
            patch_the_rest "$OLD_HOME"
            keep_while_loaded "$OLD_HOME"
            rm -rf "$OLD_HOME" || say "Could not delete $OLD_HOME. Delete it by hand."
        fi
    fi

    say ""
    say "Done. Quit Discord fully and start it again."
    [ "$first" = 1 ] && say "AI Translate is already on: open its settings, choose a provider and paste your key."
    [ "$first" = 1 ] && say "From now on it updates itself; this command is only needed to repair or remove it."
    return 0
}

remove() {
    # A copy never moved out of the old folder is removed where it is.
    if [ ! -d "$AIT_HOME" ] && [ -n "$OLD_HOME" ]; then
        AIT_HOME=$OLD_HOME
        OLD_HOME=""
    fi
    [ -d "$AIT_HOME" ] || stop "Nothing to remove: $AIT_HOME does not exist."

    say "Removing the patch from Discord..."
    pick_discord "Which Discord should the patch be removed from?"
    vencord_installer --uninstall "$DISCORD" || stop "Removing the patch failed."

    choose "Also delete the downloaded files in $AIT_HOME?" "No" "Yes"
    if [ "$CHOICE" = 1 ]; then
        for gone in "$AIT_HOME" ${OLD_HOME:+"$OLD_HOME"}; do
            keep_while_loaded "$gone" "So $gone is kept. Run this again and remove the patch from that Discord too."
        done
        cd "$HOME" && rm -rf "$AIT_HOME" ${OLD_HOME:+"$OLD_HOME"} && say "Deleted $AIT_HOME."
    fi

    say ""
    say "Done. Quit Discord fully and start it again."
}

case "${1:-}" in
    install | update) install_or_update ;;
    remove | uninstall) remove ;;
    *)
        choose "AI Translate" "Install or update" "Remove"
        if [ "$CHOICE" = 1 ]; then remove; else install_or_update; fi
        ;;
esac
