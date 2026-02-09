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
let testAbandonedEventFired = false;
let lastTrackedScreenId = null;
let lastTrackedQuestionIndex = null;
let lastTrackedQuestionTestKey = null;
let selectedTestKey = null;
let testSetupPreferences = null;

const examTimerDefaults = {
    'maths': 50,
    'english': 50,
    'verbal-reasoning': 60,
    'verbal-skills': 60,
    'non-verbal-reasoning': 60
};

// Test progress persistence
const STORAGE_KEY = 'elevenPlusTestProgress';
const HISTORY_STORAGE_KEY = 'elevenPlusTestHistory';
const TEST_SETUP_STORAGE_KEY = 'elevenPlusTestSetup';
const DEFAULT_TEST_SETUP = {
    questionCount: 'all',
    timerEnabled: false
};

function loadTestSetupPreferences() {
    try {
        const stored = localStorage.getItem(TEST_SETUP_STORAGE_KEY);
        if (!stored) {
            return { ...DEFAULT_TEST_SETUP };
        }
        const parsed = JSON.parse(stored);
        return {
            ...DEFAULT_TEST_SETUP,
            ...parsed
        };
    } catch (error) {
        console.error('Failed to load test setup preferences:', error);
        return { ...DEFAULT_TEST_SETUP };
    }
}

function saveTestSetupPreferences() {
    if (!testSetupPreferences) {
        return;
    }
    try {
        localStorage.setItem(TEST_SETUP_STORAGE_KEY, JSON.stringify(testSetupPreferences));
    } catch (error) {
        console.error('Failed to save test setup preferences:', error);
    }
}

function saveTestProgress() {
    if (!currentExam || !currentTest || reviewMode) {
        return;
    }

    const progressData = {
        currentExam,
        currentTest,
        currentQuestionIndex,
        userAnswers,
        currentQuestions,
        timerEnabled,
        timerTargetMs,
        testStartTime,
        savedAt: Date.now()
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
    } catch (error) {
        console.error('Failed to save test progress:', error);
    }
}

function loadTestProgress() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            return null;
        }
        return JSON.parse(saved);
    } catch (error) {
        console.error('Failed to load test progress:', error);
        return null;
    }
}

function clearTestProgress() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear test progress:', error);
    }
}

function checkForSavedProgress() {
    const savedProgress = loadTestProgress();
    if (!savedProgress) {
        return;
    }

    // Verify the saved data is valid
    if (!savedProgress.currentExam || !savedProgress.currentTest ||
        !questionDatabase[savedProgress.currentExam] ||
        !questionDatabase[savedProgress.currentExam][savedProgress.currentTest]) {
        clearTestProgress();
        return;
    }

    showResumeModal(savedProgress);
}

function showResumeModal(savedProgress) {
    const modal = document.getElementById('resume-modal');
    const messageElement = document.getElementById('resume-message');
    const resumeButton = document.getElementById('resume-button');
    const startFreshButton = document.getElementById('start-fresh-button');

    // Get test title for display
    const testData = questionDatabase[savedProgress.currentExam][savedProgress.currentTest];
    const testTitle = testData.title || savedProgress.currentTest;
    const examTitleMap = {
        'maths': 'Maths',
        'english': 'English',
        'verbal-reasoning': 'Verbal Reasoning',
        'non-verbal-reasoning': 'Non-Verbal Reasoning',
        'verbal-skills': 'Verbal Skills'
    };
    const examTitle = examTitleMap[savedProgress.currentExam] || savedProgress.currentExam;

    messageElement.innerHTML = `You have an unfinished test in progress:<br><strong>${examTitle} - ${testTitle}</strong><br>Question ${savedProgress.currentQuestionIndex + 1} of ${savedProgress.currentQuestions.length}`;

    // Set up button handlers
    if (typeof gtag !== 'undefined') {
        gtag('event', 'resume_modal_shown', {
            'exam_type': savedProgress.currentExam,
            'test_name': testData.title || savedProgress.currentTest,
            'question_index': savedProgress.currentQuestionIndex,
            'event_category': 'engagement'
        });
    }

    resumeButton.onclick = () => {
        modal.style.display = 'none';
        resumeTest(savedProgress);
    };

    startFreshButton.onclick = () => {
        modal.style.display = 'none';
        clearTestProgress();
        if (typeof gtag !== 'undefined') {
            gtag('event', 'resume_discarded', {
                'exam_type': savedProgress.currentExam,
                'test_name': testData.title || savedProgress.currentTest,
                'question_index': savedProgress.currentQuestionIndex,
                'event_category': 'engagement'
            });
        }
    };

    // Show the modal
    modal.style.display = 'flex';
}

function resumeTest(savedProgress) {
    // Restore state
    currentExam = savedProgress.currentExam;
    currentTest = savedProgress.currentTest;
    currentQuestionIndex = savedProgress.currentQuestionIndex;
    userAnswers = savedProgress.userAnswers || {};
    currentQuestions = savedProgress.currentQuestions || [];
    timerEnabled = savedProgress.timerEnabled || false;
    timerTargetMs = savedProgress.timerTargetMs || 0;
    testStartTime = savedProgress.testStartTime || Date.now();
    reviewMode = false;
    testEndTime = null;
    testAbandonedEventFired = false;
    lastTrackedQuestionIndex = null;
    lastTrackedQuestionTestKey = null;

    const testData = questionDatabase[currentExam][currentTest];

    // Setup passage if present
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

    // Show test screen
    showScreen('test-screen');

    // Show debug panel if in debug mode
    if (debugMode) {
        showDebugPanel();
    } else {
        hideDebugPanel();
    }

    // Resume timer if it was enabled
    if (timerEnabled && timerTargetMs > 0) {
        startTimerCountdown();
    } else {
        stopTimerCountdown();
    }

    focusedOptionIndex = -1;
    displayQuestion();

    // Track resume in Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'test_resumed', {
            'exam_type': currentExam,
            'test_name': testData.title || currentTest,
            'question_index': currentQuestionIndex,
            'event_category': 'engagement',
            'event_label': `${currentExam}_${currentTest}`
        });
    }
}

function getScreenPath(screenId) {
    if (screenId === 'exam-selector') return '/';
    if (screenId === 'test-selector') return '/tests/select';
    if (screenId === 'test-screen') return '/tests/run';
    if (screenId === 'results-screen') return '/tests/results';
    return `/${screenId || 'unknown'}`;
}

function trackScreenView(screenId) {
    if (typeof gtag === 'undefined') {
        return;
    }
    if (screenId === lastTrackedScreenId) {
        return;
    }
    lastTrackedScreenId = screenId;
    const testData = currentExam && currentTest && questionDatabase[currentExam]
        ? questionDatabase[currentExam][currentTest]
        : null;
    gtag('event', 'page_view', {
        'page_title': screenId || 'unknown',
        'page_path': getScreenPath(screenId),
        'page_location': `${window.location.origin}${getScreenPath(screenId)}`,
        'exam_type': currentExam || null,
        'test_name': testData ? (testData.title || currentTest) : null
    });
}

function trackQuestionView(question) {
    if (typeof gtag === 'undefined') {
        return;
    }
    if (!question || !currentTest) {
        return;
    }
    if (lastTrackedQuestionIndex === currentQuestionIndex && lastTrackedQuestionTestKey === currentTest) {
        return;
    }
    lastTrackedQuestionIndex = currentQuestionIndex;
    lastTrackedQuestionTestKey = currentTest;
    const testData = questionDatabase[currentExam] && questionDatabase[currentExam][currentTest];
    gtag('event', 'question_viewed', {
        'exam_type': currentExam,
        'test_name': testData ? (testData.title || currentTest) : currentTest,
        'question_id': question.id,
        'question_index': currentQuestionIndex,
        'total_questions': getCurrentQuestions().length,
        'review_mode': reviewMode,
        'event_category': 'engagement'
    });
}

function trackTestAbandoned(reason) {
    if (typeof gtag === 'undefined') {
        return;
    }
    if (testAbandonedEventFired || reviewMode || !currentTest || !testStartTime || testEndTime) {
        return;
    }
    const questions = getCurrentQuestions();
    const answeredCount = questions.filter(question => isQuestionAnswered(question)).length;
    const testData = questionDatabase[currentExam] && questionDatabase[currentExam][currentTest];
    testAbandonedEventFired = true;
    gtag('event', 'test_abandoned', {
        'exam_type': currentExam,
        'test_name': testData ? (testData.title || currentTest) : currentTest,
        'question_index': currentQuestionIndex,
        'answered_count': answeredCount,
        'total_questions': questions.length,
        'timer_enabled': timerEnabled,
        'reason': reason || 'unknown',
        'event_category': 'engagement'
    });
}

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

function updateTimerPreview(examType, totalQuestions, selectedValue, durationElementId = 'timer-duration-preview') {
    const durationElement = document.getElementById(durationElementId);
    if (!durationElement) return;
    const baseMinutes = getBaseTimerMinutes(examType);
    if (!baseMinutes || !totalQuestions) {
        durationElement.textContent = '--';
        return;
    }
    const selectedCount = selectedValue === 'all'
        ? totalQuestions
        : Math.min(parseInt(selectedValue, 10) || totalQuestions, totalQuestions);
    const ratio = selectedCount / totalQuestions;
    const computedMinutes = baseMinutes * ratio;
    durationElement.textContent = formatDurationFromMinutes(computedMinutes);
}

function updateQuestionCountOptions(totalQuestions) {
    const select = document.getElementById('question-count-select');
    if (!select) return;
    const preferredValue = testSetupPreferences ? testSetupPreferences.questionCount : 'all';

    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = totalQuestions ? `All (${totalQuestions})` : 'All';
    select.appendChild(allOption);

    [5, 10, 15, 20, 25].forEach(count => {
        if (!totalQuestions || count < totalQuestions) {
            const option = document.createElement('option');
            option.value = count;
            option.textContent = count;
            select.appendChild(option);
        }
    });

    const hasPreferred = Array.from(select.options).some(option => option.value === preferredValue);
    if (hasPreferred) {
        select.value = preferredValue;
    } else {
        select.value = 'all';
        if (testSetupPreferences) {
            testSetupPreferences.questionCount = 'all';
            saveTestSetupPreferences();
        }
    }

}

function updateSharedTimerPreview() {
    if (!currentExam || !selectedTestKey || !questionDatabase[currentExam]) {
        updateTimerPreview(currentExam, 0, 'all');
        return;
    }
    const testData = questionDatabase[currentExam][selectedTestKey];
    const totalQuestions = testData && testData.questions ? testData.questions.length : 0;
    const select = document.getElementById('question-count-select');
    const selectedValue = select ? select.value : 'all';
    updateTimerPreview(currentExam, totalQuestions, selectedValue);
}

function updateSelectedTestUI() {
    const startButton = document.getElementById('start-selected-test');
    const cards = document.querySelectorAll('.test-card.selectable');
    cards.forEach(card => {
        card.classList.toggle('selected', card.dataset.testKey === selectedTestKey);
    });

    if (startButton) {
        startButton.disabled = !selectedTestKey;
    }
}

function setSelectedTest(testKey) {
    selectedTestKey = testKey;
    const testData = currentExam && questionDatabase[currentExam]
        ? questionDatabase[currentExam][selectedTestKey]
        : null;
    const totalQuestions = testData && testData.questions ? testData.questions.length : 0;
    updateQuestionCountOptions(totalQuestions);
    updateSelectedTestUI();
    updateSharedTimerPreview();
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
    testSetupPreferences = loadTestSetupPreferences();

    if (isPerformancePage()) {
        setupEventListeners();
        initPerformancePage();
        return;
    }
    if (isMistakesPage()) {
        setupEventListeners();
        initMistakesPage();
        return;
    }

    window.addEventListener('beforeunload', () => {
        trackTestAbandoned('unload');
    });

    // Show loading state
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.opacity = '0.5';
    }

    // Load data
    const loaded = await loadQuestionData();

    if (loaded) {
        setupEventListeners();

        // Check for saved progress before showing initial screen
        checkForSavedProgress();

        showScreen('exam-selector');

        // Remove loading state
        if (appContainer) {
            appContainer.style.opacity = '1';
        }
    }
});

function isPerformancePage() {
    return document.body && document.body.dataset.page === 'performance';
}

function isMistakesPage() {
    return document.body && document.body.dataset.page === 'mistakes';
}

function initPerformancePage() {
    const examFilter = document.getElementById('trends-exam-filter');
    if (!examFilter) {
        return;
    }

    applyTrendsPreferences('all');
    setupTrendsHeatmapClick();

    updateTrendsView();
    setupTrendsHeatmapClick();
}

function initMistakesPage() {
    const examFilter = document.getElementById('mistakes-exam-filter');
    if (!examFilter) {
        return;
    }

    applyMistakesFiltersFromQuery();
    updateMistakesView();

    if (typeof gtag !== 'undefined') {
        gtag('event', 'mistakes_review_opened', {
            'event_category': 'engagement'
        });
    }
}

function setupEventListeners() {
    // Exam selector buttons
    document.querySelectorAll('.exam-button').forEach(button => {
        button.addEventListener('click', () => {
            const examType = button.dataset.exam;
            selectExam(examType);
        });
    });

    const questionCountSelect = document.getElementById('question-count-select');
    const timerToggle = document.getElementById('timer-toggle-shared');
    const startButton = document.getElementById('start-selected-test');

    if (questionCountSelect) {
        questionCountSelect.addEventListener('change', () => {
            if (testSetupPreferences) {
                testSetupPreferences.questionCount = questionCountSelect.value;
                saveTestSetupPreferences();
            }
            updateSharedTimerPreview();
        });
    }

    if (timerToggle) {
        timerToggle.addEventListener('change', (e) => {
            if (testSetupPreferences) {
                testSetupPreferences.timerEnabled = e.target.checked;
                saveTestSetupPreferences();
            }
            if (typeof gtag !== 'undefined') {
                const testData = currentExam && selectedTestKey && questionDatabase[currentExam]
                    ? questionDatabase[currentExam][selectedTestKey]
                    : null;
                gtag('event', 'timer_toggled', {
                    'exam_type': currentExam,
                    'test_name': testData ? (testData.title || selectedTestKey) : null,
                    'timer_enabled': e.target.checked,
                    'event_category': 'engagement',
                    'event_label': currentExam && selectedTestKey ? `${currentExam}_${selectedTestKey}` : currentExam
                });
            }
        });
    }

    if (startButton) {
        startButton.addEventListener('click', () => {
            if (!selectedTestKey) {
                return;
            }
            startTest(selectedTestKey);
        });
    }

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
    const previousScreen = document.querySelector('.screen.active');
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    const previousScreenId = previousScreen ? previousScreen.id : null;
    if (previousScreenId === 'test-screen' && screenId !== 'test-screen') {
        trackTestAbandoned('navigation');
    }
    if (screenId !== 'test-screen') {
        stopTimerCountdown();
    }
    trackScreenView(screenId);
}

function selectExam(examType) {
    currentExam = examType;
    selectedTestKey = null;
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
            testCard.className = 'test-card selectable';
            testCard.dataset.testKey = testKey;

            // Test title and question count
            const testInfo = document.createElement('div');
            testInfo.className = 'test-info';
            testInfo.innerHTML = `
                <div class="test-title">${test.title}</div>
                <div class="test-question-count">• ${test.questions.length} questions</div>
            `;
            testCard.appendChild(testInfo);

            testList.appendChild(testCard);
            testCard.addEventListener('click', () => setSelectedTest(testKey));
            testCard.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedTest(testKey);
                }
            });
            testCard.tabIndex = 0;
            testCard.setAttribute('role', 'button');
        }
    });

    initTestSetupForExam(examType);
    showScreen('test-selector');
}

function initTestSetupForExam(examType) {
    const timerToggle = document.getElementById('timer-toggle-shared');
    const timerText = document.getElementById('timer-toggle-text');
    const baseTimerMinutes = getBaseTimerMinutes(examType);

    if (timerToggle && timerText) {
        if (baseTimerMinutes > 0) {
            timerToggle.disabled = false;
            timerToggle.checked = !!(testSetupPreferences && testSetupPreferences.timerEnabled);
            timerText.innerHTML = 'Enable timer (<span id="timer-duration-preview" class="timer-duration-value">--</span>)';
        } else {
            timerToggle.checked = false;
            timerToggle.disabled = true;
            timerText.textContent = 'Timer unavailable';
        }
    }

    updateQuestionCountOptions(null);
    updateSelectedTestUI();
    updateSharedTimerPreview();
}

function startTest(testKey) {
    clearTestProgress(); // Clear any existing saved progress
    currentTest = testKey;
    currentQuestionIndex = 0;
    userAnswers = {};
    reviewMode = false;
    testAbandonedEventFired = false;
    lastTrackedQuestionIndex = null;
    lastTrackedQuestionTestKey = null;

    const testData = questionDatabase[currentExam][currentTest];
    const fullQuestionSet = testData.questions || [];
    const totalQuestions = fullQuestionSet.length;

    if (totalQuestions === 0) {
        alert('This test is not yet available.');
        return;
    }

    // Check if user selected a specific number of questions
    const questionCountSelect = document.getElementById('question-count-select');
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
    const timerToggle = document.getElementById('timer-toggle-shared');
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
    saveTestProgress(); // Save initial test state
}

function showDebugPanel() {
    const testScreen = document.getElementById('test-screen');
    testScreen.classList.add('debug-mode');

    const questions = currentQuestions;

    const existingPanel = document.querySelector('.debug-panel');

    let debugHTML = '<div class="debug-panel"><button class="debug-panel-toggle" onclick="toggleDebugPanel()" title="Toggle navigation">◀</button><h3>Debug: Questions</h3><ul class="debug-question-list">';
    questions.forEach((q, index) => {
        const answered = isQuestionAnswered(q) ? '✓' : '';
        const hasImage = q.image ? '*' : '';
        const current = index === currentQuestionIndex ? 'current' : '';
        debugHTML += `<li class="${current}" data-index="${index}" onclick="jumpToQuestion(${index})">
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

    requestAnimationFrame(scrollDebugNavToCurrent);
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

function scrollDebugNavToCurrent() {
    if (!debugMode) return;
    const list = document.querySelector('.debug-question-list');
    if (!list) return;
    const currentItem = list.querySelector('li.current');
    if (!currentItem) return;
    currentItem.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function updateDebugNavSelection() {
    if (!debugMode) return;
    const items = document.querySelectorAll('.debug-question-list li');
    if (!items.length) return;
    items.forEach(item => {
        const index = Number(item.dataset.index);
        if (Number.isNaN(index)) {
            return;
        }
        item.classList.toggle('current', index === currentQuestionIndex);
    });
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
        if (typeof question.showPassage === 'boolean') {
            showPassage = question.showPassage;
        } else if (currentExam === 'english') {
            const passageEndId = currentTest === 'test1' ? 28 : 23;
            if (question.id >= 1 && question.id <= passageEndId) {
                showPassage = true;
            }
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

    // Show alphabet reference for Verbal Reasoning tests
    const alphabetElement = document.getElementById('alphabet-reference');
    const showAlphabet = currentExam === 'verbal-reasoning' &&
                         ((currentTest === 'test1' && question.id >= 45 && question.id <= 51) ||
                          (currentTest === 'test2' && question.id >= 74 && question.id <= 80));
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

    if (debugMode) {
        updateDebugNavSelection();
        scrollDebugNavToCurrent();
    }

    trackQuestionView(question);
}

function getOptionGroup(letter) {
    // Group 1: A, B, C, D, E
    // Group 2: X, Y, Z
    if (['A', 'B', 'C', 'D', 'E'].includes(letter)) {
        return 1;
    } else if (['X', 'Y', 'Z'].includes(letter)) {
        return 2;
    }
    return null;
}

function hasTwoGroups(question) {
    if (!question || !question.options) {
        return false;
    }
    const hasGroup1 = question.options.some(opt => getOptionGroup(opt.letter) === 1);
    const hasGroup2 = question.options.some(opt => getOptionGroup(opt.letter) === 2);
    return hasGroup1 && hasGroup2;
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
        // Check if this is a two-group question (A, B, C vs X, Y, Z)
        const isTwoGroupQuestion = hasTwoGroups(question);

        if (isTwoGroupQuestion) {
            // For two-group questions, enforce one selection per group
            const clickedGroup = getOptionGroup(letter);

            if (selections.includes(letter)) {
                // Deselect the clicked option
                selections = selections.filter(selection => selection !== letter);
            } else {
                // Remove any existing selection from the same group
                selections = selections.filter(selection => getOptionGroup(selection) !== clickedGroup);
                // Add the new selection
                selections = [...selections, letter];
            }
        } else {
            // Standard multi-select logic for non-grouped questions
            if (selections.includes(letter)) {
                selections = selections.filter(selection => selection !== letter);
            } else {
                if (selections.length >= requiredSelections) {
                    return;
                }
                selections = [...selections, letter];
            }
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
    saveTestProgress(); // Save progress after answer selection

    if (typeof gtag !== 'undefined') {
        const testData = questionDatabase[currentExam] && questionDatabase[currentExam][currentTest];
        gtag('event', 'option_selected', {
            'exam_type': currentExam,
            'test_name': testData ? (testData.title || currentTest) : currentTest,
            'question_id': questionId,
            'question_index': currentQuestionIndex,
            'option_letter': letter,
            'selection_count': selections.length,
            'required_selections': requiredSelections,
            'multi_select': requiredSelections > 1,
            'event_category': 'engagement'
        });
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        focusedOptionIndex = -1; // Reset focus when changing questions
        displayQuestion();
        saveTestProgress(); // Save progress after navigation
    }
}

function nextQuestion() {
    const questions = getCurrentQuestions();
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        focusedOptionIndex = -1; // Reset focus when changing questions
        displayQuestion();
        saveTestProgress(); // Save progress after navigation
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
    testAbandonedEventFired = true;
    stopTimerCountdown();
    clearTestProgress(); // Clear saved progress after test completion

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

    // Save test result to history for trend tracking
    saveTestResultToHistory();
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

// Category Breakdown Functions
function calculateCategoryBreakdown() {
    const categoryStats = {};

    currentQuestions.forEach(question => {
        const category = question.category || 'Uncategorized';
        const questionId = question.id;
        const selections = getUserSelections(questionId);
        const isAnswered = selections.length > 0;
        const isCorrect = isAnswered && areAnswersCorrect(question, selections);

        if (!categoryStats[category]) {
            categoryStats[category] = {
                total: 0,
                correct: 0,
                incorrect: 0,
                unanswered: 0
            };
        }

        categoryStats[category].total++;
        if (!isAnswered) {
            categoryStats[category].unanswered++;
        } else if (isCorrect) {
            categoryStats[category].correct++;
        } else {
            categoryStats[category].incorrect++;
        }
    });

    return categoryStats;
}

function getPerformanceClass(percentage) {
    if (percentage >= 80) return 'excellent';
    if (percentage >= 60) return 'good';
    if (percentage >= 40) return 'average';
    return 'poor';
}

function showCategoryBreakdown() {
    const categoryStats = calculateCategoryBreakdown();
    const breakdownContent = document.getElementById('breakdown-content');

    // Sort categories by name
    const sortedCategories = Object.keys(categoryStats).sort();

    let html = '';

    if (sortedCategories.length === 0) {
        html = '<p style="text-align: center; color: #666;">No category data available.</p>';
    } else {
        sortedCategories.forEach(category => {
            const stats = categoryStats[category];
            const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
            const performanceClass = getPerformanceClass(percentage);

            html += `
                <div class="category-item">
                    <div class="category-header">
                        <span class="category-name">${category}</span>
                        <span class="category-score ${performanceClass}">${percentage}%</span>
                    </div>
                    <div class="category-details">
                        ${stats.correct} correct, ${stats.incorrect} incorrect, ${stats.unanswered} unanswered
                        (${stats.total} total)
                    </div>
                    <div class="category-bar">
                        <div class="category-bar-fill ${performanceClass}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        });
    }

    breakdownContent.innerHTML = html;

    // Show modal
    document.getElementById('breakdown-modal').style.display = 'flex';

    // Track in Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'category_breakdown_viewed', {
            'exam_type': currentExam,
            'test_name': currentTest,
            'event_category': 'engagement'
        });
    }
}

function closeBreakdownModal() {
    document.getElementById('breakdown-modal').style.display = 'none';
}

// Historical Performance Tracking
function saveTestResultToHistory() {
    const categoryStats = calculateCategoryBreakdown();

    // Calculate overall stats
    const totalQuestions = currentQuestions.length;

    // Count correct answers by iterating through questions
    let correctCount = 0;
    currentQuestions.forEach(question => {
        const selections = getUserSelections(question.id);
        if (selections.length > 0 && areAnswersCorrect(question, selections)) {
            correctCount++;
        }
    });

    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Collect incorrect questions with details
    const incorrectQuestions = [];
    currentQuestions.forEach(question => {
        const selections = getUserSelections(question.id);
        const isAnswered = selections.length > 0;
        const isCorrect = isAnswered && areAnswersCorrect(question, selections);

        if (isAnswered && !isCorrect) {
            incorrectQuestions.push({
                id: question.id,
                question: question.question,
                category: question.category || 'Uncategorized',
                correctAnswer: question.correctAnswer,
                userAnswer: selections.join(', '),
                options: question.options,
                instruction: question.instruction,
                image: question.image
            });
        }
    });

    const testResult = {
        timestamp: Date.now(),
        date: new Date().toISOString(),
        examType: currentExam,
        testName: questionDatabase[currentExam][currentTest].title || currentTest,
        testKey: currentTest,
        totalQuestions: totalQuestions,
        correctCount: correctCount,
        percentage: percentage,
        categoryBreakdown: {},
        incorrectQuestions: incorrectQuestions
    };

    // Add category breakdown with percentages
    Object.keys(categoryStats).forEach(category => {
        const stats = categoryStats[category];
        const catPercentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        testResult.categoryBreakdown[category] = {
            total: stats.total,
            correct: stats.correct,
            incorrect: stats.incorrect,
            unanswered: stats.unanswered,
            percentage: catPercentage
        };
    });

    // Get existing history
    let history = [];
    try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (stored) {
            history = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Failed to load test history:', error);
    }

    // Add new result
    history.push(testResult);

    // Keep only last 100 test results to avoid storage limits
    if (history.length > 100) {
        history = history.slice(-100);
    }

    // Save back to localStorage
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
        console.log('Test result saved to history');
    } catch (error) {
        console.error('Failed to save test history:', error);
    }
}

function getTestHistory(examType = null) {
    try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!stored) {
            return [];
        }

        let history = JSON.parse(stored);

        // Filter by exam type if specified
        if (examType) {
            history = history.filter(result => result.examType === examType);
        }

        // Sort by timestamp (oldest first)
        history.sort((a, b) => a.timestamp - b.timestamp);

        return history;
    } catch (error) {
        console.error('Failed to load test history:', error);
        return [];
    }
}

function clearTestHistory() {
    if (confirm('Are you sure you want to clear all performance history? This cannot be undone.')) {
        try {
            localStorage.removeItem(HISTORY_STORAGE_KEY);
            alert('Performance history cleared successfully.');
            // Close trends modal if open
            const trendsModal = document.getElementById('trends-modal');
            if (trendsModal) {
                trendsModal.style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to clear test history:', error);
            alert('Failed to clear history.');
        }
    }
}

// Performance Trends Visualization
let currentTrendsData = [];
let timeRangeStart = 0;
let timeRangeEnd = 100;
let currentTimeAggregation = 'week';
const TRENDS_PREFS_KEY = 'elevenPlusTrendsPrefs';

function showPerformanceTrends() {
    const modal = document.getElementById('trends-modal');
    if (!modal) {
        window.location.href = 'performance.html';
        return;
    }
    modal.style.display = 'flex';

    applyTrendsPreferences(currentExam);

    updateTrendsView();

    // Track in Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'trends_viewed', {
            'exam_type': currentExam,
            'event_category': 'engagement'
        });
    }
}

function closeTrendsModal() {
    const modal = document.getElementById('trends-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateTimeRange(value) {
    timeRangeEnd = parseInt(value);
    saveTrendsPreferences();
    updateTrendsView();
}

function updateTimeAggregation(value) {
    currentTimeAggregation = value;
    saveTrendsPreferences();
    updateTrendsView();
}

function updateTrendsView() {
    const examFilter = document.getElementById('trends-exam-filter').value;
    const examType = examFilter === 'all' ? null : examFilter;
    saveTrendsPreferences();

    // Get filtered history
    let history = getTestHistory(examType);

    if (history.length === 0) {
        displayNoDataMessage();
        return;
    }

    const buckets = buildTimeBuckets(history, currentTimeAggregation);
    if (buckets.length === 0) {
        displayNoDataMessage();
        return;
    }

    // Apply time range filter by buckets
    const totalBuckets = buckets.length;
    const startIndex = Math.floor((timeRangeStart / 100) * totalBuckets);
    const endIndex = Math.ceil((timeRangeEnd / 100) * totalBuckets);
    const visibleBuckets = buckets.slice(startIndex, endIndex);
    const filteredHistory = visibleBuckets.flatMap(bucket => bucket.tests);

    if (filteredHistory.length === 0) {
        displayNoDataMessage();
        return;
    }

    currentTrendsData = filteredHistory;

    // Update time range label
    if (visibleBuckets.length > 0) {
        const startDate = new Date(visibleBuckets[0].startTs).toLocaleDateString();
        const endDate = new Date(visibleBuckets[visibleBuckets.length - 1].endTs).toLocaleDateString();
        const aggregationLabel = formatAggregationLabel(currentTimeAggregation);
        const rangeLabel = visibleBuckets.length === totalBuckets ? 'All Time' : `${startDate} - ${endDate}`;
        document.getElementById('time-range-label').textContent = `${rangeLabel} - ${aggregationLabel}`;
        document.getElementById('time-start').textContent = startDate;
        document.getElementById('time-end').textContent = endDate;
    }

    renderTrendsSummary(filteredHistory);
    renderHeatMap(visibleBuckets, currentTimeAggregation, examFilter);
    renderInsights(filteredHistory);

    const reviewLink = document.getElementById('trends-review-mistakes');
    if (reviewLink) {
        reviewLink.href = buildMistakesUrl(examFilter, null);
    }
}

function loadTrendsPreferences() {
    try {
        const stored = localStorage.getItem(TRENDS_PREFS_KEY);
        if (!stored) {
            return null;
        }
        return JSON.parse(stored);
    } catch (error) {
        console.error('Failed to load trends preferences:', error);
        return null;
    }
}

function saveTrendsPreferences() {
    const examFilter = document.getElementById('trends-exam-filter');
    const aggregation = document.getElementById('time-aggregation');
    const slider = document.getElementById('time-slider');

    if (!examFilter || !aggregation || !slider) {
        return;
    }

    const prefs = {
        examFilter: examFilter.value,
        aggregation: aggregation.value,
        timeRangeEnd: parseInt(slider.value)
    };

    try {
        localStorage.setItem(TRENDS_PREFS_KEY, JSON.stringify(prefs));
    } catch (error) {
        console.error('Failed to save trends preferences:', error);
    }
}

function applyTrendsPreferences(fallbackExam) {
    const examFilter = document.getElementById('trends-exam-filter');
    const aggregation = document.getElementById('time-aggregation');
    const slider = document.getElementById('time-slider');

    if (!examFilter || !aggregation || !slider) {
        return;
    }

    const prefs = loadTrendsPreferences();
    const examValue = (prefs && prefs.examFilter) ? prefs.examFilter : (fallbackExam || 'all');
    const aggregationValue = (prefs && prefs.aggregation) ? prefs.aggregation : currentTimeAggregation;
    const rangeValue = (prefs && Number.isFinite(prefs.timeRangeEnd)) ? prefs.timeRangeEnd : 100;

    examFilter.value = examValue;
    aggregation.value = aggregationValue;
    slider.value = rangeValue;
    timeRangeStart = 0;
    timeRangeEnd = rangeValue;
    currentTimeAggregation = aggregationValue;
}

function buildTimeBuckets(history, aggregation) {
    const buckets = new Map();

    history.forEach(test => {
        const start = getBucketStart(new Date(test.timestamp), aggregation);
        const key = start.getTime();

        if (!buckets.has(key)) {
            const end = getBucketEnd(start, aggregation);
            buckets.set(key, {
                startTs: start.getTime(),
                endTs: end.getTime(),
                label: formatBucketLabel(start, end, aggregation),
                tests: []
            });
        }

        buckets.get(key).tests.push(test);
    });

    return Array.from(buckets.values()).sort((a, b) => a.startTs - b.startTs);
}

function getBucketStart(date, aggregation) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    if (aggregation === 'week') {
        const day = start.getDay();
        const diff = (day + 6) % 7;
        start.setDate(start.getDate() - diff);
    } else if (aggregation === 'month') {
        start.setDate(1);
    }

    return start;
}

function getBucketEnd(start, aggregation) {
    const end = new Date(start);

    if (aggregation === 'week') {
        end.setDate(end.getDate() + 6);
    } else if (aggregation === 'month') {
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
    }

    end.setHours(23, 59, 59, 999);
    return end;
}

function formatBucketLabel(start, end, aggregation) {
    if (aggregation === 'month') {
        return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    if (aggregation === 'week') {
        const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${startLabel}-${endLabel}`;
    }

    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAggregationLabel(aggregation) {
    if (aggregation === 'day') return 'Day';
    if (aggregation === 'week') return 'Week';
    if (aggregation === 'month') return 'Month';
    return 'Date';
}

function aggregateCategoryBreakdown(tests) {
    const totals = {};

    tests.forEach(test => {
        Object.entries(test.categoryBreakdown).forEach(([category, stats]) => {
            if (!totals[category]) {
                totals[category] = { correct: 0, total: 0 };
            }

            totals[category].correct += stats.correct;
            totals[category].total += stats.total;
        });
    });

    Object.values(totals).forEach(stats => {
        stats.percentage = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);
    });

    return totals;
}

function renderTrendsSummary(history) {
    const summaryDiv = document.getElementById('trends-summary');

    if (history.length === 0) {
        summaryDiv.innerHTML = '';
        return;
    }

    const avgScore = Math.round(
        history.reduce((sum, test) => sum + test.percentage, 0) / history.length
    );

    const totalTests = history.length;
    const totalQuestions = history.reduce((sum, test) => sum + (test.totalQuestions || 0), 0);
    const totalCorrect = history.reduce((sum, test) => sum + (test.correctCount || 0), 0);
    const totalIncorrect = Math.max(0, totalQuestions - totalCorrect);
    const lastUpdated = history[history.length - 1]?.timestamp
        ? new Date(history[history.length - 1].timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
        : 'N/A';

    let html = `
        <h4>Summary</h4>
        <div class="trends-summary-stats">
            <div class="trend-stat">
                <span class="trend-stat-value">${totalTests}</span>
                <span class="trend-stat-label">Tests Taken</span>
            </div>
            <div class="trend-stat">
                <span class="trend-stat-value">${avgScore}%</span>
                <span class="trend-stat-label">Average Score</span>
            </div>
            <div class="trend-stat">
                <span class="trend-stat-value">${totalQuestions}</span>
                <span class="trend-stat-label">Total Questions</span>
            </div>
            <div class="trend-stat">
                <span class="trend-stat-value">${totalCorrect}</span>
                <span class="trend-stat-label">Total Correct</span>
            </div>
            <div class="trend-stat">
                <span class="trend-stat-value">${totalIncorrect}</span>
                <span class="trend-stat-label">Total Incorrect</span>
            </div>
            <div class="trend-stat">
                <span class="trend-stat-value">${lastUpdated}</span>
                <span class="trend-stat-label">Last Updated</span>
            </div>
        </div>
    `;

    summaryDiv.innerHTML = html;
}

function renderHeatMap(buckets, aggregation, examFilter) {
    const heatmapDiv = document.getElementById('trends-heatmap');

    if (buckets.length === 0) {
        heatmapDiv.innerHTML = '';
        return;
    }

    const summarizedBuckets = buckets.map(bucket => ({
        ...bucket,
        breakdown: aggregateCategoryBreakdown(bucket.tests)
    }));

    // Collect all categories across all buckets
    const allCategories = new Set();
    summarizedBuckets.forEach(bucket => {
        Object.keys(bucket.breakdown).forEach(cat => allCategories.add(cat));
    });

    const categories = Array.from(allCategories).sort();

    // Limit to recent buckets for better visualization (max 10)
    const recentBuckets = summarizedBuckets.slice(-10);
    const columnLabel = formatAggregationLabel(aggregation);
    const subjectValue = examFilter || 'all';

    let html = `
        <div class="heatmap-header">
            <h4>Category Performance Heat Map</h4>
            <div class="heatmap-legend">
                <div class="legend-item">
                    <div class="legend-color" style="background: #FF5722;"></div>
                    <span>Poor (&lt;40%)</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #FFC107;"></div>
                    <span>Average (40-59%)</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #8BC34A;"></div>
                    <span>Good (60-79%)</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #4CAF50;"></div>
                    <span>Excellent (80%+)</span>
                </div>
            </div>
        </div>
        <div class="heatmap-grid">
    `;

    // Add date labels row
    html += `<div class="heatmap-row"><div class="heatmap-category-label">Category / ${columnLabel}</div>`;
    recentBuckets.forEach(bucket => {
        html += `<div class="heatmap-date-label">${bucket.label}</div>`;
    });
    html += '</div>';

    // Add rows for each category
    categories.forEach(category => {
        html += `<div class="heatmap-row">`;
        html += `<div class="heatmap-category-label">${category}</div>`;

        recentBuckets.forEach(bucket => {
            const catData = bucket.breakdown[category];
            if (catData) {
                const percentage = catData.percentage;
                const performanceClass = getPerformanceClass(percentage);
                const bgColor = getHeatmapColor(percentage);
                html += `
                    <div class="heatmap-cell actionable" style="background: ${bgColor};"
                         data-category="${category}" data-subject="${subjectValue}"
                         title="${bucket.label} • ${category}: ${percentage}% (${catData.correct}/${catData.total})">
                        <div style="font-size: 1.1em; font-weight: 700; margin-bottom: 2px;">${percentage}%</div>
                        <div style="font-size: 0.7em; opacity: 0.85; font-weight: 500;">(${catData.correct}/${catData.total})</div>
                    </div>
                `;
            } else {
                html += '<div class="heatmap-cell empty">-</div>';
            }
        });

        html += '</div>';
    });

    html += '</div>';
    heatmapDiv.innerHTML = html;
}

function getHeatmapColor(percentage) {
    if (percentage >= 80) return '#4CAF50';
    if (percentage >= 60) return '#8BC34A';
    if (percentage >= 40) return '#FFC107';
    return '#FF5722';
}

let trendsHeatmapClickBound = false;

function setupTrendsHeatmapClick() {
    const heatmapDiv = document.getElementById('trends-heatmap');
    if (!heatmapDiv || trendsHeatmapClickBound) {
        return;
    }

    trendsHeatmapClickBound = true;
    heatmapDiv.addEventListener('click', (event) => {
        const cell = event.target.closest('.heatmap-cell.actionable');
        if (!cell) {
            return;
        }

        const subject = cell.dataset.subject || 'all';
        const category = cell.dataset.category || null;
        navigateToMistakes(subject, category);
    });
}

function buildMistakesUrl(subject, category) {
    const params = new URLSearchParams();
    if (subject && subject !== 'all') {
        params.set('subject', subject);
    }
    if (category && category !== 'all') {
        params.set('category', category);
    }

    const query = params.toString();
    return query ? `mistakes.html?${query}` : 'mistakes.html';
}

function navigateToMistakes(subject, category) {
    window.location.href = buildMistakesUrl(subject, category);
}

function displayNoDataMessage() {
    const summaryDiv = document.getElementById('trends-summary');
    const heatmapDiv = document.getElementById('trends-heatmap');
    const insightsDiv = document.getElementById('trends-insights');

    const message = `
        <div class="no-data-message">
            <h4>No Performance Data Yet</h4>
            <p>Complete some tests to start tracking your performance trends!</p>
        </div>
    `;

    summaryDiv.innerHTML = '';
    heatmapDiv.innerHTML = message;
    insightsDiv.innerHTML = '';
}

function renderInsights(history) {
    const insightsDiv = document.getElementById('trends-insights');

    if (history.length < 2) {
        insightsDiv.innerHTML = '<div class="no-data-message"><p>Complete more tests to see trend insights.</p></div>';
        return;
    }

    const insights = analyzeTrends(history);

    let html = '<h4>📊 Insights & Recommendations</h4>';

    // Overall trend
    if (insights.overallTrend) {
        html += `<div class="insight-item ${insights.overallTrend.type}">
            <span class="insight-icon">${insights.overallTrend.icon}</span>
            <strong>${insights.overallTrend.title}</strong>: ${insights.overallTrend.message}
        </div>`;
    }

    // Category trends
    insights.categoryTrends.forEach(trend => {
        html += `<div class="insight-item ${trend.type}">
            <span class="insight-icon">${trend.icon}</span>
            <strong>${trend.category}</strong>: ${trend.message}
        </div>`;
    });

    // Recommendations
    if (insights.recommendations.length > 0) {
        html += '<h4 style="margin-top: 20px;">💡 Focus Areas</h4>';
        insights.recommendations.forEach(rec => {
            html += `<div class="insight-item">
                <span class="insight-icon">🎯</span>
                ${rec}
            </div>`;
        });
    }

    insightsDiv.innerHTML = html;
}

// Mistakes Review Functions
function getAllIncorrectQuestions(examFilter = null) {
    const history = getTestHistory(examFilter);
    const mistakes = [];

    history.forEach(test => {
        if (test.incorrectQuestions && test.incorrectQuestions.length > 0) {
            test.incorrectQuestions.forEach(q => {
                mistakes.push({
                    ...q,
                    testName: test.testName,
                    examType: test.examType,
                    date: test.date,
                    timestamp: test.timestamp
                });
            });
        }
    });

    return mistakes;
}

function showMistakesReview() {
    const modal = document.getElementById('mistakes-modal');
    if (!modal) {
        navigateToMistakes(currentExam || 'all', null);
        return;
    }
    modal.style.display = 'flex';

    // Reset filters
    document.getElementById('mistakes-exam-filter').value = 'all';
    updateMistakesView();

    // Track in Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'mistakes_review_opened', {
            'event_category': 'engagement'
        });
    }
}

function closeMistakesModal() {
    const modal = document.getElementById('mistakes-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function applyMistakesFiltersFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    const category = params.get('category');

    const examSelect = document.getElementById('mistakes-exam-filter');
    const categorySelect = document.getElementById('mistakes-category-filter');

    if (examSelect && subject) {
        examSelect.value = subject;
    }
    if (categorySelect && category) {
        categorySelect.dataset.pendingValue = category;
    }
}

function updateMistakesView() {
    const examFilter = document.getElementById('mistakes-exam-filter').value;

    const allMistakes = getAllIncorrectQuestions(examFilter === 'all' ? null : examFilter);

    // Update category filter options
    const categories = new Set(allMistakes.map(m => m.category));
    const categorySelect = document.getElementById('mistakes-category-filter');
    const currentCategoryValue = categorySelect.value;

    categorySelect.innerHTML = '<option value="all">All Categories</option>';
    Array.from(categories).sort().forEach(cat => {
        categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    const pendingCategory = categorySelect.dataset.pendingValue;
    if (pendingCategory && categories.has(pendingCategory)) {
        categorySelect.value = pendingCategory;
        delete categorySelect.dataset.pendingValue;
    } else if (currentCategoryValue && categories.has(currentCategoryValue)) {
        categorySelect.value = currentCategoryValue;
    }

    const categoryFilter = categorySelect.value;

    // Filter by category
    let filteredMistakes = allMistakes;
    if (categoryFilter && categoryFilter !== 'all') {
        filteredMistakes = allMistakes.filter(m => m.category === categoryFilter);
    }

    // Update stats
    const statsDiv = document.getElementById('mistakes-stats');
    statsDiv.innerHTML = `
        <span class="mistakes-stats-value">${filteredMistakes.length}</span>
        <span class="mistakes-stats-label">Questions to Revisit</span>
    `;

    // Render mistakes
    renderMistakes(filteredMistakes, examFilter, categoryFilter);
}

function renderMistakes(mistakes, examFilter, categoryFilter) {
    const contentDiv = document.getElementById('mistakes-content');

    if (mistakes.length === 0) {
        contentDiv.innerHTML = `
            <div class="no-mistakes-message">
                <div class="no-mistakes-icon">🎉</div>
                <h4>No Questions to Revisit!</h4>
                <p>There are no questions to revisit for these filters yet.</p>
            </div>
        `;
        return;
    }

    // Sort by most recent first
    mistakes.sort((a, b) => b.timestamp - a.timestamp);
    currentMistakesForDetail = mistakes;

    const grouped = new Map();
    mistakes.forEach((mistake, index) => {
        const subjectKey = mistake.examType || 'unknown';
        if (!grouped.has(subjectKey)) {
            grouped.set(subjectKey, new Map());
        }
        const categoryKey = mistake.category || 'Uncategorized';
        const subjectMap = grouped.get(subjectKey);
        if (!subjectMap.has(categoryKey)) {
            subjectMap.set(categoryKey, []);
        }
        subjectMap.get(categoryKey).push({ mistake, index });
    });

    const subjects = Array.from(grouped.keys()).sort();
    const openAllSubjects = examFilter && examFilter !== 'all';
    const openAllCategories = categoryFilter && categoryFilter !== 'all';

    let html = '';
    subjects.forEach((subjectKey, subjectIndex) => {
        const subjectMap = grouped.get(subjectKey);
        const subjectCount = Array.from(subjectMap.values()).reduce((sum, items) => sum + items.length, 0);
        const subjectName = formatExamName(subjectKey);
        const subjectOpen = openAllSubjects || subjectIndex === 0;

        html += `
            <details class="mistakes-group" ${subjectOpen ? 'open' : ''}>
                <summary class="mistakes-group-summary">
                    <span class="mistakes-group-title">${subjectName}</span>
                    <span class="mistakes-group-count">${subjectCount} mistake${subjectCount === 1 ? '' : 's'}</span>
                </summary>
                <div class="mistakes-group-content">
        `;

        const categories = Array.from(subjectMap.keys()).sort();
        categories.forEach((categoryKey) => {
            const items = subjectMap.get(categoryKey);
            const categoryOpen = openAllCategories || categoryKey === categoryFilter;

            html += `
                    <details class="mistakes-category" ${categoryOpen ? 'open' : ''}>
                        <summary class="mistakes-category-summary">
                            <span class="mistakes-category-title">${categoryKey}</span>
                            <span class="mistakes-category-count">${items.length}</span>
                        </summary>
                        <div class="mistakes-category-content">
            `;

            items.forEach(({ mistake, index }) => {
                const date = new Date(mistake.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });

                html += `
                            <div class="mistake-item" onclick="showQuestionDetail(${index})" style="cursor: pointer;">
                                <div class="mistake-header">
                                    <div class="mistake-meta">
                                        <span class="mistake-badge subject">${subjectName}</span>
                                        <span class="mistake-badge category">${mistake.category}</span>
                                        <span class="mistake-badge date">${date}</span>
                                    </div>
                                </div>

                                <div class="mistake-question">
                                    ${mistake.instruction ? `<em>${mistake.instruction}</em><br><br>` : ''}
                                    ${mistake.question}
                                </div>

                                <div class="mistake-answers">
                                    <div class="mistake-answer-row incorrect">
                                        <span class="mistake-answer-label">❌ Your Answer:</span>
                                        <span class="mistake-answer-value">${mistake.userAnswer}</span>
                                    </div>
                                    <div class="mistake-answer-row correct">
                                        <span class="mistake-answer-label">✅ Correct Answer:</span>
                                        <span class="mistake-answer-value">${mistake.correctAnswer}</span>
                                    </div>
                                </div>
                                <div style="text-align: center; margin-top: 10px; color: #667eea; font-size: 0.9em;">
                                    Click to view full question
                                </div>
                            </div>
                `;
            });

            html += `
                        </div>
                    </details>
            `;
        });

        html += `
                </div>
            </details>
        `;
    });

    contentDiv.innerHTML = html;
}

let currentMistakesForDetail = [];

function formatExamName(examType) {
    if (!examType) return 'Unknown';
    return examType.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function showQuestionDetail(mistakeIndex) {
    const mistake = currentMistakesForDetail[mistakeIndex];
    if (!mistake) return;

    const contentDiv = document.getElementById('question-detail-content');

    const date = new Date(mistake.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const examName = mistake.examType.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    // Parse user answer (might be comma-separated for multi-select)
    const userAnswers = mistake.userAnswer.split(', ').map(a => a.trim());

    let html = `
        <div class="question-detail-header">
            <span class="mistake-badge subject">${examName}</span>
            <span class="mistake-badge category">${mistake.category}</span>
            <span class="mistake-badge date">${date}</span>
        </div>
    `;

    if (mistake.instruction) {
        html += `<div class="question-detail-instruction">${mistake.instruction}</div>`;
    }

    if (mistake.image) {
        html += `
            <div class="question-detail-image">
                <img src="${mistake.image}" alt="Question diagram">
            </div>
        `;
    }

    html += `<div class="question-detail-text">${mistake.question}</div>`;

    html += '<div class="question-detail-options">';

    mistake.options.forEach(option => {
        const isCorrect = option.letter === mistake.correctAnswer;
        const isUserAnswer = userAnswers.includes(option.letter);

        let optionClass = '';
        if (isCorrect) {
            optionClass = 'correct';
        } else if (isUserAnswer) {
            optionClass = 'user-incorrect';
        }

        html += `
            <div class="question-detail-option ${optionClass}">
                <div class="question-detail-option-letter">${option.letter}</div>
                <div class="question-detail-option-text">${option.text}</div>
            </div>
        `;
    });

    html += '</div>';

    // Add labels
    html += `
        <div style="margin-top: 20px;">
            <div class="question-detail-label incorrect">
                ❌ Your answer: ${mistake.userAnswer}
            </div>
            <div class="question-detail-label correct">
                ✅ Correct answer: ${mistake.correctAnswer}
            </div>
        </div>
    `;

    contentDiv.innerHTML = html;

    document.getElementById('question-detail-modal').style.display = 'flex';
}

function closeQuestionDetailModal() {
    document.getElementById('question-detail-modal').style.display = 'none';
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function analyzeTrends(history) {
    const insights = {
        overallTrend: null,
        categoryTrends: [],
        recommendations: []
    };

    // Analyze overall score trend
    const recentTests = history.slice(-5);
    const olderTests = history.slice(0, Math.min(5, history.length - 5));

    if (olderTests.length > 0 && recentTests.length > 0) {
        const oldAvg = olderTests.reduce((sum, t) => sum + t.percentage, 0) / olderTests.length;
        const recentAvg = recentTests.reduce((sum, t) => sum + t.percentage, 0) / recentTests.length;
        const change = recentAvg - oldAvg;

        if (change > 5) {
            insights.overallTrend = {
                type: 'improving',
                icon: '📈',
                title: 'Overall Performance Improving',
                message: `Your average score has improved by ${Math.round(change)}% recently. Keep up the great work!`
            };
        } else if (change < -5) {
            insights.overallTrend = {
                type: 'declining',
                icon: '📉',
                title: 'Overall Performance Declining',
                message: `Your average score has decreased by ${Math.round(Math.abs(change))}% recently. Consider reviewing fundamentals.`
            };
        } else {
            insights.overallTrend = {
                type: 'stable',
                icon: '➡️',
                title: 'Stable Performance',
                message: 'Your performance has been consistent. Focus on challenging categories to improve further.'
            };
        }
    }

    // Analyze category trends
    const categoryStats = {};

    history.forEach(test => {
        Object.entries(test.categoryBreakdown).forEach(([category, data]) => {
            if (!categoryStats[category]) {
                categoryStats[category] = [];
            }
            categoryStats[category].push(data.percentage);
        });
    });

    Object.entries(categoryStats).forEach(([category, scores]) => {
        if (scores.length < 2) return;

        const recentScores = scores.slice(-3);
        const olderScores = scores.slice(0, Math.max(1, scores.length - 3));

        const oldAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
        const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        const change = recentAvg - oldAvg;

        if (Math.abs(change) > 10) {
            if (change > 0) {
                insights.categoryTrends.push({
                    category,
                    type: 'improving',
                    icon: '✅',
                    message: `Improved by ${Math.round(change)}% - great progress!`
                });
            } else {
                insights.categoryTrends.push({
                    category,
                    type: 'declining',
                    icon: '⚠️',
                    message: `Declined by ${Math.round(Math.abs(change))}% - needs attention`
                });
            }
        }
    });

    // Generate recommendations based on weak categories
    const allScores = {};
    history.forEach(test => {
        Object.entries(test.categoryBreakdown).forEach(([category, data]) => {
            if (!allScores[category]) {
                allScores[category] = [];
            }
            allScores[category].push(data.percentage);
        });
    });

    const weakCategories = Object.entries(allScores)
        .map(([category, scores]) => ({
            category,
            avgScore: scores.reduce((a, b) => a + b, 0) / scores.length
        }))
        .filter(item => item.avgScore < 60)
        .sort((a, b) => a.avgScore - b.avgScore)
        .slice(0, 3);

    weakCategories.forEach(item => {
        insights.recommendations.push(
            `Focus on <strong>${item.category}</strong> (current avg: ${Math.round(item.avgScore)}%)`
        );
    });

    return insights;
}
