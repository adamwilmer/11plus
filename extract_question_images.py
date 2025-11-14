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
    crop_coords=(0.28, 0.08, 0.72, 0.35),
    output_name="maths_q4_grid.png"
)

# Question 6: Triangle and hexagon (page 3)
extract_question_image(
    doc, 3, 6,
    crop_coords=(0.18, 0.67, 0.82, 0.83),
    output_name="maths_q6_shapes.png"
)

# Question 8: Triangle with more at top (page 4)
extract_question_image(
    doc, 4, 8,
    crop_coords=(0.28, 0.28, 0.72, 0.50),
    output_name="maths_q8_triangle.png"
)

# Question 11: Jug and jar with more at top (page 5)
extract_question_image(
    doc, 5, 11,
    crop_coords=(0.20, 0.15, 0.80, 0.38),
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
    crop_coords=(0.10, 0.32, 0.90, 0.40),
    output_name="maths_q20_shapes.png"
)

# Question 23: Baby weight graph only (page 9)
extract_question_image(
    doc, 9, 23,
    crop_coords=(0.22, 0.40, 0.78, 0.70),
    output_name="maths_q23_graph.png"
)

# Question 24: 3D shapes only (page 10)
extract_question_image(
    doc, 10, 24,
    crop_coords=(0.22, 0.16, 0.78, 0.44),
    output_name="maths_q24_cuboids.png"
)

# Question 25: Angle diagram only (page 10)
extract_question_image(
    doc, 10, 25,
    crop_coords=(0.34, 0.62, 0.66, 0.72),
    output_name="maths_q25_angle.png"
)

# Question 30: Population graph only (page 12)
extract_question_image(
    doc, 12, 30,
    crop_coords=(0.22, 0.26, 0.78, 0.60),
    output_name="maths_q30_population.png"
)

# Question 40: Venn diagram only (page 15)
extract_question_image(
    doc, 15, 40,
    crop_coords=(0.30, 0.24, 0.70, 0.46),
    output_name="maths_q40_venn.png"
)

# Question 42: Number line only (page 15)
extract_question_image(
    doc, 15, 42,
    crop_coords=(0.20, 0.71, 0.80, 0.77),
    output_name="maths_q42_numberline.png"
)

# Question 43: Frog on pond only (page 16)
extract_question_image(
    doc, 16, 43,
    crop_coords=(0.26, 0.22, 0.74, 0.46),
    output_name="maths_q43_frog.png"
)

# Question 45: Weather pie chart only (page 17)
extract_question_image(
    doc, 17, 45,
    crop_coords=(0.34, 0.22, 0.66, 0.44),
    output_name="maths_q45_weather.png"
)

# Question 47: Transport bar chart only (page 18)
extract_question_image(
    doc, 18, 47,
    crop_coords=(0.24, 0.28, 0.76, 0.64),
    output_name="maths_q47_transport.png"
)

# Question 48: Pizza diagram only (page 19)
extract_question_image(
    doc, 19, 48,
    crop_coords=(0.34, 0.20, 0.66, 0.42),
    output_name="maths_q48_pizza.png"
)

doc.close()
print()
print("All images extracted successfully!")
print("Remember to update data/maths.json to reference these images.")
