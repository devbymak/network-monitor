<div align="center">

# Network Monitor: network speed monitor for the Mac menu bar

**See your upload and download speed, data usage, and ping at a glance. Free, open source, and private.**

![macOS 13+](https://img.shields.io/badge/macOS-13%2B-black?logo=apple)
![Swift](https://img.shields.io/badge/Swift-SwiftUI%20%2B%20AppKit-F05138?logo=swift&logoColor=white)
![No dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)
![MIT License](https://img.shields.io/badge/license-MIT-blue)

</div>

<p align="center">
  <img src="assets/cover.png" alt="Network Monitor on a Mac: live upload and download speed and ping in the menu bar, the popover with speed and ping graphs and daily data usage, and the Settings window for menu bar layout, units, and ping, next to a list of features">
</p>

**Network Monitor** is a small, native macOS menu bar app that shows your **internet speed** in real time. It's a Mac take on the popular GNOME *Internet Speed Monitor* extension. It shows what you'd want to know about your connection, and it doesn't watch you.

## Why Network Monitor

- ⚡ **Live speed in the menu bar.** Upload and download speed, stacked or side by side, in MB/s or Mb/s.
- 📊 **Data usage tracking.** Today's total, plus yesterday and the last 7, 30, and 90 days.
- 📈 **Speed graph.** The last 60 seconds, plus a per-interface breakdown (Wi-Fi, Ethernet, iPhone tethering).
- 🌍 **Ping and location (optional).** Real latency to Cloudflare, Google, or Apple, a 10-minute ping graph, and the country, IP address, and network operator that websites see. Useful with a VPN.
- 🎯 **Accurate counts.** Skips VPN tunnels, VMs, and virtual interfaces so traffic isn't counted twice, and uses 64-bit counters so totals never wrap.
- 🔒 **Private by design.** Runs in the App Sandbox, keeps no logs, and makes no network requests unless you turn on ping.
- 🪶 **Lightweight.** Pure Swift with no third-party dependencies. Launches at login if you want it to.

## Install

You need an Apple silicon Mac and macOS 13 Ventura or later. Install with [Homebrew](https://brew.sh):

```sh
brew tap devbymak/tap
brew trust devbymak/tap
brew install --cask network-monitor
```

Homebrew asks you to trust taps from outside Homebrew before it installs from them. Network Monitor isn't notarized by Apple (that needs a paid developer account), so the cask clears macOS's download warning for you. `brew upgrade` keeps it up to date.

To build from source instead, you also need the Xcode Command Line Tools (`xcode-select --install`):

```sh
git clone https://github.com/devbymak/network-monitor.git && cd network-monitor
./build.sh --install
```

This builds Network Monitor, copies it to `/Applications`, and opens it. Look for the speed readout in your menu bar. Click it for details, or right-click it for quick options.

<details>
<summary><b>Uninstall</b></summary>

Installed with Homebrew: `brew uninstall --cask network-monitor` (add `--zap` to remove your settings and usage history too).

Built from source: quit Network Monitor, delete it from `/Applications`, and delete `~/Library/Containers/local.networkmonitor` to remove your settings.

</details>

## Privacy

With ping off (the default), Network Monitor has **no network access** of its own. It only reads your Mac's interface counters. With ping on, it contacts only the ping server and location service you choose, sends no cookies and a generic user agent, and caps every reply. On disk it keeps only your preferences and one total per day (at most 90 days). The App Sandbox blocks it from reading your files or accepting incoming connections.

<details>
<summary><b>For developers</b></summary>

```sh
./test.sh    # run the tests
./build.sh   # build Network Monitor.app here without installing it
```

- `'Network Monitor.app/Contents/MacOS/networkmonitor' --probe` prints each interface's counters and whether they're counted.
- `--ping` prints ping and location readings for 30 seconds. To pick providers, put `-pingServer google|apple|cloudflare`, `-locationService ipinfo|geojs|ipsb|ifconfig|cloudflare|off`, or `-pingInterval 1|2|5|10|30|60` before it.
- Preferences are stored in `~/Library/Containers/local.networkmonitor`.

The default build is signed ad hoc and isn't notarized. With a Developer ID you can sign and notarize it instead:

```sh
NETWORK_MONITOR_SIGN_IDENTITY='Developer ID Application: Your Name (TEAMID)' ./build.sh
ditto -c -k --keepParent 'Network Monitor.app' NetworkMonitor.zip
xcrun notarytool submit NetworkMonitor.zip --keychain-profile <profile> --wait
xcrun stapler staple 'Network Monitor.app'
```

Releases are automatic: merging `main` into the `release` branch builds the app, publishes a GitHub Release versioned from the conventional commits since the last tag, and updates the Homebrew cask. `node --test scripts/*.test.mjs` tests the release scripts.

`assets/app-icon.swift` draws the app icon; run `xcrun swift assets/app-icon.swift assets/app-icon.png` to regenerate it. The screenshot uses demo data.

</details>

## License

MIT. See [license](license). Contributions and stars are welcome ⭐
