/*
 * Upkeep for the two repositories this project lives in.
 *
 * Both of them have files that are generated from other files, and nothing
 * warns when a generated file falls behind. Every command here either makes
 * one of those, or, with --check, says plainly that it is out of date, which
 * is the part a person cannot do by eye.
 *
 * Every command takes --root, so the same binary serves both repositories:
 *   tools css    --root ../website        the joined stylesheet
 *   tools header --root .                 the sixteen README headers
 *   tools tokens                          what a piece of text costs
 *   tools preview --root ../website        the site, locally
 *   tools sync   --root . <vencord>        the plugin into a Vencord checkout
 */

mod cli;
mod css;
mod header;
mod preview;
mod sync;
mod tokens;

use cli::Cli;
use std::process::ExitCode;

const USAGE: &str = "\
Upkeep for AI Translate and zolatau.com.

  tools <command> [--root <path>] [options]

Commands
  css       Join src/css/*.css into public/assets/css/site.css
  header    Write the sixteen language links at the top of every README
  tokens    Count o200k tokens, the way the models count them
  preview   Serve the site's public/ folder on this computer
  sync      Copy the plugin into a Vencord checkout

--root is the repository a command works on, the current folder by default.
Any command takes --help for what it does and what it accepts.
";

fn main() -> ExitCode {
    let mut args: Vec<String> = std::env::args().skip(1).collect();

    if args.is_empty() || args[0] == "--help" || args[0] == "-h" || args[0] == "help" {
        print!("{USAGE}");
        return ExitCode::SUCCESS;
    }

    if args[0] == "--version" || args[0] == "-V" {
        println!("tools {}", env!("CARGO_PKG_VERSION"));
        return ExitCode::SUCCESS;
    }

    let command = args.remove(0);
    let mut cli = Cli::new(args);

    // --help after a command prints that command's own help and stops.
    if cli.flag("--help") || cli.flag("-h") {
        match command.as_str() {
            "css" => print!("{}", css::HELP),
            "header" => print!("{}", header::HELP),
            "tokens" => print!("{}", tokens::HELP),
            "preview" => print!("{}", preview::HELP),
            "sync" => print!("{}", sync::HELP),
            _ => {
                eprintln!("tools: there is no command called \"{command}\".");
                return ExitCode::FAILURE;
            }
        }
        return ExitCode::SUCCESS;
    }

    let done = match command.as_str() {
        "css" => css::run(&mut cli),
        "header" => header::run(&mut cli),
        "tokens" => tokens::run(&mut cli),
        "preview" => preview::run(&mut cli),
        "sync" => sync::run(&mut cli),
        other => Err(format!(
            "there is no command called \"{other}\". Run tools --help for the list."
        )),
    };

    match done {
        Ok(()) => ExitCode::SUCCESS,
        Err(why) => {
            eprintln!("tools: {why}");
            ExitCode::FAILURE
        }
    }
}
