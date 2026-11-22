/*
 * The plugin into a Vencord checkout, at src/userplugins/ai-translate, which is
 * where Vencord looks for it and the only way to build it.
 *
 * What is left out is what the plugin does not need in order to be built:
 * local/, .git/, .github/, test/, tools/, docs/ and web/dist/. The build robot
 * clones the whole repository instead; this is the same copy, by hand, on a
 * computer that has Vencord and Discord on it.
 *
 * A file whose bytes have not changed is left as it is, so Vencord rebuilds
 * only what actually moved.
 *
 * A checkout synced before 0.2.4a has the plugin in a folder of the old name.
 * Vencord would build both under one name, so that folder is moved to the new
 * one first, and its unchanged files are still left as they are.
 */

use crate::cli::Cli;
use std::fs;
use std::path::{Path, PathBuf};

pub const HELP: &str = "\
Copy the plugin into a Vencord checkout.

  tools sync [--root <path>] <vencord> [--prune] [--dry-run]

<vencord> is a Vencord checkout. The plugin lands in its
src/userplugins/ai-translate, which is where Vencord looks for it. A copy
left under the folder's old name is moved there first.

  --root <path>   The plugin repository. The current folder by default
  --prune         Also delete files there that are not in the plugin any more
  --dry-run       Say what would happen and change nothing

Left out: local/, .git/, .github/, test/, tools/, docs/ and web/dist/, none of
which the plugin needs in order to be built. Files that have not changed are
left alone, so Vencord rebuilds only what moved.
";

/// Where Vencord keeps plugins that are not its own.
const INSIDE: &str = "src/userplugins/ai-translate";

/// The folder's name before 0.2.4a, read only to move a copy out of it.
const BEFORE: &str = "src/userplugins/aiTranslate";

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
    let before = vencord.join(BEFORE.replace('/', std::path::MAIN_SEPARATOR_STR));

    let moved = move_old_copy(&before, &into, dry_run)?;

    // A dry run has moved nothing, so it compares with the files where they are.
    let there = if moved.is_some() && dry_run { &before } else { &into };

    let mut tally = Tally::default();
    let mut wanted: Vec<PathBuf> = Vec::new();
    walk(&root, &root, &mut wanted)?;
    wanted.sort();

    for file in &wanted {
        let from = root.join(file);
        let to = into.join(file);
        let bytes =
            fs::read(&from).map_err(|e| format!("could not read {}: {e}", from.display()))?;

        if fs::read(there.join(file)).is_ok_and(|old| old == bytes) {
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
    if there.is_dir() {
        let mut found: Vec<PathBuf> = Vec::new();
        walk(there, there, &mut found)?;
        found.sort();
        for file in found {
            if !wanted.contains(&file) {
                tally.stale.push(as_text(&file));
                if prune && !dry_run {
                    let _ = fs::remove_file(into.join(&file));
                }
            }
        }
    }

    if let Some(line) = moved {
        println!("{line}");
    }
    println!("{}", said(&tally, &into, prune, dry_run));
    Ok(())
}

/// Moves a copy synced under the folder's old name to the new one, and says so.
/// Both at once would be the plugin twice, which is the person's to sort out.
fn move_old_copy(before: &Path, into: &Path, dry_run: bool) -> Result<Option<String>, String> {
    if !before.is_dir() {
        return Ok(None);
    }

    if into.exists() {
        return Err(format!(
            "both {} and {} are there, and Vencord would build the plugin twice. \
             Delete the first, which is the folder's old name.",
            before.display(),
            into.display()
        ));
    }

    if dry_run {
        return Ok(Some(format!("Would move {} to {}.", before.display(), into.display())));
    }

    fs::rename(before, into).map_err(|e| {
        format!("could not move {} to {}: {e}", before.display(), into.display())
    })?;
    Ok(Some(format!("Moved {} to {}.", before.display(), into.display())))
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

    /// A Vencord checkout of its own in the temp folder, gone when dropped.
    struct Checkout(PathBuf);

    impl Checkout {
        fn new(name: &str) -> Self {
            let path = std::env::temp_dir().join(format!("tools-sync-{}-{name}", std::process::id()));
            let _ = fs::remove_dir_all(&path);
            fs::create_dir_all(path.join("src/userplugins")).unwrap();
            Checkout(path)
        }

        fn plugin(&self, folder: &str) -> PathBuf {
            let path = self.0.join(folder);
            fs::create_dir_all(&path).unwrap();
            fs::write(path.join("index.tsx"), "definePlugin").unwrap();
            path
        }
    }

    impl Drop for Checkout {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn a_copy_under_the_old_name_is_moved() {
        let vc = Checkout::new("moved");
        let before = vc.plugin(BEFORE);
        let into = vc.0.join(INSIDE);

        let said = move_old_copy(&before, &into, false).unwrap().unwrap();
        assert!(said.starts_with("Moved "));
        assert!(!before.exists());
        assert_eq!(fs::read_to_string(into.join("index.tsx")).unwrap(), "definePlugin");
    }

    #[test]
    fn a_dry_run_moves_nothing() {
        let vc = Checkout::new("dry");
        let before = vc.plugin(BEFORE);
        let into = vc.0.join(INSIDE);

        let said = move_old_copy(&before, &into, true).unwrap().unwrap();
        assert!(said.starts_with("Would move "));
        assert!(before.join("index.tsx").is_file());
        assert!(!into.exists());
    }

    #[test]
    fn both_folders_at_once_are_refused() {
        let vc = Checkout::new("both");
        let before = vc.plugin(BEFORE);
        let into = vc.plugin(INSIDE);

        assert!(move_old_copy(&before, &into, false).is_err());
        assert!(before.is_dir() && into.is_dir());
    }

    #[test]
    fn no_old_copy_is_nothing_to_say() {
        let vc = Checkout::new("none");
        assert_eq!(move_old_copy(&vc.0.join(BEFORE), &vc.0.join(INSIDE), false).unwrap(), None);
    }

    #[test]
    fn a_name_that_merely_starts_the_same_is_kept() {
        assert!(!out("testing.ts"));
        assert!(!out("locales.ts"));
        assert!(!out("docs.md"));
        assert!(!out("web/distance.ts"));
    }
}
