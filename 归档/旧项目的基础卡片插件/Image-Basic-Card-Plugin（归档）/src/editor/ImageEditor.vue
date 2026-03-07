<template>
  <div class="chips-image-editor">
    <!-- ====== 顶部工具栏 ====== -->
    <div class="chips-image-editor__toolbar">
      <div class="chips-image-editor__toolbar-left">
        <button
          class="chips-image-editor__icon-btn"
          :class="{ 'chips-image-editor__icon-btn--disabled': !internalState.canUndo }"
          :disabled="!internalState.canUndo"
          :title="t('toolbar.undo')"
          @click="handleUndo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          class="chips-image-editor__icon-btn"
          :class="{ 'chips-image-editor__icon-btn--disabled': !internalState.canRedo }"
          :disabled="!internalState.canRedo"
          :title="t('toolbar.redo')"
          @click="handleRedo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>
      </div>
      <div class="chips-image-editor__toolbar-right">
        <span class="chips-image-editor__badge">
          {{ t('editor.image_count', { count: internalState.images.length }) }}
        </span>
      </div>
    </div>

    <!-- ====== 可滚动内容区 ====== -->
    <div class="chips-image-editor__scroll-body">

    <!-- ====== 添加图片区域 ====== -->
    <div class="chips-image-editor__section">
      <!-- 已有图片时：收起为按钮 -->
      <div v-if="internalState.images.length > 0 && !showUploader" class="chips-image-editor__add-bar">
        <button class="chips-image-editor__add-btn" @click="showUploader = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {{ t('editor.section_add_images') }}
        </button>
      </div>

      <!-- 展开的上传面板 -->
      <template v-if="internalState.images.length === 0 || showUploader">
        <div class="chips-image-editor__section-header">
          <svg class="chips-image-editor__section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span class="chips-image-editor__section-title">{{ t('editor.section_add_images') }}</span>
          <button
            v-if="internalState.images.length > 0"
            class="chips-image-editor__collapse-btn"
            @click="showUploader = false"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>

        <!-- 上传区域 -->
        <div
          class="chips-image-editor__dropzone"
          :class="{
            'chips-image-editor__dropzone--dragover': isDragover,
            'chips-image-editor__dropzone--uploading': internalState.isUploading,
          }"
          @click="triggerFileInput"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            multiple
            class="chips-image-editor__file-input"
            @change="onFileInputChange"
          />
          <div v-if="!internalState.isUploading" class="chips-image-editor__dropzone-body">
            <div class="chips-image-editor__dropzone-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span class="chips-image-editor__dropzone-text">{{ t('editor.upload_hint') }}</span>
            <span class="chips-image-editor__dropzone-subtext">{{ t('editor.upload_sub_hint') }}</span>
          </div>
          <div v-else class="chips-image-editor__dropzone-body">
            <div class="chips-image-editor__progress-ring">
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" stroke-width="3" opacity="0.15" />
                <circle
                  cx="20" cy="20" r="16" fill="none" stroke="currentColor" stroke-width="3"
                  stroke-linecap="round"
                  :stroke-dasharray="`${internalState.uploadProgress * 1.005} 100.5`"
                  transform="rotate(-90 20 20)"
                />
              </svg>
              <span class="chips-image-editor__progress-number">{{ internalState.uploadProgress }}%</span>
            </div>
            <span class="chips-image-editor__dropzone-text">{{ t('status.uploading') }}</span>
          </div>
        </div>

        <!-- 分隔线 + URL 输入 -->
        <div class="chips-image-editor__divider">
          <span class="chips-image-editor__divider-line" />
          <span class="chips-image-editor__divider-text">{{ t('editor.section_or') }}</span>
          <span class="chips-image-editor__divider-line" />
        </div>

        <div class="chips-image-editor__url-row">
          <div class="chips-image-editor__url-input-wrapper">
            <svg class="chips-image-editor__url-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <input
              v-model="urlInput"
              type="text"
              class="chips-image-editor__url-field"
              :placeholder="t('editor.url_placeholder')"
              @keydown.enter="handleAddByUrl"
            />
          </div>
          <button
            class="chips-image-editor__url-btn"
            :disabled="!urlInput.trim()"
            @click="handleAddByUrl"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {{ t('editor.add_by_url') }}
          </button>
        </div>
      </template>
    </div>

    <!-- ====== 排版设置（仅在图片数 > 1 时显示） ====== -->
    <div
      v-if="internalState.images.length > 1"
      class="chips-image-editor__section"
    >
      <div class="chips-image-editor__section-header">
        <svg class="chips-image-editor__section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
        <span class="chips-image-editor__section-title">{{ t('layout.title') }}</span>
      </div>

      <!-- 排版类型选择卡片 -->
      <div class="chips-image-editor__layout-cards">
        <div
          v-for="lt in layoutTypeOptions"
          :key="lt.value"
          class="chips-image-editor__layout-card"
          :class="{ 'chips-image-editor__layout-card--active': internalState.layoutType === lt.value }"
          @click="execSetLayoutType(lt.value)"
        >
          <div class="chips-image-editor__layout-card-icon" v-html="lt.icon" />
          <span class="chips-image-editor__layout-card-name">{{ lt.label }}</span>
          <span class="chips-image-editor__layout-card-desc">{{ lt.desc }}</span>
        </div>
      </div>

      <!-- 子选项 -->
      <div class="chips-image-editor__layout-options">
        <!-- 网格模式 -->
        <div v-if="internalState.layoutType === 'grid'" class="chips-image-editor__option-row">
          <label class="chips-image-editor__option-label">{{ t('layout.grid_mode') }}</label>
          <div class="chips-image-editor__option-control">
            <select
              :value="internalConfig.layout_options?.grid_mode || '2x2'"
              class="chips-image-editor__select"
              @change="handleGridModeChange"
            >
              <option value="2x2">{{ t('layout.grid_2x2') }}</option>
              <option value="3x3">{{ t('layout.grid_3x3') }}</option>
              <option value="3-column-infinite">{{ t('layout.grid_3col_infinite') }}</option>
            </select>
          </div>
        </div>

        <!-- 长图拼接模式 -->
        <div v-if="internalState.layoutType === 'long-scroll'" class="chips-image-editor__option-row">
          <label class="chips-image-editor__option-label">{{ t('layout.scroll_mode') }}</label>
          <div class="chips-image-editor__option-control">
            <select
              :value="internalConfig.layout_options?.scroll_mode || 'fixed-window'"
              class="chips-image-editor__select"
              @change="handleScrollModeChange"
            >
              <option value="fixed-window">{{ t('layout.fixed_window') }}</option>
              <option value="adaptive">{{ t('layout.adaptive') }}</option>
            </select>
          </div>
        </div>

        <!-- 固定窗口高度 -->
        <div
          v-if="internalState.layoutType === 'long-scroll' && (internalConfig.layout_options?.scroll_mode || 'fixed-window') === 'fixed-window'"
          class="chips-image-editor__option-row"
        >
          <label class="chips-image-editor__option-label">{{ t('layout.window_height') }}</label>
          <div class="chips-image-editor__option-control chips-image-editor__option-control--inline">
            <input
              type="number"
              :value="internalConfig.layout_options?.fixed_window_height || 600"
              class="chips-image-editor__number-input"
              min="200" max="2000" step="50"
              @change="handleWindowHeightChange"
            />
            <span class="chips-image-editor__option-unit">{{ t('common.pixels') }}</span>
          </div>
        </div>

        <!-- 单张宽度 -->
        <div v-if="internalState.layoutType === 'single'" class="chips-image-editor__option-row">
          <label class="chips-image-editor__option-label">{{ t('layout.width_percent') }}</label>
          <div class="chips-image-editor__option-control chips-image-editor__option-control--range">
            <input
              type="range"
              :value="internalConfig.layout_options?.single_width_percent || 100"
              class="chips-image-editor__range-input"
              min="10" max="100" step="5"
              @input="handleWidthPercentChange"
            />
            <span class="chips-image-editor__range-value">
              {{ internalConfig.layout_options?.single_width_percent || 100 }}{{ t('common.percent') }}
            </span>
          </div>
        </div>

        <!-- 对齐方式 -->
        <div v-if="internalState.layoutType === 'single'" class="chips-image-editor__option-row">
          <label class="chips-image-editor__option-label">{{ t('layout.alignment') }}</label>
          <div class="chips-image-editor__option-control">
            <div class="chips-image-editor__align-group">
              <button
                v-for="align in alignmentOptions"
                :key="align.value"
                class="chips-image-editor__align-btn"
                :class="{ 'chips-image-editor__align-btn--active': (internalConfig.layout_options?.single_alignment || 'center') === align.value }"
                :title="align.label"
                @click="handleAlignmentChange(align.value)"
              >
                <svg v-if="align.value === 'left'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
                </svg>
                <svg v-else-if="align.value === 'center'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="18" y1="18" x2="6" y2="18" />
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 图片间距 -->
        <div v-if="internalState.layoutType !== 'single'" class="chips-image-editor__option-row">
          <label class="chips-image-editor__option-label">{{ t('layout.gap') }}</label>
          <div class="chips-image-editor__option-control chips-image-editor__option-control--inline">
            <input
              type="number"
              :value="internalConfig.layout_options?.gap || 8"
              class="chips-image-editor__number-input"
              min="0" max="32" step="2"
              @change="handleGapChange"
            />
            <span class="chips-image-editor__option-unit">{{ t('common.pixels') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== 图片列表 ====== -->
    <div class="chips-image-editor__section">
      <div class="chips-image-editor__section-header">
        <svg class="chips-image-editor__section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        <span class="chips-image-editor__section-title">{{ t('editor.section_image_list') }}</span>
        <span v-if="internalState.images.length > 1" class="chips-image-editor__drag-hint">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" />
            <line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
          </svg>
          {{ t('editor.drag_to_sort') }}
        </span>
      </div>

      <!-- 空状态 -->
      <div v-if="internalState.images.length === 0" class="chips-image-editor__empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
        </svg>
        <span class="chips-image-editor__empty-text">{{ t('editor.empty_hint') }}</span>
      </div>

      <!-- 图片列表 -->
      <div v-else class="chips-image-editor__list">
        <div
          v-for="(image, index) in internalState.images"
          :key="image.id"
          class="chips-image-editor__card"
          :class="{
            'chips-image-editor__card--selected': internalState.selectedImageId === image.id,
            'chips-image-editor__card--dragging': internalState.draggingImageId === image.id,
          }"
          draggable="true"
          @click="handleSelectImage(image.id)"
          @dragstart="handleDragStart(image.id, $event)"
          @dragover.prevent="handleDragOver(index, $event)"
          @drop.prevent="handleDragDrop(index)"
          @dragend="handleDragEnd"
        >
          <div class="chips-image-editor__card-index">
            <span>{{ index + 1 }}</span>
          </div>
          <div class="chips-image-editor__card-thumb">
            <img
              :src="getImageSrc(image)"
              :alt="image.alt || ''"
              class="chips-image-editor__card-img"
              @error="handlePreviewError($event)"
            />
          </div>
          <div class="chips-image-editor__card-info">
            <input
              :value="image.title || ''"
              class="chips-image-editor__card-input chips-image-editor__card-input--title"
              :placeholder="t('editor.image_title_placeholder')"
              @input="handleTitleChange(image.id, $event)"
              @click.stop
            />
            <input
              :value="image.alt || ''"
              class="chips-image-editor__card-input chips-image-editor__card-input--alt"
              :placeholder="t('editor.image_alt_placeholder')"
              @input="handleAltChange(image.id, $event)"
              @click.stop
            />
          </div>
          <div class="chips-image-editor__card-actions">
            <button
              v-if="index > 0"
              class="chips-image-editor__action-btn"
              :title="t('editor.move_up')"
              @click.stop="execMoveImage(image.id, index - 1)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
            </button>
            <button
              v-if="index < internalState.images.length - 1"
              class="chips-image-editor__action-btn"
              :title="t('editor.move_down')"
              @click.stop="execMoveImage(image.id, index + 1)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            <button
              class="chips-image-editor__action-btn chips-image-editor__action-btn--danger"
              :title="t('editor.remove_image')"
              @click.stop="execRemoveImage(image.id)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div v-if="internalState.images.length > 0" class="chips-image-editor__list-footer">
        <button class="chips-image-editor__clear-btn" @click="execClearAll">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          {{ t('editor.clear_all') }}
        </button>
      </div>
    </div>

    </div><!-- /.chips-image-editor__scroll-body -->
  </div>
</template>

<script lang="ts">
/**
 * 图片卡片编辑器组件
 *
 * 自包含组件：内部管理编辑状态、撤销/重做、命令执行，
 * 通过 onUpdateConfig 回调将变更同步到 PluginHost。
 *
 * PluginHost 传入的 props 接口：
 *   - config: Record<string, unknown>   — 当前卡片配置
 *   - initialContent: string            — 初始内容（图片卡片不使用）
 *   - options: { toolbar, autoSave }    — 编辑器选项
 *   - state: object                     — PluginHost 内部状态（图片卡片不使用）
 *   - onUpdateConfig: (config) => void  — 配置变更回调
 *   - onContentChange, onSelectionChange, onFocus, onBlur  — 可选回调
 */

import { defineComponent, ref, reactive, computed, watch, onMounted, onUnmounted, type PropType } from 'vue';
import type { ImageItem, LayoutType, ImageCardConfig, LayoutOptions } from '../types';
import { DEFAULT_CONFIG } from '../types/constants';
import { t } from '../utils/i18n';
import { generateId, arrayMove } from '../utils/dom';

// === 简化的内置 UndoManager ===
interface HistoryEntry {
  before: ImageCardConfig;
  after: ImageCardConfig;
}

/**
 * 待上传的文件信息
 * key = 卡片根目录相对路径（如 "photo.jpg"）
 * value = File 对象（包含二进制数据）
 */
type PendingFilesMap = Map<string, File>;

export default defineComponent({
  name: 'ImageEditor',

  props: {
    /** 卡片配置（来自 PluginHost） */
    config: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },
    /** 初始内容（图片卡片不使用，保持兼容） */
    initialContent: {
      type: String,
      default: '',
    },
    /** 编辑器选项 */
    options: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },
    /** PluginHost 传入的状态（图片卡片使用自己的内部状态） */
    state: {
      type: Object,
      default: () => ({}),
    },
    /** 配置变更回调 — 将变更同步给 PluginHost */
    onUpdateConfig: {
      type: Function as PropType<(config: Record<string, unknown>) => void>,
      default: undefined,
    },
    /** 内容变更回调（兼容 PluginHost） */
    onContentChange: {
      type: Function as PropType<(html: string) => void>,
      default: undefined,
    },
    /** 选区变更回调（兼容 PluginHost，图片卡片不使用） */
    onSelectionChange: {
      type: Function,
      default: undefined,
    },
    /** 聚焦回调 */
    onFocus: {
      type: Function,
      default: undefined,
    },
    /** 失焦回调 */
    onBlur: {
      type: Function,
      default: undefined,
    },
  },

  setup(props) {
    // ==================================================================
    // 内部状态管理
    // ==================================================================

    /** 解析外部 config 为 ImageCardConfig */
    function parseConfig(raw: Record<string, unknown>): ImageCardConfig {
      return {
        card_type: 'ImageCard',
        images: Array.isArray(raw.images) ? (raw.images as ImageItem[]) : [],
        layout_type: (raw.layout_type as LayoutType) || 'single',
        layout_options: (raw.layout_options as LayoutOptions) || { ...DEFAULT_CONFIG.layout_options },
        theme: (raw.theme as string) || undefined,
        layout: (raw.layout as ImageCardConfig['layout']) || undefined,
      };
    }

    /** 内部完整配置 */
    const internalConfig = reactive<ImageCardConfig>(parseConfig(props.config));

    /** 编辑器 UI 状态 */
    const internalState = reactive({
      images: [...internalConfig.images],
      layoutType: internalConfig.layout_type || ('single' as LayoutType),
      canUndo: false,
      canRedo: false,
      isUploading: false,
      uploadProgress: 0,
      selectedImageId: null as string | null,
      draggingImageId: null as string | null,
    });

    // 撤销/重做
    const undoStack = ref<HistoryEntry[]>([]);
    const redoStack = ref<HistoryEntry[]>([]);

    function snapshotConfig(): ImageCardConfig {
      return {
        card_type: 'ImageCard',
        images: internalState.images.map(img => ({ ...img })),
        layout_type: internalState.layoutType,
        layout_options: { ...internalConfig.layout_options },
        theme: internalConfig.theme,
        layout: internalConfig.layout,
      };
    }

    function pushHistory(before: ImageCardConfig, after: ImageCardConfig): void {
      undoStack.value.push({ before, after });
      redoStack.value = [];
      internalState.canUndo = true;
      internalState.canRedo = false;
    }

    // 外部 UI 状态
    const fileInputRef = ref<HTMLInputElement | null>(null);
    const urlInput = ref('');
    const isDragover = ref(false);
    /** 上传面板是否展开（有图片后默认收起） */
    const showUploader = ref(internalState.images.length === 0);

    /**
     * 待保存的文件映射（卡片根目录相对路径 -> File 对象）
     * 文件在 notifyConfigChange 时通过 _pendingFiles 传递给 PluginHost，
     * 由 PluginHost 负责将文件实际写入卡片文件夹。
     */
    const pendingFiles: PendingFilesMap = new Map();

    /**
     * ObjectURL 预览映射（响应式，卡片根目录相对路径 -> blob URL）
     * 包含新上传图片的本地 ObjectURL。
     * 使用 ref 确保 Vue 能追踪变化并触发模板重渲染。
     */
    const previewUrls = ref<Record<string, string>>({});

    /**
     * 已解析的资源 URL 映射（响应式，用于触发模板更新）
     * key = 卡片根目录相对路径，value = 通过 chips:// 协议获取的 blob URL
     * 使用 ref 确保 Vue 能追踪变化并触发模板重渲染。
     */
    const resolvedUrls = ref<Record<string, string>>({});

    /**
     * 正在解析中的路径集合（避免重复请求）
     */
    const pendingResolves = new Set<string>();

    function getReleaseResolvedResourceHandler():
      | ((path: string) => Promise<void> | void)
      | undefined {
      return (props.options as Record<string, unknown>)?.onReleaseResolvedResource as
        | ((path: string) => Promise<void> | void)
        | undefined;
    }

    function releaseResolvedResourceByPath(filePath: string): void {
      const resolvedUrl = resolvedUrls.value[filePath];
      if (!resolvedUrl) return;

      const onReleaseResolvedResource = getReleaseResolvedResourceHandler();
      if (onReleaseResolvedResource) {
        void Promise.resolve(onReleaseResolvedResource(filePath));
      } else {
        try { URL.revokeObjectURL(resolvedUrl); } catch { /* ignore */ }
      }

      const { [filePath]: _r, ...restResolved } = resolvedUrls.value;
      resolvedUrls.value = restResolved;
    }

    function releaseAllResolvedResources(): void {
      for (const filePath of Object.keys(resolvedUrls.value)) {
        releaseResolvedResourceByPath(filePath);
      }
      resolvedUrls.value = {};
    }

    /**
     * 生成唯一的资源文件名（相对于卡片根目录）
     * 保留原始文件名，重名时追加编号（如 photo_2.jpg）
     */
    function generateUniqueFileName(originalName: string): string {
      // 提取文件名和扩展名
      const dotIndex = originalName.lastIndexOf('.');
      const baseName = dotIndex > 0 ? originalName.substring(0, dotIndex) : originalName;
      const ext = dotIndex > 0 ? originalName.substring(dotIndex) : '';

      // 清理文件名中的非法字符，空格替换为下划线
      const cleanBase = baseName.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_') || 'image';
      const cleanExt = ext.toLowerCase();

      let candidate = `${cleanBase}${cleanExt}`;
      let counter = 2;

      // 检查是否与已有的 pendingFiles 或当前图片列表的 file_path 冲突
      const existingPaths = new Set<string>();
      for (const img of internalState.images) {
        if (img.source === 'file' && img.file_path) {
          existingPaths.add(img.file_path);
        }
      }
      for (const key of pendingFiles.keys()) {
        existingPaths.add(key);
      }

      while (existingPaths.has(candidate)) {
        candidate = `${cleanBase}_${counter}${cleanExt}`;
        counter++;
      }

      return candidate;
    }

    /**
     * 为所有 source='file' 且有 file_path 的已有图片触发异步资源解析。
     * 在组件挂载和外部配置同步时调用。
     */
    function resolveExistingImages(): void {
      console.log('[ImageEditor] resolveExistingImages called, images:', internalState.images.length);
      for (const image of internalState.images) {
        if (image.source === 'file' && image.file_path) {
          // 跳过已有本地预览的（刚上传的文件）
          if (previewUrls.value[image.file_path]) continue;
          // 跳过已经是完整 URL 的旧数据
          if (image.file_path.startsWith('blob:') || image.file_path.startsWith('http')) continue;
          // 触发异步解析
          console.log('[ImageEditor] Triggering async resolve for:', image.file_path);
          resolveResourceAsync(image.file_path);
        }
      }
    }

    // ==================================================================
    // 同步外部 config 到内部
    // ==================================================================
    watch(() => props.config, (newConfig) => {
      const parsed = parseConfig(newConfig as Record<string, unknown>);
      console.log('[ImageEditor] config watch triggered, parsed images:', parsed.images.length,
        'internal images:', internalState.images.length,
        'previewUrls count:', Object.keys(previewUrls.value).length,
        'resolvedUrls count:', Object.keys(resolvedUrls.value).length);
      // 只在外部真正变化时同步（避免自身触发的循环）
      if (JSON.stringify(parsed.images) !== JSON.stringify(internalState.images)) {
        console.log('[ImageEditor] Images changed from config, syncing and resolving...');
        internalState.images = [...parsed.images];
        // 外部配置更新后，解析已有图片的资源路径
        resolveExistingImages();
      }
      if (parsed.layout_type !== internalState.layoutType) {
        internalState.layoutType = parsed.layout_type;
      }
      Object.assign(internalConfig, parsed);
    }, { deep: true });

    // ==================================================================
    // 通知 PluginHost 配置变更
    // ==================================================================
    function notifyConfigChange(): void {
      const configData: Record<string, unknown> = {
        card_type: 'ImageCard',
        images: internalState.images.map(img => ({ ...img })),
        layout_type: internalState.layoutType,
        layout_options: { ...internalConfig.layout_options },
      };
      if (internalConfig.theme) configData.theme = internalConfig.theme;
      if (internalConfig.layout) configData.layout = { ...internalConfig.layout };

      // 如果有待上传的文件，将其附加到配置中
      // PluginHost 会提取 _pendingFiles 并写入卡片文件夹，然后清除此字段
      if (pendingFiles.size > 0) {
        const filesToUpload: Record<string, File> = {};
        for (const [filePath, file] of pendingFiles.entries()) {
          filesToUpload[filePath] = file;
        }
        configData._pendingFiles = filesToUpload;
        // 清空本地待上传队列（已交给 PluginHost 处理）
        pendingFiles.clear();
      }

      // 同步 internalConfig
      internalConfig.images = internalState.images;
      internalConfig.layout_type = internalState.layoutType;

      if (props.onUpdateConfig) {
        props.onUpdateConfig(configData);
      }
    }

    // ==================================================================
    // 智能默认排版
    // 用户第一次添加图片后自动设置合理的默认排版
    // ==================================================================
    function applySmartDefaults(totalImages: number): void {
      if (totalImages === 1) {
        // 单张图片：默认宽度 70%，居中
        internalState.layoutType = 'single';
        internalConfig.layout_options = {
          ...internalConfig.layout_options,
          single_width_percent: 70,
          single_alignment: 'center',
        };
      } else if (totalImages > 1) {
        // 多张图片：默认 9 宫格（3x3）
        internalState.layoutType = 'grid';
        internalConfig.layout_options = {
          ...internalConfig.layout_options,
          grid_mode: '3x3',
          gap: 8,
        };
      }
    }

    // ==================================================================
    // 命令执行（带 undo 支持）
    // ==================================================================
    function execWithHistory(fn: () => void): void {
      const before = snapshotConfig();
      fn();
      const after = snapshotConfig();
      pushHistory(before, after);
      notifyConfigChange();
    }

    // ==================================================================
    // 撤销 / 重做
    // ==================================================================
    function handleUndo(): void {
      const entry = undoStack.value.pop();
      if (!entry) return;
      redoStack.value.push(entry);
      // 恢复 before 状态
      internalState.images = entry.before.images.map(img => ({ ...img }));
      internalState.layoutType = entry.before.layout_type;
      internalConfig.layout_options = { ...entry.before.layout_options };
      internalState.canUndo = undoStack.value.length > 0;
      internalState.canRedo = true;
      notifyConfigChange();
    }

    function handleRedo(): void {
      const entry = redoStack.value.pop();
      if (!entry) return;
      undoStack.value.push(entry);
      // 恢复 after 状态
      internalState.images = entry.after.images.map(img => ({ ...img }));
      internalState.layoutType = entry.after.layout_type;
      internalConfig.layout_options = { ...entry.after.layout_options };
      internalState.canUndo = true;
      internalState.canRedo = redoStack.value.length > 0;
      notifyConfigChange();
    }

    // ==================================================================
    // 图片操作
    // ==================================================================
    function handleAddByUrl(): void {
      const url = urlInput.value.trim();
      if (!url) return;
      const wasEmpty = internalState.images.length === 0;
      execWithHistory(() => {
        internalState.images.push({
          id: generateId(),
          source: 'url',
          url,
          alt: '',
          title: '',
        });
        // 第一次添加图片，设置智能默认排版
        if (wasEmpty) {
          applySmartDefaults(internalState.images.length);
        }
      });
      urlInput.value = '';
      // 添加成功后收起上传面板
      showUploader.value = false;
    }

    function execRemoveImage(imageId: string): void {
      // 清理被删除图片的预览 ObjectURL（防止内存泄漏）
      const removedImage = internalState.images.find(img => img.id === imageId);
      if (removedImage?.source === 'file' && removedImage.file_path) {
        const fp = removedImage.file_path;
        const previewUrl = previewUrls.value[fp];
        if (previewUrl) {
          try { URL.revokeObjectURL(previewUrl); } catch { /* ignore */ }
          const { [fp]: _p, ...restPreview } = previewUrls.value;
          previewUrls.value = restPreview;
        }
        // 清理通过 chips:// 协议解析的 blob URL
        releaseResolvedResourceByPath(fp);
        // 如果文件还在 pending 队列中（未保存），也清除
        pendingFiles.delete(fp);
      }

      execWithHistory(() => {
        const idx = internalState.images.findIndex(img => img.id === imageId);
        if (idx !== -1) internalState.images.splice(idx, 1);
        if (internalState.selectedImageId === imageId) internalState.selectedImageId = null;
      });
      // 如果删除后没有图片了，重新显示上传面板
      if (internalState.images.length === 0) {
        showUploader.value = true;
      }
    }

    function execMoveImage(imageId: string, targetIndex: number): void {
      execWithHistory(() => {
        const fromIndex = internalState.images.findIndex(img => img.id === imageId);
        if (fromIndex !== -1 && targetIndex >= 0 && targetIndex < internalState.images.length) {
          internalState.images = arrayMove(internalState.images, fromIndex, targetIndex);
        }
      });
    }

    function execSetLayoutType(layoutType: LayoutType): void {
      execWithHistory(() => {
        internalState.layoutType = layoutType;
      });
    }

    function execUpdateLayoutOptions(opts: Partial<LayoutOptions>): void {
      execWithHistory(() => {
        internalConfig.layout_options = { ...internalConfig.layout_options, ...opts };
      });
    }

    function execClearAll(): void {
      // 清理所有预览 ObjectURL（防止内存泄漏）
      for (const url of Object.values(previewUrls.value)) {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      }
      previewUrls.value = {};
      // 清理所有通过 chips:// 协议解析的 blob URL
      releaseAllResolvedResources();
      pendingFiles.clear();

      execWithHistory(() => {
        internalState.images = [];
        internalState.selectedImageId = null;
      });
      // 清空后重新显示上传面板
      showUploader.value = true;
    }

    // ==================================================================
    // 文件上传
    // ==================================================================
    function triggerFileInput(): void {
      fileInputRef.value?.click();
    }

    function onFileInputChange(event: Event): void {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        handleFiles(input.files);
        input.value = '';
      }
    }

    function onDragOver(): void { isDragover.value = true; }
    function onDragLeave(): void { isDragover.value = false; }

    function onDrop(event: DragEvent): void {
      isDragover.value = false;
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) handleFiles(files);
    }

    async function handleFiles(files: FileList | File[]): Promise<void> {
      const fileArray = Array.from(files);
      internalState.isUploading = true;
      internalState.uploadProgress = 0;

      const newImages: ImageItem[] = [];
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        if (!file || !file.type.startsWith('image/')) continue;
        try {
          // 1. 生成卡片根目录的相对文件名（保留原始文件名，重名时追加编号）
          const relativeFilePath = generateUniqueFileName(file.name);

          // 2. 创建 ObjectURL 仅用于编辑器内预览（不保存到配置）
          const objectUrl = URL.createObjectURL(file);
          previewUrls.value = { ...previewUrls.value, [relativeFilePath]: objectUrl };
          console.log('[ImageEditor] Preview URL set for:', relativeFilePath, '→', objectUrl);

          // 3. 暂存 File 对象，等待 notifyConfigChange 时传递给 PluginHost
          pendingFiles.set(relativeFilePath, file);

          // 4. file_path 记录为卡片根目录相对路径
          newImages.push({
            id: generateId(),
            source: 'file',
            file_path: relativeFilePath,
            alt: '',
            title: file.name.replace(/\.[^.]+$/, ''),
          });
        } catch (err) {
          console.error(t('error.upload_failed'), err);
        }
        internalState.uploadProgress = Math.round(((i + 1) / fileArray.length) * 100);
      }

      internalState.isUploading = false;
      internalState.uploadProgress = 0;

      if (newImages.length > 0) {
        const wasEmpty = internalState.images.length === 0;
        execWithHistory(() => {
          internalState.images.push(...newImages);
          // 第一次添加图片，设置智能默认排版
          if (wasEmpty) {
            applySmartDefaults(internalState.images.length);
          }
        });
        // 上传成功后收起上传面板
        showUploader.value = false;
      }
    }

    // ==================================================================
    // 排版选项事件处理
    // ==================================================================
    function handleGridModeChange(event: Event): void {
      execUpdateLayoutOptions({ grid_mode: (event.target as HTMLSelectElement).value as any });
    }
    function handleScrollModeChange(event: Event): void {
      execUpdateLayoutOptions({ scroll_mode: (event.target as HTMLSelectElement).value as any });
    }
    function handleWindowHeightChange(event: Event): void {
      const v = parseInt((event.target as HTMLInputElement).value, 10);
      if (!isNaN(v) && v > 0) execUpdateLayoutOptions({ fixed_window_height: v });
    }
    function handleWidthPercentChange(event: Event): void {
      const v = parseInt((event.target as HTMLInputElement).value, 10);
      if (!isNaN(v) && v >= 10 && v <= 100) execUpdateLayoutOptions({ single_width_percent: v });
    }
    function handleAlignmentChange(value: string): void {
      execUpdateLayoutOptions({ single_alignment: value as any });
    }
    function handleGapChange(event: Event): void {
      const v = parseInt((event.target as HTMLInputElement).value, 10);
      if (!isNaN(v) && v >= 0) execUpdateLayoutOptions({ gap: v });
    }

    // ==================================================================
    // 图片交互：标题、alt、选中、拖拽
    // ==================================================================
    function handleTitleChange(imageId: string, event: Event): void {
      const value = (event.target as HTMLInputElement).value;
      const img = internalState.images.find(i => i.id === imageId);
      if (img) {
        img.title = value;
        notifyConfigChange();
      }
    }

    function handleAltChange(imageId: string, event: Event): void {
      const value = (event.target as HTMLInputElement).value;
      const img = internalState.images.find(i => i.id === imageId);
      if (img) {
        img.alt = value;
        notifyConfigChange();
      }
    }

    function handleSelectImage(imageId: string): void {
      internalState.selectedImageId = internalState.selectedImageId === imageId ? null : imageId;
    }

    function handleDragStart(imageId: string, event: DragEvent): void {
      internalState.draggingImageId = imageId;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', imageId);
      }
    }

    function handleDragOver(_index: number, event: DragEvent): void {
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    }

    function handleDragDrop(targetIndex: number): void {
      const imageId = internalState.draggingImageId;
      if (imageId) execMoveImage(imageId, targetIndex);
      internalState.draggingImageId = null;
    }

    function handleDragEnd(): void {
      internalState.draggingImageId = null;
    }

    // ==================================================================
    // 辅助
    // ==================================================================
    /**
     * 通过 chips:// 协议异步解析资源路径为 blob URL
     * 使用 PluginHost 传入的 onResolveResource 回调，
     * 符合薯片协议规范的中央路由机制。
     */
    function resolveResourceAsync(filePath: string): void {
      // 已经解析过或正在解析中，跳过
      if (resolvedUrls.value[filePath] || pendingResolves.has(filePath)) {
        console.log('[ImageEditor] resolveResourceAsync skipped (already resolved/pending):', filePath);
        return;
      }

      const onResolveResource = (props.options as Record<string, unknown>)?.onResolveResource as
        ((path: string) => Promise<string>) | undefined;

      if (!onResolveResource) {
        console.warn('[ImageEditor] onResolveResource callback not available! Cannot resolve:', filePath);
        return;
      }

      console.log('[ImageEditor] Starting async resolve for:', filePath);
      pendingResolves.add(filePath);

      onResolveResource(filePath)
        .then((blobUrl) => {
          console.log('[ImageEditor] Resolve result for', filePath, '→', blobUrl ? `blob URL (${blobUrl.substring(0, 50)}...)` : 'empty');
          if (blobUrl) {
            // 使用展开运算符创建新对象，确保 Vue ref 响应式更新
            resolvedUrls.value = { ...resolvedUrls.value, [filePath]: blobUrl };
          }
        })
        .catch((err) => {
          console.warn(`[ImageEditor] Failed to resolve resource: ${filePath}`, err);
        })
        .finally(() => {
          pendingResolves.delete(filePath);
        });
    }

    function getImageSrc(image: ImageItem): string {
      if (image.source === 'url' && image.url) return image.url;
      if (image.source === 'file' && image.file_path) {
        // 优先使用暂存的 ObjectURL 预览（刚上传但尚未保存的文件）
        const preview = previewUrls.value[image.file_path];
        if (preview) {
          console.log('[ImageEditor] getImageSrc → preview:', image.file_path);
          return preview;
        }

        // 已经通过 chips:// 协议解析的 blob URL
        const resolved = resolvedUrls.value[image.file_path];
        if (resolved) {
          console.log('[ImageEditor] getImageSrc → resolved:', image.file_path);
          return resolved;
        }

        // 已经是 blob URL（向后兼容旧数据）
        if (image.file_path.startsWith('blob:')) return image.file_path;

        // 已经是完整 URL（向后兼容旧数据）
        if (image.file_path.startsWith('http://') || image.file_path.startsWith('https://')) {
          return image.file_path;
        }

        // 相对路径：触发异步解析（通过 chips:// 协议）
        console.log('[ImageEditor] getImageSrc → triggering async resolve for:', image.file_path);
        resolveResourceAsync(image.file_path);

        // 返回空字符串，等异步解析完成后 resolvedUrls 更新会触发模板重渲染
        return '';
      }
      console.log('[ImageEditor] getImageSrc → no source for:', image.id, image.source, image.file_path);
      return '';
    }

    function handlePreviewError(event: Event): void {
      (event.target as HTMLImageElement).classList.add('chips-image-editor__card-img--error');
    }

    const alignmentOptions = computed(() => [
      { value: 'left', label: t('layout.align_left') },
      { value: 'center', label: t('layout.align_center') },
      { value: 'right', label: t('layout.align_right') },
    ]);

    const layoutTypeOptions = computed(() => [
      { value: 'single' as LayoutType, label: t('layout.single'), desc: t('layout.single_desc'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="9" cy="9" r="1.5" /><polyline points="20 14 15 9 4 20" /></svg>' },
      { value: 'grid' as LayoutType, label: t('layout.grid'), desc: t('layout.grid_desc'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>' },
      { value: 'long-scroll' as LayoutType, label: t('layout.long_scroll'), desc: t('layout.long_scroll_desc'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="2" width="14" height="6" rx="1" /><rect x="5" y="9" width="14" height="6" rx="1" /><rect x="5" y="16" width="14" height="6" rx="1" /></svg>' },
      { value: 'horizontal-scroll' as LayoutType, label: t('layout.horizontal_scroll'), desc: t('layout.horizontal_scroll_desc'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="6" height="14" rx="1" /><rect x="9" y="5" width="6" height="14" rx="1" /><rect x="16" y="5" width="6" height="14" rx="1" /></svg>' },
    ]);

    // ==================================================================
    // 键盘快捷键
    // ==================================================================
    function handleKeydown(event: KeyboardEvent): void {
      const isMac = navigator.platform.includes('Mac');
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (mod && event.key === 'z' && !event.shiftKey) { event.preventDefault(); handleUndo(); }
      if (mod && event.key === 'z' && event.shiftKey) { event.preventDefault(); handleRedo(); }
      if (event.ctrlKey && event.key === 'y') { event.preventDefault(); handleRedo(); }
      if (event.key === 'Delete' && internalState.selectedImageId) {
        event.preventDefault();
        execRemoveImage(internalState.selectedImageId);
      }
    }

    onMounted(() => {
      document.addEventListener('keydown', handleKeydown);
      console.log('[ImageEditor] onMounted - images:', internalState.images.length,
        'config keys:', Object.keys(props.config || {}),
        'options.onResolveResource:', typeof (props.options as Record<string, unknown>)?.onResolveResource);
      // 组件挂载后，解析已有图片的资源路径
      resolveExistingImages();
    });
    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown);
      // 释放所有暂存的 ObjectURL，防止内存泄漏
      for (const url of Object.values(previewUrls.value)) {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      }
      previewUrls.value = {};
      // 释放所有通过 chips:// 协议解析的 blob URL
      releaseAllResolvedResources();
      pendingFiles.clear();
    });

    // ==================================================================
    // Return
    // ==================================================================
    return {
      t,
      internalConfig,
      internalState,
      fileInputRef,
      urlInput,
      isDragover,
      showUploader,
      alignmentOptions,
      layoutTypeOptions,
      triggerFileInput,
      onFileInputChange,
      onDragOver,
      onDragLeave,
      onDrop,
      handleUndo,
      handleRedo,
      handleAddByUrl,
      execRemoveImage,
      execMoveImage,
      execSetLayoutType,
      execClearAll,
      handleGridModeChange,
      handleScrollModeChange,
      handleWindowHeightChange,
      handleWidthPercentChange,
      handleAlignmentChange,
      handleGapChange,
      handleSelectImage,
      handleTitleChange,
      handleAltChange,
      handleDragStart,
      handleDragOver,
      handleDragDrop,
      handleDragEnd,
      getImageSrc,
      handlePreviewError,
    };
  },
});
</script>

<style>
/* ============================================================
 * 编辑器容器
 * ============================================================ */
.chips-image-editor {
  font-family: var(--chips-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  font-size: var(--chips-font-size-sm, 14px);
  color: var(--chips-color-text, #1f2937);
  background: var(--chips-color-surface, #ffffff);
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}

/* 可滚动内容区 */
.chips-image-editor__scroll-body {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 16px;
}
.chips-image-editor__scroll-body::-webkit-scrollbar { width: 5px; }
.chips-image-editor__scroll-body::-webkit-scrollbar-thumb {
  background: var(--chips-color-border, #d1d5db); border-radius: 3px;
}
.chips-image-editor__scroll-body::-webkit-scrollbar-track { background: transparent; }

/* ============================================================
 * 顶部工具栏（固定在顶部）
 * ============================================================ */
.chips-image-editor__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--chips-color-surface-alt, #f9fafb);
  border-bottom: 1px solid var(--chips-color-border, #e5e7eb);
  flex-shrink: 0;
}

/* 收起后的添加按钮 */
.chips-image-editor__add-bar {
  padding: 4px 0;
}
.chips-image-editor__add-btn {
  display: inline-flex; align-items: center; gap: 6px;
  width: 100%; padding: 10px 0; justify-content: center;
  background: var(--chips-color-surface-alt, #f9fafb);
  border: 2px dashed var(--chips-color-border, #d1d5db);
  border-radius: var(--chips-radius-md, 6px);
  color: var(--chips-color-primary, #3b82f6);
  font-size: 14px; font-weight: 500; cursor: pointer;
  transition: all 0.15s ease;
}
.chips-image-editor__add-btn:hover {
  background: var(--chips-color-primary-light, rgba(59,130,246,0.08));
  border-color: var(--chips-color-primary, #3b82f6);
}

/* 收起按钮 */
.chips-image-editor__collapse-btn {
  margin-left: auto;
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  background: transparent; border: none; border-radius: 4px; cursor: pointer;
  color: var(--chips-color-text-tertiary, #9ca3af);
  transition: all 0.15s ease;
}
.chips-image-editor__collapse-btn:hover {
  background: var(--chips-color-surface-alt, #f3f4f6);
  color: var(--chips-color-text, #374151);
}
.chips-image-editor__toolbar-left { display: flex; align-items: center; gap: 4px; }
.chips-image-editor__toolbar-right { display: flex; align-items: center; }

.chips-image-editor__icon-btn {
  width: 32px; height: 32px; border: none; background: transparent;
  border-radius: var(--chips-radius-md, 6px); cursor: pointer;
  color: var(--chips-color-text-secondary, #6b7280);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.chips-image-editor__icon-btn:hover:not(:disabled) {
  background: var(--chips-color-hover, rgba(0,0,0,0.06));
  color: var(--chips-color-text, #1f2937);
}
.chips-image-editor__icon-btn--disabled, .chips-image-editor__icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.chips-image-editor__badge {
  display: inline-flex; align-items: center; padding: 2px 10px;
  font-size: 12px; font-weight: 500;
  color: var(--chips-color-primary, #3b82f6);
  background: var(--chips-color-primary-light, rgba(59,130,246,0.08));
  border-radius: 12px;
}

/* ============================================================
 * 分区
 * ============================================================ */
.chips-image-editor__section { padding: 16px; border-bottom: 1px solid var(--chips-color-border, #e5e7eb); }
.chips-image-editor__section:last-child { border-bottom: none; }
.chips-image-editor__section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.chips-image-editor__section-icon { color: var(--chips-color-text-secondary, #6b7280); flex-shrink: 0; }
.chips-image-editor__section-title { font-size: 13px; font-weight: 600; color: var(--chips-color-text, #1f2937); letter-spacing: 0.02em; }
.chips-image-editor__drag-hint { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--chips-color-text-tertiary, #9ca3af); }

/* ============================================================
 * 上传区域
 * ============================================================ */
.chips-image-editor__dropzone {
  border: 2px dashed var(--chips-color-border, #d1d5db); border-radius: var(--chips-radius-lg, 10px);
  padding: 28px 16px; text-align: center; cursor: pointer; transition: all 0.2s ease;
  background: var(--chips-color-surface, #ffffff); position: relative;
}
.chips-image-editor__dropzone:hover { border-color: var(--chips-color-primary, #3b82f6); background: var(--chips-color-primary-light, rgba(59,130,246,0.03)); }
.chips-image-editor__dropzone--dragover { border-color: var(--chips-color-primary, #3b82f6); background: var(--chips-color-primary-light, rgba(59,130,246,0.06)); transform: scale(1.005); }
.chips-image-editor__dropzone--uploading { cursor: default; border-style: solid; border-color: var(--chips-color-primary, #3b82f6); }
.chips-image-editor__file-input { display: none; }
.chips-image-editor__dropzone-body { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.chips-image-editor__dropzone-icon { color: var(--chips-color-text-tertiary, #9ca3af); transition: color 0.2s ease; }
.chips-image-editor__dropzone:hover .chips-image-editor__dropzone-icon { color: var(--chips-color-primary, #3b82f6); }
.chips-image-editor__dropzone-text { font-size: 14px; font-weight: 500; color: var(--chips-color-text-secondary, #6b7280); }
.chips-image-editor__dropzone-subtext { font-size: 12px; color: var(--chips-color-text-tertiary, #9ca3af); }
.chips-image-editor__progress-ring { position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: var(--chips-color-primary, #3b82f6); }
.chips-image-editor__progress-number { position: absolute; font-size: 10px; font-weight: 600; color: var(--chips-color-primary, #3b82f6); }

/* ============================================================
 * 分隔线
 * ============================================================ */
.chips-image-editor__divider { display: flex; align-items: center; gap: 12px; margin: 14px 0; }
.chips-image-editor__divider-line { flex: 1; height: 1px; background: var(--chips-color-border, #e5e7eb); }
.chips-image-editor__divider-text { font-size: 12px; color: var(--chips-color-text-tertiary, #9ca3af); flex-shrink: 0; }

/* ============================================================
 * URL 输入
 * ============================================================ */
.chips-image-editor__url-row { display: flex; gap: 8px; }
.chips-image-editor__url-input-wrapper { flex: 1; position: relative; display: flex; align-items: center; }
.chips-image-editor__url-icon { position: absolute; left: 10px; color: var(--chips-color-text-tertiary, #9ca3af); pointer-events: none; }
.chips-image-editor__url-field {
  width: 100%; padding: 8px 10px 8px 32px;
  border: 1px solid var(--chips-color-border, #d1d5db); border-radius: var(--chips-radius-md, 6px);
  font-size: 13px; color: var(--chips-color-text, #1f2937); background: var(--chips-color-surface, #ffffff);
  transition: border-color 0.15s ease, box-shadow 0.15s ease; outline: none;
}
.chips-image-editor__url-field::placeholder { color: var(--chips-color-text-tertiary, #9ca3af); }
.chips-image-editor__url-field:focus { border-color: var(--chips-color-primary, #3b82f6); box-shadow: 0 0 0 3px var(--chips-color-primary-light, rgba(59,130,246,0.12)); }
.chips-image-editor__url-btn {
  display: inline-flex; align-items: center; gap: 4px; padding: 8px 14px;
  background: var(--chips-color-primary, #3b82f6); color: #ffffff; border: none;
  border-radius: var(--chips-radius-md, 6px); font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap; transition: background-color 0.15s ease, opacity 0.15s ease;
}
.chips-image-editor__url-btn:hover:not(:disabled) { background: var(--chips-color-primary-dark, #2563eb); }
.chips-image-editor__url-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* ============================================================
 * 排版选择卡片
 * ============================================================ */
.chips-image-editor__layout-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; }
.chips-image-editor__layout-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px 8px; border: 1.5px solid var(--chips-color-border, #e5e7eb);
  border-radius: var(--chips-radius-md, 8px); background: var(--chips-color-surface, #ffffff);
  cursor: pointer; transition: all 0.15s ease; text-align: center;
}
.chips-image-editor__layout-card:hover { border-color: var(--chips-color-primary-light, rgba(59,130,246,0.4)); background: var(--chips-color-primary-light, rgba(59,130,246,0.03)); }
.chips-image-editor__layout-card--active { border-color: var(--chips-color-primary, #3b82f6); background: var(--chips-color-primary-light, rgba(59,130,246,0.06)); box-shadow: 0 0 0 3px var(--chips-color-primary-light, rgba(59,130,246,0.1)); }
.chips-image-editor__layout-card-icon { color: var(--chips-color-text-secondary, #6b7280); transition: color 0.15s ease; }
.chips-image-editor__layout-card--active .chips-image-editor__layout-card-icon { color: var(--chips-color-primary, #3b82f6); }
.chips-image-editor__layout-card-name { font-size: 12px; font-weight: 600; color: var(--chips-color-text, #1f2937); }
.chips-image-editor__layout-card-desc { font-size: 11px; color: var(--chips-color-text-tertiary, #9ca3af); line-height: 1.3; }

/* ============================================================
 * 排版子选项
 * ============================================================ */
.chips-image-editor__layout-options { display: flex; flex-direction: column; gap: 10px; }
.chips-image-editor__option-row { display: flex; align-items: center; gap: 12px; }
.chips-image-editor__option-label { min-width: 72px; font-size: 13px; color: var(--chips-color-text-secondary, #6b7280); flex-shrink: 0; }
.chips-image-editor__option-control { flex: 1; display: flex; align-items: center; }
.chips-image-editor__option-control--inline { gap: 6px; }
.chips-image-editor__option-control--range { gap: 10px; }
.chips-image-editor__select {
  width: 100%; padding: 6px 10px; border: 1px solid var(--chips-color-border, #d1d5db);
  border-radius: var(--chips-radius-md, 6px); font-size: 13px;
  background: var(--chips-color-surface, #ffffff); color: var(--chips-color-text, #1f2937);
  outline: none; cursor: pointer; transition: border-color 0.15s ease;
}
.chips-image-editor__select:focus { border-color: var(--chips-color-primary, #3b82f6); }
.chips-image-editor__number-input {
  width: 80px; padding: 6px 8px; border: 1px solid var(--chips-color-border, #d1d5db);
  border-radius: var(--chips-radius-md, 6px); font-size: 13px;
  background: var(--chips-color-surface, #ffffff); color: var(--chips-color-text, #1f2937);
  text-align: center; outline: none; transition: border-color 0.15s ease;
}
.chips-image-editor__number-input:focus { border-color: var(--chips-color-primary, #3b82f6); }
.chips-image-editor__option-unit { font-size: 12px; color: var(--chips-color-text-tertiary, #9ca3af); white-space: nowrap; }
.chips-image-editor__range-input { flex: 1; accent-color: var(--chips-color-primary, #3b82f6); cursor: pointer; }
.chips-image-editor__range-value { min-width: 40px; text-align: right; font-size: 13px; font-weight: 500; color: var(--chips-color-text, #1f2937); font-variant-numeric: tabular-nums; }
.chips-image-editor__align-group { display: flex; border: 1px solid var(--chips-color-border, #d1d5db); border-radius: var(--chips-radius-md, 6px); overflow: hidden; }
.chips-image-editor__align-btn {
  width: 36px; height: 32px; border: none; background: var(--chips-color-surface, #ffffff);
  cursor: pointer; color: var(--chips-color-text-secondary, #6b7280);
  display: flex; align-items: center; justify-content: center; transition: all 0.12s ease;
  border-right: 1px solid var(--chips-color-border, #e5e7eb);
}
.chips-image-editor__align-btn:last-child { border-right: none; }
.chips-image-editor__align-btn:hover { background: var(--chips-color-hover, rgba(0,0,0,0.04)); }
.chips-image-editor__align-btn--active { background: var(--chips-color-primary, #3b82f6); color: #ffffff; }
.chips-image-editor__align-btn--active:hover { background: var(--chips-color-primary-dark, #2563eb); }

/* ============================================================
 * 空状态
 * ============================================================ */
.chips-image-editor__empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; gap: 12px; }
.chips-image-editor__empty-text { font-size: 13px; color: var(--chips-color-text-tertiary, #9ca3af); text-align: center; }

/* ============================================================
 * 图片列表
 * ============================================================ */
.chips-image-editor__list { display: flex; flex-direction: column; gap: 6px; }
.chips-image-editor__card {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  border: 1px solid var(--chips-color-border, #e5e7eb); border-radius: var(--chips-radius-md, 8px);
  background: var(--chips-color-surface, #ffffff); cursor: grab; transition: all 0.15s ease;
}
.chips-image-editor__card:hover { border-color: var(--chips-color-border-dark, #d1d5db); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.chips-image-editor__card--selected { border-color: var(--chips-color-primary, #3b82f6); box-shadow: 0 0 0 2px var(--chips-color-primary-light, rgba(59,130,246,0.15)); }
.chips-image-editor__card--dragging { opacity: 0.45; transform: scale(0.98); }
.chips-image-editor__card-index {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--chips-color-surface-alt, #f3f4f6); color: var(--chips-color-text-tertiary, #9ca3af);
  font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.chips-image-editor__card--selected .chips-image-editor__card-index { background: var(--chips-color-primary, #3b82f6); color: #ffffff; }
.chips-image-editor__card-thumb {
  width: 56px; height: 56px; border-radius: var(--chips-radius-sm, 6px);
  overflow: hidden; flex-shrink: 0; background: var(--chips-color-surface-alt, #f3f4f6); position: relative;
}
.chips-image-editor__card-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: opacity 0.2s ease; }
.chips-image-editor__card-img--error { opacity: 0.2; filter: grayscale(100%); }
.chips-image-editor__card-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.chips-image-editor__card-input {
  width: 100%; padding: 4px 8px; border: 1px solid transparent;
  border-radius: var(--chips-radius-sm, 4px); font-size: 12px;
  color: var(--chips-color-text, #1f2937); background: transparent; outline: none; transition: all 0.15s ease;
}
.chips-image-editor__card-input::placeholder { color: var(--chips-color-text-tertiary, #c0c4cc); }
.chips-image-editor__card-input:hover { background: var(--chips-color-surface-alt, #f9fafb); }
.chips-image-editor__card-input:focus { background: var(--chips-color-surface, #ffffff); border-color: var(--chips-color-primary, #3b82f6); box-shadow: 0 0 0 2px var(--chips-color-primary-light, rgba(59,130,246,0.1)); }
.chips-image-editor__card-input--title { font-weight: 500; font-size: 13px; }
.chips-image-editor__card-input--alt { font-size: 11px; color: var(--chips-color-text-secondary, #6b7280); }
.chips-image-editor__card-actions { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; opacity: 0; transition: opacity 0.15s ease; }
.chips-image-editor__card:hover .chips-image-editor__card-actions { opacity: 1; }
.chips-image-editor__action-btn {
  width: 26px; height: 26px; border: none; border-radius: var(--chips-radius-sm, 4px);
  background: transparent; cursor: pointer; color: var(--chips-color-text-secondary, #6b7280);
  display: flex; align-items: center; justify-content: center; transition: all 0.12s ease;
}
.chips-image-editor__action-btn:hover { background: var(--chips-color-hover, rgba(0,0,0,0.06)); color: var(--chips-color-text, #1f2937); }
.chips-image-editor__action-btn--danger:hover { background: rgba(239,68,68,0.08); color: #ef4444; }

/* ============================================================
 * 底部操作
 * ============================================================ */
.chips-image-editor__list-footer { display: flex; justify-content: center; padding-top: 12px; }
.chips-image-editor__clear-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px;
  border: 1px solid var(--chips-color-border, #e5e7eb); border-radius: var(--chips-radius-md, 6px);
  background: var(--chips-color-surface, #ffffff); color: var(--chips-color-text-secondary, #6b7280);
  font-size: 12px; cursor: pointer; transition: all 0.15s ease;
}
.chips-image-editor__clear-btn:hover { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.04); }
</style>
