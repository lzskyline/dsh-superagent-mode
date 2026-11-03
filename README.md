# dsh-superagent-mode

[English](README.md) | [简体中文](README.zh-CN.md)

A **DSH bundle** that gives a session the operating discipline of
[dsh-superagent](https://github.com/deepseek-ai/dsh-superagent-prototype) without
any of its deployment machinery: no GitHub, no Feishu, no bot, no external
service, no background process. You describe a request in the chat and the
session runs it the superagent way — scope it, dispatch subagents, verify their
claims, report once.

It installs through DSH's own plugin mechanism, so it is added and removed with
`dsh plugin` like any other bundle.

## What it installs

Two agent presets, declared in this package's `cordis.patch.yml`:

| Preset | Role |
| --- | --- |
| `Superagent` | The orchestrator. Reads the request, decides act / ask one question / stop at the decision, keeps scope minimal, dispatches subagents, verifies what comes back, reports once in a fixed shape. |
| `Superagent Worker` | The worker a dispatched subagent runs under. Acts on the brief, verifies its own change, escalates a real blocker immediately, reports with evidence. |

Both are derived from the `standard` preset shipped by the DSH you install into,
so they carry that version's tools and its Windows/non-Windows shell guards. The
only differences are the persona prompt and the subagent wiring
(`superagent` dispatches into `superagent-worker`; a worker's own subagents fall
back to `standard`).

## What it does not touch

- No environment variables, no `PATH`, no git configuration.
- No files outside your DSH profile directory.
- No process. It loads inside your normal DSH app.

It adds two entries to the preset picker. Everything else is opt-in per session.

## Install

The generated `cordis.patch.yml` depends on the shipped `standard` preset of a
specific DSH version. Four ways in, easiest first — they all land in the same
place.

### Easiest: hand it to your AI agent

If you already have a DSH session open, or any AI coding agent with shell access
on the target machine, paste this:

````text
Install https://github.com/lzskyline/dsh-superagent-mode as a plugin in my DSH
profile, using the method its README recommends. When it is done, tell me to
restart and which preset to pick.
````

### From this repository (manual)

The repository is public, so no credentials are needed:

```powershell
dsh plugin --profile <profile> add "github:lzskyline/dsh-superagent-mode"
```

pnpm pins the dependency to a specific commit together with an integrity hash, so
the installed content cannot drift. It installs the committed patch, which was
generated for one DSH version; on a machine with a different version use the
folder form below.

### From a packed tarball (offline, or the same DSH version)

Install the packed tarball directly — it already contains a generated patch:

```powershell
dsh plugin --profile <profile> add "C:\path\to\dsh-superagent-mode-<version>.tgz"
```

### Any other DSH version (or after upgrading DSH)

Copy this whole folder to the target machine, regenerate the patch against that
machine's DSH, then install it from the folder:

```powershell
cd dsh-superagent-mode
node prepare.mjs                                   # regenerates cordis.patch.yml
dsh plugin --profile <profile> add "link:$PWD"     # $PWD = this folder
```

`prepare.mjs` finds the `dsh` executable on its own (PATH, then the path bundled
with the desktop app). If it cannot, pass `--dsh "<path to dsh>"`. It dumps the
shipped config against a throwaway `DSH_HOME` under the OS temp directory, so it
never reads or writes the target machine's real profiles.

`link:` keeps the package where it is, so editing `prompts/*.md` and re-running
`prepare.mjs` changes what the app loads on the next restart. Use the tarball
form if the folder will be moved or deleted.

Then **restart the DeepSeek Harness app**, open a session, and pick
**Superagent** in the preset picker.

### Notes per platform

- **Windows**: `dsh` is `%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd`.
- **macOS / Linux**: the desktop app ships the same CLI under its resources
  directory; `prepare.mjs` probes the usual locations. From a terminal install,
  plain `dsh` is on `PATH`.
- The launcher refuses to *boot or dump* a profile literally named `desktop`
  (`profile "desktop" is managed exclusively by the Electron application`), but
  `dsh plugin` is not guarded — it only forwards to pnpm — so plugin add/remove
  works for that profile too. The desktop app additionally offers its own
  Plugin Manager UI.

## Uninstall

```powershell
dsh plugin --profile <profile> remove dsh-superagent-mode
```

That removes the dependency and the `dsh.profile.bundles` entry. Restart; the two
presets disappear and nothing else was changed.

## Upgrade DSH

The preset's plugin list comes from the shipped config, so a stale patch quietly
loses whatever plugins the new version added. After upgrading DSH:

```powershell
cd dsh-superagent-mode
node prepare.mjs
```

How the regenerated patch reaches the app depends on how it was installed:

```powershell
# GitHub install: the dependency is pinned to a commit, so re-resolve the pin
dsh plugin --profile <profile> add "github:lzskyline/dsh-superagent-mode"

# tarball install: pack and re-add
npm pack
dsh plugin --profile <profile> add "<new tarball>"

# folder (link:) install: nothing to re-add, the next restart picks it up
```

`dsh plugin install` alone is not enough after a change: it keeps the existing
resolution and will not move a pinned commit.

## Troubleshooting

### The presets disappeared after a restart

The app logs `skipping profile bundle "dsh-superagent-mode"` and starts normally
without the two presets. Something removed the installed copy from the profile's
`node_modules`.

`dsh plugin install` does **not** repair this: pnpm reports `Already up to date`
and the command exits 1. Re-run `add` instead:

```powershell
dsh plugin --profile <profile> add "github:lzskyline/dsh-superagent-mode"
```

### Changing where the package comes from

Always `remove` first, then `add`. Swapping the dependency spec (`link:` →
`file:` tarball → `github:`) without removing it leaves the old resolution in
`pnpm-lock.yaml` and a dangling symlink in `node_modules`; the next install then
fails with `cannot resolve profile bundle`.

```powershell
dsh plugin --profile <profile> remove dsh-superagent-mode
dsh plugin --profile <profile> add "github:lzskyline/dsh-superagent-mode"
```

### The plugin and the network

The bundle is loaded from the profile's `node_modules` and never fetches anything
by itself. Only `dsh plugin` operations and the app's own updater touch the
network. A missing installed copy is skipped, not re-downloaded.

## Editing the prompts

Do not edit `cordis.patch.yml` — it is generated. Edit `prompts/*.md`, then:

```powershell
node prepare.mjs
```

`prompts/README.md` documents where each prompt came from, what was deliberately
dropped from the original design, and the known gaps. Read it before changing
behaviour.

## How the bundle mechanism works

`package.json` declares:

```json
"dsh": {
  "bundle": { "patch": "./cordis.patch.yml" },
  "manifestVersion": 1
}
```

`dsh plugin --profile <name> add <spec>` forwards to pnpm inside the profile
directory. DSH then does two things automatically:

1. adds the package as a profile dependency, and
2. appends the package name to `dsh.profile.bundles` in the profile's
   `package.json`,

after which the bundle's `cordis.patch.yml` is composed into the profile. No
hand-editing of any profile file.

## Files

```
package.json        bundle manifest (dsh.bundle.patch + manifestVersion)
prepare.mjs         dumps this machine's shipped config and regenerates the patch
build.mjs           the derivation logic: standard preset -> our two presets
cordis.patch.yml    generated; what the bundle actually contributes
prompts/*.md        the prompt stack, one file per concern
```

`build.mjs` asserts every anchor it depends on and fails loudly rather than
emitting a preset that boots wrong, so a DSH release that reshapes `standard`
breaks the build instead of the app.

## Verification performed

- `prepare.mjs` regenerates the patch against a throwaway `DSH_HOME`.
- Install through `dsh plugin --profile <p> add` (both `link:` and tarball forms)
  adds the dependency and the `dsh.profile.bundles` entry automatically.
- `dsh --profile <p> --dump-config` composes with both presets, exit 0, no
  diagnostics; all five prompt files present; `agentPreset: superagent-worker`
  wired.
- `dsh plugin --profile <p> remove` removes both the dependency and the bundle
  entry, and the presets disappear from the composed config.
- The profile boots (`dsh web --port 0 --no-open`) and serves the UI with no
  plugin or preset errors in the startup log.

## Known gaps

These are inherent to dropping dsh-superagent's host machinery, not bugs:

- **No authorization gate.** The original capped work with a Mandate the host
  enforced. Here the stop conditions are prompt-level discipline only: the model
  is asked to stop at product/UX decisions, public-interface changes,
  destructive operations and missing credentials — but nothing enforces it.
- **No ticket ledger.** There is no durable record of work across turns and no
  panel. The report in the chat is the record.
- **No subscription resume.** A subagent is one-shot and does not see the chat;
  new context means the orchestrator re-briefs.