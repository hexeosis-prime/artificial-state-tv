# THE ARTIFICIAL STATE TV

The band runs a pirate TV station. Eight channels, autoplaying full-screen,
controls that vanish until the mouse moves. The premium channel's manifest
returns HTTP 402 until you pay — x402-native, no login, no account.

Sibling repo to [nightshift](https://github.com/hexeosis-prime/nightshift):
every render the pipeline produces becomes channel inventory.

## Structure
- `index.html` — one page, two stacked `<video>` elements (double-buffered)
- `style.css` — house chrome: black void, hexagonal marks, monospace, fades on idle
- `tv.js` — player core: buffer swap, channel logic, idle chrome, keyboard
- `manifest.json` — the schedule: 8 channels, clips per channel

## Channels
01 music video · 02 news · 03 blipverts · 04 telenovela ·
05 ambient erosion · 06 lyric · 07 zeitgeist · 08 flip mode (x402-locked)

Channel 08 is the meta-channel: the player itself jumps channels like a bored
viewer. Its manifest endpoint will return `HTTP 402` with x402 payment headers
until settled — pirate TV funding itself on its own rails.

## Run locally
```
python3 -m http.server 8080
# open http://localhost:8080
```
(Media files live under `/media/<channel>/` — drop MP4s there or point the
manifest at your R2 bucket.)

## Deploy (Cloudflare)
1. Push repo → Cloudflare Pages connects to it (build: none, output: root)
2. Upload media to an R2 bucket bound to the same zone (`/media/*` routes to R2)
3. Premium channel: a Worker on the `/manifest/08` route returning 402 +
   `x-paywall` headers until an x402 payment settles, then the real manifest

## Keyboard
`←/→` prev/next clip · `space` play/pause · `1–8` channels ·
`m` mute · `c` toggle channel strip

## Design notes
Modeled on purz.tv's discipline (double-buffered, muted+playsinline, chrome
on idle, locked CSP) with the hexeosis house language: black void, hexagonal
marks, monospace chrome, signal-intrusion flicker on channel flips. The
content is the chrome; everything else is signal.
