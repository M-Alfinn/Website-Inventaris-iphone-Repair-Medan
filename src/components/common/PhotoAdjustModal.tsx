import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, ZoomIn, ZoomOut, Move } from 'lucide-react';

export interface PhotoAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  cropShape?: 'circle' | 'square';
  title?: string;
  onSave: (adjustedBase64: string) => void;
}

const BOX_SIZE = 260; // Preview viewport size in pixels

export const PhotoAdjustModal: React.FC<PhotoAdjustModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  cropShape = 'circle',
  title = 'Sesuaikan Posisi Foto',
  onSave,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Reset adjustments whenever modal opens with a new image
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setIsDragging(false);
    }
  }, [isOpen, imageSrc]);

  // Load natural dimensions of source image
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - panX, y: touch.clientY - panY });
    }
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      setPanX(touch.clientX - dragStart.x);
      setPanY(touch.clientY - dragStart.y);
    },
    [isDragging, dragStart]
  );

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(3, Math.max(1, Number((prev + delta).toFixed(2)))));
  };

  // Generate cropped image using HTML5 Canvas matching the preview exactly
  const handleApply = () => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const outputSize = 512;
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, outputSize, outputSize);

      ctx.save();
      ctx.translate(outputSize / 2, outputSize / 2);

      const scaleFactor = outputSize / BOX_SIZE;
      const aspect = img.naturalWidth / img.naturalHeight;
      let baseWidth = BOX_SIZE;
      let baseHeight = BOX_SIZE;

      if (aspect >= 1) {
        baseHeight = BOX_SIZE;
        baseWidth = BOX_SIZE * aspect;
      } else {
        baseWidth = BOX_SIZE;
        baseHeight = BOX_SIZE / aspect;
      }

      const finalWidth = baseWidth * zoom * scaleFactor;
      const finalHeight = baseHeight * zoom * scaleFactor;
      const finalPanX = panX * scaleFactor;
      const finalPanY = panY * scaleFactor;

      ctx.drawImage(
        img,
        -finalWidth / 2 + finalPanX,
        -finalHeight / 2 + finalPanY,
        finalWidth,
        finalHeight
      );

      ctx.restore();

      const resultBase64 = canvas.toDataURL('image/jpeg', 0.92);
      onSave(resultBase64);
      onClose();
    };
    img.src = imageSrc;
  };

  if (!isOpen) return null;

  // Compute display size inside the preview box
  const aspect = imageSize.width > 0 && imageSize.height > 0 ? imageSize.width / imageSize.height : 1;
  let baseDisplayWidth = BOX_SIZE;
  let baseDisplayHeight = BOX_SIZE;
  if (aspect >= 1) {
    baseDisplayHeight = BOX_SIZE;
    baseDisplayWidth = BOX_SIZE * aspect;
  } else {
    baseDisplayWidth = BOX_SIZE;
    baseDisplayHeight = BOX_SIZE / aspect;
  }

  const renderedWidth = baseDisplayWidth * zoom;
  const renderedHeight = baseDisplayHeight * zoom;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: Preview & Pan Area */}
        <div className="p-6 flex flex-col items-center">
          <div
            style={{ width: BOX_SIZE, height: BOX_SIZE }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className={`relative overflow-hidden bg-slate-100 border-2 border-dashed border-indigo-300 shadow-inner select-none cursor-grab active:cursor-grabbing touch-none ${
              cropShape === 'circle' ? 'rounded-full' : 'rounded-2xl'
            }`}
          >
            {imageSrc && (
              <img
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${renderedWidth}px`,
                  height: `${renderedHeight}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px))`,
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>

          <p className="text-[11px] text-slate-400 mt-2.5 flex items-center gap-1 font-medium">
            <span>Geser foto untuk menentukan posisi yang pas</span>
          </p>

          {/* Simple Zoom Slider */}
          <div className="w-full mt-4 flex items-center gap-3 px-2">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(1, Number((prev - 0.1).toFixed(2))))}
              className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Perkecil"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3, Number((prev + 0.1).toFixed(2))))}
              className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Perbesar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Gunakan Foto</span>
          </button>
        </div>
      </div>
    </div>
  );
};
