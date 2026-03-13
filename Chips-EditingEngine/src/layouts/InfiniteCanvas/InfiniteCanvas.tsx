import React, { useRef, useEffect, ReactNode, useState } from 'react';
import { useCanvasControls } from './use-canvas';
import { CanvasProvider } from './CanvasContext';
import { DesktopLayer } from './DesktopLayer';
import { WindowLayer } from './WindowLayer';
import { ZoomControl } from './ZoomControl';
import './InfiniteCanvas.css';

interface InfiniteCanvasProps {
    showGrid?: boolean;
    gridSize?: number;
    desktopContent?: ReactNode;
    windowContent?: ReactNode;
    onDropCreate?: (data: any, worldPosition: { x: number; y: number }, target?: any) => void;
    onOpenSettings?: () => void;
}

export function InfiniteCanvas({
    showGrid = true,
    gridSize = 20,
    desktopContent,
    windowContent,
    onDropCreate,
    onOpenSettings,
}: InfiniteCanvasProps) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [insertIndicator, setInsertIndicator] = useState<{ left: number; top: number; width: number } | null>(null);

    const canvasControls = useCanvasControls();
    const {
        zoom,
        panX,
        panY,
        isPanning,
        buildNativeWheelHandler,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        zoomIn,
        zoomOut,
        zoomTo,
        resetView,
        fitToContent,
        screenToWorld,
        worldToScreen,
    } = canvasControls;

    // Register the wheel handler as a native (non-passive) event listener.
    // React 17+ makes synthetic onWheel passive, so e.preventDefault() would be
    // silently ignored. By using addEventListener with { passive: false } we can
    // actually prevent the page from scrolling while zooming the canvas.
    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;

        const handler = buildNativeWheelHandler(el);

        const onWheel = (e: WheelEvent) => {
            const target = e.target as HTMLElement;

            const isDesktopBackground =
                target === el ||
                target.classList.contains('infinite-canvas__grid') ||
                target.classList.contains('desktop-layer');

            const isToolWindow = Boolean(target.closest('.base-window'));
            const isCardWindow = Boolean(target.closest('.card-window-base') || target.closest('.card-cover'));
            const isCardContentWheel = isCardWindow && !isToolWindow;

            if (e.ctrlKey || e.metaKey || isDesktopBackground) {
                handler(e);
                return;
            }

            // Let card windows handle their own scroll unless pinch-to-zoom
            if (isCardContentWheel) {
                return;
            }
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            el.removeEventListener('wheel', onWheel);
        };
    }, [buildNativeWheelHandler]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                e.preventDefault();
                resetView();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
                e.preventDefault();
                zoomIn();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                e.preventDefault();
                zoomOut();
            }
        };

        const clearDragVisualState = () => {
            setIsDragOver(false);
            setInsertIndicator(null);
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('dragend', clearDragVisualState);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('dragend', clearDragVisualState);
        };
    }, [resetView, zoomIn, zoomOut]);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDragLeave = (e: React.DragEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            if (
                e.clientX <= rect.left ||
                e.clientX >= rect.right ||
                e.clientY <= rect.top ||
                e.clientY >= rect.bottom
            ) {
                setIsDragOver(false);
                setInsertIndicator(null);
            }
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        setInsertIndicator(null);

        const worldPosition = screenToWorld(e.clientX, e.clientY);

        let data = null;
        try {
            const dropDataStr = e.dataTransfer.getData('application/x-chips-drag-data');
            if (dropDataStr) {
                data = JSON.parse(dropDataStr);
            }
        } catch (err) {
            console.warn('Failed to parse drop drag data', err);
        }

        if (onDropCreate && data) {
            onDropCreate(data, worldPosition);
        }
    };

    const desktopStyle = {
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        transformOrigin: '0 0',
    };

    const gridStyle = {
        backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
        backgroundPosition: `${panX % (gridSize * zoom)}px ${panY % (gridSize * zoom)}px`,
    };

    const canvasCursor = isPanning ? 'grabbing' : 'grab';

    const indicatorStyle = insertIndicator ? {
        left: `${screenToWorld(insertIndicator.left, insertIndicator.top).x}px`,
        top: `${screenToWorld(insertIndicator.left, insertIndicator.top).y}px`,
        width: `${insertIndicator.width / zoom}px`,
        '--chips-insert-indicator-scale': `${1 / Math.max(zoom, 0.001)}`,
    } : undefined;

    return (
        <CanvasProvider value={canvasControls}>
            <div
                ref={canvasRef}
                className={`infinite-canvas ${isDragOver ? 'infinite-canvas--drag-over' : ''}`}
                style={{ cursor: canvasCursor }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {showGrid && (
                    <div className="infinite-canvas__grid" style={gridStyle} />
                )}

                <DesktopLayer style={desktopStyle}>
                    {indicatorStyle && (
                        <div
                            className="infinite-canvas__insert-indicator"
                            style={indicatorStyle}
                        />
                    )}
                    {desktopContent}
                </DesktopLayer>

                <WindowLayer>
                    {windowContent}
                </WindowLayer>

                <ZoomControl
                    zoom={zoom}
                    onZoomIn={zoomIn}
                    onZoomOut={zoomOut}
                    onZoomTo={zoomTo}
                    onReset={resetView}
                    onFit={fitToContent}
                />
            </div>
        </CanvasProvider>
    );
}
