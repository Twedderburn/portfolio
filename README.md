# Tyler Wedderburn — portfolio

Live at **https://twedderburn.github.io/portfolio/**

Four static pages: home, projects, Pips & Peril and Focus Home. No framework and no build server; GitHub Pages serves the HTML files in this folder as they are.

## Editing

The pages are generated. Edit the sources, then rebuild:

- `src/*.html` — the body of each page
- `src/site.css` — the styles (its first lines are the Hallmark design stamp)
- `tokens.css`, `base.css` — colours, fonts, spacing and base rules

```bash
node build.mjs
```

This writes `index.html`, `projects.html`, `pips-and-peril.html` and `focus-home.html` here, with the shared header, footer and scripts. Commit and push them, and Pages updates in a minute or two.

`node build.mjs --artifact` makes a version for a claude.ai artifact instead (in `artifact/`, which is not committed).

## Pictures

- `img/shots/` — Pips & Peril gameplay, captured with the game's own autopilot in Godot
- `img/fh/` — Focus Home screenshots, captured from the 1.7 dev build on an emulator
- `img/*.png` — Pips & Peril art from the game
