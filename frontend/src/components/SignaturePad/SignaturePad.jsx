import React, { useRef, useEffect, useState, useCallback } from 'react';
import './SignaturePad.css';

export default function SignaturePad({
  onSave,
  onClear,
  label = 'Firma digital',
  disabled = false,
  height = 160
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const getCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const handleStart = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y } = getCoords(e);
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [disabled, getCoords]);

  const handleMove = useCallback((e) => {
    if (!isDrawingRef.current || disabled) return;
    e.preventDefault();
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (isEmpty) {
      setIsEmpty(false);
    }
  }, [disabled, getCoords, isEmpty]);

  const handleEnd = useCallback((e) => {
    if (!isDrawingRef.current) return;
    if (e) e.preventDefault();
    isDrawingRef.current = false;
    
    // Al soltar el trazo, notificar la firma como Data URL base64
    const canvas = canvasRef.current;
    if (canvas && onSave) {
      onSave(canvas.toDataURL('image/png'));
    }
  }, [onSave]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(height * ratio);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineWidth = 2.5 * ratio;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a1a';
    ctxRef.current = ctx;
  }, [height]);

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, [initCanvas]);

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    if (onClear) onClear();
    if (onSave) onSave('');
  };

  return (
    <div className={`signature-pad-container ${disabled ? 'disabled' : ''}`}>
      {label && <label className="signature-pad-label">{label}</label>}
      <div className="signature-canvas-wrapper" style={{ height: `${height}px` }}>
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
        {isEmpty && !disabled && (
          <div className="signature-watermark">Firmar aquí con mouse o dedo</div>
        )}
      </div>
      {!disabled && (
        <div className="signature-pad-actions">
          <button
            type="button"
            className="btn-clear-signature"
            onClick={handleClearCanvas}
            disabled={isEmpty}
          >
            Limpiar firma
          </button>
        </div>
      )}
    </div>
  );
}
