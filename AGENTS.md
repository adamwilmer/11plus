# Repository Guidelines

## Project Structure & Module Organization
The app is a static bundle served from `index.html`, with styling in `css/style.css`, client logic in `js/app.js`, and subject data stored as JSON under `data/`. Image assets that back exam questions live in `images/`, while original PDF booklets remain under `exams/` so every question has a traceable source.

## Build, Test, and Development Commands
- `./serve.sh [port]`: starts a local Python `http.server` (default `8000`); use this to bypass browser CORS rules when fetching JSON.
- `python3 extract_images.py`: pulls diagrams from source PDFs into `images/`; confirm filenames and aspect ratios before committing.
- `python3 extract_question_images.py`: batch-extracts per-question artwork; update the matching `data/*.json` entries in the same change.

## Coding Style & Naming Conventions
JavaScript and CSS both use four-space indentation; avoid tabs to keep diffs consistent. Favor `const`/`let`, keep shared state near the top of `js/app.js`, and colocate helpers with their event handlers. JSON files stay kebab-cased (`verbal-reasoning.json`) while properties use camelCase such as `correctAnswer`. Class names should describe UI roles (`.test-card`, `.question-count-selector`), and comments should explain intent rather than restating the obvious.

## Testing Guidelines
There is no automated harness yet, so rely on manual regression sweeps in Chrome and Safari (desktop and mobile). Before merging, complete at least one full exam per subject you touched, confirming navigation, scoring, and review states. When editing `data/*.json`, validate the JSON and ensure each question has five options plus a single-letter `correctAnswer`. Capture the manual steps you ran in the PR description for reviewer parity.

## Commit & Pull Request Guidelines
History favors concise, imperative summaries (e.g., “Add Verbal Skills test…”). Keep the first line under 72 characters, add body bullets only when you span multiple areas, and reference issue IDs where possible. PRs should explain user impact, note which scripts ran, and include screenshots or GIFs for UI changes, especially anything affecting layout or readability.

## Content & Asset Updates
When sourcing new questions, work in subject-scoped branches (`feature/maths-test-2`, etc.) and cite the origin PDF in the PR. Place processed diagrams in `images/` with descriptive names (`maths_1_q21.png`) and reference them from the matching JSON entries. Include `altText` whenever an answer depends on an image, and stick to the existing color palette for contrast consistency.
