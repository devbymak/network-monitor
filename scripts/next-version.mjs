// Works out the next release version: the latest vX.Y.Z tag, bumped by the commits since it.
// Prints `version=X.Y.Z` to release, or nothing when there are no new commits.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** The lowest version a release may have, and the first release's. Raise it to jump ahead, such as to 1.0.0. */
export const FLOOR = '0.2.0'

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/

export function parseVersion(text) {
  const match = SEMVER.exec(text)
  if (!match) throw new Error(`Not a version: ${text}`)
  return match.slice(1).map(Number)
}

export function compareVersions(a, b) {
  const [x, y] = [parseVersion(a), parseVersion(b)]
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

/** The highest of the vX.Y.Z tags; anything else (v1, v2.0.0-beta, nightly) is not a release. */
export function latestTag(tags) {
  return tags
    .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag))
    .map((tag) => tag.slice(1))
    .sort(compareVersions)
    .at(-1)
}

/** Conventional commits: `feat` is a feature, `type!:` or a BREAKING CHANGE footer is breaking, the rest are patches. */
export function commitBump(message) {
  if (/^\w+(\([^)]*\))?!:/.test(message) || /^BREAKING[ -]CHANGE:/m.test(message)) return 'breaking'
  if (/^feat(\([^)]*\))?:/.test(message)) return 'feature'
  return 'patch'
}

/** Before 1.0 breaking changes and features both bump the minor; going to 1.0.0 is a choice, made by raising FLOOR. */
export function nextVersion({ latest, messages, floor = FLOOR }) {
  if (!messages.length) return null
  if (!latest) return floor
  const bumps = messages.map(commitBump)
  const [major, minor, patch] = parseVersion(latest)
  let next
  if (bumps.includes('breaking') && major > 0) next = `${major + 1}.0.0`
  else if (bumps.includes('breaking') || bumps.includes('feature')) next = `${major}.${minor + 1}.0`
  else next = `${major}.${minor}.${patch + 1}`
  return compareVersions(floor, next) > 0 ? floor : next
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  parseVersion(FLOOR)
  const latest = latestTag(git('tag', '--list', 'v*').split('\n'))
  // Merge commits only move changes between branches; the commits they bring in are what counts.
  const range = latest ? [`v${latest}..HEAD`] : ['HEAD']
  const messages = git('log', '--no-merges', '--format=%B%x00', ...range)
    .split('\0')
    .map((message) => message.trim())
    .filter(Boolean)
  const version = nextVersion({ latest, messages })
  if (version) console.log(`version=${version}`)
}
