// Reading the command line. Small on purpose: five commands, a handful of
// flags, and an unknown one named back rather than ignored.

use std::path::PathBuf;

pub struct Cli {
    args: Vec<String>,
}

impl Cli {
    pub fn new(args: Vec<String>) -> Self {
        Cli { args }
    }

    /// True when the flag was given, and takes it out of the list.
    pub fn flag(&mut self, name: &str) -> bool {
        match self.args.iter().position(|a| a == name) {
            Some(at) => {
                self.args.remove(at);
                true
            }
            None => false,
        }
    }

    /// The value of `--name value` or `--name=value`, taken out of the list.
    pub fn value(&mut self, name: &str) -> Result<Option<String>, String> {
        let with_equals = format!("{name}=");

        if let Some(at) = self.args.iter().position(|a| a.starts_with(&with_equals)) {
            let found = self.args.remove(at);
            let value = found[with_equals.len()..].to_string();
            if value.is_empty() {
                return Err(format!("{name} was given nothing after it."));
            }
            return Ok(Some(value));
        }

        match self.args.iter().position(|a| a == name) {
            Some(at) => {
                self.args.remove(at);
                if at >= self.args.len() || self.args[at].starts_with('-') {
                    return Err(format!("{name} needs a value after it."));
                }
                Ok(Some(self.args.remove(at)))
            }
            None => Ok(None),
        }
    }

    /// The repository a command works on. The current folder unless told otherwise.
    pub fn root(&mut self) -> Result<PathBuf, String> {
        Ok(self
            .value("--root")?
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(".")))
    }

    /// Everything left that is not a flag, in the order it was written.
    pub fn rest(&mut self) -> Vec<String> {
        let mut left = Vec::new();
        let mut kept = Vec::new();
        for arg in self.args.drain(..) {
            if arg.starts_with('-') {
                kept.push(arg);
            } else {
                left.push(arg);
            }
        }
        self.args = kept;
        left
    }

    /// Anything still here was not understood, so say which one.
    pub fn nothing_left(&self) -> Result<(), String> {
        match self.args.first() {
            Some(unknown) => Err(format!(
                "\"{unknown}\" is not one of this command's options. Run tools --help."
            )),
            None => Ok(()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cli(args: &[&str]) -> Cli {
        Cli::new(args.iter().map(|a| a.to_string()).collect())
    }

    #[test]
    fn a_flag_is_found_once_and_taken_out() {
        let mut args = cli(&["--check"]);
        assert!(args.flag("--check"));
        assert!(!args.flag("--check"));
        assert!(args.nothing_left().is_ok());
    }

    #[test]
    fn a_value_is_read_either_way_round() {
        assert_eq!(
            cli(&["--root", "../website"]).root().unwrap().as_os_str(),
            "../website"
        );
        assert_eq!(
            cli(&["--root=../website"]).root().unwrap().as_os_str(),
            "../website"
        );
        assert_eq!(cli(&[]).root().unwrap().as_os_str(), ".");
    }

    #[test]
    fn a_value_with_nothing_after_it_is_refused() {
        assert!(cli(&["--root"]).value("--root").is_err());
        // The next flag is not swallowed as the value.
        assert!(cli(&["--root", "--check"]).value("--root").is_err());
        assert!(cli(&["--root="]).value("--root").is_err());
    }

    #[test]
    fn what_is_left_is_split_into_words_and_unknown_flags() {
        let mut args = cli(&["one", "--odd", "two"]);
        assert_eq!(args.rest(), vec!["one".to_string(), "two".to_string()]);
        assert!(args.nothing_left().is_err());
    }
}
