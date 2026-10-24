/*
 * public/assets/css/site.css is the files in src/css/ joined in the order of
 * their names, byte for byte, with nothing added. Until now the joining was
 * done by hand, and nothing noticed when it was forgotten: edit a source
 * without rebuilding and the site keeps showing the old styling, edit
 * site.css directly and the sources quietly fall behind.
 *
 * --check is the half that was missing. It says which of the two happened, or
 * at least where the two stopped agreeing.
 */

use crate::cli::Cli;
use std::fs;
use std::path::{Path, PathBuf};

pub const HELP: &str = "\
Join the stylesheet sources into the one file the site serves.

  tools css [--root <path>] [--check]

src/css/*.css, in the order of their names, becomes
public/assets/css/site.css, byte for byte with nothing added.

  --root <path>   The website repository. The current folder by default
  --check         Write nothing. Fails when site.css and its sources
                  disagree, and says where
";

const SOURCES: &str = "src/css";
const BUILT: &str = "public/assets/css/site.css";

struct Part {
    name: String,
    bytes: Vec<u8>,
    at: usize,
}

pub fn run(cli: &mut Cli) -> Result<(), String> {
    let root = cli.root()?;
    let check = cli.flag("--check");
    cli.nothing_left()?;

    let parts = read_sources(&root)?;
    let joined: Vec<u8> = parts.iter().flat_map(|p| p.bytes.iter().copied()).collect();
    let built = root.join(BUILT);

    if check {
        let have = match fs::read(&built) {
            Ok(bytes) => bytes,
            Err(_) => {
                return Err(format!(
                    "{} is not there at all. Run tools css to write it.",
                    show(&built)
                ))
            }
        };

        if have == joined {
            println!(
                "{} matches its sources: {} files, {} bytes.",
                show(&built),
                parts.len(),
                joined.len()
            );
            return Ok(());
        }

        Err(disagreement(&built, &parts, &joined, &have))
    } else {
        if let Ok(have) = fs::read(&built) {
            if have == joined {
                println!(
                    "{} was already up to date: {} bytes.",
                    show(&built),
                    joined.len()
                );
                return Ok(());
            }
        }

        if let Some(folder) = built.parent() {
            fs::create_dir_all(folder)
                .map_err(|e| format!("could not make {}: {e}", show(folder)))?;
        }
        fs::write(&built, &joined).map_err(|e| format!("could not write {}: {e}", show(&built)))?;

        let names: Vec<&str> = parts.iter().map(|p| p.name.as_str()).collect();
        println!(
            "Wrote {}: {}, {} bytes.",
            show(&built),
            names.join(" + "),
            joined.len()
        );
        Ok(())
    }
}

fn read_sources(root: &Path) -> Result<Vec<Part>, String> {
    let folder = root.join(SOURCES);

    let listing = fs::read_dir(&folder).map_err(|_| {
        format!(
            "there is no {} here. Point --root at the website repository.",
            show(&folder)
        )
    })?;

    let mut found: Vec<PathBuf> = Vec::new();
    for entry in listing {
        let path = entry
            .map_err(|e| format!("could not read {}: {e}", show(&folder)))?
            .path();
        if path.is_file() && path.extension().is_some_and(|e| e == "css") {
            found.push(path);
        }
    }

    if found.is_empty() {
        return Err(format!("{} holds no .css files.", show(&folder)));
    }

    // The order of the names is the order they are joined in, which is what
    // the leading numbers on them are for.
    found.sort();

    let mut parts = Vec::new();
    let mut at = 0;
    for path in found {
        let bytes = fs::read(&path).map_err(|e| format!("could not read {}: {e}", show(&path)))?;
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();
        at += bytes.len();
        parts.push(Part {
            name,
            at: at - bytes.len(),
            bytes,
        });
    }

    Ok(parts)
}

/// What to say when the built file and the sources have parted ways.
fn disagreement(built: &Path, parts: &[Part], joined: &[u8], have: &[u8]) -> String {
    let mut said = format!("{} does not match its sources.\n\n", show(built));

    let names: Vec<&str> = parts.iter().map(|p| p.name.as_str()).collect();
    said += &format!(
        "  sources  {} bytes, {}\n  built    {} bytes\n\n",
        joined.len(),
        names.join(" + "),
        have.len()
    );

    match joined.iter().zip(have).position(|(a, b)| a != b) {
        Some(at) => {
            said += &format!("The first difference is {at} bytes in");
            match place(parts, at) {
                Some(where_) => said += &format!(", at {where_}:\n"),
                None => said += ":\n",
            }
            said += &format!(
                "  sources  {}\n  built    {}\n",
                line_at(joined, at),
                line_at(have, at)
            );
        }
        None if have.len() < joined.len() => {
            let at = have.len();
            said += &format!("The built file stops {} bytes early", joined.len() - at);
            match place(parts, at) {
                Some(where_) => said += &format!(", at {where_}.\n"),
                None => said += ".\n",
            }
        }
        None => {
            said += &format!(
                "The built file has {} bytes more at the end than its sources do.\n",
                have.len() - joined.len()
            );
        }
    }

    said += "\nRun tools css to write it again.";
    said
}

/// Which source file an offset into the joined whole falls in, and where.
fn place(parts: &[Part], at: usize) -> Option<String> {
    let part = parts
        .iter()
        .find(|p| at >= p.at && at < p.at + p.bytes.len())?;
    let inside = &part.bytes[..at - part.at];
    let line = inside.iter().filter(|b| **b == b'\n').count() + 1;
    let column = match inside.iter().rposition(|b| *b == b'\n') {
        Some(newline) => inside.len() - newline,
        None => inside.len() + 1,
    };
    Some(format!("{} line {line}, column {column}", part.name))
}

/// The line an offset sits on, shortened, for showing one against the other.
fn line_at(bytes: &[u8], at: usize) -> String {
    if at >= bytes.len() {
        return "(nothing, the file ends here)".to_string();
    }
    let from = bytes[..at]
        .iter()
        .rposition(|b| *b == b'\n')
        .map_or(0, |n| n + 1);
    let to = bytes[at..]
        .iter()
        .position(|b| *b == b'\n')
        .map_or(bytes.len(), |n| at + n);

    let text = String::from_utf8_lossy(&bytes[from..to]);
    let text = text.trim_end();
    let mut shown: String = text.chars().take(90).collect();
    if text.chars().count() > 90 {
        shown += "...";
    }
    format!("\"{shown}\"")
}

/// Paths are shown as written, with the separators this computer uses.
fn show(path: &Path) -> String {
    path.display().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parts() -> Vec<Part> {
        // Two files: the first three lines long, the second one.
        let first = b"a\nbb\nccc\n".to_vec();
        let second = b"dddd\n".to_vec();
        let at = first.len();
        vec![
            Part {
                name: "10-first.css".into(),
                bytes: first,
                at: 0,
            },
            Part {
                name: "20-second.css".into(),
                bytes: second,
                at,
            },
        ]
    }

    #[test]
    fn an_offset_is_traced_back_to_the_source_it_came_from() {
        let parts = parts();
        assert_eq!(place(&parts, 0).unwrap(), "10-first.css line 1, column 1");
        assert_eq!(place(&parts, 2).unwrap(), "10-first.css line 2, column 1");
        assert_eq!(place(&parts, 3).unwrap(), "10-first.css line 2, column 2");
        // The first byte of the second file, not the last of the first.
        assert_eq!(place(&parts, 9).unwrap(), "20-second.css line 1, column 1");
    }

    #[test]
    fn an_offset_past_the_end_belongs_to_no_source() {
        assert!(place(&parts(), 99).is_none());
    }

    #[test]
    fn the_line_an_offset_sits_on_is_shown_whole() {
        let text = b"first line\nsecond line\nthird";
        assert_eq!(line_at(text, 0), "\"first line\"");
        assert_eq!(line_at(text, 14), "\"second line\"");
        assert_eq!(line_at(text, 24), "\"third\"");
        assert_eq!(line_at(text, text.len()), "(nothing, the file ends here)");
    }
}
