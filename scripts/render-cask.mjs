// Writes Network Monitor's Homebrew cask for a release, pinned to its version and zip checksum.
// usage: node scripts/render-cask.mjs <cask.rb> <version> <sha256>
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compareVersions } from './next-version.mjs'

/** Must match CFBundleIdentifier in build.sh; the App Sandbox keeps the app's settings in a container named after it. */
export const BUNDLE_ID = 'local.networkmonitor'

export function renderCask({ version, sha256 }) {
  compareVersions(version, version) // throws unless it's X.Y.Z
  if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error(`Not a sha256: ${sha256}`)
  return `cask "network-monitor" do
  version "${version}"
  sha256 "${sha256}"

  url "https://github.com/devbymak/network-monitor/releases/download/v#{version}/NetworkMonitor-#{version}.zip"
  name "Network Monitor"
  desc "Menu bar network speed, data usage and ping monitor"
  homepage "https://github.com/devbymak/network-monitor"

  depends_on arch: :arm64
  depends_on macos: :ventura

  app "Network Monitor.app"

  postflight_steps do
    # Network Monitor is distributed outside Apple's notarization service.
    run "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "{{appdir}}/Network Monitor.app"]
  end

  # Quitting saves today's usage before the app is removed.
  uninstall quit: "${BUNDLE_ID}"

  zap trash: [
    "~/Library/Application Scripts/${BUNDLE_ID}",
    "~/Library/Containers/${BUNDLE_ID}",
  ]
end
`
}

/** The version a cask is pinned to; null when there's no cask yet. */
export function caskVersion(text) {
  return /^\s*version "(\d+\.\d+\.\d+)"/m.exec(text)?.[1] ?? null
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file, version, sha256] = process.argv.slice(2)
  const current = existsSync(file) ? caskVersion(readFileSync(file, 'utf8')) : null
  // Re-running an old release's job must not move Homebrew users back.
  if (current && compareVersions(version, current) < 0) throw new Error(`The cask is already at ${current}, newer than ${version}`)
  writeFileSync(file, renderCask({ version, sha256 }))
}
