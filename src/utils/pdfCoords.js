// PDF coordinate conversion utilities
// PDF uses bottom-left origin, screen uses top-left origin

export const PREVIEW_DPI = 144;

// Convert PDF points to screen pixels
export const ptToPx = (points) => points * (PREVIEW_DPI / 72);

// Convert screen pixels to PDF points  
export const pxToPt = (pixels) => pixels * (72 / PREVIEW_DPI);

// Convert rectangle from points to pixels [x1, y1, x2, y2]
export const rectPtToPx = (rectPt = [0, 0, 0, 0]) => [
  ptToPx(rectPt[0]),
  ptToPx(rectPt[1]), 
  ptToPx(rectPt[2]),
  ptToPx(rectPt[3])
];

// Convert rectangle from pixels to points [x1, y1, x2, y2]
export const rectPxToPt = (rectPx = [0, 0, 0, 0]) => [
  pxToPt(rectPx[0]),
  pxToPt(rectPx[1]),
  pxToPt(rectPx[2]), 
  pxToPt(rectPx[3])
];

// Convert screen coordinates to PDF coordinates using page metrics
export const screenToPdfCoords = (screenX, screenY, pageMetrics) => {
  if (!pageMetrics) return { x: screenX, y: screenY };
  
  const scaleX = pageMetrics.pointsWidth / pageMetrics.pixelWidth;
  const scaleY = pageMetrics.pointsHeight / pageMetrics.pixelHeight;
  
  return {
    x: screenX * scaleX,
    y: screenY * scaleY
  };
};

// Convert PDF coordinates to screen coordinates using page metrics
export const pdfToScreenCoords = (pdfX, pdfY, pageMetrics) => {
  if (!pageMetrics) return { x: pdfX, y: pdfY };
  
  const scaleX = pageMetrics.pixelWidth / pageMetrics.pointsWidth;
  const scaleY = pageMetrics.pixelHeight / pageMetrics.pointsHeight;
  
  return {
    x: pdfX * scaleX,
    y: pdfY * scaleY
  };
};

// Snap coordinate to grid (8pt default)
export const snapToGrid = (value, gridSize = 8) => {
  return Math.round(value / gridSize) * gridSize;
};

// Convert AI field coordinates to proper format
export const processAICoordinates = (aiRect) => {
  if (!Array.isArray(aiRect) || aiRect.length < 4) {
    return [0, 0, 100, 20];
  }
  
  const [a, b, c, d] = aiRect.map(coord => Number(coord) || 0);
  
  // If c and d are small values (< 500), they're likely width/height
  // If they're large values, they're likely x2/y2 coordinates
  if (c < 500 && d < 200) {
    // Convert from [x, y, width, height] to [x1, y1, x2, y2]
    return [a, b, a + c, b + d];
  }
  
  return [a, b, c, d];
};