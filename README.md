# 11+ Practice Test Application

A simple, mobile-friendly browser-based application for practicing 11+ exam questions.

## Features

- ✅ Mobile-responsive design
- ✅ Multiple exam types (Maths, English, Verbal Reasoning, etc.)
- ✅ Progress tracking
- ✅ Instant scoring
- ✅ Review answers after completion
- ✅ No server required - runs entirely in the browser

## How to Use

### For Local Testing (Recommended)

Due to browser security restrictions, you need to run a local web server:

```bash
./serve.sh
```

Then open http://localhost:8000 in your browser.

Alternatively, you can specify a different port:
```bash
./serve.sh 3000  # Use port 3000 instead
```

### For Deployed/Hosted Sites

Simply open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge)

### Taking the Test

1. **Select exam type**: Choose from Maths, English, Verbal Reasoning, Non-Verbal Reasoning, or Verbal Skills
2. **Take the test**: Answer questions by clicking on options (you must answer each question to continue)
3. **Navigate**: Use Previous/Next buttons to move between questions
4. **Submit**: Click Submit on the last question to see your results
5. **Review**: Review your answers to see which were correct/incorrect

## Current Status

- **Maths Test 1**: 20 sample questions loaded (out of 50 in the PDF)
- **Other tests**: Structure ready, questions need to be added

## How to Add More Questions

Edit the relevant JSON file in the `data/` folder (e.g., `data/maths.json`) and add questions following this format:

```json
{
    "id": 1,
    "question": "Your question text here",
    "options": [
        { "letter": "A", "text": "First option" },
        { "letter": "B", "text": "Second option" },
        { "letter": "C", "text": "Third option" },
        { "letter": "D", "text": "Fourth option" },
        { "letter": "E", "text": "Fifth option" }
    ],
    "correctAnswer": "A"
}
```

## File Structure

```
11plus/
├── index.html          # Main HTML structure
├── css/
│   └── style.css       # Styling and responsive design
├── js/
│   └── app.js          # Application logic
├── data/               # Question data (JSON files)
│   ├── maths.json
│   ├── english.json
│   ├── verbal-reasoning.json
│   ├── non-verbal-reasoning.json
│   └── verbal-skills.json
├── images/             # Question images (for future use)
└── exams/              # Original PDF files
    ├── Maths/
    ├── English/
    ├── Verbal Reasoning/
    └── ...
```

## Next Steps

1. **Add remaining questions**: Extract questions 21-50 from Maths_1_Test Booklet.pdf
2. **Add Maths Test 2**: Extract questions from Maths_2_Test Booklet.pdf
3. **Add other subjects**: Extract questions from English, Verbal Reasoning, etc.
4. **Add images**: For questions with diagrams, save images and reference them in questions
5. **Add timer**: Optional timed mode for realistic exam practice
6. **Save progress**: Use localStorage to save progress between sessions

## Sharing the Application

Since this is a pure HTML/CSS/JS application, you can share it by:

1. **Send the folder**: Zip the entire folder and send via email/cloud storage
2. **Host on GitHub Pages**: Free static hosting
3. **Host on Netlify/Vercel**: Free static hosting with drag-and-drop
4. **Local network**: Share via file sharing on same WiFi network

Users just need to open `index.html` in their browser - no installation required!

## Browser Compatibility

Works on:
- Chrome/Edge (Desktop & Mobile)
- Firefox (Desktop & Mobile)
- Safari (Desktop & Mobile)
- Any modern browser with JavaScript enabled

## Tips for Mobile Use

- Works best in landscape mode for better readability
- Can be added to home screen for app-like experience:
  - iOS: Safari → Share → Add to Home Screen
  - Android: Chrome → Menu → Add to Home Screen
