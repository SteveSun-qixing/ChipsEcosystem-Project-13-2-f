<template>
  <div :class="containerClass">
    <!-- 单张图片布局 -->
    <div
      v-if="effectiveLayoutType === 'single'"
      class="chips-image-single"
      :style="singleContainerStyle"
    >
      <img
        v-if="images.length > 0"
        :src="images[0]?.resolvedUrl"
        :alt="images[0]?.alt || ''"
        :title="images[0]?.title || ''"
        class="chips-image-single__img"
        :style="singleImageStyle"
        @click="handleClick(0)"
        @error="handleImageError(0, $event)"
      />
    </div>

    <!-- 网格排版 -->
    <div
      v-else-if="effectiveLayoutType === 'grid'"
      class="chips-image-grid"
      :class="gridClass"
      :style="gridStyle"
    >
      <div
        v-for="(image, index) in gridDisplayImages"
        :key="image.id"
        class="chips-image-grid__cell"
        @click="handleClick(index)"
      >
        <!-- 正常显示图片 -->
        <img
          v-if="!isOverflowCell(index)"
          :src="image.resolvedUrl"
          :alt="image.alt || ''"
          :title="image.title || ''"
          class="chips-image-grid__img"
          @error="handleImageError(index, $event)"
        />
        <!-- 溢出格子（+N） -->
        <div
          v-else
          class="chips-image-grid__overflow"
        >
          <img
            :src="image.resolvedUrl"
            :alt="image.alt || ''"
            class="chips-image-grid__img chips-image-grid__img--dimmed"
            @error="handleImageError(index, $event)"
          />
          <span class="chips-image-grid__overflow-count">
            +{{ overflowCount }}
          </span>
        </div>
      </div>
    </div>

    <!-- 长图拼接 -->
    <div
      v-else-if="effectiveLayoutType === 'long-scroll'"
      class="chips-image-longscroll"
      :class="longScrollClass"
      :style="longScrollStyle"
    >
      <div class="chips-image-longscroll__content">
        <img
          v-for="(image, index) in images"
          :key="image.id"
          :src="image.resolvedUrl"
          :alt="image.alt || ''"
          :title="image.title || ''"
          class="chips-image-longscroll__img"
          @click="handleClick(index)"
          @error="handleImageError(index, $event)"
        />
      </div>
    </div>

    <!-- 横向滑动 -->
    <div
      v-else-if="effectiveLayoutType === 'horizontal-scroll'"
      class="chips-image-horizontal"
      :style="horizontalStyle"
      @wheel.prevent="handleHorizontalWheel"
    >
      <div
        ref="horizontalContentRef"
        class="chips-image-horizontal__content"
        :style="horizontalContentStyle"
      >
        <img
          v-for="(image, index) in images"
          :key="image.id"
          :src="image.resolvedUrl"
          :alt="image.alt || ''"
          :title="image.title || ''"
          class="chips-image-horizontal__img"
          @click="handleClick(index)"
          @error="handleImageError(index, $event)"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-if="images.length === 0"
      class="chips-image-empty"
    >
      <span class="chips-image-empty__text">{{ emptyText }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, type PropType } from 'vue';
import type { ImageItem, LayoutOptions, LayoutType, GridMode } from '../types';
import { GRID_DISPLAY_LIMITS } from '../types/constants';

interface ResolvedImage extends ImageItem {
  resolvedUrl: string;
}

export default defineComponent({
  name: 'ImageRenderer',

  props: {
    images: {
      type: Array as PropType<ResolvedImage[]>,
      required: true,
    },
    layoutType: {
      type: String as PropType<LayoutType>,
      required: true,
    },
    layoutOptions: {
      type: Object as PropType<LayoutOptions>,
      default: () => ({}),
    },
    interactive: {
      type: Boolean,
      default: true,
    },
    onImageClick: {
      type: Function as PropType<(index: number, src: string) => void>,
      default: undefined,
    },
  },

  setup(props) {
    const horizontalContentRef = ref<HTMLElement | null>(null);

    // === 计算属性 ===

    const effectiveLayoutType = computed(() => {
      if (props.images.length <= 1) return 'single';
      return props.layoutType;
    });

    const containerClass = computed(() => [
      'chips-image-renderer',
      `chips-image-renderer--${effectiveLayoutType.value}`,
      { 'chips-image-renderer--interactive': props.interactive },
    ]);

    const gap = computed(() => props.layoutOptions.gap ?? 8);

    // --- 单张图片 ---
    const singleContainerStyle = computed(() => {
      const alignment = props.layoutOptions.single_alignment || 'center';
      const justifyMap = {
        left: 'flex-start',
        center: 'center',
        right: 'flex-end',
      };
      return {
        display: 'flex',
        justifyContent: justifyMap[alignment],
      };
    });

    const singleImageStyle = computed(() => {
      const widthPct = props.layoutOptions.single_width_percent ?? 100;
      return {
        width: `${widthPct}%`,
        maxWidth: '100%',
        height: 'auto',
        display: 'block',
      };
    });

    // --- 网格 ---
    const gridMode = computed<GridMode>(
      () => props.layoutOptions.grid_mode || '2x2'
    );

    const gridColumns = computed(() => {
      switch (gridMode.value) {
        case '2x2':
          return 2;
        case '3x3':
        case '3-column-infinite':
          return 3;
        default:
          return 2;
      }
    });

    const gridDisplayLimit = computed(() => {
      return GRID_DISPLAY_LIMITS[gridMode.value] ?? Infinity;
    });

    const gridDisplayImages = computed(() => {
      if (gridMode.value === '3-column-infinite') {
        return props.images;
      }
      return props.images.slice(0, gridDisplayLimit.value);
    });

    const overflowCount = computed(() => {
      if (gridMode.value === '3-column-infinite') return 0;
      return props.images.length - gridDisplayLimit.value + 1;
    });

    const isOverflowCell = (index: number): boolean => {
      if (gridMode.value === '3-column-infinite') return false;
      if (props.images.length <= gridDisplayLimit.value) return false;
      return index === gridDisplayLimit.value - 1;
    };

    const gridClass = computed(() => [
      `chips-image-grid--${gridMode.value}`,
    ]);

    const gridStyle = computed(() => ({
      display: 'grid',
      gridTemplateColumns: `repeat(${gridColumns.value}, 1fr)`,
      gap: `${gap.value}px`,
    }));

    // --- 长图拼接 ---
    const scrollMode = computed(
      () => props.layoutOptions.scroll_mode || 'fixed-window'
    );

    const longScrollClass = computed(() => [
      `chips-image-longscroll--${scrollMode.value}`,
    ]);

    const longScrollStyle = computed(() => {
      if (scrollMode.value === 'fixed-window') {
        const height = props.layoutOptions.fixed_window_height || 600;
        return {
          maxHeight: `${height}px`,
          overflowY: 'auto' as const,
        };
      }
      return {};
    });

    // --- 横向滑动 ---
    const horizontalStyle = computed(() => ({
      overflowX: 'auto' as const,
      overflowY: 'hidden' as const,
    }));

    const horizontalContentStyle = computed(() => ({
      display: 'flex',
      gap: `${gap.value}px`,
      minWidth: 'max-content',
    }));

    const handleHorizontalWheel = (event: WheelEvent) => {
      if (horizontalContentRef.value) {
        const parent = horizontalContentRef.value.parentElement;
        if (parent) {
          parent.scrollLeft += event.deltaY;
        }
      }
    };

    // --- 空文本 ---
    const emptyText = computed(() => '');

    // === 事件处理 ===
    const handleClick = (index: number) => {
      if (!props.interactive) return;
      const image = props.images[index];
      if (image && props.onImageClick) {
        props.onImageClick(index, image.resolvedUrl);
      }
    };

    const handleImageError = (_index: number, event: Event) => {
      const img = event.target as HTMLImageElement;
      img.classList.add('chips-image--error');
    };

    return {
      horizontalContentRef,
      effectiveLayoutType,
      containerClass,
      singleContainerStyle,
      singleImageStyle,
      gridDisplayImages,
      overflowCount,
      isOverflowCell,
      gridClass,
      gridStyle,
      longScrollClass,
      longScrollStyle,
      horizontalStyle,
      horizontalContentStyle,
      handleHorizontalWheel,
      emptyText,
      handleClick,
      handleImageError,
    };
  },
});
</script>

<style>
/* === 渲染器容器 === */
.chips-image-renderer {
  width: 100%;
  position: relative;
  font-family: var(--chips-image-font-family, inherit);
  color: var(--chips-image-text-color, inherit);
  background-color: var(--chips-image-bg-color, transparent);
}

.chips-image-renderer--interactive img {
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.chips-image-renderer--interactive img:hover {
  opacity: 0.9;
}

/* === 单张图片 === */
.chips-image-single {
  width: 100%;
}

.chips-image-single__img {
  border-radius: var(--chips-image-border-radius, 4px);
  object-fit: contain;
}

/* === 网格排版 === */
.chips-image-grid__cell {
  position: relative;
  overflow: hidden;
  border-radius: var(--chips-image-border-radius, 4px);
  aspect-ratio: 1;
}

.chips-image-grid__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.chips-image-grid__img--dimmed {
  filter: brightness(0.4);
}

.chips-image-grid__overflow {
  position: relative;
  width: 100%;
  height: 100%;
}

.chips-image-grid__overflow-count {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ffffff;
  font-size: 24px;
  font-weight: 600;
  pointer-events: none;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

/* === 长图拼接 === */
.chips-image-longscroll {
  width: 100%;
}

.chips-image-longscroll--fixed-window {
  border-radius: var(--chips-image-border-radius, 4px);
}

.chips-image-longscroll--fixed-window::-webkit-scrollbar {
  width: var(--chips-image-scrollbar-width, 6px);
}

.chips-image-longscroll--fixed-window::-webkit-scrollbar-thumb {
  background: var(--chips-image-scrollbar-color, rgba(0, 0, 0, 0.2));
  border-radius: 3px;
}

.chips-image-longscroll__content {
  display: flex;
  flex-direction: column;
}

.chips-image-longscroll__img {
  width: 100%;
  display: block;
  border-radius: var(--chips-image-border-radius, 0);
}

/* === 横向滑动 === */
.chips-image-horizontal {
  width: 100%;
  border-radius: var(--chips-image-border-radius, 4px);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.chips-image-horizontal::-webkit-scrollbar {
  height: var(--chips-image-scrollbar-width, 6px);
}

.chips-image-horizontal::-webkit-scrollbar-thumb {
  background: var(--chips-image-scrollbar-color, rgba(0, 0, 0, 0.2));
  border-radius: 3px;
}

.chips-image-horizontal__img {
  height: 300px;
  width: auto;
  flex-shrink: 0;
  border-radius: var(--chips-image-border-radius, 4px);
  object-fit: cover;
}

/* === 空状态 === */
.chips-image-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: var(--chips-image-text-color, #999);
  font-size: 14px;
}

/* === 错误状态 === */
.chips-image--error {
  opacity: 0.3;
  filter: grayscale(100%);
}

.chips-image-error {
  padding: 24px;
  text-align: center;
  color: var(--chips-image-text-color, #cc0000);
  background-color: var(--chips-image-bg-color, #fff5f5);
  border-radius: var(--chips-image-border-radius, 4px);
}

/* === 响应式 === */
.chips-image--mobile .chips-image-grid {
  grid-template-columns: repeat(2, 1fr) !important;
}

.chips-image--mobile .chips-image-horizontal__img {
  height: 200px;
}

.chips-image--mobile .chips-image-grid__overflow-count {
  font-size: 18px;
}
</style>
