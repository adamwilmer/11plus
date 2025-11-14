// Application state
let currentExam = null;
let currentTest = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let questionDatabase = {};
let reviewMode = false;
let debugMode = false;
let currentQuestions = [];

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
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function selectExam(examType) {
    currentExam = examType;
    const examData = questionDatabase[examType];

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

            selectorContainer.appendChild(selectLabel);
            selectorContainer.appendChild(select);
            testCard.appendChild(selectorContainer);

            // Start test button
            const startButton = document.createElement('button');
            startButton.className = 'start-test-button';
            startButton.textContent = 'Start Test';
            startButton.onclick = () => startTest(testKey);
            testCard.appendChild(startButton);

            testList.appendChild(testCard);
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

    if (fullQuestionSet.length === 0) {
        alert('This test is not yet available.');
        return;
    }

    // Check if user selected a specific number of questions
    const questionCountSelect = document.getElementById(`question-count-${testKey}`);
    const questionCount = questionCountSelect ? questionCountSelect.value : 'all';

    currentQuestions = [...fullQuestionSet];

    if (questionCount !== 'all') {
        const count = parseInt(questionCount, 10);
        // Randomly select N questions without mutating the source array
        const shuffled = [...fullQuestionSet].sort(() => Math.random() - 0.5);
        currentQuestions = shuffled.slice(0, Math.min(count, fullQuestionSet.length));
    }

    // Setup passage if present (visibility will be handled by displayQuestion)
    if (testData.passage) {
        document.getElementById('passage-title').textContent = testData.passageTitle || 'Reading Passage';
        document.getElementById('passage-text').textContent = testData.passage;
    }

    showScreen('test-screen');

    // Show debug panel if in debug mode
    if (debugMode) {
        showDebugPanel();
    } else {
        hideDebugPanel();
    }

    displayQuestion();
}

function showDebugPanel() {
    const testScreen = document.getElementById('test-screen');
    testScreen.classList.add('debug-mode');

    const questions = currentQuestions;

    let debugHTML = '<div class="debug-panel"><h3>Debug: Questions</h3><ul class="debug-question-list">';
    questions.forEach((q, index) => {
        const answered = isQuestionAnswered(q) ? '✓' : '';
        const current = index === currentQuestionIndex ? 'current' : '';
        debugHTML += `<li class="${current}" onclick="jumpToQuestion(${index})">
            <span class="q-num">Q${q.id}</span> ${answered}
        </li>`;
    });
    debugHTML += '</ul></div>';

    // Remove existing debug panel if any
    const existingPanel = document.querySelector('.debug-panel');
    if (existingPanel) {
        existingPanel.remove();
    }

    // Insert debug panel
    testScreen.insertAdjacentHTML('afterbegin', debugHTML);
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
    displayQuestion();
    if (debugMode) {
        showDebugPanel();
    }
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

    question.options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.dataset.letter = option.letter;

        const isCorrectAnswer = correctAnswers.includes(option.letter);
        const isUserAnswer = userSelections.includes(option.letter);

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
        selections = [letter];
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
        displayQuestion();
    }
}

function nextQuestion() {
    const questions = getCurrentQuestions();
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
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
}

function reviewAnswers() {
    // Reset to first question and show test screen in review mode
    currentQuestionIndex = 0;
    reviewMode = true;
    showScreen('test-screen');
    displayQuestion();
}
