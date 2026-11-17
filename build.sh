#!/bin/zsh
set -eu
cd "$(dirname "$0")"
# The release workflow passes the version; a local build takes the latest release tag.
version="${NETWORK_MONITOR_VERSION:-$(git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*' 2>/dev/null || echo v0.0.0)}"
version="${version#v}"
if [[ ! "$version" =~ '^[0-9]+\.[0-9]+\.[0-9]+$' ]]; then echo "Not a version: $version" >&2; exit 1; fi
# Start from an empty bundle so files dropped from the build never linger in it.
rm -rf 'Network Monitor.app'
mkdir -p 'Network Monitor.app/Contents/MacOS' 'Network Monitor.app/Contents/Resources' .build/app-icon.iconset
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" assets/app-icon.png --out ".build/app-icon.iconset/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips -z "$double" "$double" assets/app-icon.png --out ".build/app-icon.iconset/icon_${size}x${size}@2x.png" >/dev/null
done
mkdir -p .build/module-cache
cache_path="$(cd .build/module-cache && pwd -P)"
xcrun swift -module-cache-path "$cache_path" sources/icon.swift .build/app-icon.iconset 'Network Monitor.app/Contents/Resources/app-icon.icns'
xcrun swiftc -target arm64-apple-macosx13.0 -module-cache-path "$cache_path" -swift-version 5 -O -framework AppKit -framework SystemConfiguration -framework ServiceManagement -framework Network sources/traffic.swift sources/graph.swift sources/main.swift -o 'Network Monitor.app/Contents/MacOS/networkmonitor'
cat > 'Network Monitor.app/Contents/Info.plist' <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>networkmonitor</string>
<key>CFBundleIdentifier</key><string>local.networkmonitor</string>
<key>CFBundleName</key><string>Network Monitor</string>
<key>CFBundleDisplayName</key><string>Network Monitor</string>
<key>CFBundleIconFile</key><string>app-icon.icns</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleVersion</key><string>$version</string>
<key>CFBundleShortVersionString</key><string>$version</string>
<key>LSMinimumSystemVersion</key><string>13.0</string>
<key>LSUIElement</key><true/>
</dict></plist>
PLIST
# App Sandbox with outgoing connections only: no file access outside its own container, no incoming connections.
cat > .build/networkmonitor.entitlements <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>com.apple.security.app-sandbox</key><true/>
<key>com.apple.security.network.client</key><true/>
</dict></plist>
PLIST
# Ad-hoc by default. To sign with a Developer ID instead, set NETWORK_MONITOR_SIGN_IDENTITY to a Developer ID
# Application identity, then notarize it (see readme.md); a secure timestamp is required for notarization.
identity="${NETWORK_MONITOR_SIGN_IDENTITY:--}"
timestamp=()
[[ "$identity" == - ]] || timestamp=(--timestamp)
codesign --force --sign "$identity" "${timestamp[@]}" --options runtime --entitlements .build/networkmonitor.entitlements 'Network Monitor.app'
echo "Built Network Monitor.app $version"
if [[ "${1:-}" == "--install" ]]; then
  # Replace only an earlier Network Monitor, never another app with the same name.
  if [[ -e '/Applications/Network Monitor.app' && "$(plutil -extract CFBundleIdentifier raw -o - '/Applications/Network Monitor.app/Contents/Info.plist' 2>/dev/null || true)" != local.networkmonitor ]]; then
    echo '/Applications/Network Monitor.app is not this Network Monitor; leaving it in place.' >&2; exit 1
  fi
  # Quit every running copy first, wherever it was started; it saves today's usage before exiting. Matched by bundle ID,
  # like the app's own one-copy check, so a copy still running would also make the new one quit at launch.
  running() { [[ -n "$(lsappinfo find bundleid=local.networkmonitor)" ]] }
  # A refused quit request (such as a declined Automation prompt) is caught by the check below.
  if running; then osascript -e 'tell application id "local.networkmonitor" to quit' >/dev/null 2>&1 || true; fi
  for _ in {1..50}; do running || break; sleep 0.2; done
  if running; then echo 'Network Monitor is still running; quit it, then run ./build.sh --install again.' >&2; exit 1; fi
  rm -rf '/Applications/Network Monitor.app'
  ditto 'Network Monitor.app' '/Applications/Network Monitor.app'
  # Only the installed copy should handle Launch at Login.
  /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -u "$PWD/Network Monitor.app" 2>/dev/null || true  # Fails when it was never registered.
  open '/Applications/Network Monitor.app'
  echo 'Installed and opened /Applications/Network Monitor.app'
fi
