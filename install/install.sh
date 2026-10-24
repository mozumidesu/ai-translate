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
# Everything lives in ~/.aiTranslate. Running this again updates the files, or
# removes them.

set -u

AIT_HOME="${AIT_HOME:-$HOME/.aiTranslate}"
DIST="$AIT_HOME/dist"
BUILDS="https://builds.zolatau.com"
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

install_or_update() {
    first=0
    # "ait-build.json" is what the file was called before it was renamed.
    [ -f "$DIST/build.json" ] || [ -f "$DIST/ait-build.json" ] || first=1

    # The first installer built Vencord in a folder of its own, and Discord
    # keeps pointing there until it is patched again.
    moving=0
    [ -d "$AIT_HOME/Vencord" ] && moving=1

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
        vencord_installer --install || stop "Patching Discord failed."
        [ "$moving" = 1 ] && rm -rf "$AIT_HOME/Vencord"
    fi

    say ""
    say "Done. Quit Discord fully and start it again."
    [ "$first" = 1 ] && say "AI Translate is already on: open its settings, choose a provider and paste your key."
    [ "$first" = 1 ] && say "From now on it updates itself; this command is only needed to repair or remove it."
    return 0
}

remove() {
    [ -d "$AIT_HOME" ] || stop "Nothing to remove: $AIT_HOME does not exist."

    say "Removing the patch from Discord..."
    vencord_installer --uninstall || stop "Removing the patch failed."

    choose "Also delete the downloaded files in $AIT_HOME?" "No" "Yes"
    if [ "$CHOICE" = 1 ]; then
        cd "$HOME" && rm -rf "$AIT_HOME" && say "Deleted $AIT_HOME."
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
