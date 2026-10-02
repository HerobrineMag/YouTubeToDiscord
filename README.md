# YouTube → Discord Rich Presence

[Русская версия](README.ru.md)

Show what you are watching or listening to on **YouTube** and **YouTube Music** (in Chrome or any Chromium browser) as a Rich Presence status in the **Discord desktop app**.

## Features

- "Listening to YouTube" status with the video / track title and the channel / artist
- Live progress bar: elapsed time, total duration, correct after seeking
- Large image: video thumbnail (album art on YouTube Music)
- Small image: channel avatar (YouTube only)
- Pause detection: the timer disappears and a ⏸ appears next to the author
- Clickable title, author, thumbnail and avatar (open the video or the channel)
- Two buttons for other users: **Open video** and **Open channel**
- Runs hidden in the background with a system tray icon and an **Exit** menu item
- The status is removed automatically when you close the tab or stop playback

## How it works

A browser userscript cannot talk to Discord directly, because Discord only listens on a local IPC pipe. So the project has two parts:

```
Chrome (Tampermonkey userscript)  ──HTTP──►  local bridge (Node.js)  ──IPC──►  Discord desktop
 reads title, time, thumbnail…            127.0.0.1:6969                      shows Rich Presence
```

1. `youtube-discord-rpc.user.js` reads the player state from the page and sends it to `http://127.0.0.1:6969` every few seconds and on play / pause / seek.
2. `server.js` receives it and updates your Discord activity. It only talks to Discord when something actually changes, to stay within Discord's rate limits.

Nothing leaves your computer except the Rich Presence data that Discord itself displays.

## Requirements

- Windows (the launcher scripts are for Windows; the bridge itself is plain Node.js)
- Discord **desktop app**, running (the browser version does not work)
- [Node.js](https://nodejs.org) 18 or newer, added to `PATH`
- Chrome or another Chromium browser with the [Tampermonkey](https://www.tampermonkey.net) extension

## Setup

### 1. Create a Discord application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**.
2. Name it **YouTube**. This name is shown in the status as "Listening to YouTube".
3. Copy the **Application ID** from the General Information page.

### 2. Configure and start the bridge

1. Clone or download this repository.
2. Open `config.json` and replace `YOUR_APPLICATION_ID` with your Application ID.
3. Run `start.bat`. The first run installs dependencies automatically. A red tray icon appears (it may be under the "Show hidden icons" arrow).

To run it manually with visible logs instead:

```
npm install
npm start
```

### 3. Install the userscript

1. In Tampermonkey, create a new script and paste the contents of `youtube-discord-rpc.user.js`, then save.
2. When Tampermonkey asks for access to `127.0.0.1`, choose **Always allow**.
3. In Chrome 138 or newer, open `chrome://extensions`, open Tampermonkey's **Details** and enable **Allow User Scripts** (or turn on Developer mode). Reload the YouTube tab.

### 4. Check Discord settings

In **Settings → Activity Privacy**, enable **Share my detected activity**, and make sure your status is not set to Invisible.

Open any video on `youtube.com/watch?v=...` or a track on `music.youtube.com` and press play.

## Usage

- Start the bridge with `start.bat`. Stop it from the tray icon: right click → **Exit**.
- To start with Windows, press `Win+R`, type `shell:startup` and put a shortcut to `start.bat` in the folder that opens.
- The log of the hidden bridge is written to `log.txt` next to the scripts.

## Notes and limitations

- **You cannot see your own buttons.** Discord hides Rich Presence buttons from the owner of the status. Other people see them. For you, the clickable title, author and images work as links.
- Discord allows at most two buttons per status, and button labels are the same for everyone. Discord does not tell the app the viewer's language, so the labels are in English.
- Only the Discord desktop client with a local IPC connection is supported.
- Only one tab should play at a time. With several tabs the latest data wins.
- YouTube changes its page layout from time to time. If the title, author or avatar stop appearing, update the selectors in `youtube-discord-rpc.user.js` (the `querySelector` calls in `getInfo`).
- The channel avatar is not available on YouTube Music, so no small image is shown there.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Nothing happens | Run `npm start` and look at the output. You should see "Listening on…" and "Connected to Discord as…". |
| "Discord not found" | Start the Discord desktop app (not the browser or Store version) and wait a few seconds. |
| Tampermonkey badge shows no script | Enable **Allow User Scripts** for Tampermonkey in `chrome://extensions`, then reload the tab. Open a `watch?v=` page (Shorts are not supported). |
| No data reaches the bridge | Open `http://127.0.0.1:6969` in the browser: it should say `ok`. Check that Tampermonkey is allowed to connect to `127.0.0.1`. |
| No tray icon | Check `log.txt`. Antivirus can quarantine the `systray2` helper executable, so look at your protection history. Make sure `node -v` works in a new terminal. Close any old `node.exe` process in Task Manager, because a second instance exits when the port is already in use. |
| Status does not appear | Check **Activity Privacy** in Discord and that the status is not Invisible. |
| Buttons are missing | You cannot see your own buttons. Ask a friend or check from a second account. |

## Project structure

```
config.json                      Discord Application ID
server.js                        local bridge: HTTP server, Discord RPC, tray icon
youtube-discord-rpc.user.js      Tampermonkey userscript
start.bat / start-hidden.vbs     hidden launcher for Windows
icon.ico                         tray icon
```

## Disclaimer

This is an unofficial project. It is not affiliated with, endorsed by or sponsored by Google, YouTube or Discord. All trademarks belong to their respective owners.

## License

[MIT](LICENSE)
