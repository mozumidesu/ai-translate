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

say() { printf '%s\n' "$*"; }

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

# Vencord's own installer, told to point Discord at these files instead of
# downloading plain Vencord. It asks which Discord to patch.
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
    download "$VENCORD_INSTALLER/$name" "$cli"
    chmod +x "$cli"

    set -- env VENCORD_USER_DATA_DIR="$AIT_HOME" VENCORD_DEV_INSTALL=1 "$cli" "$1"

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

    # It reads the arrow keys from the terminal, even if this script came
    # through a pipe.
    if (: < /dev/tty) 2> /dev/null; then
        "$@" < /dev/tty
    else
        "$@"
    fi
}

# Whether an app.asar loads AI Translate from inside a folder: Vencord's
# installer writes one that requires a patcher.js there by its full path.
loads_from() {
    [ -f "$1" ] && grep -qF "$2/" "$1" 2> /dev/null
}

# Each Discord that still loads AI Translate from a folder, of those in the
# places Vencord's installer looks. Of the app-* folders a Discord updates
# itself into, only the newest runs.
still_loading_from() {
    for asar in /usr/share/[Dd]iscord*/resources/app.asar \
        /usr/lib64/[Dd]iscord*/resources/app.asar /opt/[Dd]iscord*/resources/app.asar \
        "$HOME"/.local/share/[Dd]iscord*/resources/app.asar \
        "$HOME"/.dvm/[Dd]iscord*/resources/app.asar \
        /var/lib/flatpak/app/com.discordapp.*/current/active/files/*/resources/app.asar \
        "$HOME"/.local/share/flatpak/app/com.discordapp.*/current/active/files/*/resources/app.asar \
        /Applications/Discord*.app/Contents/Resources/app.asar \
        "$HOME"/Applications/Discord*.app/Contents/Resources/app.asar; do
        loads_from "$asar" "$1" || continue
        asar=${asar%/resources/app.asar}
        say "  ${asar%/Contents/Resources/app.asar}"
    done
    for base in "$HOME"/.config/discord* "$HOME"/.var/app/com.discordapp.*/config/discord \
        "$HOME/Library/Application Support"/discord*; do
        newest=""
        for asar in "$base"/app-*/resources/app.asar "$base"/app-*/Discord*.app/Contents/Resources/app.asar; do
            [ -f "$asar" ] && newest=$asar
        done
        loads_from "$newest" "$1" && say "  $base"
    done
}

# A folder about to be deleted stays while a Discord still loads AI Translate
# from it, and the run stops there, so the next one patches again.
keep_while_loaded() {
    [ -d "$1" ] || return 0
    left=$(still_loading_from "$1")
    [ -n "$left" ] || return 0
    say ""
    say "A Discord still loads AI Translate from $1:"
    say "$left"
    stop "So $1 is kept. Run this again and patch that Discord too."
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
    # nothing to ask about, and the installer asks which Discord itself. Only a
    # Discord update of its own can undo the patch, and that is the one case
    # worth a question.
    if [ "$first" = 1 ] || [ "$moving" = 1 ]; then
        patch=1
    else
        choose "Patch Discord again? Only needed if AI Translate vanished after Discord updated." "No" "Yes"
        patch=$((CHOICE == 1))
    fi

    if [ "$patch" = 1 ]; then
        [ -n "$OLD_HOME" ] && say "AI Translate moves from $OLD_HOME to $AIT_HOME, so Discord is patched again."
        vencord_installer --install || stop "Patching Discord failed."

        # Another Discord on this computer (PTB, Canary, a Flatpak beside a
        # native one) may have been patched to the old folder, and fails to
        # start once that is deleted. The old folder goes only after every one
        # of them is patched; a failed or cancelled patch stops here with it
        # kept, and the next run moves again.
        if [ -n "$OLD_HOME" ]; then
            while :; do
                choose "Did another Discord on this computer have AI Translate too?" "No" "Yes"
                [ "$CHOICE" = 1 ] || break
                vencord_installer --install || stop "Patching Discord failed."
            done
        fi

        # Vencord's installer leaves its own menu on Ctrl+C with the exit
        # status of a patch that worked, so its word alone is not enough.
        keep_while_loaded "$AIT_HOME/Vencord"
        rm -rf "$AIT_HOME/Vencord"
        if [ -n "$OLD_HOME" ]; then
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
    vencord_installer --uninstall || stop "Removing the patch failed."

    choose "Also delete the downloaded files in $AIT_HOME?" "No" "Yes"
    if [ "$CHOICE" = 1 ]; then
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
