---
name: release
description: How a change reaches AI Translate's users: the version number, main and release, the testing channel, GitHub releases, the build site's carry-over and CHANGELOG.md. Load before raising the version, moving release, writing a release's changelog section, or touching build/github.sh, the workflows or the installers.
---

The full text behind the How a change reaches users section of CLAUDE.md.

## How a change reaches users

**Raising the version is part of moving `release`, not of a commit.** The
number lives in `core/version.ts` and nowhere else: three numbers and a letter
for the stage, `0.2.1a` today. The third number counts fixes, the second counts
anything new and puts the third back to zero, nine is the ceiling
for both, and `1.0.0` is where the letter goes away and the beta ends. The
robot publishes a new build whenever Vencord changes too, and those are not new
versions of the plugin, which is why no build ever touches this.

`main` is the working branch, and it is where work is committed and pushed, in a
cloud session too: no `claude/...` branch of its own. `release` is what users
get. The robot in `.github/workflows/build.yml` fetches `build/github.sh`
**from `release`** every hour, builds Vencord with the plugin inside, and
publishes the result on `builds.zolatau.com`; installed copies pick it up on
their next check. Moving `release` is a deliberate act, never a side effect of
a commit.

The same run also makes a **GitHub release**, tagged `v` and the version, with
the four files Discord loads and the userscript attached, and marked a
prerelease while the version still carries a letter. It is made only when the
version has changed: a build happens whenever Vencord moves, and those would
otherwise fill the releases page hourly. The site is where the install command
and the updater take their files from; the releases are where the versions are
kept. `gh` is told the repository outright in those calls, because the workflow
runs the script with no checkout and so has no git remote to infer it from. A
testing build never makes one: its number is the one the last release carries,
so the release would say nothing.

`main` is also the **testing channel**. The same hourly run builds it into
`/testing/` on that same site, so a change can be tried without `release`
moving at all. `AIT_CHANNEL=testing` in front of either install command
installs those builds; an installed copy says which channel it follows in a
line under the update button in the settings, and switches back there. Nothing
advertises it: not the plugin's page, not the README. The one place it is
written down is the page the robot itself generates on `builds.zolatau.com`.
So every push to `main` reaches whoever is on that channel within the hour.

The whole site is replaced on every deploy, which is why the script carries
over the files of whichever channel it did not rebuild. **If those cannot be
fetched, nothing is published at all.** An hour longer on the build that is
already out costs nobody anything; a channel that has lost its files breaks
every copy that follows it.

One thing not to tidy: `@namespace` in the userscript header still points at a
GitLab address. Userscript managers identify a script by name and namespace
together, so changing it would orphan every installed copy.
