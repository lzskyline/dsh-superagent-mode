#!/usr/bin/env node
/**
 * Regenerates cordis.patch.yml from the `standard` preset shipped by the DSH
 * installed on THIS machine.
 *
 * Run this before `dsh plugin --profile <name> add`, and again after every DSH
 * upgrade: the preset's plugin list is taken from the shipped config, so a
 * stale patch quietly loses whatever plugins the new version added.
 *
 *   node prepare.mjs                 # auto-detect dsh
 *   node prepare.mjs --dsh <path>    # explicit dsh executable
 *   node prepare.mjs --template web  # which shipped profile to dump (default: web)
 *
 * Writes cordis.patch.yml next to this file. Never touches your real DSH_HOME:
 * the dump runs against a throwaway home under the OS temp directory.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, openSync, closeSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { dirname, join, resolve, delimiter } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPatch } from './build.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const isWindows = process.platform === 'win32'

function argValue(flag) {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

/** Candidate locations for the dsh executable, most explicit first. */
function findDsh() {
  const explicit = argValue('--dsh') ?? process.env.DSH_BIN
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`dsh not found at ${explicit}`)
    return explicit
  }

  // 1. `dsh` on PATH
  const pathDirs = (process.env.PATH ?? '').split(delimiter).filter(Boolean)
  const names = isWindows ? ['dsh.cmd', 'dsh.exe', 'dsh'] : ['dsh']
  for (const dir of pathDirs) {
    for (const name of names) {
      const candidate = join(dir, name)
      if (existsSync(candidate)) return candidate
    }
  }

  // 2. the bundled CLI that ships with the desktop app
  const bundled = isWindows
    ? [
        join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Programs', 'DeepSeek Harness', 'resources', 'runtime', 'cli', 'bin', 'dsh.cmd'),
        join(process.env.ProgramFiles ?? 'C:\\Program Files', 'DeepSeek Harness', 'resources', 'runtime', 'cli', 'bin', 'dsh.cmd'),
      ]
    : [
        '/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh',
        join(homedir(), 'Applications', 'DeepSeek Harness.app', 'Contents', 'Resources', 'runtime', 'cli', 'bin', 'dsh'),
        '/usr/local/bin/dsh',
        '/opt/deepseek-harness/resources/runtime/cli/bin/dsh',
      ]
  for (const candidate of bundled) if (existsSync(candidate)) return candidate

  throw new Error(
    'Could not find the `dsh` executable.\n'
    + '  Point at it explicitly:  node prepare.mjs --dsh "<path to dsh>"\n'
    + '  or put it on PATH / set DSH_BIN.',
  )
}

/**
 * Runs a command with stdout+stderr redirected to a FILE rather than a pipe.
 * Piped stdio is forbidden in some confined environments, and file redirection
 * behaves identically on every platform, so this is the portable choice.
 */
function runCaptured(command, args, env) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-superagent-dump-'))
  const log = join(dir, 'out.log')
  const fd = openSync(log, 'w')
  try {
    // A .cmd shim can only be launched through cmd.exe, and its path may contain
    // spaces (e.g. "...\Programs\DeepSeek Harness\..."), so the executable must be
    // quoted when a shell is involved. Everywhere else argv is passed directly.
    const useShell = isWindows && /\.(cmd|bat)$/i.test(command)
    const result = useShell
      ? spawnSync(`"${command}" ${args.join(' ')}`, { stdio: ['ignore', fd, fd], env, windowsHide: true, shell: true })
      : spawnSync(command, args, { stdio: ['ignore', fd, fd], env, windowsHide: true })
    closeSync(fd)
    return { status: result.status, stdout: readFileSync(log, 'utf8') }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const dsh = findDsh()
const template = argValue('--template') ?? 'web'

// A throwaway DSH_HOME: dumping the shipped config must never read or write the
// operator's real profile directory.
const scratch = mkdtempSync(join(tmpdir(), 'dsh-superagent-home-'))
let dumped
try {
  const log = runCaptured(dsh, [`--profile`, template, '--dump-default-config'], {
    ...process.env,
    DSH_HOME: scratch,
  })
  dumped = log.stdout
  if (log.status !== 0 || !/^- id: preset-standard\s*$/m.test(dumped)) {
    throw new Error(
      `\`${dsh} --profile ${template} --dump-default-config\` did not produce a shipped config.\n`
      + `exit=${log.status}\n--- output ---\n${dumped.slice(0, 4000)}`,
    )
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}

const { yaml, lines } = buildPatch(dumped)
const outPath = join(here, 'cordis.patch.yml')
writeFileSync(outPath, yaml, 'utf8')

console.log(`dsh            : ${dsh}`)
console.log(`template       : ${template}`)
console.log(`wrote          : ${outPath} (${yaml.length} bytes)`)
console.log(`  preset-superagent        ${lines.orchestrator} lines`)
console.log(`  preset-superagent-worker ${lines.worker} lines`)
console.log('')
console.log('Next: install it into a profile with')
console.log(`  "${dsh}" plugin --profile <profile> add "link:${resolve(here)}"`)
console.log('then restart the DeepSeek Harness app.')