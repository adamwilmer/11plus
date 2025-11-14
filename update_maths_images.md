# Maths Questions That Need Images

The following questions have been extracted and need to be added to `data/maths.json`:

## Already Added
- ✅ Question 4: Coordinate grid (`images/maths_q4_grid.png`)

## Need to Add

Add the `"image"` field to these questions in `data/maths.json`:

### Question 6
```json
"image": "images/maths_q6_shapes.png",
```
Triangle and hexagon shapes

### Question 8
```json
"image": "images/maths_q8_triangle.png",
```
Triangle with shaded sections (fraction question)

### Question 11
```json
"image": "images/maths_q11_containers.png",
```
Jug and jar diagram

### Question 12
```json
"image": "images/maths_q12_chart.png",
```
Bar chart showing Kai's spare time activities

### Question 14
```json
"image": "images/maths_q14_rectangles.png",
```
Small square and large rectangle

### Question 15
```json
"image": "images/maths_q15_clocks.png",
```
Digital alarm clocks

### Question 20
```json
"image": "images/maths_q20_shapes.png",
```
Shapes to identify quadrilaterals

### Question 23
```json
"image": "images/maths_q23_graph.png",
```
Baby weight graph

### Question 24
```json
"image": "images/maths_q24_cuboids.png",
```
3D shapes/cuboids

### Question 25
```json
"image": "images/maths_q25_angle.png",
```
Angle diagram

### Question 30
```json
"image": "images/maths_q30_population.png",
```
Population of Britain graph

### Question 40
```json
"image": "images/maths_q40_venn.png",
```
Venn diagram for multiples

### Question 42
```json
"image": "images/maths_q42_numberline.png",
```
Number line from 1200 to 1400

### Question 43
```json
"image": "images/maths_q43_frog.png",
```
Frog jumping on pond

### Question 45
```json
"image": "images/maths_q45_weather.png",
```
Weather pie chart

### Question 47
```json
"image": "images/maths_q47_transport.png",
```
Transport bar chart

### Question 48
```json
"image": "images/maths_q48_pizza.png",
```
Pizza cut into six slices

## Example Format

For each question, add the image field like this:

```json
{
  "id": 6,
  "question": "How many of the triangles will fill the hexagon?",
  "image": "images/maths_q6_shapes.png",
  "options": [
    { "letter": "A", "text": "10" },
    ...
  ],
  "correctAnswer": "D"
}
```
