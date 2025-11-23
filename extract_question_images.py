#!/usr/bin/env python3
"""
Extract images from Maths PDF for specific questions.
Usage: python3 extract_question_images.py

This script extracts diagrams/images from the Maths PDF that are needed for questions.
Adjust the crop coordinates for each question as needed.
"""
import fitz  # PyMuPDF
from PIL import Image
import io
import os

def extract_question_image(pdf_doc, page_num, question_num, crop_coords, output_name):
    """
    Extract and crop an image from a PDF page.

    Args:
        pdf_doc: PyMuPDF document object
        page_num: Page number (0-indexed)
        question_num: Question number for logging
        crop_coords: Tuple of (left, top, right, bottom) as percentages (0.0 to 1.0)
        output_name: Output filename (will be saved to images/ directory)
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
    output_path = f"images/{output_name}"
    cropped.save(output_path)
    print(f"✓ Question {question_num}: {output_path}")

# Ensure images directory exists
os.makedirs("images", exist_ok=True)

# Open the PDF
pdf_path = "exams/Maths/Maths_1_Test Booklet.pdf"
doc = fitz.open(pdf_path)

print("Extracting question images from Maths PDF...")
print("(Extracting ONLY the visual diagrams, no text)")
print()

# Question 4: Coordinate grid only (page 3, 0-indexed)
extract_question_image(
    doc, 3, 4,
    crop_coords=(0.30, 0.08, 0.76, 0.38),
    output_name="maths_q4_grid.png"
)

# Question 6: Triangle and hexagon (page 3)
extract_question_image(
    doc, 3, 6,
    crop_coords=(0.23, 0.71, 0.79, 0.84),
    output_name="maths_q6_shapes.png"
)

# Question 8: Triangle with more at top (page 4)
extract_question_image(
    doc, 4, 8,
    crop_coords=(0.28, 0.22, 0.72, 0.50),
    output_name="maths_q8_triangle.png"
)

# Question 11: Jug and jar with more at top (page 5)
extract_question_image(
    doc, 5, 11,
    crop_coords=(0.20, 0.10, 0.90, 0.38),
    output_name="maths_q11_containers.png"
)

# Question 12: Bar chart with more at top (page 5)
extract_question_image(
    doc, 5, 12,
    crop_coords=(0.12, 0.56, 0.88, 0.81),
    output_name="maths_q12_chart.png"
)

# Question 14: Rectangles with more at top (page 6)
extract_question_image(
    doc, 6, 14,
    crop_coords=(0.18, 0.25, 0.82, 0.38),
    output_name="maths_q14_rectangles.png"
)

# Question 15: Digital clocks with more at top (page 6)
extract_question_image(
    doc, 6, 15,
    crop_coords=(0.24, 0.54, 0.76, 0.78),
    output_name="maths_q15_clocks.png"
)

# Question 20: All five shapes A-E complete, no question text (page 8)
extract_question_image(
    doc, 8, 20,
    crop_coords=(0.19, 0.29, 0.97, 0.42),
    output_name="maths_q20_shapes.png"
)

# Question 21: Train timetable (page 8)
extract_question_image(
    doc, 8, 21,
    crop_coords=(0.20, 0.53, 0.97, 0.80),
    output_name="maths_q21_diagram.png"
)

# Question 23: Baby weight graph only (page 9)
extract_question_image(
    doc, 9, 23,
    crop_coords=(0.15, 0.25, 0.96, 0.56),
    output_name="maths_q23_graph.png"
)

# Question 24: 3D shapes only (page 10)
extract_question_image(
    doc, 10, 24,
    crop_coords=(0.15, 0.08, 0.78, 0.33),
    output_name="maths_q24_cuboids.png"
)

# Question 25: Angle diagram only (page 10)
extract_question_image(
    doc, 10, 25,
    crop_coords=(0.21, 0.47, 0.87, 0.61),
    output_name="maths_q25_angle.png"
)

# Question 30: Population graph only (page 12)
extract_question_image(
    doc, 12, 30,
    crop_coords=(0.22, 0.12, 0.88, 0.48),
    output_name="maths_q30_population.png"
)

# Question 40: Venn diagram only (page 15)
extract_question_image(
    doc, 15, 40,
    crop_coords=(0.22, 0.12, 0.88, 0.34),
    output_name="maths_q40_venn.png"
)

# Question 42: Number line only (page 15)
extract_question_image(
    doc, 15, 42,
    crop_coords=(0.17, 0.69, 0.97, 0.82),
    output_name="maths_q42_numberline.png"
)

# Question 43: Frog on pond only (page 16)
extract_question_image(
    doc, 16, 43,
    crop_coords=(0.18, 0.19, 0.90, 0.42),
    output_name="maths_q43_frog.png"
)

# Question 45: Weather pie chart only (page 17)
extract_question_image(
    doc, 17, 45,
    crop_coords=(0.27, 0.14, 0.78, 0.37),
    output_name="maths_q45_weather.png"
)

# Question 47: Transport bar chart only (page 18)
extract_question_image(
    doc, 18, 47,
    crop_coords=(0.22, 0.19, 0.94, 0.48),
    output_name="maths_q47_transport.png"
)

# Question 48: Pizza diagram only (page 19)
extract_question_image(
    doc, 19, 48,
    crop_coords=(0.28, 0.14, 0.77, 0.41),
    output_name="maths_q48_pizza.png"
)

doc.close()

# Maths Test 2
pdf_path_2 = "exams/Maths/Maths_2_Test Booklet.pdf.pdf"
doc2 = fitz.open(pdf_path_2)

print()
print("Extracting question images from Maths Test 2 PDF...")
print()

# Question 2
extract_question_image(
    doc2, 1, 2,
    crop_coords=(0.17, 0.21, 0.99, 0.44),
    output_name="maths2_q2_birthdays.png"
)

# Question 5
extract_question_image(
    doc2, 2, 5,
    crop_coords=(0.25, 0.08, 0.85, 0.39),
    output_name="maths2_q5_coordinates.png"
)

# Question 8
extract_question_image(
    doc2, 3, 8,
    crop_coords=(0.29, 0.08, 0.73, 0.29),
    output_name="maths2_q8_circle.png"
)

# Question 11
extract_question_image(
    doc2, 4, 11,
    crop_coords=(0.31, 0.15, 0.76, 0.43),
    output_name="maths2_q11_library.png"
)

# Question 24
extract_question_image(
    doc2, 9, 24,
    crop_coords=(0.28, 0.13, 0.81, 0.46),
    output_name="maths2_q24_heights.png"
)

# Question 32
extract_question_image(
    doc2, 12, 32,
    crop_coords=(0.25, 0.13, 0.79, 0.47),
    output_name="maths2_q32_squares.png"
)

# Question 34
extract_question_image(
    doc2, 13, 34,
    crop_coords=(0.24, 0.15, 0.76, 0.41),
    output_name="maths2_q34_rectangle.png"
)

# Question 35
extract_question_image(
    doc2, 13, 35,
    crop_coords=(0.30, 0.57, 0.78, 0.73),
    output_name="maths2_q35_hexagon.png"
)

# Question 40
extract_question_image(
    doc2, 15, 40,
    crop_coords=(0.22, 0.31, 0.92, 0.61),
    output_name="maths2_q40_graph.png"
)

# Question 43
extract_question_image(
    doc2, 17, 43,
    crop_coords=(0.23, 0.14, 0.81, 0.39),
    output_name="maths2_q43_parallel.png"
)

doc2.close()

# Verbal Reasoning Test 1
pdf_path_vr = "exams/Verbal Reasoning/Verbal Reasoning_1_Test Booklet.pdf"
doc_vr = fitz.open(pdf_path_vr)

print()
print("Extracting question images from Verbal Reasoning Test 1 PDF...")
print()

# Question 75-77: Shared diagram
extract_question_image(
    doc_vr, 21, 75,
    crop_coords=(0.04, 0.08, 0.99, 0.47),
    output_name="verbal_reasoning_q75_diagram.png"
)

# Question 78-80: Shared diagram
extract_question_image(
    doc_vr, 22, 78,
    crop_coords=(0.02, 0.08, 0.99, 0.36),
    output_name="verbal_reasoning_q78_diagram.png"
)

doc_vr.close()
print()
print("All images extracted successfully!")
print("Remember to update data/maths.json and data/verbal-reasoning.json to reference these images.")
