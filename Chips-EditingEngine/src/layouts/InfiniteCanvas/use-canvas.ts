import { useState, useCallback, useMemo, useRef, RefObject } from 'react';

export interface CanvasControlsOptions {
    minZoom?: number;
    maxZoom?: number;
    zoomStep?: number;
    smoothZoom?: boolean;
}

export interface ContentBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Point {
    x: number;
    y: number;
}

export function useCanvasControls(options: CanvasControlsOptions = {}) {
    const {
        minZoom = 0.1,
        maxZoom = 5,
        zoomStep = 0.1,
        smoothZoom = true,
    } = options;

    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [isPanning, setIsPanning] = useState(false);

    // Use refs to keep the latest state values accessible in the native wheel handler
    // without re-registering the event listener every time (which would be expensive).
    const zoomRef = useRef(zoom);
    const panXRef = useRef(panX);
    const panYRef = useRef(panY);
    zoomRef.current = zoom;
    panXRef.current = panX;
    panYRef.current = panY;

    const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
    const [panOrigin, setPanOrigin] = useState<Point>({ x: 0, y: 0 });

    const zoomPercent = useMemo(() => Math.round(zoom * 100), [zoom]);

    /**
     * Returns a native wheel event handler (not a React synthetic one).
     * Must be registered with addEventListener(el, 'wheel', handler, { passive: false })
     * to allow e.preventDefault() — React's synthetic onWheel is passive in React 17+
     * and calling preventDefault() inside it throws a warning that is suppressed but
     * the default scroll behavior is NOT actually prevented.
     */
    const buildNativeWheelHandler = useCallback((el: HTMLElement) => {
        return (e: WheelEvent) => {
            e.preventDefault();

            const currentZoom = zoomRef.current;
            const currentPanX = panXRef.current;
            const currentPanY = panYRef.current;

            const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
            const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + delta));

            if (smoothZoom) {
                const rect = el.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const worldX = (mouseX - currentPanX) / currentZoom;
                const worldY = (mouseY - currentPanY) / currentZoom;

                setZoom(newZoom);
                setPanX(mouseX - worldX * newZoom);
                setPanY(mouseY - worldY * newZoom);
            } else {
                setZoom(newZoom);
            }
        };
    }, [zoomStep, minZoom, maxZoom, smoothZoom]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.target === e.currentTarget)) {
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
            setPanOrigin({ x: panX, y: panY });
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        }
    }, [panX, panY]);

    const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
        if (!isPanning) return;
        const deltaX = e.clientX - panStart.x;
        const deltaY = e.clientY - panStart.y;
        setPanX(panOrigin.x + deltaX);
        setPanY(panOrigin.y + deltaY);
    }, [isPanning, panStart, panOrigin]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    const zoomIn = useCallback(() => setZoom(z => Math.min(maxZoom, z + zoomStep)), [maxZoom, zoomStep]);
    const zoomOut = useCallback(() => setZoom(z => Math.max(minZoom, z - zoomStep)), [minZoom, zoomStep]);
    const zoomTo = useCallback((value: number) => setZoom(Math.max(minZoom, Math.min(maxZoom, value))), [minZoom, maxZoom]);

    const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
        return {
            x: (screenX - panX) / zoom,
            y: (screenY - panY) / zoom,
        };
    }, [panX, panY, zoom]);

    const worldToScreen = useCallback((worldX: number, worldY: number): Point => {
        return {
            x: worldX * zoom + panX,
            y: worldY * zoom + panY,
        };
    }, [panX, panY, zoom]);

    const resetView = useCallback(() => {
        setZoom(1);
        setPanX(0);
        setPanY(0);
    }, []);

    const fitToContent = useCallback((bounds?: ContentBounds) => {
        if (!bounds) {
            resetView();
            return;
        }
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 80;

        const scaleX = (viewportWidth - padding * 2) / bounds.width;
        const scaleY = (viewportHeight - padding * 2) / bounds.height;
        let newZoom = Math.min(scaleX, scaleY);
        const maxFitZoom = Math.min(1, maxZoom);
        newZoom = Math.max(0.25, Math.min(maxFitZoom, newZoom));

        setZoom(newZoom);

        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;

        setPanX(viewportWidth / 2 - centerX * newZoom);
        setPanY(viewportHeight / 2 - centerY * newZoom);
    }, [maxZoom, resetView]);

    return {
        zoom,
        panX,
        panY,
        isPanning,
        zoomPercent,
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
    };
}
