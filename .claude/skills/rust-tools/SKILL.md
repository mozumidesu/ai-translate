---
name: rust-tools
description: The tools/ Rust binary shared by AI Translate and the website: css, header, tokens, preview and sync, and how to build and test it. Load before using or changing tools/, or when the website's site.css or the sixteen README headers need rebuilding.
---

The full text behind the tools/ paragraph of CLAUDE.md.

### The Rust side

`tools/` is a binary of its own, the package `ai-translate-tools`, built as
`tools`. It is upkeep for both repositories, not part of the plugin: nothing
in the plugin imports it, and `tools sync` leaves it out of the copy into
Vencord. Built for `x86_64-pc-windows-msvc`:

```
cd tools
cargo build --release --target x86_64-pc-windows-msvc
cargo test                 # 23 checks on the parts that are easy to get wrong
```

Every command takes `--root <path>`, which is the repository it works on, so
the one binary serves this repository and the website's.

| Command | Does |
|---|---|
| `tools css --root ../website` | Joins `src/css/*.css` in the order of their names into `public/assets/css/site.css`, byte for byte. `--check` writes nothing and fails when the two disagree, naming the source file, line and column where they part. This is the one the website's CLAUDE.md asks for first |
| `tools header --root .` | Writes the row of sixteen language links at the top of all sixteen READMEs, each with its own language in bold and the paths at the right depth. Fixes the banner's path too, where there is a banner. `--check` fails and says which file is wrong. The prose is never touched |
| `tools tokens` | o200k counts, from `tiktoken-rs` with its own tables, so counting needs no network and nothing beside the project. `--lines` counts each line on its own, `--each` several texts at once |
| `tools preview --root ../website` | Serves the website's `public/` on `localhost:8787`. Not the Worker: no redirects, no `_headers`, nothing cached |
| `tools sync --root . <vencord>` | Copies the plugin into a Vencord checkout's `src/userplugins/aiTranslate`, leaving out `local/`, `.git/`, `.github/`, `test/`, `tools/`, `docs/` and `web/dist/`. Files whose bytes have not changed are left alone, so Vencord rebuilds only what moved. `--dry-run` says what would happen; `--prune` also deletes what the plugin no longer has |

`tools tokens` is what replaced `gpt-tokenizer` for `test/measure.mjs` and
`test/rules.mjs`. It counts the same: both scripts print the numbers they
printed before, line for line.

## Why the plugin is not Rust

- **The plugin is TypeScript and stays TypeScript.** It runs inside Discord's
  window and is bundled by Vencord's own esbuild, and it hooks into Discord
  internals: webpack module patches, React components, Flux stores, Vencord's
  settings API. Rust, WASM or a native sidecar have all been considered and
  rejected; the plugin's own work is 0.3–0.7 ms per translation against
  700–1500 ms of network, so there is nothing to win and the one-command
  install would be lost. Rust belongs in `tools/`, not here.
