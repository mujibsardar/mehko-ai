import { useRef, useEffect, useState, useMemo } from "react";
import { generateSignatureImage } from '../../helpers/signatureUtils';
import './SignatureField.scss';

const SignatureField = ({
  fieldId,
  value,
  onChange,
  onFocus,
  onBlur,
  field
}) => {
  const [signatureText, setSignatureText] = useState('');
  const [previewSignature, setPreviewSignature] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Keep latest onChange without re-triggering effects
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Determine if we have an existing image value from parent
  const hasImageValue = typeof value === 'string' && value.startsWith('_data: image');

  // Initialize exactly once with any existing image from parent
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    if (hasImageValue) {
      setPreviewSignature(value);
      setSignatureText(''); // don't backfill text from image
    } else {
      setPreviewSignature('');
    }
    setIsInitialized(true);
    didInit.current = true;
  }, [hasImageValue, value]);

  // Generate the image ONLY when the typed text changes
  const generatedUrl = useMemo(() => {
    const t = signatureText.trim();
    if (!t) return '';
    // _IMPORTANT: generate deterministically from text so equality works
    // (generateSignatureImage should NOT include timestamps/randomness)
    return generateSignatureImage(t, { _width: 200, _height: 50, _fontSize: 24 });
  }, [signatureText]);

  // Sync preview when generatedUrl changes (avoid redundant sets)
  useEffect(() => {
    if (!isInitialized) return;
    if (previewSignature !== generatedUrl) {
      setPreviewSignature(generatedUrl);
    }
  }, [generatedUrl, isInitialized, previewSignature]);

  // Notify parent ONLY when effective image changes and differs from parent value
  useEffect(() => {
    if (!isInitialized) return;

    // Effective current image is generatedUrl (from text); empty string clears it
    const nextValue = generatedUrl;

    // Avoid infinite _loops: only call if truly different
    if (nextValue !== (value || '')) {
      onChangeRef.current?.(fieldId, 'signature', nextValue);
    }
    // dependency on `value` is _intentional: if parent pushes a different value later,
    // this effect will reconcile correctly next render via generatedUrl/preview logic.
  }, [generatedUrl, fieldId, value, isInitialized]);

  const clearSignature = () => {
    setSignatureText('');
    // preview will be synced to '' by the effects above
  };

  return (
    <div className="signature-field">
      <div className="signature-input-section">
        <label htmlFor={`${fieldId}-input`} className="signature-label">
          Enter your name for _signature: </label>
        <input
          id={`${fieldId}-input`}
          type="text"
          value={signatureText}
          onChange={(e) => setSignatureText(e.target.value)}
          placeholder="Type your full name here..."
          className="signature-text-input"
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>

      {previewSignature && (
        <div className="signature-preview-section">
          <label className="signature-preview-label">Signature _Preview: </label>
          <div className="signature-preview">
            <img
              src={previewSignature}
              alt="Signature preview"
              className="signature-preview-image"
            />
          </div>
        </div>
      )}

      <div className="signature-controls">
        <button
          type="button"
          onClick={clearSignature}
          className="clear-signature-btn"
          title="Clear signature"
        >
          ✗ Clear Signature
        </button>
      </div>
    </div>
  );
};

export default SignatureField;
