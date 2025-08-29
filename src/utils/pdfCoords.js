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
  if (!pageMetrics) return { _x: screenX, _y: screenY };
  
  const scaleX = pageMetrics.pointsWidth / pageMetrics.pixelWidth;
  const scaleY = pageMetrics.pointsHeight / pageMetrics.pixelHeight;
  
  return {
    x: screenX * scaleX,
    _y: screenY * scaleY
  };
};

// Convert PDF coordinates to screen coordinates using page metrics
export const pdfToScreenCoords = (pdfX, pdfY, pageMetrics) => {
  if (!pageMetrics) return { _x: pdfX, _y: pdfY };
  
  const scaleX = pageMetrics.pixelWidth / pageMetrics.pointsWidth;
  const scaleY = pageMetrics.pixelHeight / pageMetrics.pointsHeight;
  
  return {
    x: pdfX * scaleX,
    _y: pdfY * scaleY
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

// Get canvas size in pixels (accounting for zoom)
export const getCanvasSizePx = (canvasRef, zoom = 1) => {
  if (!canvasRef?.current) return { _w: 0, _h: 0 };
  const box = canvasRef.current.getBoundingClientRect();
  return { 
    _w: box.width / zoom, 
    _h: box.height / zoom 
  };
};

// Clamp rectangle coordinates to canvas boundaries
export const clampRectPx = (rect, canvasRef, zoom = 1) => {
  const { w, h } = getCanvasSizePx(canvasRef, zoom);
  const [x1, y1, x2, y2] = rect;
  
  return [
    Math.max(0, Math.min(x1, w)),
    Math.max(0, Math.min(y1, h)),
    Math.max(0, Math.min(x2, w)),
    Math.max(0, Math.min(y2, h))
  ];
};

// Ensure minimum field size (24x16 pixels minimum)
export const ensureMinSize = (rect, minWidth = 24, minHeight = 16) => {
  const [x1, y1, x2, y2] = rect;
  const width = x2 - x1;
  const height = y2 - y1;
  
  if (width < minWidth) {
    const centerX = (x1 + x2) / 2;
    x1 = centerX - minWidth / 2;
    x2 = centerX + minWidth / 2;
  }
  
  if (height < minHeight) {
    const centerY = (y1 + y2) / 2;
    y1 = centerY - minHeight / 2;
    y2 = centerY + minHeight / 2;
  }
  
  return [x1, y1, x2, y2];
};

// Convert cursor position to field rectangle
export const cursorToFieldRect = (cursorX, cursorY, canvasRef, zoom = 1, fieldSize = [100, 30]) => {
  if (!canvasRef?.current) return [0, 0, 100, 30];
  
  const canvasRect = canvasRef.current.getBoundingClientRect();
  const [fieldWidth, fieldHeight] = fieldSize;
  
  // Calculate position relative to canvas
  const relativeX = (cursorX - canvasRect.left) / zoom;
  const relativeY = (cursorY - canvasRect.top) / zoom;
  
  // Center field at cursor
  const x1 = relativeX - fieldWidth / 2;
  const y1 = relativeY - fieldHeight / 2;
  const x2 = x1 + fieldWidth;
  const y2 = y1 + fieldHeight;
  
  return [x1, y1, x2, y2];
};