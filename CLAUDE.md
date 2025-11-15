# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a client-side only 11+ practice test application - a mobile-friendly browser-based app for practicing UK 11+ exam questions across multiple subjects (Maths, English, Verbal Reasoning, Non-Verbal Reasoning, Verbal Skills). The application runs entirely in the browser with no backend or build process required.

## Running the Application

### Local Development

For local testing, you must run a web server due to browser CORS restrictions:

```bash
./serve.sh
```

This starts a Python HTTP server on `http://localhost:8000`. Open this URL in your browser.

To use a different port:
```bash
./serve.sh 3000
```

### Production/Deployment

When hosted on a web server (GitHub Pages, Netlify, etc.), simply open `index.html` in any modern web browser. No build step, no backend, no dependencies to install.

## Architecture

### Single-Page Application Structure

The app uses vanilla JavaScript with a screen-based navigation system:
- **Screens**: `exam-selector`, `test-selector`, `test-screen`, `results-screen`
- **Screen switching**: `showScreen(screenId)` function in `js/app.js` toggles `.active` class
- **State management**: Global variables in `js/app.js` track current exam, test, question index, and user answers

### Question Data Architecture

Questions are stored in JSON files in `data/` directory:
- Each subject has its own JSON file (e.g., `data/maths.json`, `data/english.json`)
- Each JSON file contains multiple test objects keyed by test ID (e.g., `test1`, `test2`)
- Each test object has:
  - `title`: Display name
  - `questions`: Array of question objects
  - Optional `passage`: Reading comprehension text (for English/Verbal Skills)
  - Optional `passageTitle`: Title for the passage

### Question Object Format

```json
{
  "id": 1,
  "question": "Question text here",
  "options": [
    { "letter": "A", "text": "Option text" },
    { "letter": "B", "text": "Option text" },
    ...
  ],
  "correctAnswer": "A",
  "instruction": "Optional instruction text"
}
```

### Passage Display Logic

Reading passages are conditionally displayed based on exam type and question ID:
- **English test**: Passage shown for questions 1-28 (reading comprehension section)
- **Verbal Skills test**: Passage shown for questions 1-14 (reading comprehension section)
- Logic in `displayQuestion()` function at `js/app.js:152-166`

### Review Mode

After test submission, users can review answers:
- `reviewMode` flag controls whether answer review is active
- In review mode:
  - Correct answers highlighted in green (`.correct` class)
  - Incorrect user answers highlighted in red (`.incorrect` class)
  - Options are non-clickable (`cursor: default`)
  - Navigation works but submit button is hidden

### Data Loading

All question data is loaded asynchronously on page load:
- `loadQuestionData()` fetches all JSON files in parallel using `Promise.all()`
- `questionDatabase` object stores all loaded data
- Data loading happens before app initialization in DOMContentLoaded event

## Key Implementation Details

### State Variables (js/app.js:1-7)
- `currentExam`: Current exam type slug (e.g., 'maths', 'english')
- `currentTest`: Current test key (e.g., 'test1', 'test2')
- `currentQuestionIndex`: 0-based index of current question
- `userAnswers`: Object mapping question IDs to selected letters
- `questionDatabase`: Nested object containing all loaded question data
- `reviewMode`: Boolean flag for review mode after test submission

### Navigation Flow
1. Exam selector → Test selector → Test screen → Results screen
2. Results screen → Review mode (back to test screen with `reviewMode=true`)
3. Each screen has back button to previous screen

### Progress Tracking
- Question counter: "Question X of Y" updated in `displayQuestion()`
- Progress bar: Visual percentage indicator updated via `progress-fill` width
- User answers stored in `userAnswers` object throughout test session

## Google Analytics

The application includes Google Analytics tracking with measurement ID `G-KNVM44YVQV` configured in the `<head>` section of `index.html`.

## Adding New Questions

1. Edit the appropriate JSON file in `data/` directory
2. Add question objects to the `questions` array of the relevant test
3. Follow the question object format documented above
4. For questions with diagrams/images:
   - Add an `"image": "images/filename.png"` field to the question object
   - Place the image file in the `images/` directory
   - Use the extraction script: `python3 extract_question_images.py`
5. For reading comprehension questions, add a `passage` field to the test object

## Image Support

Questions can include images by adding an `image` field with the relative path to the image file:

```json
{
  "id": 4,
  "question": "The hills are at (3, 4). The lighthouse is at ( , ).",
  "image": "images/maths_q4_grid.png",
  "options": [...],
  "correctAnswer": "B"
}
```

### Extracting Images from PDFs

Use the provided script to extract diagrams from PDF exam files:

```bash
python3 extract_question_images.py
```

This script extracts images for questions that require visual diagrams (coordinate grids, charts, shapes, etc.) and saves them to the `images/` directory. Adjust crop coordinates in the script as needed for new questions.

#### Image Extraction Best Practices

When extracting images from PDFs, follow these principles to avoid duplication and ensure clean presentation:

**What to INCLUDE:**
- The essential visual diagram, chart, graph, or shape that the question refers to
- Answer option letters (A-E) if they are part of the visual diagram itself (e.g., labeled shapes)

**What to EXCLUDE:**
- Question text - this belongs in the JSON `question` field
- Answer options text - this belongs in the JSON `options` array
- Superfluous text or labels that will be duplicated in the JSON
- Extra whitespace at edges

**Example:** For a question with 3D shapes labeled A-E:
- ✅ Include: The shapes with their A-E labels
- ❌ Exclude: The question text "Which shape has the most faces?"
- ❌ Exclude: Answer options like "A. Shape A", "B. Shape B", etc.

Crop coordinates should be adjusted iteratively to capture exactly what's needed and nothing more.

## File Organization

- `index.html`: Single-page app shell with all screens defined
- `css/style.css`: All styling including responsive design
- `js/app.js`: All application logic and state management
- `data/*.json`: Question data organized by subject
- `exams/`: Source PDF files (reference only, not used by app)
- `images/`: Directory for question images (currently unused)
