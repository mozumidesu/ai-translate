/*
 * Both repositories keep their README in sixteen languages, and every one of
 * them opens with the same row of sixteen links, where the language you are
 * reading is bold rather than a link. The paths differ by depth: from docs/
 * the English one is ../README.md, from the root the others are in docs/.
 *
 * Sixteen files times sixteen links is the kind of thing that is right on the
 * day it is written and wrong a month later. This writes the row, and --check
 * says which file disagrees with it.
 *
 * The prose is nobody's business but the author's. Only the row of links, and
 * the depth of the banner's path, are touched.
 */

use crate::cli::Cli;
use std::fs;
use std::path::{Path, PathBuf};

pub const HELP: &str = "\
Write the row of sixteen language links at the top of every README.

  tools header [--root <path>] [--check]

README.md and docs/README.<code>.md, sixteen files, each with the same row of
links and its own language in bold. The prose below the row is left alone.

  --root <path>   The repository to work on, either one. The current folder
                  by default
  --check         Write nothing. Fails when a README's row is not the one it
                  should have, and says which

A README whose row is an empty <p align=\"center\"> block has it filled in,
which is how a new language's file gets one. A README with no such block at
all is only reported: where its row belongs is a judgement, not a rule.
";

/// The sixteen, in the order they appear in the row. Not alphabetical: this is
/// the order the author chose, and it is the same in both repositories.
const LANGS: [(&str, &str, &str); 16] = [
    ("de", "🇩🇪", "Deutsch"),
    ("en", "🇬🇧", "English"),
    ("es", "🇪🇸", "Español"),
    ("fr", "🇫🇷", "Français"),
    ("id", "🇮🇩", "Bahasa Indonesia"),
    ("pt", "🇧🇷", "Português"),
    ("ro", "🇷🇴", "Română"),
    ("ru", "🇷🇺", "Русский"),
    ("uk", "🇺🇦", "Українська"),
    ("tr", "🇹🇷", "Türkçe"),
    ("vi", "🇻🇳", "Tiếng Việt"),
    ("ar", "🇸🇦", "العربية"),
    ("th", "🇹🇭", "ไทย"),
    ("ja", "🇯🇵", "日本語"),
    ("ko", "🇰🇷", "한국어"),
    ("zh", "🇨🇳", "中文"),
];

const OPEN: &str = "<p align=\"center\">";
const CLOSE: &str = "</p>";
const BANNER: &str = "banner.png";

struct Readme {
    path: PathBuf,
    code: &'static str,
    in_docs: bool,
}

pub fn run(cli: &mut Cli) -> Result<(), String> {
    let root = cli.root()?;
    let check = cli.flag("--check");
    cli.nothing_left()?;

    if !root.join("README.md").is_file() {
        return Err(format!(
            "there is no README.md in {}. Point --root at either repository.",
            root.display()
        ));
    }

    // Only this repository's own banner, and only its path, which changes with
    // depth. The website's READMEs have no banner at all.
    let has_banner = root.join("docs").join(BANNER).is_file();

    let mut trouble: Vec<String> = Vec::new();
    let mut changed: Vec<String> = Vec::new();
    let mut looked_at = 0;

    for file in sixteen(&root) {
        let shown = relative(&root, &file.path);

        let text = match fs::read_to_string(&file.path) {
            Ok(text) => text,
            Err(_) => {
                trouble.push(format!("  {shown} is missing."));
                continue;
            }
        };
        looked_at += 1;

        let mut lines: Vec<String> = text.split('\n').map(str::to_string).collect();
        let wanted = row(file.code, file.in_docs);

        let Some((from, to)) = language_row(&lines) else {
            trouble.push(format!(
                "  {shown} has no <p align=\"center\"> block holding a language row."
            ));
            continue;
        };

        let found: Vec<String> = lines[from..=to].to_vec();
        let mut fixes: Vec<String> = Vec::new();

        if found != wanted {
            fixes.push(match first_difference(&found, &wanted) {
                Some(said) => format!("  {shown}: the language row differs.\n{said}"),
                None => format!("  {shown}: the language row differs."),
            });
        }

        // The banner sits in a block of its own, above the row.
        let mut banner_fix: Option<(usize, String)> = None;
        if has_banner {
            match banner_line(&lines) {
                Some((at, src)) => {
                    let should = if file.in_docs {
                        BANNER.to_string()
                    } else {
                        format!("docs/{BANNER}")
                    };
                    if src != should {
                        banner_fix = Some((at, lines[at].replace(&src, &should)));
                        fixes.push(format!(
                            "  {shown}: the banner points at \"{src}\", from here it is \"{should}\"."
                        ));
                    }
                }
                None => fixes.push(format!("  {shown} has a banner nowhere in it.")),
            }
        }

        if fixes.is_empty() {
            continue;
        }

        if check {
            trouble.extend(fixes);
            continue;
        }

        if let Some((at, fixed)) = banner_fix {
            lines[at] = fixed;
        }
        if found != wanted {
            lines.splice(from..=to, wanted);
        }

        let rewritten = lines.join("\n");
        if rewritten != text {
            fs::write(&file.path, &rewritten)
                .map_err(|e| format!("could not write {shown}: {e}"))?;
            changed.push(shown);
        }
    }

    for stray in strays(&root) {
        trouble.push(format!(
            "  docs/{stray} is a README for a language that is not one of the sixteen."
        ));
    }

    if check {
        if trouble.is_empty() {
            println!(
                "The sixteen README headers in {} are in order.",
                root.display()
            );
            return Ok(());
        }
        return Err(format!(
            "the README headers are not in order:\n\n{}\n\nRun tools header to write them.",
            trouble.join("\n")
        ));
    }

    if !trouble.is_empty() {
        // Written what could be written, and said what could not.
        println!("{}", report(&changed, looked_at));
        return Err(format!(
            "some of it needs a hand:\n\n{}",
            trouble.join("\n")
        ));
    }

    println!("{}", report(&changed, looked_at));
    Ok(())
}

fn report(changed: &[String], looked_at: usize) -> String {
    if changed.is_empty() {
        format!("All {looked_at} README headers were already in order.")
    } else {
        format!(
            "Wrote the header in {} of {looked_at} READMEs: {}.",
            changed.len(),
            changed.join(", ")
        )
    }
}

/// The sixteen files, English at the root and the rest under docs/.
fn sixteen(root: &Path) -> Vec<Readme> {
    LANGS
        .iter()
        .map(|(code, _, _)| {
            if *code == "en" {
                Readme {
                    path: root.join("README.md"),
                    code,
                    in_docs: false,
                }
            } else {
                Readme {
                    path: root.join("docs").join(format!("README.{code}.md")),
                    code,
                    in_docs: true,
                }
            }
        })
        .collect()
}

/// Translated READMEs for languages the row does not carry.
fn strays(root: &Path) -> Vec<String> {
    let Ok(listing) = fs::read_dir(root.join("docs")) else {
        return Vec::new();
    };

    let mut found: Vec<String> = Vec::new();
    for entry in listing.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        let Some(code) = name
            .strip_prefix("README.")
            .and_then(|rest| rest.strip_suffix(".md"))
        else {
            continue;
        };
        if !LANGS.iter().any(|(known, _, _)| *known == code) {
            found.push(name);
        }
    }
    found.sort();
    found
}

/// The row as it should read in one file.
fn row(current: &str, in_docs: bool) -> Vec<String> {
    let mut lines = vec![OPEN.to_string()];

    for (at, (code, flag, name)) in LANGS.iter().enumerate() {
        let entry = if *code == current {
            format!("<b>{flag}&nbsp;{name}</b>")
        } else {
            format!("<a href=\"{}\">{flag}&nbsp;{name}</a>", path(code, in_docs))
        };
        let last = at + 1 == LANGS.len();
        lines.push(format!("  {entry}{}", if last { "" } else { " ·" }));
    }

    lines.push(CLOSE.to_string());
    lines
}

/// Where one language's README is, read from another's.
fn path(code: &str, in_docs: bool) -> String {
    match (in_docs, code) {
        (true, "en") => "../README.md".to_string(),
        (true, _) => format!("README.{code}.md"),
        (false, "en") => "README.md".to_string(),
        (false, _) => format!("docs/README.{code}.md"),
    }
}

/// The first centred block that holds the language row: no image in it, and
/// either language entries or nothing at all. An empty one is how a new
/// language's README asks for its row.
fn language_row(lines: &[String]) -> Option<(usize, usize)> {
    blocks(lines).into_iter().find(|(from, to)| {
        let block = &lines[*from..=*to];
        if block.iter().any(|l| l.contains("<img")) {
            return false;
        }
        let entries = block.iter().any(|l| l.contains("&nbsp;"));
        let empty = block[1..block.len() - 1]
            .iter()
            .all(|l| l.trim().is_empty());
        entries || empty
    })
}

fn blocks(lines: &[String]) -> Vec<(usize, usize)> {
    let mut found = Vec::new();
    let mut opened = None;

    for (at, line) in lines.iter().enumerate() {
        match line.trim() {
            OPEN => opened = Some(at),
            CLOSE => {
                if let Some(from) = opened.take() {
                    found.push((from, at));
                }
            }
            _ => {}
        }
    }
    found
}

/// The banner's line and what its src says.
fn banner_line(lines: &[String]) -> Option<(usize, String)> {
    for (at, line) in lines.iter().enumerate() {
        if !line.contains("<img") {
            continue;
        }
        let after = line.split_once("src=\"")?.1;
        let src = after.split_once('"')?.0;
        if src.ends_with(BANNER) {
            return Some((at, src.to_string()));
        }
    }
    None
}

/// The first line that is not what it should be, shown both ways.
fn first_difference(found: &[String], wanted: &[String]) -> Option<String> {
    for (at, should) in wanted.iter().enumerate() {
        match found.get(at) {
            Some(is) if is == should => continue,
            Some(is) => {
                return Some(format!(
                    "    line {}:\n      found      {}\n      should be  {}",
                    at + 1,
                    trimmed(is),
                    trimmed(should)
                ))
            }
            None => {
                return Some(format!(
                    "    it has {} lines, and should have {}",
                    found.len(),
                    wanted.len()
                ))
            }
        }
    }

    if found.len() > wanted.len() {
        return Some(format!(
            "    it has {} lines, and should have {}",
            found.len(),
            wanted.len()
        ));
    }
    None
}

fn trimmed(line: &str) -> String {
    let text = line.trim();
    let mut shown: String = text.chars().take(72).collect();
    if text.chars().count() > 72 {
        shown += "...";
    }
    format!("\"{shown}\"")
}

/// A path as it reads from the repository root.
fn relative(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lines(text: &str) -> Vec<String> {
        text.split('\n').map(str::to_string).collect()
    }

    #[test]
    fn the_sixteen_are_the_sixteen() {
        assert_eq!(LANGS.len(), 16);
        let mut codes: Vec<&str> = LANGS.iter().map(|(code, _, _)| *code).collect();
        codes.sort();
        codes.dedup();
        assert_eq!(codes.len(), 16, "a language code appears twice");
        assert!(LANGS.iter().any(|(code, _, _)| *code == "en"));
    }

    #[test]
    fn a_readme_knows_where_the_others_are() {
        // From the root, the rest are under docs/.
        assert_eq!(path("ro", false), "docs/README.ro.md");
        assert_eq!(path("en", false), "README.md");
        // From docs/, English is a level up and the rest are alongside.
        assert_eq!(path("ro", true), "README.ro.md");
        assert_eq!(path("en", true), "../README.md");
    }

    #[test]
    fn the_row_is_sixteen_entries_with_one_of_them_bold() {
        let built = row("ro", true);
        assert_eq!(built.len(), 18, "the open and close lines plus sixteen");
        assert_eq!(built[0], OPEN);
        assert_eq!(built[17], CLOSE);

        let bold: Vec<&String> = built.iter().filter(|l| l.contains("<b>")).collect();
        assert_eq!(bold.len(), 1, "exactly one language is the current one");
        assert!(bold[0].contains("Română"));

        // Every entry but the last carries the separator.
        for line in &built[1..16] {
            assert!(line.ends_with(" ·"), "{line} has no separator");
        }
        assert!(!built[16].ends_with(" ·"), "the last entry carries none");
    }

    #[test]
    fn the_row_reads_exactly_as_the_readmes_have_it() {
        let from_docs = row("ro", true);
        assert_eq!(
            from_docs[1],
            "  <a href=\"README.de.md\">🇩🇪&nbsp;Deutsch</a> ·"
        );
        assert_eq!(
            from_docs[2],
            "  <a href=\"../README.md\">🇬🇧&nbsp;English</a> ·"
        );
        assert_eq!(from_docs[7], "  <b>🇷🇴&nbsp;Română</b> ·");
        assert_eq!(from_docs[16], "  <a href=\"README.zh.md\">🇨🇳&nbsp;中文</a>");

        let from_root = row("en", false);
        assert_eq!(
            from_root[1],
            "  <a href=\"docs/README.de.md\">🇩🇪&nbsp;Deutsch</a> ·"
        );
        assert_eq!(from_root[2], "  <b>🇬🇧&nbsp;English</b> ·");
    }

    #[test]
    fn the_row_is_found_and_the_banner_is_not_mistaken_for_it() {
        let text = lines(
            "<p align=\"center\">\n  <img src=\"banner.png\" alt=\"AI Translate\" width=\"760\">\n</p>\n\n\
             <p align=\"center\">\n  <b>🇷🇴&nbsp;Română</b>\n</p>\n\n# AI Translate\n",
        );
        assert_eq!(language_row(&text), Some((4, 6)));

        let (at, src) = banner_line(&text).unwrap();
        assert_eq!(at, 1);
        assert_eq!(src, "banner.png");
    }

    #[test]
    fn an_empty_block_is_a_row_waiting_to_be_written() {
        let text = lines("<p align=\"center\">\n</p>\n\n# zolatau.com\n");
        assert_eq!(language_row(&text), Some((0, 1)));
    }

    #[test]
    fn a_readme_with_no_block_has_no_row() {
        assert_eq!(language_row(&lines("# zolatau.com\n\nJust prose.\n")), None);
    }

    #[test]
    fn the_first_line_out_of_place_is_the_one_reported() {
        let wanted = row("ro", true);
        let mut found = wanted.clone();
        found[9] = "  <a href=\"README.rus.md\">🇷🇺&nbsp;Русский</a> ·".to_string();

        let said = first_difference(&found, &wanted).unwrap();
        assert!(said.contains("line 10"), "{said}");
        assert!(said.contains("README.rus.md"), "{said}");

        assert!(first_difference(&wanted, &wanted).is_none());
    }

    #[test]
    fn a_row_of_the_wrong_length_is_reported_as_such() {
        let wanted = row("en", false);
        let short: Vec<String> = wanted[..5].to_vec();
        assert!(first_difference(&short, &wanted).unwrap().contains("lines"));

        let mut long = wanted.clone();
        long.push("  extra".to_string());
        assert!(first_difference(&long, &wanted).unwrap().contains("lines"));
    }
}
