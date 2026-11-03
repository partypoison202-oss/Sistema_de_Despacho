import React, { useRef, useEffect, useState, useCallback } from 'react';
import './SignaturePad.css';

export default function SignaturePad({
  onSave,
  onClear,
  label = 'Firma digital',
  disabled = false,
  height = 160,
  initialImage = ''
}) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Configuración de estilo del contexto 2D
  const setupContext = useCallback((canvas, ratio) => {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineWidth = 2.5 * ratio;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b';
    ctxRef.current = ctx;
    return ctx;
  }, []);

  // Coordenadas normalizadas con escala exacta del buffer interno vs el bounding client rect
  const getCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches && e.touches.length > 0 ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;

    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const handleStart = useCallback((e) => {
    if (disabled) return;
    if (e.cancelable) e.preventDefault();
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y } = getCoords(e);
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [disabled, getCoords]);

  const handleMove = useCallback((e) => {
    if (!isDrawingRef.current || disabled) return;
    if (e.cancelable) e.preventDefault();
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (!hasDrawnRef.current) {
      hasDrawnRef.current = true;
      setIsEmpty(false);
    }
  }, [disabled, getCoords]);

  const handleEnd = useCallback((e) => {
    if (!isDrawingRef.current) return;
    if (e && e.cancelable) e.preventDefault();
    isDrawingRef.current = false;
    
    const canvas = canvasRef.current;
    if (canvas && onSave && hasDrawnRef.current) {
      onSave(canvas.toDataURL('image/png'));
    }
  }, [onSave]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const ratio = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * ratio);
    const targetH = Math.round(height * ratio);

    // Si ya coincide la resolución exacta, no reiniciar el canvas
    if (canvas.width === targetW && canvas.height === targetH) {
      if (!ctxRef.current) {
        setupContext(canvas, ratio);
      }
      return;
    }

    let savedData = null;
    if (canvas.width > 0 && canvas.height > 0 && hasDrawnRef.current) {
      try {
        savedData = canvas.toDataURL('image/png');
      } catch (err) {
        // ignore
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;
    setupContext(canvas, ratio);

    if (savedData) {
      const img = new Image();
      img.onload = () => {
        if (ctxRef.current && canvasRef.current) {
          ctxRef.current.drawImage(img, 0, 0, targetW, targetH);
        }
      };
      img.src = savedData;
    }
  }, [height, setupContext]);

  // Cargar imagen inicial si existe
  useEffect(() => {
    if (initialImage && isEmpty) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const img = new Image();
      img.onload = () => {
        if (ctxRef.current && canvasRef.current) {
          ctxRef.current.drawImage(img, 0, 0, canvas.width, canvas.height);
          hasDrawnRef.current = true;
          setIsEmpty(false);
        }
      };
      img.src = initialImage;
    }
  }, [initialImage, isEmpty]);

  useEffect(() => {
    initCanvas();

    const wrapper = wrapperRef.current;
    let observer;
    if (typeof ResizeObserver !== 'undefined' && wrapper) {
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            initCanvas();
          }
        }
      });
      observer.observe(wrapper);
    }

    window.addEventListener('resize', initCanvas);
    return () => {
      window.removeEventListener('resize', initCanvas);
      if (observer) observer.disconnect();
    };
  }, [initCanvas]);

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    setIsEmpty(true);
    if (onClear) onClear();
    if (onSave) onSave('');
  };

  return (
    <div className={`signature-pad-container ${disabled ? 'disabled' : ''}`}>
      {label && <label className="signature-pad-label">{label}</label>}
      <div ref={wrapperRef} className="signature-canvas-wrapper" style={{ height: `${height}px` }}>
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
          <div className="signature-watermark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
              <path d="M2 2l7.586 7.586"></path>
              <circle cx="11" cy="11" r="2"></circle>
            </svg>
            <span>Firmar aquí con mouse o dedo</span>
          </div>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Limpiar firma
          </button>
        </div>
      )}
    </div>
  );
}
