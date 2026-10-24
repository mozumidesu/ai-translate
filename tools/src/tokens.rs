/*
 * What a piece of text costs, counted the way the models count it.
 *
 * test/measure.mjs and test/rules.mjs used to reach for gpt-tokenizer in
 * ~/tools. This carries its own tables, so counting works with nothing
 * beside the project and no network.
 *
 * Two modes, because the two scripts ask different questions. The whole text
 * at once is what a request actually carries; line by line is what rules.mjs
 * wants, to see which rule is the heaviest. They do not add up to the same
 * number, and that is the tokenizer's doing: a blank line between two lines
 * merges with the newline before it, so three empty lines cost less counted
 * together than counted apart.
 */

use crate::cli::Cli;
use std::io::Read;
use tiktoken_rs::o200k_base;

pub const HELP: &str = "\
Count o200k tokens, the way the models count them.

  tools tokens [--lines | --each] [--file <path>] [text...]
  ... | tools tokens

The text comes from the arguments, or from --file, or from what is piped in.

  --lines         One count per line of the input, in order, instead of one
                  count for the whole of it
  --each          One count per piece of the input, where the pieces are
                  separated by a zero byte. For scripts counting several
                  texts at once, so the tables are loaded once
  --file <path>   Read the text from a file

Without --lines the whole text is counted in one piece, which is what a
request really costs. With --lines each line is counted on its own, so the
counts can be put against the lines they came from. The input is split on
newline exactly as written, so a text ending in a newline has an empty last
line, and that line counts nothing.
";

pub fn run(cli: &mut Cli) -> Result<(), String> {
    let by_line = cli.flag("--lines");
    let by_piece = cli.flag("--each");
    let file = cli.value("--file")?;
    // --root is accepted everywhere, and counting has no use for it.
    let _ = cli.root()?;
    let words = cli.rest();
    cli.nothing_left()?;

    let text = match (&file, words.is_empty()) {
        (Some(path), true) => {
            std::fs::read_to_string(path).map_err(|e| format!("could not read {path}: {e}"))?
        }
        (Some(_), false) => return Err("either --file or the text itself, not both.".to_string()),
        (None, false) => words.join(" "),
        (None, true) => {
            let mut piped = String::new();
            std::io::stdin()
                .read_to_string(&mut piped)
                .map_err(|e| format!("could not read what was piped in: {e}"))?;
            piped
        }
    };

    if by_line && by_piece {
        return Err("either --lines or --each, not both.".to_string());
    }

    let bpe = o200k_base().map_err(|e| format!("could not load the o200k tables: {e}"))?;

    // Nothing in a prompt is a special token, and anything that looks like one
    // is counted as the text it is rather than refused.
    let counted: Vec<usize> = match (by_line, by_piece) {
        (true, _) => text
            .split('\n')
            .map(|line| bpe.encode_ordinary(line).len())
            .collect(),
        (_, true) => text
            .split('\0')
            .map(|piece| bpe.encode_ordinary(piece).len())
            .collect(),
        _ => vec![bpe.encode_ordinary(&text).len()],
    };

    let mut out = String::new();
    for count in counted {
        out += &format!("{count}\n");
    }
    print!("{out}");

    Ok(())
}
