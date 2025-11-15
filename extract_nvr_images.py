#!/usr/bin/env python3
"""
Extract images from Non-Verbal Reasoning PDFs for all questions.
Usage: python3 extract_nvr_images.py

This script extracts all 80 question images from each of the 3 Non-Verbal Reasoning tests.
Each question is entirely visual, so we extract the full question area including the answer options.
"""
import fitz  # PyMuPDF
from PIL import Image
import io
import os

def extract_question_image(pdf_doc, page_num, question_num, crop_coords, output_path):
    """
    Extract and crop an image from a PDF page.

    Args:
        pdf_doc: PyMuPDF document object
        page_num: Page number (0-indexed)
        question_num: Question number for logging
        crop_coords: Tuple of (left, top, right, bottom) as percentages (0.0 to 1.0)
        output_path: Full output path including directory and filename
    """
    page = pdf_doc[page_num]

    # Get high-resolution image of the page
    mat = fitz.Matrix(3, 3)  # 3x zoom for quality
    pix = page.get_pixmap(matrix=mat)

    # Convert to PIL Image
    img = Image.open(io.BytesIO(pix.tobytes()))
    width, height = img.size

    # Calculate crop coordinates
    left = int(width * crop_coords[0])
    top = int(height * crop_coords[1])
    right = int(width * crop_coords[2])
    bottom = int(height * crop_coords[3])

    # Crop and save
    cropped = img.crop((left, top, right, bottom))
    cropped.save(output_path)
    print(f"  Q{question_num}: {output_path}")

# Ensure images directories exist
os.makedirs("images/non-verbal-reasoning/test1", exist_ok=True)
os.makedirs("images/non-verbal-reasoning/test2", exist_ok=True)
os.makedirs("images/non-verbal-reasoning/test3", exist_ok=True)

# PDF paths
pdfs = [
    ("exams/Non - Verbal Reasoning/Non-Verbal Reasoning_1_ Test Booklet.pdf", "test1"),
    ("exams/Non - Verbal Reasoning/Non-Verbal Reasoning_2_Test Booklet.pdf", "test2"),
    ("exams/Non - Verbal Reasoning/Non-Verbal Reasoning_3_Test Booklet.pdf", "test3")
]

# Page mappings for each test (all tests have same structure)
# Page numbers are 0-indexed
# Each page has 5 questions except instruction pages

page_mappings = {
    # Section 1: Questions 1-20 (pages 3-6 in PDF, indices 3-6)
    1: (3, 0.0, 0.08, 1.0, 0.24),    # Q1 on page 4 (index 3)
    2: (3, 0.0, 0.24, 1.0, 0.40),    # Q2
    3: (3, 0.0, 0.40, 1.0, 0.56),    # Q3
    4: (3, 0.0, 0.56, 1.0, 0.72),    # Q4
    5: (3, 0.0, 0.72, 1.0, 0.88),    # Q5

    6: (4, 0.0, 0.08, 1.0, 0.24),    # Q6 on page 5 (index 4)
    7: (4, 0.0, 0.24, 1.0, 0.40),    # Q7
    8: (4, 0.0, 0.40, 1.0, 0.56),    # Q8
    9: (4, 0.0, 0.56, 1.0, 0.72),    # Q9
    10: (4, 0.0, 0.72, 1.0, 0.88),   # Q10

    11: (5, 0.0, 0.08, 1.0, 0.24),   # Q11 on page 6 (index 5)
    12: (5, 0.0, 0.24, 1.0, 0.40),   # Q12
    13: (5, 0.0, 0.40, 1.0, 0.56),   # Q13
    14: (5, 0.0, 0.56, 1.0, 0.72),   # Q14
    15: (5, 0.0, 0.72, 1.0, 0.88),   # Q15

    16: (6, 0.0, 0.08, 1.0, 0.24),   # Q16 on page 7 (index 6)
    17: (6, 0.0, 0.24, 1.0, 0.40),   # Q17
    18: (6, 0.0, 0.40, 1.0, 0.56),   # Q18
    19: (6, 0.0, 0.56, 1.0, 0.72),   # Q19
    20: (6, 0.0, 0.72, 1.0, 0.88),   # Q20

    # Section 2: Questions 21-40 (pages 9-12 in PDF, indices 9-12)
    21: (9, 0.0, 0.08, 1.0, 0.24),   # Q21 on page 10 (index 9)
    22: (9, 0.0, 0.24, 1.0, 0.40),   # Q22
    23: (9, 0.0, 0.40, 1.0, 0.56),   # Q23
    24: (9, 0.0, 0.56, 1.0, 0.72),   # Q24
    25: (9, 0.0, 0.72, 1.0, 0.88),   # Q25

    26: (10, 0.0, 0.08, 1.0, 0.24),  # Q26 on page 11 (index 10)
    27: (10, 0.0, 0.24, 1.0, 0.40),  # Q27
    28: (10, 0.0, 0.40, 1.0, 0.56),  # Q28
    29: (10, 0.0, 0.56, 1.0, 0.72),  # Q29
    30: (10, 0.0, 0.72, 1.0, 0.88),  # Q30

    31: (11, 0.0, 0.08, 1.0, 0.24),  # Q31 on page 12 (index 11)
    32: (11, 0.0, 0.24, 1.0, 0.40),  # Q32
    33: (11, 0.0, 0.40, 1.0, 0.56),  # Q33
    34: (11, 0.0, 0.56, 1.0, 0.72),  # Q34
    35: (11, 0.0, 0.72, 1.0, 0.88),  # Q35

    36: (12, 0.0, 0.08, 1.0, 0.24),  # Q36 on page 13 (index 12)
    37: (12, 0.0, 0.24, 1.0, 0.40),  # Q37
    38: (12, 0.0, 0.40, 1.0, 0.56),  # Q38
    39: (12, 0.0, 0.56, 1.0, 0.72),  # Q39
    40: (12, 0.0, 0.72, 1.0, 0.88),  # Q40

    # Section 3: Questions 41-60 (pages 15-18 in PDF, indices 15-18)
    41: (15, 0.0, 0.08, 1.0, 0.24),  # Q41 on page 16 (index 15)
    42: (15, 0.0, 0.24, 1.0, 0.40),  # Q42
    43: (15, 0.0, 0.40, 1.0, 0.56),  # Q43
    44: (15, 0.0, 0.56, 1.0, 0.72),  # Q44
    45: (15, 0.0, 0.72, 1.0, 0.88),  # Q45

    46: (16, 0.0, 0.08, 1.0, 0.24),  # Q46 on page 17 (index 16)
    47: (16, 0.0, 0.24, 1.0, 0.40),  # Q47
    48: (16, 0.0, 0.40, 1.0, 0.56),  # Q48
    49: (16, 0.0, 0.56, 1.0, 0.72),  # Q49
    50: (16, 0.0, 0.72, 1.0, 0.88),  # Q50

    51: (17, 0.0, 0.08, 1.0, 0.24),  # Q51 on page 18 (index 17)
    52: (17, 0.0, 0.24, 1.0, 0.40),  # Q52
    53: (17, 0.0, 0.40, 1.0, 0.56),  # Q53
    54: (17, 0.0, 0.56, 1.0, 0.72),  # Q54
    55: (17, 0.0, 0.72, 1.0, 0.88),  # Q55

    56: (18, 0.0, 0.08, 1.0, 0.24),  # Q56 on page 19 (index 18)
    57: (18, 0.0, 0.24, 1.0, 0.40),  # Q57
    58: (18, 0.0, 0.40, 1.0, 0.56),  # Q58
    59: (18, 0.0, 0.56, 1.0, 0.72),  # Q59
    60: (18, 0.0, 0.72, 1.0, 0.88),  # Q60

    # Section 4: Questions 61-80 (pages 21-24 in PDF, indices 21-24)
    61: (21, 0.0, 0.08, 1.0, 0.24),  # Q61 on page 22 (index 21)
    62: (21, 0.0, 0.24, 1.0, 0.40),  # Q62
    63: (21, 0.0, 0.40, 1.0, 0.56),  # Q63
    64: (21, 0.0, 0.56, 1.0, 0.72),  # Q64
    65: (21, 0.0, 0.72, 1.0, 0.88),  # Q65

    66: (22, 0.0, 0.08, 1.0, 0.24),  # Q66 on page 23 (index 22)
    67: (22, 0.0, 0.24, 1.0, 0.40),  # Q67
    68: (22, 0.0, 0.40, 1.0, 0.56),  # Q68
    69: (22, 0.0, 0.56, 1.0, 0.72),  # Q69
    70: (22, 0.0, 0.72, 1.0, 0.88),  # Q70

    71: (23, 0.0, 0.08, 1.0, 0.24),  # Q71 on page 24 (index 23)
    72: (23, 0.0, 0.24, 1.0, 0.40),  # Q72
    73: (23, 0.0, 0.40, 1.0, 0.56),  # Q73
    74: (23, 0.0, 0.56, 1.0, 0.72),  # Q74
    75: (23, 0.0, 0.72, 1.0, 0.88),  # Q75

    76: (24, 0.0, 0.08, 1.0, 0.24),  # Q76 on page 25 (index 24)
    77: (24, 0.0, 0.24, 1.0, 0.40),  # Q77
    78: (24, 0.0, 0.40, 1.0, 0.56),  # Q78
    79: (24, 0.0, 0.56, 1.0, 0.72),  # Q79
    80: (24, 0.0, 0.72, 1.0, 0.88),  # Q80
}

print("Extracting Non-Verbal Reasoning images from all 3 tests...")
print("=" * 60)

for pdf_path, test_name in pdfs:
    print(f"\n{test_name.upper()}: {pdf_path}")
    print("-" * 60)

    doc = fitz.open(pdf_path)

    for q_num in range(1, 81):
        page_idx, left, top, right, bottom = page_mappings[q_num]
        output_path = f"images/non-verbal-reasoning/{test_name}/q{q_num}.png"

        extract_question_image(
            doc,
            page_idx,
            q_num,
            (left, top, right, bottom),
            output_path
        )

    doc.close()

print("\n" + "=" * 60)
print("All images extracted successfully!")
print("Total images created: 240 (80 questions × 3 tests)")
print("\nNext step: Update data/non-verbal-reasoning.json with image references and answers.")
