# FastTTS

[![Release](https://img.shields.io/github/v/release/FastThunder5/FastTTS?display_name=tag&sort=semver)](https://github.com/FastThunder5/FastTTS/releases/latest)
[![Build & Release](https://github.com/FastThunder5/FastTTS/actions/workflows/release.yml/badge.svg)](https://github.com/FastThunder5/FastTTS/actions/workflows/release.yml)
[![License](https://img.shields.io/github/license/FastThunder5/FastTTS)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)

**FastTTS** is a free Windows desktop app that reads live chat aloud while you stream. Connect TikTok Live, Twitch, YouTube, or Kick, manage everything from one native app, and add browser-source overlays to OBS.

## Highlights

- Natural Microsoft Edge neural voices (14 Spanish accents and more) plus Google TTS, with a timestamp-ordered speech queue, a voice per viewer and a pronunciation dictionary.
- Multi-platform chat for TikTok Live, Twitch, YouTube, and Kick, with a platform badge on every message.
- Local moderation: spam and language filters, blocked words, viewer records, mute, and ban controls.
- OBS-ready overlays for alerts, likes, followers, unified chat, social events, and credits.
- Music requests with chat commands (`!p`, `!cancion`, `!cola`, `!skip`, `!quitar`), Soundpad effects, global shortcuts, and OBS clip markers.
- A mobile control panel, built-in PortalView browser, automatic updates, settings backup, and optional MCP tools for advanced agent control.

## Download

Get the latest Windows installer from [GitHub Releases](https://github.com/FastThunder5/FastTTS/releases/latest). Node.js is not required to use the app.

The installer is currently unsigned, so Windows may show a first-run SmartScreen warning. Select **More info** and then **Run anyway** if you trust the release.

## Quick start

1. Open FastTTS. Everything is free: no account, no paid plan.
2. Add your TikTok, Twitch, YouTube, or Kick channel and select **Connect**.
3. Choose a language, voice, and filters in Settings.
4. In OBS, add the overlay URL shown by the app as a **Browser Source**. Keep FastTTS running while streaming.

> YouTube chat requires an active live stream.

## Tech stack

| Layer | Technology |
| --- | --- |
| Desktop | Electron |
| App server | Express + WebSocket (`ws`) |
| Frontend | Vanilla ESM + Vite |
| Live chat | TikTok Live client, `tmi.js`, `youtube-chat`, Kick WebSocket |
| Text-to-speech | Microsoft Edge neural voices + Google Translate TTS |
| Packaging | electron-builder + NSIS |
| Delivery | GitHub Actions + GitHub Releases |

## Architecture

Electron starts a local Express/WebSocket server and loads the UI from it. The backend is organized by domain under `features/`; domains communicate through a shared event bus or narrow contracts. The Vite-built frontend powers the desktop UI, mobile panel, and OBS overlays.

```text
Electron shell
  ├─ Express + WebSocket server
  │   ├─ core/          event bus, HTTP, logging, contracts
  │   └─ features/      channels, chat, moderation, overlays, sound, and more
  └─ Vite frontend      desktop UI, mobile panel, OBS overlays
```

## Project layout

```text
core/             Application kernel and shared contracts
electron-shell/   Window, tray, updates, IPC, and desktop integrations
features/         Backend domains
interfaz/         Vite frontend source and static assets
gifts/            TikTok gift images
sounds/           Bundled sound assets
test/             Node test suite
```

## Development

### Prerequisites

- Node.js 22+
- npm
- Windows is required to create the NSIS installer

```bash
git clone https://github.com/FastThunder5/FastTTS.git
cd FastTTS
npm ci
```

Run the full desktop app:

```bash
npm run electron
```

For frontend and server development with a Vite build watcher:

```bash
npm run dev:all
```

Other useful commands:

```bash
npm run lint
npm test
npm run build:front
npm run serve
```

## Build and release

Build a local Windows installer:

```bash
npm run build:electron
```

Maintainers release a new version by updating `package.json` and `CHANGELOG.md`, then pushing a version tag:

```bash
git tag vX.Y.Z
git push origin main --tags
```

GitHub Actions builds the installer and publishes the GitHub Release. Installed copies update themselves from it.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), create a focused branch, run `npm run lint` and `npm test`, then open a pull request against `main`.

## License

Released under the [MIT License](LICENSE). FastTTS started as a fork of [iKhunsa/tiktok-tts](https://github.com/iKhunsa/tiktok-tts) v1.10.0. It has no telemetry: nothing about your stream leaves your PC.
