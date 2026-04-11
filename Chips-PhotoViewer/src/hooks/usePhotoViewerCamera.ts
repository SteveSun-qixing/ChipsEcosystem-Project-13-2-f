import { useEffect, useRef, useState, type MutableRefObject, type PointerEvent } from "react";
import {
  clampScale,
  getFitScale,
  getNextZoomScale,
  getPointerDistance,
  getPointerMidpoint,
  getScaleFromWheelDelta,
  projectPanOffsetForScale,
  shouldHandleWheelZoom,
  type ImageDimensions,
  type InteractionPoint,
  type ViewportSize,
} from "../utils/image-viewer";

type ZoomMode = "fit" | "manual";

interface DragPanState {
  pointerId: number;
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
}

interface PinchState {
  pointerIds: [number, number];
  startDistance: number;
  baseScale: number;
}

interface UsePhotoViewerCameraOptions {
  imageDimensions: ImageDimensions | null;
  isImageLoaded: boolean;
  sessionKey: string | null;
}

interface PhotoViewerCamera {
  viewportRef: MutableRefObject<HTMLDivElement | null>;
  zoomMode: ZoomMode;
  manualScale: number;
  effectiveScale: number;
  imageWidth: number | undefined;
  imageHeight: number | undefined;
  panOffset: InteractionPoint;
  isPanningImage: boolean;
  isInteractive: boolean;
  setFitMode: () => void;
  setActualSize: () => void;
  handleZoom: (direction: "in" | "out") => void;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
}

function normalizeWheelDelta(value: number, deltaMode: number): number {
  if (deltaMode === 1) {
    return value * 14;
  }

  if (deltaMode === 2) {
    return value * 160;
  }

  return value;
}

export function usePhotoViewerCamera(options: UsePhotoViewerCameraOptions): PhotoViewerCamera {
  const { imageDimensions, isImageLoaded, sessionKey } = options;
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit");
  const [manualScale, setManualScale] = useState(1);
  const [viewportSize, setViewportSize] = useState<ViewportSize | null>(null);
  const [panOffset, setPanOffset] = useState<InteractionPoint>({ x: 0, y: 0 });
  const [isPanningImage, setIsPanningImage] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragPanRef = useRef<DragPanState | null>(null);
  const activeTouchPointsRef = useRef<Map<number, InteractionPoint>>(new Map());
  const pinchStateRef = useRef<PinchState | null>(null);

  const fitScale = getFitScale(imageDimensions, viewportSize);
  const effectiveScale = zoomMode === "fit" ? fitScale : manualScale;
  const imageWidth = imageDimensions ? Math.max(1, Math.round(imageDimensions.width * effectiveScale)) : undefined;
  const imageHeight = imageDimensions ? Math.max(1, Math.round(imageDimensions.height * effectiveScale)) : undefined;
  const isInteractive = Boolean(imageDimensions && isImageLoaded);

  function clearGestureState(): void {
    dragPanRef.current = null;
    pinchStateRef.current = null;
    activeTouchPointsRef.current.clear();
    setIsPanningImage(false);
  }

  function resetCamera(nextZoomMode: ZoomMode): void {
    clearGestureState();
    setPanOffset({ x: 0, y: 0 });
    setZoomMode(nextZoomMode);
  }

  function applyAnchoredScale(nextScaleValue: number, anchorX: number, anchorY: number): void {
    const nextScale = clampScale(nextScaleValue);
    if (imageDimensions && viewportSize) {
      setPanOffset((currentPan) => ({
        x: projectPanOffsetForScale({
          viewportLength: viewportSize.width,
          pointerOffset: anchorX,
          naturalLength: imageDimensions.width,
          currentScale: effectiveScale,
          nextScale,
          currentPan: currentPan.x,
        }),
        y: projectPanOffsetForScale({
          viewportLength: viewportSize.height,
          pointerOffset: anchorY,
          naturalLength: imageDimensions.height,
          currentScale: effectiveScale,
          nextScale,
          currentPan: currentPan.y,
        }),
      }));
    }

    setZoomMode("manual");
    setManualScale(nextScale);
  }

  function setFitMode(): void {
    resetCamera("fit");
    setManualScale(1);
  }

  function setActualSize(): void {
    resetCamera("manual");
    setManualScale(1);
  }

  function handleZoom(direction: "in" | "out"): void {
    const baseScale = zoomMode === "fit" ? fitScale : manualScale;
    const nextScale = getNextZoomScale(baseScale, direction);

    if (!viewportSize) {
      setZoomMode("manual");
      setManualScale(nextScale);
      return;
    }

    applyAnchoredScale(nextScale, viewportSize.width / 2, viewportSize.height / 2);
  }

  function handleWheelEvent(event: WheelEvent, element: HTMLDivElement): void {
    if (!imageDimensions || !isImageLoaded) {
      return;
    }

    if (
      shouldHandleWheelZoom({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
      })
    ) {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const nextScale = getScaleFromWheelDelta(effectiveScale, event.deltaY, event.deltaMode);
      applyAnchoredScale(nextScale, event.clientX - rect.left, event.clientY - rect.top);
      return;
    }

    event.preventDefault();
    setPanOffset((currentPan) => ({
      x: currentPan.x - normalizeWheelDelta(event.deltaX, event.deltaMode),
      y: currentPan.y - normalizeWheelDelta(event.deltaY, event.deltaMode),
    }));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (!imageDimensions || !isImageLoaded) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const viewport = event.currentTarget;
    viewport.setPointerCapture(event.pointerId);

    if (event.pointerType === "touch") {
      activeTouchPointsRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (activeTouchPointsRef.current.size === 2) {
        const [first, second] = Array.from(activeTouchPointsRef.current.values());
        if (first && second) {
          pinchStateRef.current = {
            pointerIds: Array.from(activeTouchPointsRef.current.keys()) as [number, number],
            startDistance: getPointerDistance(first, second),
            baseScale: effectiveScale,
          };
          dragPanRef.current = null;
          setIsPanningImage(false);
          return;
        }
      }
    }

    dragPanRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    };
    setIsPanningImage(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (event.pointerType === "touch") {
      activeTouchPointsRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }

    const pinchState = pinchStateRef.current;
    if (pinchState && pinchState.pointerIds.includes(event.pointerId)) {
      const first = activeTouchPointsRef.current.get(pinchState.pointerIds[0]);
      const second = activeTouchPointsRef.current.get(pinchState.pointerIds[1]);
      if (first && second && imageDimensions) {
        event.preventDefault();
        const midpoint = getPointerMidpoint(first, second);
        const rect = event.currentTarget.getBoundingClientRect();
        const nextScale = pinchState.baseScale * (getPointerDistance(first, second) / Math.max(pinchState.startDistance, 1));
        applyAnchoredScale(nextScale, midpoint.x - rect.left, midpoint.y - rect.top);
        return;
      }
    }

    const dragPan = dragPanRef.current;
    if (!dragPan || dragPan.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    setPanOffset({
      x: dragPan.startPanX + (event.clientX - dragPan.startX),
      y: dragPan.startPanY + (event.clientY - dragPan.startY),
    });
    setIsPanningImage(true);
  }

  function endPointerInteraction(event: PointerEvent<HTMLDivElement>): void {
    if (event.pointerType === "touch") {
      activeTouchPointsRef.current.delete(event.pointerId);
    }

    if (dragPanRef.current?.pointerId === event.pointerId) {
      dragPanRef.current = null;
    }

    const pinchState = pinchStateRef.current;
    if (pinchState?.pointerIds.includes(event.pointerId)) {
      pinchStateRef.current = null;
      const remainingTouch = Array.from(activeTouchPointsRef.current.entries())[0];
      if (remainingTouch) {
        dragPanRef.current = {
          pointerId: remainingTouch[0],
          startX: remainingTouch[1].x,
          startY: remainingTouch[1].y,
          startPanX: panOffset.x,
          startPanY: panOffset.y,
        };
      }
    }

    setIsPanningImage(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>): void {
    endPointerInteraction(event);
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>): void {
    endPointerInteraction(event);
  }

  useEffect(() => {
    const element = viewportRef.current;
    if (!element || typeof ResizeObserver !== "function") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setViewportSize({
        width: Math.max(1, entry.contentRect.width),
        height: Math.max(1, entry.contentRect.height),
      });
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [sessionKey]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const handleNativeWheel = (event: WheelEvent) => {
      handleWheelEvent(event, element);
    };

    const handleGestureEvent = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node) || !element.contains(target)) {
        return;
      }
      event.preventDefault();
    };

    element.addEventListener("wheel", handleNativeWheel, { passive: false });
    document.addEventListener("gesturestart", handleGestureEvent, { passive: false });
    document.addEventListener("gesturechange", handleGestureEvent, { passive: false });
    document.addEventListener("gestureend", handleGestureEvent, { passive: false });

    return () => {
      element.removeEventListener("wheel", handleNativeWheel);
      document.removeEventListener("gesturestart", handleGestureEvent);
      document.removeEventListener("gesturechange", handleGestureEvent);
      document.removeEventListener("gestureend", handleGestureEvent);
    };
  }, [effectiveScale, imageDimensions, isImageLoaded, viewportSize, zoomMode, manualScale, panOffset]);

  useEffect(() => {
    clearGestureState();
    setPanOffset({ x: 0, y: 0 });
    setZoomMode("fit");
    setManualScale(1);
  }, [sessionKey]);

  useEffect(() => {
    if (!isImageLoaded || zoomMode !== "fit") {
      return;
    }

    setPanOffset({ x: 0, y: 0 });
  }, [isImageLoaded, zoomMode, imageDimensions]);

  return {
    viewportRef,
    zoomMode,
    manualScale,
    effectiveScale,
    imageWidth,
    imageHeight,
    panOffset,
    isPanningImage,
    isInteractive,
    setFitMode,
    setActualSize,
    handleZoom,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
