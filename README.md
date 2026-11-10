# Tyler Wedderburn — portfolio

Live at **https://twedderburn.github.io/portfolio/**

Three static pages: a home page that shows both projects with their download buttons, plus one page each for Pips & Peril and Focus Home. No framework and no build server; GitHub Pages serves the HTML files in this folder as they are.

## Editing

The pages are generated. Edit the sources, then rebuild:

- `src/*.html` — the body of each page
- `src/site.css` — the styles
- `tokens.css`, `base.css` — colours, fonts, spacing and base rules

```bash
node build.mjs
```

This writes `index.html`, `pips-and-peril.html` and `focus-home.html` here, with the shared header, footer and scripts. It also writes `projects.html`, a redirect to the home page that keeps the old address working. Commit and push them, and Pages updates in a minute or two.

`node build.mjs --artifact` makes a version for a claude.ai artifact instead (in `artifact/`, which is not committed).

## Pictures

- `img/shots/` — Pips & Peril gameplay, captured with the game's own autopilot in Godot
- `img/fh/` — Focus Home screenshots, captured from the 1.7 dev build on an emulator
- `img/*.png` — Pips & Peril art from the game

## When a new version comes out

The download buttons point at fixed release files, so update them by hand:

- Pips & Peril: the three links and file sizes in `src/index.html` and `src/pips-and-peril.html`
- Focus Home: the link, size and version number in `src/index.html` and `src/focus-home.html`

## A photo of Tyler

The About section on the home page has a hidden slot for a portrait. Put the photo in `img/` and add `<img src="img/your-file.jpg" alt="Tyler Wedderburn">` inside the `<div class="portrait">` in `src/index.html`; the section then becomes two columns.
