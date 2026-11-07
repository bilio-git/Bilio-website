# Bilio

A minimal two-view website, using the original animated wordmark and blinking Deployer.

For client deployment, see `HANDOFF.md`. Run `python3 build-deploy.py` to generate the publishable `dist/` folder, or `python3 package-handoff.py` to create `output/Bilio-client-handoff.zip` with source, deployment files, and an offline preview.

For GitHub-connected Netlify deployment, put this project's contents at the repository root and import the repository into Netlify. `netlify.toml` supplies the build command (`python3 build-deploy.py`), output directory (`dist`), and Python version. Existing `/deploy` and `/enjoy` links redirect to the homepage through `_redirects`, which is copied into `dist/` on every build.

Run `python3 -m http.server 4173 --bind 127.0.0.1` from this folder, then open http://127.0.0.1:4173.

- `website.template.html`: page structure and about copy.
- `styles.css`: layout, typography, colors, and transitions.
- `website.js`: caret navigation, animation visibility, and the 1.2-second pause after page load. The about sheet descends over the homepage and retracts upward when closed.
- `wordmark-physics.js`: continuous gravity simulation starting with both dots in their original positions on the wordmark. After the pause, either dot can leap first, followed by the other after a short random delay. Opening directions and heights vary. Each bounce gets fresh random height and lateral aim, including occasional lower hops. Browser entropy is replenished throughout the animation; there is no repeating timeline. Tests can inject a seeded sampler for reproducibility.
- `assets/bilio_deployer.silhouette.svg`: Deployer's continuous outer contour, with the old head/body join removed. `build-glider.py` generates the single-path static logo (`bilio_deployer.solid.svg`) and the blinking version (`bilio_deployer.blink.svg`) from this outline. Both have transparent eye cutouts; the blinking version animates the eyes through a mask over one body path.

Letter contacts use the outlines in two dimensions: top landings sustain the bounce, while side contacts rebound outward without restarting the vertical arc. `node tests/opener.cjs` checks the random opening. `node tests/contacts.cjs` checks both sides of the L and 20 simulated minutes against the real outlines; this second check needs `@napi-rs/canvas` available to Node (installed locally or supplied through `NODE_PATH`).

After editing the template, CSS, JavaScript, or SVG assets, run `python3 build-site.py` to rebuild `index.html` and update its asset fingerprints so browser refreshes load the current files. Fonts are served locally; their license is in `assets/fonts/OFL.txt`.

The earlier animation studies remain at `wordmark.html` and `glider.html`. Rebuild them with `python3 build-preview.py` and `python3 build-glider.py` respectively, then run `python3 build-site.py` if the assets changed.

The site is static and can be served from this folder without a framework or package installation. Both animations respect the visitor's reduced-motion preference. The about view can also be closed with Escape.

To make an offline copy for someone to view, run `python3 package-preview.py`. Send `output/Bilio-preview.zip`; the recipient unzips it and double-clicks `Bilio.html` in the extracted folder. The HTML embeds all fonts, artwork, styles, and animation code, so no server or internet connection is needed. You can also share `output/Bilio.html` on its own. Re-run the packaging command after making changes to create an updated snapshot.
