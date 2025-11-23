// Application state
let currentExam = null;
let currentTest = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let questionDatabase = {};
let reviewMode = false;
let debugMode = false;
let currentQuestions = [];
let timerEnabled = false;
let timerInterval = null;
let timerTargetMs = 0;
let timerExpiredEventFired = false;
let testStartTime = null;
let testEndTime = null;
let currentPassageHtml = '';
let focusedOptionIndex = -1;

const examTimerDefaults = {
    'maths': 50,
    'english': 50,
    'verbal-reasoning': 60,
    'verbal-skills': 60,
    'non-verbal-reasoning': 60
};

function getCurrentQuestions() {
    if (currentQuestions.length) {
        return currentQuestions;
    }
    if (currentExam && currentTest && questionDatabase[currentExam] && questionDatabase[currentExam][currentTest]) {
        return questionDatabase[currentExam][currentTest].questions || [];
    }
    return [];
}

function getCorrectAnswers(question) {
    if (!question) return [];
    if (Array.isArray(question.correctAnswers)) {
        return question.correctAnswers;
    }
    if (Array.isArray(question.correctAnswer)) {
        return question.correctAnswer;
    }
    if (typeof question.correctAnswer === 'string' && question.correctAnswer.includes(',')) {
        return question.correctAnswer.split(',').map(answer => answer.trim()).filter(Boolean);
    }
    return question.correctAnswer ? [question.correctAnswer] : [];
}

function getRequiredSelectionCount(question) {
    const answers = getCorrectAnswers(question);
    return Math.max(answers.length, 1);
}

function getUserSelections(questionId) {
    const stored = userAnswers[questionId];
    if (!stored) {
        return [];
    }
    if (Array.isArray(stored)) {
        return stored;
    }
    return [stored];
}

function setUserSelections(questionId, selections) {
    if (!selections || selections.length === 0) {
        delete userAnswers[questionId];
        return;
    }
    // Ensure unique selections while preserving order of selection
    const unique = [];
    selections.forEach(selection => {
        if (!unique.includes(selection)) {
            unique.push(selection);
        }
    });
    userAnswers[questionId] = unique;
}

function isQuestionAnswered(question) {
    const requiredSelections = getRequiredSelectionCount(question);
    return getUserSelections(question.id).length === requiredSelections;
}

function areAnswersCorrect(question, selections) {
    const correct = getCorrectAnswers(question);
    if (selections.length !== correct.length) {
        return false;
    }
    const sortedSelections = [...selections].sort();
    const sortedCorrect = [...correct].sort();
    return sortedCorrect.every((answer, index) => answer === sortedSelections[index]);
}

function getBaseTimerMinutes(examType) {
    return examTimerDefaults[examType] || 0;
}

function formatDurationFromMs(ms) {
    if (!ms || ms <= 0) {
        return '0:00';
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (val) => val.toString().padStart(2, '0');
    if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${minutes}:${pad(seconds)}`;
}

function formatDurationFromMinutes(minutes) {
    if (!minutes || minutes <= 0) {
        return '0:00';
    }
    return formatDurationFromMs(minutes * 60 * 1000);
}

function updateTimerPreview(examType, testKey, totalQuestions, selectedValue) {
    const durationElement = document.getElementById(`timer-duration-${testKey}`);
    if (!durationElement) return;
    const baseMinutes = getBaseTimerMinutes(examType);
    if (!baseMinutes || !totalQuestions) {
        durationElement.textContent = 'N/A';
        return;
    }
    const selectedCount = selectedValue === 'all'
        ? totalQuestions
        : Math.min(parseInt(selectedValue, 10) || totalQuestions, totalQuestions);
    const ratio = selectedCount / totalQuestions;
    const computedMinutes = baseMinutes * ratio;
    durationElement.textContent = formatDurationFromMinutes(computedMinutes);
}

function clearActiveTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function showTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    const timerValue = document.getElementById('timer-value');
    const timerLabel = document.getElementById('timer-label');
    if (timerDisplay && timerValue && timerLabel) {
        timerDisplay.style.display = 'flex';
        timerLabel.textContent = 'Time left:';
        timerValue.textContent = formatDurationFromMs(timerTargetMs);
        timerDisplay.classList.remove('timer-negative');
    }
}

function hideTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    const timerValue = document.getElementById('timer-value');
    const timerLabel = document.getElementById('timer-label');
    if (timerDisplay && timerValue && timerLabel) {
        timerDisplay.style.display = 'none';
        timerLabel.textContent = 'Time left:';
        timerValue.textContent = '--:--';
        timerDisplay.classList.remove('timer-negative');
    }
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    const timerValue = document.getElementById('timer-value');
    const timerLabel = document.getElementById('timer-label');
    if (!timerDisplay || !timerValue || !timerLabel || !testStartTime) {
        return;
    }

    const elapsed = Date.now() - testStartTime;
    const remaining = timerTargetMs - elapsed;
    const isNegative = remaining <= 0;
    const displayMs = isNegative ? Math.abs(remaining) : remaining;

    timerValue.textContent = `${isNegative ? '-' : ''}${formatDurationFromMs(displayMs)}`;
    timerLabel.textContent = isNegative ? 'Over time:' : 'Time left:';
    timerDisplay.classList.toggle('timer-negative', isNegative);

    // Track timer expiry in Google Analytics (only once)
    if (isNegative && !timerExpiredEventFired) {
        timerExpiredEventFired = true;
        if (typeof gtag !== 'undefined') {
            const testData = questionDatabase[currentExam] && questionDatabase[currentExam][currentTest];
            gtag('event', 'timer_expired', {
                'exam_type': currentExam,
                'test_name': testData ? (testData.title || currentTest) : currentTest,
                'event_category': 'engagement',
                'event_label': `${currentExam}_${currentTest}`
            });
        }
    }
}

function startTimerCountdown() {
    if (!timerEnabled || !timerTargetMs) {
        hideTimerDisplay();
        return;
    }
    showTimerDisplay();
    updateTimerDisplay();
    clearActiveTimer();
    timerInterval = setInterval(updateTimerDisplay, 1000);

    // Track timer start in Google Analytics
    if (typeof gtag !== 'undefined') {
        const testData = questionDatabase[currentExam] && questionDatabase[currentExam][currentTest];
        gtag('event', 'timer_started', {
            'exam_type': currentExam,
            'test_name': testData ? (testData.title || currentTest) : currentTest,
            'duration_seconds': Math.round(timerTargetMs / 1000),
            'event_category': 'engagement',
            'event_label': `${currentExam}_${currentTest}`
        });
    }
}

function stopTimerCountdown() {
    clearActiveTimer();
    hideTimerDisplay();
}

// Data loading configuration
const dataFiles = {
    'maths': 'data/maths.json',
    'english': 'data/english.json',
    'verbal-reasoning': 'data/verbal-reasoning.json',
    'non-verbal-reasoning': 'data/non-verbal-reasoning.json',
    'verbal-skills': 'data/verbal-skills.json'
};

// Load all question data
async function loadQuestionData() {
    try {
        const loadPromises = Object.entries(dataFiles).map(async ([key, filepath]) => {
            const response = await fetch(filepath);
            const data = await response.json();
            return { key, data };
        });

        const results = await Promise.all(loadPromises);

        results.forEach(({ key, data }) => {
            questionDatabase[key] = data;
        });

        console.log('Question data loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading question data:', error);
        alert('Failed to load question data. Please refresh the page.');
        return false;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Check for debug mode
    const urlParams = new URLSearchParams(window.location.search);
    debugMode = urlParams.get('debug') === 'true';

    // Show loading state
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.opacity = '0.5';
    }

    // Load data
    const loaded = await loadQuestionData();

    if (loaded) {
        setupEventListeners();
        showScreen('exam-selector');

        // Remove loading state
        if (appContainer) {
            appContainer.style.opacity = '1';
        }
    }
});

function setupEventListeners() {
    // Exam selector buttons
    document.querySelectorAll('.exam-button').forEach(button => {
        button.addEventListener('click', () => {
            const examType = button.dataset.exam;
            selectExam(examType);
        });
    });

    // Global keyboard handler for test screen
    document.addEventListener('keydown', (e) => {
        const testScreen = document.getElementById('test-screen');
        if (!testScreen || !testScreen.classList.contains('active')) return;
        if (reviewMode) return;

        const questions = getCurrentQuestions();
        if (questions.length === 0) return;

        const question = questions[currentQuestionIndex];
        const optionCount = question.options ? question.options.length : 0;

        // Handle Enter key - submit/advance
        if (e.key === 'Enter') {
            if (!isQuestionAnswered(question)) return;

            e.preventDefault();
            const isLastQuestion = currentQuestionIndex === questions.length - 1;
            if (isLastQuestion) {
                submitTest();
            } else {
                nextQuestion();
            }
            return;
        }

        // Handle arrow keys - navigate focus
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();

            if (optionCount === 0) return;

            if (e.key === 'ArrowDown') {
                focusedOptionIndex = (focusedOptionIndex + 1) % optionCount;
            } else {
                focusedOptionIndex = (focusedOptionIndex - 1 + optionCount) % optionCount;
            }

            updateOptionFocus();
            return;
        }

        // Handle space key - select/deselect focused option
        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();

            if (focusedOptionIndex >= 0 && focusedOptionIndex < optionCount) {
                const optionLetter = question.options[focusedOptionIndex].letter;
                selectOption(question.id, optionLetter);
            }
            return;
        }
    });
}

function updateOptionFocus() {
    const optionsContainer = document.getElementById('options');
    if (!optionsContainer) return;

    const optionElements = optionsContainer.querySelectorAll('.option');
    optionElements.forEach((optionEl, index) => {
        if (index === focusedOptionIndex) {
            optionEl.classList.add('focused');
        } else {
            optionEl.classList.remove('focused');
        }
    });

    // Scroll focused option into view if needed
    if (focusedOptionIndex >= 0 && focusedOptionIndex < optionElements.length) {
        optionElements[focusedOptionIndex].scrollIntoView({
            block: 'nearest',
            behavior: 'smooth'
        });
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    if (screenId !== 'test-screen') {
        stopTimerCountdown();
    }
}

function selectExam(examType) {
    currentExam = examType;
    const examData = questionDatabase[examType];

    // Track exam selection in Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'exam_selected', {
            'exam_type': examType,
            'event_category': 'engagement',
            'event_label': examType
        });
    }

    // Update title
    const titleMap = {
        'maths': 'Maths Tests',
        'english': 'English Tests',
        'verbal-reasoning': 'Verbal Reasoning Tests',
        'non-verbal-reasoning': 'Non-Verbal Reasoning Tests',
        'verbal-skills': 'Verbal Skills Tests'
    };

    document.getElementById('exam-title').textContent = titleMap[examType];

    // Populate test list
    const testList = document.getElementById('test-list');
    testList.innerHTML = '';

    Object.keys(examData).forEach(testKey => {
        const test = examData[testKey];
        if (test.questions && test.questions.length > 0) {
            // Create test card container
            const testCard = document.createElement('div');
            testCard.className = 'test-card';
            const baseTimerMinutes = getBaseTimerMinutes(examType);

            // Test title and question count
            const testInfo = document.createElement('div');
            testInfo.className = 'test-info';
            testInfo.innerHTML = `
                <div class="test-title">${test.title}</div>
                <div class="test-question-count">${test.questions.length} questions</div>
            `;
            testCard.appendChild(testInfo);

            // Question count selector
            const selectorContainer = document.createElement('div');
            selectorContainer.className = 'test-controls';

            const selectLabel = document.createElement('label');
            selectLabel.textContent = 'Number of questions: ';
            selectLabel.style.fontSize = '0.9em';
            selectLabel.style.marginRight = '10px';

            const select = document.createElement('select');
            select.id = `question-count-${testKey}`;
            select.className = 'question-count-selector';

            // Add options
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = `All (${test.questions.length})`;
            select.appendChild(allOption);

            [5, 10, 15, 20, 25].forEach(count => {
                if (count < test.questions.length) {
                    const option = document.createElement('option');
                    option.value = count;
                    option.textContent = count;
                    select.appendChild(option);
                }
            });

            select.addEventListener('change', () => {
                updateTimerPreview(examType, testKey, test.questions.length, select.value);
            });

            selectorContainer.appendChild(selectLabel);
            selectorContainer.appendChild(select);
            testCard.appendChild(selectorContainer);

            const timerControls = document.createElement('div');
            timerControls.className = 'timer-controls';
            const timerLabel = document.createElement('label');
            timerLabel.className = 'timer-toggle';

            const timerCheckbox = document.createElement('input');
            timerCheckbox.type = 'checkbox';
            timerCheckbox.id = `timer-toggle-${testKey}`;
            timerCheckbox.disabled = baseTimerMinutes === 0;

            // Track timer toggle in Google Analytics
            timerCheckbox.addEventListener('change', (e) => {
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'timer_toggled', {
                        'exam_type': examType,
                        'test_name': test.title || testKey,
                        'timer_enabled': e.target.checked,
                        'event_category': 'engagement',
                        'event_label': `${examType}_${testKey}`
                    });
                }
            });

            timerLabel.appendChild(timerCheckbox);

            const timerText = document.createElement('span');
            if (baseTimerMinutes > 0) {
                const durationSpan = document.createElement('span');
                durationSpan.id = `timer-duration-${testKey}`;
                durationSpan.className = 'timer-duration-value';
                durationSpan.textContent = formatDurationFromMinutes(baseTimerMinutes);
                timerText.appendChild(document.createTextNode('Enable timer ('));
                timerText.appendChild(durationSpan);
                timerText.appendChild(document.createTextNode(')'));
            } else {
                timerText.textContent = 'Timer unavailable';
            }

            timerLabel.appendChild(timerText);
            timerControls.appendChild(timerLabel);
            testCard.appendChild(timerControls);

            // Start test button
            const startButton = document.createElement('button');
            startButton.className = 'start-test-button';
            startButton.textContent = 'Start Test';
            startButton.onclick = () => startTest(testKey);
            testCard.appendChild(startButton);

            testList.appendChild(testCard);

            updateTimerPreview(examType, testKey, test.questions.length, select.value);
        }
    });

    showScreen('test-selector');
}

function startTest(testKey) {
    currentTest = testKey;
    currentQuestionIndex = 0;
    userAnswers = {};
    reviewMode = false;

    const testData = questionDatabase[currentExam][currentTest];
    const fullQuestionSet = testData.questions || [];
    const totalQuestions = fullQuestionSet.length;

    if (totalQuestions === 0) {
        alert('This test is not yet available.');
        return;
    }

    // Check if user selected a specific number of questions
    const questionCountSelect = document.getElementById(`question-count-${testKey}`);
    const questionCount = questionCountSelect ? questionCountSelect.value : 'all';

    let selectedQuestions = [...fullQuestionSet];

    if (questionCount !== 'all') {
        const count = parseInt(questionCount, 10);
        // Randomly select N questions without mutating the source array
        const shuffled = [...fullQuestionSet].sort(() => Math.random() - 0.5);
        selectedQuestions = shuffled.slice(0, Math.min(count, fullQuestionSet.length));
    }
    currentQuestions = selectedQuestions;
    const selectedQuestionCount = currentQuestions.length;

    // Track test start in Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'test_started', {
            'exam_type': currentExam,
            'test_name': testData.title || testKey,
            'question_count': selectedQuestionCount,
            'total_questions': totalQuestions,
            'event_category': 'engagement',
            'event_label': `${currentExam}_${testKey}`
        });
    }

    // Setup passage if present (visibility will be handled by displayQuestion)
    const passageTitleElement = document.getElementById('passage-title');
    const passageTextElement = document.getElementById('passage-text');
    if (testData.passageTitle) {
        passageTitleElement.textContent = testData.passageTitle;
    } else {
        passageTitleElement.textContent = 'Reading Passage';
    }

    if (testData.passageImage) {
        const imagePaths = Array.isArray(testData.passageImage) ? testData.passageImage : [testData.passageImage];
        passageTextElement.innerHTML = imagePaths.map((src, index) =>
            `<img src="${src}" alt="Reading passage page ${index + 1}" class="passage-image">`
        ).join('');
        passageTextElement.classList.add('has-image');
    } else if (testData.passage) {
        currentPassageHtml = formatPassageWithLineNumbers(testData.passage);
        passageTextElement.innerHTML = currentPassageHtml;
        passageTextElement.classList.remove('has-image');
    } else {
        currentPassageHtml = '';
        passageTextElement.innerHTML = '';
        passageTextElement.classList.remove('has-image');
    }

    testStartTime = Date.now();
    testEndTime = null;
    clearActiveTimer();
    timerEnabled = false;
    timerTargetMs = 0;
    timerExpiredEventFired = false;

    const baseTimerMinutes = getBaseTimerMinutes(currentExam);
    const timerToggle = document.getElementById(`timer-toggle-${testKey}`);
    if (timerToggle && timerToggle.checked && baseTimerMinutes > 0 && totalQuestions > 0) {
        const ratio = selectedQuestionCount / totalQuestions;
        timerTargetMs = Math.round(baseTimerMinutes * 60 * 1000 * ratio);
        timerEnabled = timerTargetMs > 0;
    }

    showScreen('test-screen');

    // Show debug panel if in debug mode
    if (debugMode) {
        showDebugPanel();
    } else {
        hideDebugPanel();
    }

    if (timerEnabled) {
        startTimerCountdown();
    } else {
        stopTimerCountdown();
    }

    focusedOptionIndex = -1; // Reset focus for new test
    displayQuestion();
}

function showDebugPanel() {
    const testScreen = document.getElementById('test-screen');
    testScreen.classList.add('debug-mode');

    const questions = currentQuestions;

    // Save scroll position before removing panel
    const existingPanel = document.querySelector('.debug-panel');
    const existingList = document.querySelector('.debug-question-list');
    const scrollPosition = existingList ? existingList.scrollTop : 0;

    let debugHTML = '<div class="debug-panel"><button class="debug-panel-toggle" onclick="toggleDebugPanel()" title="Toggle navigation">◀</button><h3>Debug: Questions</h3><ul class="debug-question-list">';
    questions.forEach((q, index) => {
        const answered = isQuestionAnswered(q) ? '✓' : '';
        const hasImage = q.image ? '*' : '';
        const current = index === currentQuestionIndex ? 'current' : '';
        debugHTML += `<li class="${current}" onclick="jumpToQuestion(${index})">
            <span class="q-num">Q${q.id}${hasImage}</span> ${answered}
        </li>`;
    });
    debugHTML += '</ul></div>';

    // Remove existing debug panel if any
    if (existingPanel) {
        existingPanel.remove();
    }

    // Insert debug panel
    testScreen.insertAdjacentHTML('afterbegin', debugHTML);

    // Restore scroll position after browser renders
    requestAnimationFrame(() => {
        const newList = document.querySelector('.debug-question-list');
        if (newList) {
            newList.scrollTop = scrollPosition;
        }
    });
}

function hideDebugPanel() {
    const testScreen = document.getElementById('test-screen');
    testScreen.classList.remove('debug-mode');
    const debugPanel = document.querySelector('.debug-panel');
    if (debugPanel) {
        debugPanel.remove();
    }
}

function jumpToQuestion(index) {
    currentQuestionIndex = index;
    focusedOptionIndex = -1; // Reset focus when jumping to a question
    displayQuestion();
    if (debugMode) {
        showDebugPanel();
    }
}

function toggleDebugPanel() {
    const debugPanel = document.querySelector('.debug-panel');
    const toggleButton = document.querySelector('.debug-panel-toggle');
    const testScreen = document.getElementById('test-screen');
    if (!debugPanel || !toggleButton || !testScreen) return;

    const isCollapsed = debugPanel.classList.toggle('collapsed');
    testScreen.classList.toggle('collapsed', isCollapsed);
    toggleButton.textContent = isCollapsed ? '▶' : '◀';
    toggleButton.title = isCollapsed ? 'Expand navigation' : 'Collapse navigation';
}

function displayQuestion() {
    const testData = questionDatabase[currentExam][currentTest];
    const questions = getCurrentQuestions();
    const question = questions[currentQuestionIndex];
    const userSelections = getUserSelections(question.id);
    const requiredSelections = getRequiredSelectionCount(question);

    // Update question counter
    document.getElementById('question-counter').textContent =
        `Question ${currentQuestionIndex + 1} of ${questions.length}`;

    // Update progress bar
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;

    // Show/hide passage based on question
    const passageContainer = document.getElementById('passage-container');
    let showPassage = false;

    if (testData.passage) {
        // For English test, show passage for questions 1-28 (reading comprehension)
        if (currentExam === 'english' && question.id >= 1 && question.id <= 28) {
            showPassage = true;
        }
        // For Verbal Skills test, show passage for questions 1-14 (reading comprehension)
        else if (currentExam === 'verbal-skills' && question.id >= 1 && question.id <= 14) {
            showPassage = true;
        }
    }

    passageContainer.style.display = showPassage ? 'flex' : 'none';

    // Display question
    document.getElementById('question-number').textContent = question.id;

    // Display instruction if present
    const instructionElement = document.getElementById('question-instruction');
    let instructionText = question.instruction || '';
    if (requiredSelections > 1) {
        const multiSelectNote = `Select ${requiredSelections} answers.`;
        instructionText = instructionText ? `${instructionText}\n\n${multiSelectNote}` : multiSelectNote;
    }
    if (instructionText) {
        instructionElement.textContent = instructionText;
        instructionElement.style.display = 'block';
    } else {
        instructionElement.style.display = 'none';
    }

    // Show alphabet reference for Verbal Reasoning Test 1, questions 45-51
    const alphabetElement = document.getElementById('alphabet-reference');
    const showAlphabet = currentExam === 'verbal-reasoning' &&
                         currentTest === 'test1' &&
                         question.id >= 45 &&
                         question.id <= 51;
    alphabetElement.style.display = showAlphabet ? 'block' : 'none';

    // Display image if present (before question text)
    const imageContainer = document.getElementById('question-image');
    if (question.image) {
        imageContainer.innerHTML = `<img src="${question.image}" alt="Question ${question.id} diagram">`;
        imageContainer.style.display = 'block';
    } else {
        imageContainer.innerHTML = '';
        imageContainer.style.display = 'none';
    }

    // Display question text (always shown)
    const questionTextElement = document.getElementById('question-text');
    questionTextElement.textContent = question.question;
    questionTextElement.style.display = 'block';

    // Display options
    const optionsContainer = document.getElementById('options');
    optionsContainer.innerHTML = '';

    const correctAnswers = getCorrectAnswers(question);

    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.dataset.letter = option.letter;

        const isCorrectAnswer = correctAnswers.includes(option.letter);
        const isUserAnswer = userSelections.includes(option.letter);
        const isFocused = index === focusedOptionIndex;

        if (reviewMode) {
            // In review mode, show correct and incorrect answers
            if (isCorrectAnswer) {
                optionDiv.classList.add('correct');
            }
            if (isUserAnswer && !isCorrectAnswer) {
                optionDiv.classList.add('incorrect');
            }
            if (isUserAnswer) {
                optionDiv.classList.add('selected');
            }
            // Disable clicking in review mode
            optionDiv.style.cursor = 'default';
        } else {
            // Normal mode - just show selection
            if (isUserAnswer) {
                optionDiv.classList.add('selected');
            }
            if (isFocused) {
                optionDiv.classList.add('focused');
            }
            optionDiv.onclick = () => selectOption(question.id, option.letter);
        }

        optionDiv.innerHTML = `
            <div class="option-letter">${option.letter}</div>
            <div class="option-text">${option.text}</div>
        `;

        optionsContainer.appendChild(optionDiv);
    });

    // Update navigation buttons
    document.getElementById('prev-button').disabled = currentQuestionIndex === 0;

    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const isCurrentQuestionAnswered = isQuestionAnswered(question);

    if (reviewMode) {
        // In review mode, hide submit button, always show next button
        document.getElementById('next-button').style.display = isLastQuestion ? 'none' : 'block';
        document.getElementById('next-button').disabled = false;
        document.getElementById('submit-button').style.display = 'none';
    } else {
        // Normal mode - require answer before continuing
        if (isLastQuestion) {
            document.getElementById('next-button').style.display = 'none';
            document.getElementById('submit-button').style.display = 'block';
            document.getElementById('submit-button').disabled = !isCurrentQuestionAnswered;
        } else {
            document.getElementById('next-button').style.display = 'block';
            document.getElementById('next-button').disabled = !isCurrentQuestionAnswered;
            document.getElementById('submit-button').style.display = 'none';
        }
    }
}

function selectOption(questionId, letter) {
    if (reviewMode) {
        return;
    }

    const question = getCurrentQuestions().find(q => q.id === questionId);
    if (!question) {
        return;
    }

    // Update focused index to match clicked option
    const optionIndex = question.options.findIndex(opt => opt.letter === letter);
    if (optionIndex >= 0) {
        focusedOptionIndex = optionIndex;
    }

    const requiredSelections = getRequiredSelectionCount(question);
    const allowsMultiple = requiredSelections > 1;
    let selections = getUserSelections(questionId);

    if (allowsMultiple) {
        if (selections.includes(letter)) {
            selections = selections.filter(selection => selection !== letter);
        } else {
            if (selections.length >= requiredSelections) {
                return;
            }
            selections = [...selections, letter];
        }
    } else {
        // Single-select: toggle if same option, otherwise select new option
        if (selections.includes(letter)) {
            selections = [];
        } else {
            selections = [letter];
        }
    }

    setUserSelections(questionId, selections);
    displayQuestion();
    if (debugMode) {
        showDebugPanel();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        focusedOptionIndex = -1; // Reset focus when changing questions
        displayQuestion();
    }
}

function nextQuestion() {
    const questions = getCurrentQuestions();
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        focusedOptionIndex = -1; // Reset focus when changing questions
        displayQuestion();
    }
}

function submitTest() {
    const questions = getCurrentQuestions();

    // Check if all questions are answered
    const unansweredCount = questions.filter(question => !isQuestionAnswered(question)).length;

    if (unansweredCount > 0) {
        const confirmSubmit = confirm(
            `You have ${unansweredCount} unanswered question(s). Do you want to submit anyway?`
        );
        if (!confirmSubmit) return;
    }

    testEndTime = Date.now();
    stopTimerCountdown();

    calculateResults();
    showScreen('results-screen');
}

function calculateResults() {
    const questions = getCurrentQuestions();
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    questions.forEach(question => {
        const selections = getUserSelections(question.id);

        if (selections.length === 0) {
            unanswered++;
        } else if (areAnswersCorrect(question, selections)) {
            correct++;
        } else {
            incorrect++;
        }
    });

    const percentage = Math.round((correct / questions.length) * 100);

    // Update results display
    document.getElementById('score-percentage').textContent = `${percentage}%`;
    document.getElementById('correct-count').textContent = correct;
    document.getElementById('incorrect-count').textContent = incorrect;
    document.getElementById('unanswered-count').textContent = unanswered;

    const timeSummaryElement = document.getElementById('time-summary');
    if (timeSummaryElement) {
        let timeText = 'Time taken: --';
        if (testStartTime) {
            const endTime = testEndTime || Date.now();
            const elapsedMs = Math.max(endTime - testStartTime, 0);
            const targetText = timerTargetMs ? ` (target ${formatDurationFromMs(timerTargetMs)})` : '';
            timeText = `Time taken: ${formatDurationFromMs(elapsedMs)}${targetText}`;
        }
        timeSummaryElement.textContent = `Summary: ${correct} correct, ${incorrect} incorrect, ${unanswered} unanswered. ${timeText}`;
    }

    // Track test completion in Google Analytics
    if (typeof gtag !== 'undefined') {
        const testData = questionDatabase[currentExam][currentTest];
        const elapsedMs = testEndTime && testStartTime ? testEndTime - testStartTime : 0;
        const elapsedSeconds = Math.round(elapsedMs / 1000);

        gtag('event', 'test_completed', {
            'exam_type': currentExam,
            'test_name': testData.title || currentTest,
            'score_percentage': percentage,
            'correct_count': correct,
            'incorrect_count': incorrect,
            'unanswered_count': unanswered,
            'total_questions': questions.length,
            'time_seconds': elapsedSeconds,
            'timer_enabled': timerEnabled,
            'event_category': 'engagement',
            'event_label': `${currentExam}_${currentTest}`,
            'value': percentage
        });
    }
}

function reviewAnswers() {
    // Reset to first question and show test screen in review mode
    currentQuestionIndex = 0;
    reviewMode = true;
    hideTimerDisplay();

    // Track review mode in Google Analytics
    if (typeof gtag !== 'undefined') {
        const testData = questionDatabase[currentExam][currentTest];
        gtag('event', 'review_started', {
            'exam_type': currentExam,
            'test_name': testData.title || currentTest,
            'event_category': 'engagement',
            'event_label': `${currentExam}_${currentTest}`
        });
    }

    focusedOptionIndex = -1; // Reset focus for review mode
    showScreen('test-screen');
    displayQuestion();
}
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatPassageWithLineNumbers(passageText) {
    if (!passageText) return '';
    const lines = passageText.split(/\r?\n/);
    let lineNumber = 1;
    return lines.map(line => {
        if (!line.trim()) {
            return '<div class="passage-line empty">&nbsp;</div>';
        }
        const numberLabel = lineNumber.toString().padStart(2, '0');
        const escapedLine = escapeHtml(line);
        lineNumber++;
        return `<div class="passage-line"><span class="line-number">${numberLabel}</span><span class="line-text">${escapedLine}</span></div>`;
    }).join('');
}
