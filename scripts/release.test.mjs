// Release scripts: run with `node --test scripts/*.test.mjs`.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { FLOOR, commitBump, latestTag, nextVersion } from './next-version.mjs'
import { BUNDLE_ID, caskVersion, renderCask } from './render-cask.mjs'

const sha = 'a'.repeat(64)

test('latestTag compares numerically and ignores tags that are not releases', () => {
  assert.equal(latestTag(['v0.9.0', 'v0.10.0', 'v0.2.5', '']), '0.10.0')
  assert.equal(latestTag(['v1', 'v2.0.0-beta.1', 'nightly', 'x1.0.0', 'v0.1.0']), '0.1.0')
  assert.equal(latestTag([]), undefined)
})

test('commitBump reads conventional commits', () => {
  assert.equal(commitBump('feat: add a thing'), 'feature')
  assert.equal(commitBump('feat(menubar): add a thing'), 'feature')
  assert.equal(commitBump('fix(ping): a bug'), 'patch')
  assert.equal(commitBump('Plain sentence commit'), 'patch')
  assert.equal(commitBump('feature flags cleanup'), 'patch')
  assert.equal(commitBump('feat!: drop it'), 'breaking')
  assert.equal(commitBump('refactor(api)!: drop it'), 'breaking')
  assert.equal(commitBump('fix: x\n\nBREAKING CHANGE: y'), 'breaking')
  assert.equal(commitBump('fix: mention BREAKING CHANGE: in passing'), 'patch')
})

test('nextVersion takes the largest bump and never goes below the floor', () => {
  const next = (latest, messages, floor = '0.1.0') => nextVersion({ latest, messages, floor })
  assert.equal(next('0.1.0', []), null)
  assert.equal(next('0.1.0', ['fix: a', 'docs: b']), '0.1.1')
  assert.equal(next('0.1.4', ['fix: a', 'feat: b']), '0.2.0')
  assert.equal(next('1.2.3', ['feat: a', 'fix!: b']), '2.0.0')
  assert.equal(next('0.3.1', ['feat!: a']), '0.4.0')
  assert.equal(next('0.3.1', ['fix: a'], '1.0.0'), '1.0.0')
  assert.equal(next(undefined, ['fix: a']), '0.1.0')
  assert.equal(nextVersion({ latest: undefined, messages: ['feat: first'] }), FLOOR)
})

test('renderCask pins the version and checksum', () => {
  const cask = renderCask({ version: '1.2.3', sha256: sha })
  assert.equal(caskVersion(cask), '1.2.3')
  assert.match(cask, new RegExp(`sha256 "${sha}"`))
  assert.match(cask, /NetworkMonitor-#\{version\}\.zip/)
  assert.match(cask, /postflight_steps do/)
  assert.throws(() => renderCask({ version: '1.2', sha256: sha }))
  assert.throws(() => renderCask({ version: '1.2.3', sha256: 'nope' }))
})

test('the cask quits and zaps the app build.sh builds', () => {
  const build = readFileSync(fileURLToPath(new URL('../build.sh', import.meta.url)), 'utf8')
  assert.equal(/<key>CFBundleIdentifier<\/key><string>([^<]+)</.exec(build)[1], BUNDLE_ID)
  const cask = renderCask({ version: '1.2.3', sha256: sha })
  assert.match(cask, new RegExp(`uninstall quit: "${BUNDLE_ID}"`))
  assert.match(cask, new RegExp(`"~/Library/Containers/${BUNDLE_ID}"`))
})

test('render-cask never moves the cask back to an older version', () => {
  const script = fileURLToPath(new URL('./render-cask.mjs', import.meta.url))
  const file = join(mkdtempSync(join(tmpdir(), 'network-monitor-cask-')), 'network-monitor.rb')
  execFileSync('node', [script, file, '1.2.3', sha])
  assert.equal(caskVersion(readFileSync(file, 'utf8')), '1.2.3')
  assert.throws(() => execFileSync('node', [script, file, '1.2.2', sha], { stdio: 'pipe' }))
  execFileSync('node', [script, file, '1.3.0', sha])
  assert.equal(caskVersion(readFileSync(file, 'utf8')), '1.3.0')
})
