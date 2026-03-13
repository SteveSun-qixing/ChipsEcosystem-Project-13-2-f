import React, { useState, useMemo, useEffect } from 'react';
import { ChipsButton, ChipsSelect } from '@chips/component-library';
import { useTranslation } from '../../hooks/useTranslation';
import './ZoomControl.css';

interface ZoomControlProps {
    zoom: number;
    minZoom?: number;
    maxZoom?: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomTo: (zoom: number) => void;
    onReset: () => void;
    onFit: () => void;
}

/**
 * 缩放控制器组件
 * 提供缩放控制功能，点击更多按钮展开选项
 */
export function ZoomControl({
    zoom,
    minZoom = 0.1,
    maxZoom = 5,
    onZoomIn,
    onZoomOut,
    onZoomTo,
    onReset,
    onFit,
}: ZoomControlProps) {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    const zoomPercent = Math.round(zoom * 100);

    const zoomPresets = [25, 50, 75, 100, 125, 150, 200, 300];

    const zoomOptions = useMemo(() => {
        const options = zoomPresets.map((preset) => ({
            label: `${preset}%`,
            value: String(preset),
        }));
        if (!zoomPresets.includes(zoomPercent)) {
            options.push({ label: `${zoomPercent}%`, value: String(zoomPercent) });
            options.sort((a, b) => Number(a.value) - Number(b.value));
        }
        return options;
    }, [zoomPercent]);

    const canZoomIn = zoom < maxZoom;
    const canZoomOut = zoom > minZoom;

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        onZoomTo(value / 100);
    };

    const handlePresetSelect = (value: string) => {
        onZoomTo(Number(value) / 100);
    };

    return (
        <div
            className={`zoom-control ${isExpanded ? 'zoom-control--expanded' : ''}`}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* 基础控件：缩小按钮 */}
            <ChipsButton
                className="zoom-control__button"
                disabled={!canZoomOut}
                title={t('zoom_control.zoom_out') || '缩小'}
                variant="ghost"
                onPress={onZoomOut}
            >
                −
            </ChipsButton>

            {/* 基础控件：缩放滑块 */}
            <div className="zoom-control__slider-container">
                <input
                    type="range"
                    className="zoom-control__slider-input"
                    min={minZoom * 100}
                    max={maxZoom * 100}
                    step={5}
                    value={zoomPercent}
                    onChange={handleSliderChange}
                />
            </div>

            {/* 基础控件：放大按钮 */}
            <ChipsButton
                className="zoom-control__button"
                disabled={!canZoomIn}
                title={t('zoom_control.zoom_in') || '放大'}
                variant="ghost"
                onPress={onZoomIn}
            >
                +
            </ChipsButton>

            {/* 更多按钮 */}
            <ChipsButton
                className={`zoom-control__button zoom-control__more ${isExpanded ? 'zoom-control__more--active' : ''}`}
                title={t('zoom_control.more') || '更多'}
                variant="ghost"
                onPress={() => setIsExpanded(!isExpanded)}
            >
                ⋯
            </ChipsButton>

            {/* 展开内容 */}
            {isExpanded && (
                <div className="zoom-control__expanded-content">
                    {/* 缩放百分比选择 */}
                    <div className="zoom-control__value">
                        <ChipsSelect
                            className="zoom-control__select"
                            options={zoomOptions}
                            value={String(zoomPercent)}
                            onValueChange={handlePresetSelect}
                        />
                    </div>

                    {/* 重置按钮 */}
                    <ChipsButton
                        className="zoom-control__button zoom-control__button--text"
                        title={t('zoom_control.reset') || '重置视图'}
                        variant="ghost"
                        onPress={onReset}
                    >
                        {t('zoom_control.reset_label') || '100%'}
                    </ChipsButton>

                    {/* 适应内容按钮 */}
                    <ChipsButton
                        className="zoom-control__button zoom-control__button--text"
                        title={t('zoom_control.fit') || '适应视图'}
                        variant="ghost"
                        onPress={onFit}
                    >
                        {t('zoom_control.fit_label') || '适应'}
                    </ChipsButton>
                </div>
            )}
        </div>
    );
}
