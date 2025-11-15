#!/usr/bin/env python3
"""
Generate the non-verbal-reasoning.json file with all questions, images, and answers.
"""
import json

# Answer keys from the Parent's Guide
answers = {
    "test1": [
        # Section 1 (Q1-20)
        "B", "B", "D", "B", "D", "A", "D", "D", "C", "D",
        "E", "D", "E", "D", "D", "E", "B", "C", "C", "D",
        # Section 2 (Q21-40)
        "E", "E", "C", "E", "D", "B", "C", "D", "E", "E",
        "A", "B", "C", "B", "B", "C", "E", "A", "B", "E",
        # Section 3 (Q41-60)
        "B", "D", "B", "E", "C", "C", "E", "D", "A", "D",
        "E", "B", "A", "E", "E", "E", "A", "B", "D", "A",
        # Section 4 (Q61-80)
        "C", "E", "B", "E", "B", "D", "E", "A", "C", "E",
        "C", "A", "A", "C", "A", "D", "B", "C", "E", "A"
    ],
    "test2": [
        # Section 1 (Q1-20)
        "A", "E", "B", "E", "D", "A", "C", "D", "E", "C",
        "C", "B", "A", "C", "E", "C", "A", "D", "B", "B",
        # Section 2 (Q21-40)
        "B", "E", "A", "B", "C", "A", "D", "A", "A", "B",
        "E", "D", "C", "B", "B", "D", "A", "E", "B", "C",
        # Section 3 (Q41-60)
        "A", "D", "C", "B", "C", "E", "E", "D", "A", "D",
        "C", "A", "D", "C", "B", "C", "D", "B", "B", "E",
        # Section 4 (Q61-80)
        "A", "E", "D", "C", "E", "B", "E", "C", "E", "A",
        "C", "B", "E", "C", "E", "A", "C", "B", "E", "D"
    ],
    "test3": [
        # Section 1 (Q1-20)
        "B", "A", "A", "B", "E", "B", "C", "D", "B", "D",
        "E", "B", "C", "B", "A", "E", "D", "C", "B", "E",
        # Section 2 (Q21-40)
        "D", "C", "D", "B", "A", "C", "A", "B", "C", "B",
        "C", "E", "D", "A", "E", "D", "E", "B", "C", "A",
        # Section 3 (Q41-60)
        "C", "D", "B", "C", "E", "B", "D", "C", "E", "A",
        "B", "E", "D", "E", "A", "B", "A", "A", "D", "B",
        # Section 4 (Q61-80)
        "A", "E", "D", "D", "C", "B", "C", "C", "E", "D",
        "C", "C", "D", "D", "E", "B", "A", "B", "E", "B"
    ]
}

# Section instructions for context
section_instructions = {
    1: "Complete the sequence",
    2: "Find the matching relationship",
    3: "Find the most similar figure",
    4: "Decode the pattern"
}

def create_question(question_num, test_name, answer):
    """Create a question object."""
    # Determine which section this question belongs to
    if 1 <= question_num <= 20:
        section = 1
    elif 21 <= question_num <= 40:
        section = 2
    elif 41 <= question_num <= 60:
        section = 3
    else:  # 61-80
        section = 4

    return {
        "id": question_num,
        "question": f"Question {question_num}",
        "instruction": section_instructions[section],
        "image": f"images/non-verbal-reasoning/{test_name}/q{question_num}.png",
        "options": [
            {"letter": "A", "text": "A"},
            {"letter": "B", "text": "B"},
            {"letter": "C", "text": "C"},
            {"letter": "D", "text": "D"},
            {"letter": "E", "text": "E"}
        ],
        "correctAnswer": answer
    }

# Build the complete data structure
data = {}

for test_name in ["test1", "test2", "test3"]:
    test_num = test_name[-1]
    questions = []

    for q_num in range(1, 81):
        answer = answers[test_name][q_num - 1]
        questions.append(create_question(q_num, test_name, answer))

    data[test_name] = {
        "title": f"Non-Verbal Reasoning Test {test_num}",
        "questions": questions
    }

# Write to file
output_path = "data/non-verbal-reasoning.json"
with open(output_path, 'w') as f:
    json.dump(data, f, indent=2)

print(f"✓ Successfully generated {output_path}")
print(f"  - 3 tests created")
print(f"  - 80 questions per test")
print(f"  - 240 total questions")
print(f"\nFile size: {len(json.dumps(data, indent=2))} bytes")
