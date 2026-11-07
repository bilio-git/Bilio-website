# Bilio client handoff

This package contains the editable project and a ready-to-publish static website. It includes the latest about copy and contact link, the animated wordmark with a 1.2-second opening pause, the sliding about sheet, and the blinking Deployer mascot. Click the downward caret to reveal About and the upward caret to return to the homepage.

## Package contents

- `dist/`: the complete website to publish, with `index.html` at its root.
- `netlify.toml`: the GitHub-connected Netlify build configuration.
- `_redirects`: redirects from the previous `/deploy` and `/enjoy` pages to `/`; included in `dist/` for both Git-connected and manual Netlify deployments.
- `preview/Bilio.html`: a self-contained viewing copy. Double-click to open it offline; this folder is included in the handoff ZIP.
- Project root: editable page template, styles, JavaScript, build scripts, and this documentation.
- `assets/`: original and generated vector artwork, local fonts, and the font license.
- `tests/`: animation checks. See `README.md` for the optional test tools.
- `wordmark.html` and `glider.html`: earlier animation studies.

## Deploy the included website

The site is plain HTML, CSS, JavaScript, and SVG. It does not require a backend, database, environment variables, API keys, a framework, or a package installation to serve.

For a manual upload, upload the **contents of `dist/`** to the hosting service's public website directory. Preserve the `assets/` directory structure. The homepage entry point is `index.html`.

## GitHub and Netlify deployment

The intended GitHub account is `bilio-git`; the intended Netlify account/team is Bilio, using GitHub sign-in. Account access, the exact repository, and the Netlify project must be verified before publishing.

1. Add the **contents** of `Bilio-project/` to the intended GitHub repository, with `netlify.toml` at the repository root. Keep the editable source and `dist/` together.
2. In Netlify, choose **Add new project > Import an existing project > GitHub** and select that repository in the Bilio account/team. If an existing Netlify project already serves the company domain, inspect its current repository and deploy settings before changing it.
3. Use `main` as the production branch for a new repository. Preserve the established production branch when updating an existing repository unless deliberately changing it.
4. Check the settings below. The included `netlify.toml` supplies the build settings automatically. If the project is placed inside a repository subfolder instead, select that subfolder as the base directory.
5. Verify the Netlify preview URL, homepage animation, About panel, email link, mobile layout, and legacy redirects before connecting the company domain.

| Setting | Use |
| --- | --- |
| Project type / framework | Static HTML / none |
| Base directory | Leave empty when the project is at the repository root |
| Build command | `python3 build-deploy.py` |
| Publish / output directory | `dist` |
| Python version | `3.12`, declared in `netlify.toml` |
| Start command | None |
| Secrets / API keys | None |

Every Git-triggered build regenerates `dist/` from source, so edits to the template, styles, or scripts are reflected in the deployed website. Python uses only its standard library and runs at build time; it is not needed on the live website. No npm installation is required.

For a manual Netlify upload, use the contents of the prebuilt `dist/` directory. It already includes the redirect rules. For a Git-connected deployment with no build step, explicitly change `command` in `netlify.toml` to an empty string and commit an up-to-date `dist/`; file-based settings otherwise override a blank build command in the UI.

## Company domain and future updates

Add the intended `bilio.com` and `www.bilio.com` domain configuration to the verified Netlify project and follow the exact DNS values Netlify provides. Keep the existing DNS provider unless there is a separate reason to change it. Change only the website records needed for the cutover; retain the existing mailbox and mail-related DNS records. Select the preferred primary domain in Netlify so both hostnames resolve consistently.

Use branches and pull requests for subsequent changes, review the Netlify Deploy Preview, and merge the reviewed source into the production branch. Preserve the previous host and its DNS values during migration. Once the new site is live, Netlify can republish a prior successful deploy; also revert or correct the source if automatic builds could otherwise replace that rollback.

The Netlify project, repository, domain records, and account access are not configured by this archive. Complete those account-level steps and verify a successful deployment before considering the site launched.

### Official reference documentation

- [Deploy from a Git repository](https://docs.netlify.com/start/quickstarts/deploy-from-repository/)
- [Netlify file-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/)
- [Python build dependencies](https://docs.netlify.com/build/configure-builds/manage-dependencies/)
- [Redirect options](https://docs.netlify.com/manage/routing/redirects/redirect-options/)
- [Configure external DNS](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/)
- [Rollbacks and locked deploys](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/)

The client supplies their repository and hosting account. Connecting a custom domain is done through their hosting and domain/DNS settings. This archive does not publish or connect a domain automatically.

## Make changes and rebuild

Edit the source files in the project root; `dist/` is generated and replaced by each deployment build.

| Change | Source |
| --- | --- |
| About copy and contact email | `website.template.html` |
| Type, layout, colors, sheet timing | `styles.css` |
| Opening pause and page navigation | `website.js` |
| Wordmark movement and collisions | `wordmark-physics.js` |
| Original artwork | `assets/*.original.svg` |
| Deployer's continuous body outline | `assets/bilio_deployer.silhouette.svg` |

After editing, run:

```sh
python3 build-deploy.py
```

The template contains artwork placeholders, so view `dist/index.html` through a local server rather than opening `website.template.html` as the site:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:4173/` in a browser. Stop the server with Ctrl+C when finished.

If changing the original wordmark artwork or rebuilding its standalone animation study, first run `python3 build-preview.py`. For Deployer, edit `assets/bilio_deployer.silhouette.svg` or its eye animation in `build-glider.py`, then run `python3 build-glider.py`. This generates a static single-path logo and a blinking logo with one continuous body. The old `bilio_deployer.original.svg` is retained as a reference, but its split head/body shapes are no longer used for the website. Then run `python3 build-deploy.py`.

Run `python3 package-preview.py` to create a new offline viewing copy. Run `python3 package-handoff.py` to create a new complete handoff ZIP. These outputs are saved in `output/`.

## Fonts and contact link

IBM Plex Mono is bundled locally. Keep its accompanying license at `assets/fonts/OFL.txt`; the deployment build includes that license in `dist/`.

The `office@bilio.com` link opens the visitor's email application. The website itself does not provision or host that mailbox.
