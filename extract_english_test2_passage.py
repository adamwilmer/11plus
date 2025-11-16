#!/usr/bin/env python3
"""
Extract passage images from English Test 2 PDF.
Usage: python3 extract_english_test2_passage.py

This script extracts the reading comprehension passage from the English Test 2 PDF.
"""
import fitz  # PyMuPDF
from PIL import Image
import io
import os

def extract_passage_image(pdf_doc, page_num, crop_coords, output_name):
    """
    Extract and crop a passage image from a PDF page.

    Args:
        pdf_doc: PyMuPDF document object
        page_num: Page number (0-indexed)
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
    print(f"✓ {output_name}: {output_path}")

# Ensure images directory exists
os.makedirs("images", exist_ok=True)

# Open the PDF
pdf_path = "exams/English/English 2 Test Booklet.pdf"
doc = fitz.open(pdf_path)

print("Extracting passage images from English Test 2 PDF...")
print()

# Extract passage from pages (adjust page numbers and crop coordinates as needed)
# Typically the passage starts on page 1 or 2 (0-indexed 0 or 1)
# You may need to adjust these coordinates by examining the PDF

# Page 1 - First part of passage
extract_passage_image(
    doc, 1,
    crop_coords=(0.05, 0.08, 0.95, 0.95),
    output_name="english_test2_passage_1.png"
)

# Page 2 - Second part of passage (if it spans multiple pages)
extract_passage_image(
    doc, 2,
    crop_coords=(0.05, 0.05, 0.95, 0.95),
    output_name="english_test2_passage_2.png"
)

# Add more pages if the passage continues
# extract_passage_image(
#     doc, 3,
#     crop_coords=(0.10, 0.05, 0.90, 0.50),
#     output_name="english_test2_passage_3.png"
# )

doc.close()
print()
print("Passage images extracted successfully!")
print("Remember to update data/english.json to add the passageImage field for test2.")
