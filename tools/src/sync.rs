/*
 * The plugin into a Vencord checkout, at src/userplugins/aiTranslate, which is
 * where Vencord looks for it and the only way to build it.
 *
 * What is left out is what the plugin does not need in order to be built:
 * local/, .git/, .github/, test/, tools/, docs/ and web/dist/. The build robot
 * clones the whole repository instead; this is the same copy, by hand, on a
 * computer that has Vencord and Discord on it.
 *
 * A file whose bytes have not changed is left as it is, so Vencord rebuilds
 * only what actually moved.
 */

use crate::cli::Cli;
use std::fs;
use std::path::{Path, PathBuf};

pub const HELP: &str = "\
Copy the plugin into a Vencord checkout.

  tools sync [--root <path>] <vencord> [--prune] [--dry-run]

<vencord> is a Vencord checkout. The plugin lands in its
src/userplugins/aiTranslate, which is where Vencord looks for it.

  --root <path>   The plugin repository. The current folder by default
  --prune         Also delete files there that are not in the plugin any more
  --dry-run       Say what would happen and change nothing

Left out: local/, .git/, .github/, test/, tools/, docs/ and web/dist/, none of
which the plugin needs in order to be built. Files that have not changed are
left alone, so Vencord rebuilds only what moved.
";

/// Where Vencord keeps plugins that are not its own.
const INSIDE: &str = "src/userplugins/aiTranslate";

/// Not part of what gets built. Matched against the path from the plugin root.
const LEAVE_OUT: [&str; 7] = [
    "local", ".git", ".github", "test", "tools", "docs", "web/dist",
];

#[derive(Default)]
struct Tally {
    copied: Vec<String>,
    same: usize,
    stale: Vec<String>,
}

pub fn run(cli: &mut Cli) -> Result<(), String> {
    let root = cli.root()?;
    let prune = cli.flag("--prune");
    let dry_run = cli.flag("--dry-run");
    let named = cli.rest();
    cli.nothing_left()?;

    // The same test Vencord itself makes: a plugin is an index.tsx with a
    // definePlugin call in it. Nothing here depends on where the rest sits.
    let entry = fs::read_to_string(root.join("index.tsx")).unwrap_or_default();
    if !entry.contains("definePlugin") {
        return Err(format!(
            "{} does not look like the plugin: no index.tsx with a definePlugin call in it. \
             Point --root at its repository.",
            root.display()
        ));
    }

    let vencord = match named.len() {
        1 => PathBuf::from(&named[0]),
        0 => return Err("say which Vencord checkout to copy into.".to_string()),
        _ => return Err("one Vencord checkout at a time.".to_string()),
    };

    // Better to say this now than to fill a folder that was a typo.
    if !vencord.join("package.json").is_file() || !vencord.join("src").is_dir() {
        return Err(format!(
            "{} does not look like a Vencord checkout: no package.json and src/ in it.",
            vencord.display()
        ));
    }

    let into = vencord.join(INSIDE.replace('/', std::path::MAIN_SEPARATOR_STR));

    let mut tally = Tally::default();
    let mut wanted: Vec<PathBuf> = Vec::new();
    walk(&root, &root, &mut wanted)?;
    wanted.sort();

    for file in &wanted {
        let from = root.join(file);
        let to = into.join(file);
        let bytes =
            fs::read(&from).map_err(|e| format!("could not read {}: {e}", from.display()))?;

        if fs::read(&to).is_ok_and(|there| there == bytes) {
            tally.same += 1;
            continue;
        }

        tally.copied.push(as_text(file));

        if dry_run {
            continue;
        }

        if let Some(folder) = to.parent() {
            fs::create_dir_all(folder)
                .map_err(|e| format!("could not make {}: {e}", folder.display()))?;
        }
        fs::write(&to, &bytes).map_err(|e| format!("could not write {}: {e}", to.display()))?;
    }

    // Anything over there that the plugin no longer has. Left in place unless
    // --prune says otherwise: that folder is the person's, not ours.
    if into.is_dir() {
        let mut there: Vec<PathBuf> = Vec::new();
        walk(&into, &into, &mut there)?;
        there.sort();
        for file in there {
            if !wanted.contains(&file) {
                tally.stale.push(as_text(&file));
                if prune && !dry_run {
                    let _ = fs::remove_file(into.join(&file));
                }
            }
        }
    }

    println!("{}", said(&tally, &into, prune, dry_run));
    Ok(())
}

fn said(tally: &Tally, into: &Path, prune: bool, dry_run: bool) -> String {
    let would = if dry_run { "Would copy" } else { "Copied" };
    let mut out = match (tally.copied.len(), tally.same) {
        (0, same) => format!(
            "Nothing to copy into {}: {same} files, all of them as they are here.",
            into.display()
        ),
        (n, 0) => format!(
            "{would} {n} {} into {}.",
            if n == 1 { "file" } else { "files" },
            into.display()
        ),
        (n, same) => format!(
            "{would} {n} {} into {}, and left {same} unchanged.",
            if n == 1 { "file" } else { "files" },
            into.display()
        ),
    };

    if !tally.copied.is_empty() && tally.copied.len() <= 20 {
        out += &format!("\n  {}", tally.copied.join("\n  "));
    }

    if !tally.stale.is_empty() {
        let what = if prune && !dry_run {
            "Deleted, no longer in the plugin:"
        } else if prune {
            "Would delete, no longer in the plugin:"
        } else {
            "Left behind, not in the plugin any more (--prune deletes them):"
        };
        out += &format!("\n{what}\n  {}", tally.stale.join("\n  "));
    }

    out
}

/// Every file worth copying, as paths from the folder walked.
fn walk(base: &Path, folder: &Path, found: &mut Vec<PathBuf>) -> Result<(), String> {
    let listing =
        fs::read_dir(folder).map_err(|e| format!("could not read {}: {e}", folder.display()))?;

    for entry in listing {
        let entry = entry.map_err(|e| format!("could not read {}: {e}", folder.display()))?;
        let path = entry.path();
        let Ok(from_base) = path.strip_prefix(base) else {
            continue;
        };

        if left_out(from_base) {
            continue;
        }

        if path.is_dir() {
            walk(base, &path, found)?;
        } else if path.is_file() {
            found.push(from_base.to_path_buf());
        }
    }

    Ok(())
}

fn left_out(path: &Path) -> bool {
    let text = as_text(path);
    LEAVE_OUT
        .iter()
        .any(|out| text == *out || text.starts_with(&format!("{out}/")))
}

/// Paths are compared and printed with forward slashes, on either system.
fn as_text(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn out(path: &str) -> bool {
        left_out(Path::new(path))
    }

    #[test]
    fn the_skipped_folders_are_skipped() {
        assert!(out("local"));
        assert!(out("local/notes.md"));
        assert!(out(".git/config"));
        assert!(out(".github/workflows/build.yml"));
        assert!(out("test/prompts.mjs"));
        assert!(out("tools/src/main.rs"));
        assert!(out("docs/README.ro.md"));
        assert!(out("web/dist/ai-translate.user.js"));
    }

    #[test]
    fn what_the_plugin_is_built_from_is_kept() {
        assert!(!out("index.tsx"));
        assert!(!out("core/translate.ts"));
        assert!(!out("web/intercept.ts"));
        assert!(!out("build/github.sh"));
        assert!(!out("install/install.ps1"));
        assert!(!out("LICENSE"));
    }

    #[test]
    fn a_name_that_merely_starts_the_same_is_kept() {
        assert!(!out("testing.ts"));
        assert!(!out("locales.ts"));
        assert!(!out("docs.md"));
        assert!(!out("web/distance.ts"));
    }
}
