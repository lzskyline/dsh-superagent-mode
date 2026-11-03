#!/usr/bin/env node
/**
 * Derives `cordis.patch.yml`: two DSH agent presets that give a session the
 * dsh-superagent operating discipline without any of its deployment machinery.
 *
 *   superagent         - the orchestrator: reads a request, scopes it, dispatches
 *                        subagents, verifies, reports once.
 *   superagent-worker  - the worker a dispatched subagent runs under.
 *
 * Both are derived from the SHIPPED `standard` preset of the DSH being installed
 * into, so they stay in step with that version instead of drifting from a
 * hand-copied plugin list. This is why the generated patch must be rebuilt per
 * machine: never copy it between DSH versions.
 *
 * CLI:
 *   node build.mjs <default-config.yml> [out-file]
 *
 * Produce <default-config.yml> with:
 *   set DSH_HOME=<some scratch dir>
 *   dsh web --dump-default-config > default-config.yml
 *
 * Or let install.mjs do the whole job:  node install.mjs --profile <name>
 *
 * Every anchor below is asserted. If a future DSH release renames or reshapes
 * something, this fails loudly instead of emitting a preset that boots wrong.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

/** Directory holding the markdown prompt sources. */
export const PROMPTS_DIR = join(here, 'prompts')

/** Prompt files for the orchestrator preset, in the order they are concatenated. */
export const ORCHESTRATOR_PROMPT = ['orchestrator.md', 'dispatch.md', 'delivery.md', 'replies.md']

/** Prompt files for the worker preset. */
export const WORKER_PROMPT = ['work.md', 'delivery.md']

/** Preset ids this patch installs; used for idempotence checks and uninstall. */
export const PRESET_IDS = ['superagent', 'superagent-worker']

/** Patch row ids this patch inserts. */
export const ROW_IDS = ['preset-superagent', 'preset-superagent-worker']

export function promptStack(files, promptsDir = PROMPTS_DIR) {
  return files
    .map(name => readFileSync(join(promptsDir, name), 'utf8').trim())
    .filter(Boolean)
    .join('\n\n---\n\n')
}

/** Extracts the shipped `preset-standard` entry as a block of lines. */
export function extractStandard(text) {
  const lines = text.split(/\r?\n/)
  const start = lines.findIndex(line => /^- id: preset-standard\s*$/.test(line))
  if (start < 0) throw new Error('anchor not found: "- id: preset-standard" (is this really a dumped default config?)')
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^- /.test(lines[i])) { end = i; break }
  }
  return lines.slice(start, end)
}

/**
 * Turns a multi-line prompt into YAML block-scalar lines at `indent`.
 * Content must be indented MORE than the key, otherwise the first less-indented
 * line (e.g. "- **Act**: ...") ends the scalar and is parsed as YAML of its own.
 */
function blockScalar(key, indent, text) {
  const pad = ' '.repeat(indent)
  const bodyPad = ' '.repeat(indent + 2)
  const body = text.split(/\r?\n/).map(line => (line.trim() === '' ? '' : bodyPad + line))
  return [`${pad}${key}: |`, ...body]
}

export function derive(block, { entryId, presetId, order, label, description, prompt, subagentPreset }) {
  const out = []
  let seenEntryId = false
  let seenConfigId = false
  let seenOrder = false
  let seenPersona = false
  let seenSubagent = false

  for (const line of block) {
    // 1. the patch row id
    if (!seenEntryId && /^- id: preset-standard\s*$/.test(line)) {
      out.push(`- id: ${entryId}`)
      seenEntryId = true
      continue
    }

    // 2. the preset id inside config, plus the picker label
    if (!seenConfigId && /^ {4}id: standard\s*$/.test(line)) {
      out.push(`    id: ${presetId}`)
      out.push(`    name: ${JSON.stringify(label)}`)
      out.push(`    description: ${JSON.stringify(description)}`)
      seenConfigId = true
      continue
    }

    // 3. rewrite the shipped order in place instead of adding a second one
    if (!seenOrder && /^ {4}order: \d+\s*$/.test(line)) {
      out.push(`    order: ${order}`)
      seenOrder = true
      continue
    }

    // 4. replace the persona prefix with our prompt stack
    if (!seenPersona && /^ {10}prefix: You are a coding agent powered by the \{\{model\}\} model\.\s*$/.test(line)) {
      out.push(...blockScalar('prefix', 10, prompt))
      seenPersona = true
      continue
    }

    // 5. point dispatched subagents at the worker preset
    if (!seenSubagent && /^ {14}toolName: subagent\s*$/.test(line)) {
      out.push(line)
      out.push(`              agentPreset: ${subagentPreset}`)
      seenSubagent = true
      continue
    }

    out.push(line)
  }

  const missing = [
    ['row id', seenEntryId],
    ['config id', seenConfigId],
    ['config order', seenOrder],
    ['persona prefix', seenPersona],
    ['subagent tool', seenSubagent],
  ].filter(([, ok]) => !ok).map(([name]) => name)
  if (missing.length) throw new Error(`anchor(s) not found in the shipped standard preset: ${missing.join(', ')}`)

  return out
}

/**
 * Builds the patch YAML from a dumped shipped default config.
 * Returns the file contents plus line counts; writes nothing.
 */
export function buildPatch(defaultConfigText, { promptsDir = PROMPTS_DIR } = {}) {
  const standard = extractStandard(defaultConfigText)

  const orchestrator = derive(standard, {
    entryId: 'preset-superagent',
    presetId: 'superagent',
    order: 5,
    label: 'Superagent',
    description: 'Orchestrator mode: scopes the request, dispatches subagents, verifies their claims, reports once. Does not implement inline.',
    prompt: promptStack(ORCHESTRATOR_PROMPT, promptsDir),
    subagentPreset: 'superagent-worker',
  })

  const worker = derive(standard, {
    entryId: 'preset-superagent-worker',
    presetId: 'superagent-worker',
    order: 6,
    label: 'Superagent Worker',
    description: 'Worker mode for subagents dispatched by Superagent. Not for manual selection.',
    prompt: promptStack(WORKER_PROMPT, promptsDir),
    subagentPreset: 'standard',
  })

  const header = [
    '# superagent mode - generated by build.mjs. Do not edit by hand;',
    '# edit prompts/*.md and re-run the build. Derived from the shipped `standard` preset.',
    '# Remove this block (or run `node install.mjs --uninstall`) to uninstall completely.',
  ]

  const yaml = [
    ...header,
    '- insert:',
    // The rows are the value of `insert`, so they sit one level deeper than the
    // `- insert:` line. Otherwise they parse as sibling id-targeted patches and
    // the loader reports `entry "preset-superagent" not found`.
    ...[...orchestrator, ...worker].map(line => (line === '' ? '' : '    ' + line)),
  ].join('\n') + '\n'

  return { yaml, lines: { orchestrator: orchestrator.length, worker: worker.length } }
}

// ---------------------------------------------------------------- CLI ----
const invokedDirectly = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (invokedDirectly) {
  const [, , configPath, outArg] = process.argv
  if (!configPath) {
    console.error('usage: node build.mjs <default-config.yml> [out-file]')
    process.exit(2)
  }
  const outPath = outArg ?? join(here, 'cordis.patch.yml')
  const { yaml, lines } = buildPatch(readFileSync(configPath, 'utf8'))
  writeFileSync(outPath, yaml, 'utf8')
  console.log(`wrote ${outPath} (${yaml.length} bytes)`)
  console.log(`  preset-superagent:        ${lines.orchestrator} lines`)
  console.log(`  preset-superagent-worker: ${lines.worker} lines`)
}