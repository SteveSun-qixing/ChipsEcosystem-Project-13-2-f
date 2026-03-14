import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { parseCoverRatio } from '../../../utils/card-cover';
import './CoverCropDialog.css';

interface CoverCropDialogProps {
  open: boolean;
  imageUrl: string;
  ratio: string;
  onClose: () => void;
  onConfirm: (result: {
    data: Uint8Array;
    previewUrl: string;
    mimeType: string;
  }) => void;
}

type Size = {
  width: number;
  height: number;
};

type Point = {
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function centerCrop(imageBounds: { left: number; top: number; width: number; height: number }, cropSize: Size): Point {
  return {
    x: imageBounds.left + (imageBounds.width - cropSize.width) / 2,
    y: imageBounds.top + (imageBounds.height - cropSize.height) / 2,
  };
}

function clampCrop(position: Point, imageBounds: { left: number; top: number; width: number; height: number }, cropSize: Size): Point {
  const minX = imageBounds.left;
  const minY = imageBounds.top;
  const maxX = imageBounds.left + imageBounds.width - cropSize.width;
  const maxY = imageBounds.top + imageBounds.height - cropSize.height;

  return {
    x: clamp(position.x, minX, maxX),
    y: clamp(position.y, minY, maxY),
  };
}

export function CoverCropDialog({
  open,
  imageUrl,
  ratio,
  onClose,
  onConfirm,
}: CoverCropDialogProps) {
  const { t } = useTranslation();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const hasInitializedCropRef = useRef(false);

  const [stageSize, setStageSize] = useState<Size>({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState<Size>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPosition, setCropPosition] = useState<Point>({ x: 0, y: 0 });

  const ratioValue = useMemo(() => parseCoverRatio(ratio), [ratio]);

  const cropSize = useMemo(() => {
    if (!stageSize.width || !stageSize.height) {
      return { width: 0, height: 0 };
    }

    const maxWidth = stageSize.width * 0.72;
    const maxHeight = stageSize.height * 0.72;
    const preferredWidth = Math.min(maxWidth, maxHeight * (ratioValue.width / ratioValue.height));
    const preferredHeight = preferredWidth * (ratioValue.height / ratioValue.width);

    if (preferredHeight <= maxHeight) {
      return {
        width: preferredWidth,
        height: preferredHeight,
      };
    }

    const adjustedHeight = maxHeight;
    return {
      width: adjustedHeight * (ratioValue.width / ratioValue.height),
      height: adjustedHeight,
    };
  }, [ratioValue.height, ratioValue.width, stageSize.height, stageSize.width]);

  const imageBounds = useMemo(() => {
    if (!stageSize.width || !stageSize.height || !naturalSize.width || !naturalSize.height) {
      return {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        scale: 1,
      };
    }

    const baseScale = Math.min(stageSize.width / naturalSize.width, stageSize.height / naturalSize.height);
    const displayScale = baseScale * zoom;
    const width = naturalSize.width * displayScale;
    const height = naturalSize.height * displayScale;

    return {
      left: (stageSize.width - width) / 2,
      top: (stageSize.height - height) / 2,
      width,
      height,
      scale: displayScale,
    };
  }, [naturalSize.height, naturalSize.width, stageSize.height, stageSize.width, zoom]);

  const minZoom = useMemo(() => {
    if (!cropSize.width || !cropSize.height || !naturalSize.width || !naturalSize.height || !stageSize.width || !stageSize.height) {
      return 1;
    }

    const baseScale = Math.min(stageSize.width / naturalSize.width, stageSize.height / naturalSize.height);
    const minScale = Math.max(cropSize.width / naturalSize.width, cropSize.height / naturalSize.height);
    if (baseScale <= 0) {
      return 1;
    }

    return Math.max(1, minScale / baseScale);
  }, [cropSize.height, cropSize.width, naturalSize.height, naturalSize.width, stageSize.height, stageSize.width]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const measureStage = () => {
      const stage = stageRef.current;
      if (!stage) {
        return;
      }

      setStageSize({
        width: stage.clientWidth,
        height: stage.clientHeight,
      });
    };

    measureStage();
    window.addEventListener('resize', measureStage);
    return () => {
      window.removeEventListener('resize', measureStage);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const image = new Image();
    const handleLoad = () => {
      setNaturalSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.addEventListener('load', handleLoad);
    image.src = imageUrl;

    return () => {
      image.removeEventListener('load', handleLoad);
    };
  }, [imageUrl, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    hasInitializedCropRef.current = false;
    setZoom(1);
  }, [imageUrl, open, ratio]);

  useEffect(() => {
    if (!open || !cropSize.width || !cropSize.height || !imageBounds.width || !imageBounds.height) {
      return;
    }

    if (zoom < minZoom) {
      setZoom(minZoom);
    }
  }, [cropSize.height, cropSize.width, imageBounds.height, imageBounds.width, minZoom, open, zoom]);

  useEffect(() => {
    if (!open || !cropSize.width || !cropSize.height || !imageBounds.width || !imageBounds.height) {
      return;
    }

    setCropPosition((previous) => {
      if (!hasInitializedCropRef.current) {
        hasInitializedCropRef.current = true;
        return centerCrop(imageBounds, cropSize);
      }

      return clampCrop(previous, imageBounds, cropSize);
    });
  }, [cropSize, imageBounds, open]);

  if (!open) {
    return null;
  }

  const minZoomPercent = Math.round(minZoom * 100);
  const maxZoomPercent = Math.max(minZoomPercent, 300);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - stageRect.left - cropPosition.x,
      offsetY: event.clientY - stageRect.top - cropPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const nextPosition = {
      x: event.clientX - stageRect.left - dragStateRef.current.offsetX,
      y: event.clientY - stageRect.top - dragStateRef.current.offsetY,
    };

    setCropPosition(clampCrop(nextPosition, imageBounds, cropSize));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleConfirm = async () => {
    if (!naturalSize.width || !naturalSize.height || !cropSize.width || !cropSize.height || !imageBounds.scale) {
      return;
    }

    const sourceX = Math.max(0, (cropPosition.x - imageBounds.left) / imageBounds.scale);
    const sourceY = Math.max(0, (cropPosition.y - imageBounds.top) / imageBounds.scale);
    const sourceWidth = Math.min(naturalSize.width - sourceX, cropSize.width / imageBounds.scale);
    const sourceHeight = Math.min(naturalSize.height - sourceY, cropSize.height / imageBounds.scale);

    const image = new Image();
    image.src = imageUrl;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth));
    canvas.height = Math.max(1, Math.round(sourceHeight));

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) {
          resolve(value);
          return;
        }
        reject(new Error('Failed to create cropped image blob.'));
      }, 'image/png');
    });

    const previewUrl = URL.createObjectURL(blob);
    onConfirm({
      data: new Uint8Array(await blob.arrayBuffer()),
      previewUrl,
      mimeType: 'image/png',
    });
  };

  return (
    <div className="cover-crop-dialog" role="dialog" aria-modal="true" aria-label={t('card_settings.cover_crop_title') || '裁剪封面'}>
      <div className="cover-crop-dialog__panel">
        <div className="cover-crop-dialog__header">
          <div>
            <h3 className="cover-crop-dialog__title">{t('card_settings.cover_crop_title') || '裁剪封面'}</h3>
            <p className="cover-crop-dialog__subtitle">
              {t('card_settings.cover_crop_desc') || '拖动取景框并缩放图片，裁出和当前封面比例一致的画面。'}
            </p>
          </div>

          <button
            type="button"
            className="cover-crop-dialog__close"
            aria-label={t('card_settings.close') || '关闭'}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div ref={stageRef} className="cover-crop-dialog__stage">
          <img
            className="cover-crop-dialog__image"
            src={imageUrl}
            alt={t('cover_maker.preview_alt') || '预览图片'}
            style={{
              left: `${imageBounds.left}px`,
              top: `${imageBounds.top}px`,
              width: `${imageBounds.width}px`,
              height: `${imageBounds.height}px`,
            }}
          />

          <div
            className="cover-crop-dialog__crop-box"
            style={{
              left: `${cropPosition.x}px`,
              top: `${cropPosition.y}px`,
              width: `${cropSize.width}px`,
              height: `${cropSize.height}px`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="cover-crop-dialog__crop-grid" />
          </div>
        </div>

        <div className="cover-crop-dialog__controls">
          <label className="cover-crop-dialog__zoom-label">
            <span>{t('card_settings.cover_crop_zoom') || '缩放'}</span>
            <span>{Math.round(zoom * 100)}%</span>
          </label>
          <input
            type="range"
            min={minZoomPercent}
            max={maxZoomPercent}
            step={1}
            value={Math.round(zoom * 100)}
            onChange={(event) => setZoom(Number(event.target.value) / 100)}
          />
        </div>

        <div className="cover-crop-dialog__footer">
          <button
            type="button"
            className="cover-crop-dialog__button cover-crop-dialog__button--secondary"
            onClick={onClose}
          >
            {t('card_settings.cancel') || '取消'}
          </button>
          <button
            type="button"
            className="cover-crop-dialog__button cover-crop-dialog__button--primary"
            onClick={() => {
              void handleConfirm();
            }}
          >
            {t('card_settings.cover_crop_apply') || '应用裁剪'}
          </button>
        </div>
      </div>
    </div>
  );
}
