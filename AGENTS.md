# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **static website** (plain HTML/CSS/JS) intended to be deployed via GitHub Pages. See `README.md` for the product overview.

- **No build step, no package manager, no dependencies to install.** There is no `package.json`, lockfile, or backend. Nothing needs to be compiled or bundled.
- **No lint/test/build tooling exists** in this repo. There are no automated tests or linters to run.
- **Run it (dev):** serve the repo root over HTTP, e.g. `python3 -m http.server 8000` (run from `/workspace`), then open `http://localhost:8000/`. Opening `index.html` via `file://` also works but a local server better matches production.
- **Interactivity requires outbound internet.** The menu show/hide navigation depends on jQuery loaded from `https://code.jquery.com` (and styles from cdnjs / Google Fonts). Without CDN egress the page still renders, but the `home`/`about`/`contact` menu switching will not work.
- **Core functionality:** `script.js` uses the URL hash fragment (`#home`, `#about`, `#contact`) to show/hide the matching `.content-region` and highlight the active menu link.
