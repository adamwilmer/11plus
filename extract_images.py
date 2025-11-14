#!/usr/bin/env python3
"""
Extract images from the Maths PDF for questions that need diagrams.
"""
import fitz  # PyMuPDF
from PIL import Image
import io

# Open the PDF
pdf_path = "exams/Maths/Maths_1_Test Booklet.pdf"
doc = fitz.open(pdf_path)

# Question 4 is on page 4 (page 3 in 0-indexed)
page = doc[3]

# Get the page as a high-resolution image
mat = fitz.Matrix(3, 3)  # 3x zoom for better quality
pix = page.get_pixmap(matrix=mat)

# Convert to PIL Image
img = Image.open(io.BytesIO(pix.tobytes()))

# The coordinate grid for question 4 is roughly in this area
# These coordinates are approximate and may need adjustment
# Based on the PDF, the grid appears to be in the upper portion of the page
width, height = img.size

# Crop to just the grid diagram (approximate coordinates)
# Question 4 grid appears to be in the upper-left quadrant
left = int(width * 0.25)
top = int(height * 0.12)
right = int(width * 0.75)
bottom = int(height * 0.40)

cropped = img.crop((left, top, right, bottom))

# Save the image
cropped.save("images/maths_q4_grid.png")
print("Saved: images/maths_q4_grid.png")

# Also save the full page for reference to help with cropping
img.save("images/maths_page4_full.png")
print("Saved: images/maths_page4_full.png (for reference)")

doc.close()
