# Tyler Wedderburn — portfolio

Live at **https://twedderburn.github.io/portfolio/**

Four static pages: a home page that shows both released projects with their download buttons, plus one page each for Pips & Peril, Focus Home and Last Lantern (in development, with a playable combat demo). No framework and no build server; GitHub Pages serves the HTML files in this folder as they are.

## Editing

The pages are generated. Edit the sources, then rebuild:

- `src/*.html` — the body of each page
- `src/site.css` — the styles
- `tokens.css`, `base.css` — colours, fonts, spacing and base rules

```bash
node build.mjs
```

This writes `index.html`, `pips-and-peril.html`, `focus-home.html`, `last-lantern.html` and `404.html` here, with the shared header, footer and scripts. It also writes `projects.html`, a redirect to the home page that keeps the old address working. Commit and push them, and Pages updates in a minute or two.

`node build.mjs --artifact` makes a version for a claude.ai artifact instead (in `artifact/`, which is not committed).

## Pictures

- `img/shots/` — Pips & Peril gameplay, captured with the game's own autopilot in Godot
- `img/fh/` — Focus Home screenshots, captured from the 1.7 dev build on an emulator
- `img/*.png` — Pips & Peril art from the game
- `img/ll/` — Last Lantern screenshots and the demo's sprite sheet, cut from the Godot prototype (`art/sprites.png`, `art/preview/`, `shots/`)

## When a new version comes out

The download buttons point at fixed release files, so update them by hand:

- Pips & Peril: the three links and file sizes in `src/index.html` and `src/pips-and-peril.html`
- Focus Home: the link, size and version number in `src/index.html` and `src/focus-home.html`

## The photo of Tyler

The About section shows `img/tyler.jpg` (800 by 1000, cropped from the original). To change it, replace that file with another picture of the same shape.

## Downloads that fit the visitor

A script marks the download that matches the visitor's device (Android, Windows or Linux) and sets the others in outline. Each download carries a `data-os` attribute inside a `data-os-group`.

`404.html` is the page GitHub Pages shows for an address that doesn't exist.

## The Last Lantern combat demo

`js/last-lantern-battle.js` is a browser port of the prototype's battle (`scripts/battle.gd`, `scripts/lantern.gd`), with the costs from `scripts/tuning.gd` copied into its `T` table. When those numbers change in the game, change them there too. It draws with `img/ll/ll-sprites.png`, `ll-sprites-glow.png` and `ll-sprites.json` (the lamplighter, the Creeper and the lantern only).

The page is themed as a Gothic church at night. Its ornaments (rose window, arcade, tracery, lancet window, canopy and finial) are SVGs in `img/ll/` drawn by `node tools/gothic-art.cjs img/ll`; the demo draws its own stained-glass back wall.

Last Lantern is in development, so update its page as the game grows: new screenshots in `img/ll/`, and the rules and commands table in `src/last-lantern.html`.
