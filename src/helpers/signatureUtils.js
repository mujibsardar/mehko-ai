/**
 * Utility functions for generating signature images from text names.
 */

/**
 * Generate a signature image from text using HTML5 Canvas
 * @param {string} text - The text to convert to signature
 * @param {Object} options - Options for signature generation
 * @param {number} options.width - Width of the canvas (default: 300)
 * @param {number} options.height - Height of the canvas (default: 80)
 * @param {number} options.fontSize - Font size (default: 48)
 * @param {string} options.fontFamily - Font family (default: cursive)
 * @param {string} options.color - Text color (default: #000000)
 * @returns {string} Data URL of the generated signature image
 */
export function generateSignatureImage(text, options = {}) {
  const {
    width = 300,
    height = 80,
    fontSize = 48,
    fontFamily = 'cursive',
    color = '#000000'
  } = options;

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas dimensions
  canvas.width = width;
  canvas.height = height;
  
  // Set background to transparent
  ctx.clearRect(0, 0, width, height);
  
  // Configure text style
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Add some randomness to make it look more like a real signature
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Draw the signature text with slight variations
  ctx.save();
  
  // Add slight rotation for authenticity
  const rotation = (Math.random() - 0.5) * 0.1; // ±0.05 radians
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  
  // Draw main text
  ctx.fillText(text, 0, 0);
  
  // Add a subtle stroke for better appearance
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.strokeText(text, 0, 0);
  
  ctx.restore();
  
  // Convert to data URL
  return canvas.toDataURL('image/png');
}

/**
 * Generate a signature image and return it as a Blob
 * @param {string} text - The text to convert to signature
 * @param {Object} options - Options for signature generation
 * @returns {Promise<Blob>} Promise that resolves to a Blob
 */
export function generateSignatureBlob(text, options = {}) {
  return new Promise((resolve) => {
    const dataUrl = generateSignatureImage(text, options);
    
    // Convert data URL to Blob
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => resolve(blob));
  });
}

/**
 * Check if a field is a signature field
 * @param {Object} field - Field object from overlay
 * @returns {boolean} True if field type is "signature"
 */
export function isSignatureField(field) {
  return field?.type === 'signature';
}

/**
 * Generate signature for a specific field
 * @param {string} text - The text to convert to signature
 * @param {Object} field - Field object from overlay
 * @returns {string} Data URL of the generated signature
 */
export function generateSignatureForField(text, field) {
  if (!isSignatureField(field)) {
    return text; // Return original text for non-signature fields
  }
  
  // Calculate appropriate dimensions based on field rectangle
  const [x0, y0, x1, y1] = field.rect || [0, 0, 100, 20];
  const width = Math.max(100, Math.abs(x1 - x0) * 2); // Scale up for better quality
  const height = Math.max(40, Math.abs(y1 - y0) * 2);
  const fontSize = Math.min(48, Math.max(16, height * 0.6));
  
  return generateSignatureImage(text, {
    width,
    height,
    fontSize,
    fontFamily: 'cursive'
  });
}
