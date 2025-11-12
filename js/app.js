// Application state
let currentExam = null;
let currentTest = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let questionDatabase = {};
let reviewMode = false;

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
            const button = document.createElement('button');
            button.className = 'test-button';
            button.textContent = test.title;
            button.onclick = () => startTest(testKey);
            testList.appendChild(button);
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
    const questions = testData.questions;

    if (questions.length === 0) {
        alert('This test is not yet available.');
        return;
    }

    // Setup passage if present (visibility will be handled by displayQuestion)
    if (testData.passage) {
        document.getElementById('passage-title').textContent = testData.passageTitle || 'Reading Passage';
        document.getElementById('passage-text').textContent = testData.passage;
    }

    showScreen('test-screen');
    displayQuestion();
}

function displayQuestion() {
    const testData = questionDatabase[currentExam][currentTest];
    const questions = testData.questions;
    const question = questions[currentQuestionIndex];

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
    if (question.instruction) {
        instructionElement.textContent = question.instruction;
        instructionElement.style.display = 'block';
    } else {
        instructionElement.style.display = 'none';
    }

    document.getElementById('question-text').textContent = question.question;

    // Display options
    const optionsContainer = document.getElementById('options');
    optionsContainer.innerHTML = '';

    question.options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';

        const userAnswer = userAnswers[question.id];
        const isCorrectAnswer = option.letter === question.correctAnswer;
        const isUserAnswer = userAnswer === option.letter;

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

    if (reviewMode) {
        // In review mode, hide submit button, always show next button
        document.getElementById('next-button').style.display = isLastQuestion ? 'none' : 'block';
        document.getElementById('submit-button').style.display = 'none';
    } else {
        // Normal mode
        document.getElementById('next-button').style.display = isLastQuestion ? 'none' : 'block';
        document.getElementById('submit-button').style.display = isLastQuestion ? 'block' : 'none';
    }
}

function selectOption(questionId, letter) {
    userAnswers[questionId] = letter;

    // Update UI
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
    });

    event.currentTarget.classList.add('selected');
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

function nextQuestion() {
    const questions = questionDatabase[currentExam][currentTest].questions;
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
}

function submitTest() {
    const questions = questionDatabase[currentExam][currentTest].questions;

    // Check if all questions are answered
    const unansweredCount = questions.length - Object.keys(userAnswers).length;

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
    const questions = questionDatabase[currentExam][currentTest].questions;
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    questions.forEach(question => {
        const userAnswer = userAnswers[question.id];

        if (!userAnswer) {
            unanswered++;
        } else if (userAnswer === question.correctAnswer) {
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
