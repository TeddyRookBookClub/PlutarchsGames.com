# Plutarch's Games

Source for **[plutarchsgames.com](https://plutarchsgames.com)** — a games site named for Plutarch's *Parallel Lives*. Sister site to [teddyrookbook.com](https://teddyrookbook.com).

Plain static HTML, served by GitHub Pages straight from the `main` branch. No build step.

## Layout

```
index.html                 Home page / game directory
404.html                   Not-found page
assets/style.css           Shared site styles
games/<game-name>/index.html   One folder per game
CNAME                      Custom domain for GitHub Pages
.nojekyll                  Tells Pages to serve files as-is
```

## Adding a game

1. Create `games/<game-name>/` and put the game's `index.html` (plus any JS/CSS/images) inside.
2. Add a card for it in the "Now Playing" grid in `index.html`.
3. Commit and push to `main` — the site updates in a minute or two.

## Games

| Game | Path |
|------|------|
| Teddy Rook Racing | `/games/teddy-rook-racing/` |
