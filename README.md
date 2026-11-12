# Plutarch's Games

Source for **[plutarchsgames.com](https://plutarchsgames.com)**, a games site named for Plutarch's *Parallel Lives*. Sister site to [teddyrookbook.com](https://teddyrookbook.com).

Plain static files, served by GitHub Pages from the `main` branch. No build step: edit, commit, push.

## Layout

```
index.html               Home page: the game directory (shelves built from assets/catalog.js)
404.html                 Not-found page
assets/site.css          Site styles (Teddy Rook Book colours: racing green, cream, gold)
assets/catalog.js        The list of games shown on the home page
assets/theme.js          Light/dark switch
assets/base.css          Base stylesheet the ported Teddy Rook Book games were built on
img/games/<slug>.jpg     Thumbnails (640×336)
games/<slug>/            One folder per game
games/*.js, *.css        Shared files used by the ported games
js/, lang/               Shared helpers used by the ported games (Greek/Latin transliteration, words)
CNAME                    Custom domain for GitHub Pages
```

## Games made here

| Game | Folder | Notes |
|------|--------|-------|
| Teddy Rook Racing | `games/teddy-rook-racing/` | three.js kart racer. `game.js` is the core; `extras.js` adds item boxes, Grand Prix cups, touch controls and effects. |
| Jimothy-san | `games/jimothy-san/` | Canvas platformer. `levels.js` holds worlds, platform chunks and mine-cart recipes; every other level is a mine-cart ride. |
| Heroes of Hellas | `games/heroes-of-hellas/` | Isometric RTS. `data.js` units/buildings/campaign, `engine.js` simulation and AI, `scenarios.js` stories, `lore.js` Codex, Homeric Greek, god powers and cheat codes, `render.js` drawing (Wang-tile terrain), `ui.js` interface. |
| Ancient Festival Tycoon | `games/festival/` | Ported from Teddy Rook Book; `games/fest-more.js` is the expansion (buildings, scenarios, carpenter, ranks). |

The other games were copied from Teddy Rook Book (`static/games/`) and wrapped in this site's page shell.

## Adding a game

1. Make `games/<slug>/index.html` (plus its own scripts and styles).
2. Add an entry to `assets/catalog.js` and a 640×336 thumbnail at `img/games/<slug>.jpg`.
3. Commit and push to `main`.
