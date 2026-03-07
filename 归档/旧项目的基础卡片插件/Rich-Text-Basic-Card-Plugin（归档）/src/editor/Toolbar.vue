<template>
  <div class="chips-richtext-toolbar" @mousedown="handleToolbarMousedown">
    <!-- 文本格式组 -->
    <div class="chips-richtext-toolbar-group">
      <button
        class="chips-richtext-toolbar-button"
        :class="{ 'chips-richtext-toolbar-button--active': isActive('bold') }"
        @click="emit('format', { type: 'bold' })"
        :title="t('richtext.toolbar.bold') + ' (Ctrl+B)'"
      >
        <span class="chips-richtext-toolbar-icon">B</span>
      </button>

      <button
        class="chips-richtext-toolbar-button"
        :class="{ 'chips-richtext-toolbar-button--active': isActive('italic') }"
        @click="emit('format', { type: 'italic' })"
        :title="t('richtext.toolbar.italic') + ' (Ctrl+I)'"
      >
        <span class="chips-richtext-toolbar-icon chips-richtext-toolbar-icon--italic">I</span>
      </button>

      <button
        class="chips-richtext-toolbar-button"
        :class="{ 'chips-richtext-toolbar-button--active': isActive('underline') }"
        @click="emit('format', { type: 'underline' })"
        :title="t('richtext.toolbar.underline') + ' (Ctrl+U)'"
      >
        <span class="chips-richtext-toolbar-icon chips-richtext-toolbar-icon--underline">U</span>
      </button>

      <button
        class="chips-richtext-toolbar-button"
        :class="{ 'chips-richtext-toolbar-button--active': isActive('strikethrough') }"
        @click="emit('format', { type: 'strikethrough' })"
        :title="t('richtext.toolbar.strikethrough')"
      >
        <span class="chips-richtext-toolbar-icon chips-richtext-toolbar-icon--strike">S</span>
      </button>
    </div>

    <div class="chips-richtext-toolbar-divider"></div>

    <!-- 标题选择 -->
    <div class="chips-richtext-toolbar-group">
      <select
        class="chips-richtext-toolbar-select"
        :value="currentBlockValue"
        @change="handleHeadingChange"
      >
        <option value="paragraph">{{ t('richtext.toolbar.paragraph') }}</option>
        <option value="heading1">{{ t('richtext.toolbar.heading') }} 1</option>
        <option value="heading2">{{ t('richtext.toolbar.heading') }} 2</option>
        <option value="heading3">{{ t('richtext.toolbar.heading') }} 3</option>
        <option value="heading4">{{ t('richtext.toolbar.heading') }} 4</option>
        <option value="heading5">{{ t('richtext.toolbar.heading') }} 5</option>
        <option value="heading6">{{ t('richtext.toolbar.heading') }} 6</option>
      </select>
    </div>

    <div class="chips-richtext-toolbar-divider"></div>

    <!-- 列表组 -->
    <div class="chips-richtext-toolbar-group">
      <button
        class="chips-richtext-toolbar-button"
        :class="{ 'chips-richtext-toolbar-button--active': isBlock('orderedList') }"
        @click="emit('format', { type: 'orderedList' })"
        :title="t('richtext.toolbar.ordered_list')"
      >
        <span class="chips-richtext-toolbar-icon">1.</span>
      </button>

      <button
        class="chips-richtext-toolbar-button"
        :class="{ 'chips-richtext-toolbar-button--active': isBlock('unorderedList') }"
        @click="emit('format', { type: 'unorderedList' })"
        :title="t('richtext.toolbar.unordered_list')"
      >
        <span class="chips-richtext-toolbar-icon">•</span>
      </button>

      <button
        class="chips-richtext-toolbar-button"
        :class="{ 'chips-richtext-toolbar-button--active': isBlock('blockquote') }"
        @click="emit('format', { type: 'blockquote' })"
        :title="t('richtext.toolbar.blockquote')"
      >
        <span class="chips-richtext-toolbar-icon">"</span>
      </button>
    </div>

    <div class="chips-richtext-toolbar-divider"></div>

    <!-- 对齐组 -->
    <div class="chips-richtext-toolbar-group">
      <button
        class="chips-richtext-toolbar-button"
        @click="emit('format', { type: 'align', value: 'left' })"
        :title="t('richtext.toolbar.align_left')"
      >
        <span class="chips-richtext-toolbar-icon">⫢</span>
      </button>

      <button
        class="chips-richtext-toolbar-button"
        @click="emit('format', { type: 'align', value: 'center' })"
        :title="t('richtext.toolbar.align_center')"
      >
        <span class="chips-richtext-toolbar-icon">⫿</span>
      </button>

      <button
        class="chips-richtext-toolbar-button"
        @click="emit('format', { type: 'align', value: 'right' })"
        :title="t('richtext.toolbar.align_right')"
      >
        <span class="chips-richtext-toolbar-icon">⫣</span>
      </button>
    </div>

    <div class="chips-richtext-toolbar-divider"></div>

    <!-- 插入组 -->
    <div class="chips-richtext-toolbar-group">
      <button
        class="chips-richtext-toolbar-button"
        @click="showLinkDialog = true"
        :title="t('richtext.toolbar.link')"
      >
        <span class="chips-richtext-toolbar-icon">🔗</span>
      </button>

      <button
        class="chips-richtext-toolbar-button"
        @click="showImageDialog = true"
        :title="t('richtext.toolbar.image')"
      >
        <span class="chips-richtext-toolbar-icon">🖼</span>
      </button>

      <button
        class="chips-richtext-toolbar-button"
        @click="emit('insert', { type: 'horizontalRule' })"
        :title="t('richtext.toolbar.horizontal_rule')"
      >
        <span class="chips-richtext-toolbar-icon">—</span>
      </button>
    </div>

    <div class="chips-richtext-toolbar-divider"></div>

    <!-- 历史组 -->
    <div class="chips-richtext-toolbar-group">
      <button
        class="chips-richtext-toolbar-button"
        :disabled="!canUndo"
        @click="emit('undo')"
        :title="t('richtext.toolbar.undo') + ' (Ctrl+Z)'"
      >
        <span class="chips-richtext-toolbar-icon">↶</span>
      </button>

      <button
        class="chips-richtext-toolbar-button"
        :disabled="!canRedo"
        @click="emit('redo')"
        :title="t('richtext.toolbar.redo') + ' (Ctrl+Shift+Z)'"
      >
        <span class="chips-richtext-toolbar-icon">↷</span>
      </button>
    </div>

    <div class="chips-richtext-toolbar-divider"></div>

    <!-- 清除格式 -->
    <div class="chips-richtext-toolbar-group">
      <button
        class="chips-richtext-toolbar-button"
        @click="emit('format', { type: 'clearFormat' })"
        :title="t('richtext.toolbar.clear_format')"
      >
        <span class="chips-richtext-toolbar-icon">Tx</span>
      </button>
    </div>

    <!-- 链接对话框 -->
    <LinkDialog
      v-if="showLinkDialog"
      @confirm="handleLinkConfirm"
      @cancel="showLinkDialog = false"
    />

    <!-- 图片对话框 -->
    <ImageDialog
      v-if="showImageDialog"
      :maxSize="maxImageSize"
      @confirm="handleImageConfirm"
      @cancel="showImageDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { t } from '../utils/i18n';
import type { FormatCommand, InsertCommand, FormatType, BlockType } from '../types';
import LinkDialog from './dialogs/LinkDialog.vue';
import ImageDialog from './dialogs/ImageDialog.vue';

// Props
const props = defineProps<{
  activeFormats: Set<FormatType>;
  currentBlock: BlockType;
  canUndo: boolean;
  canRedo: boolean;
  maxImageSize?: number;
}>();

// Emits
const emit = defineEmits<{
  (e: 'format', command: FormatCommand): void;
  (e: 'insert', command: InsertCommand): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
}>();

// State
const showLinkDialog = ref(false);
const showImageDialog = ref(false);

// Computed
const currentBlockValue = computed(() => props.currentBlock);

// Methods
function isActive(format: string): boolean {
  return props.activeFormats.has(format as FormatType);
}

function isBlock(block: string): boolean {
  return props.currentBlock === block;
}

function handleHeadingChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  const level = value === 'paragraph' ? 0 : parseInt(value.replace('heading', ''));
  emit('format', { type: 'heading', level: level as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
}

function handleLinkConfirm(data: { url: string; text?: string; newWindow?: boolean }): void {
  emit('insert', { type: 'link', ...data });
  showLinkDialog.value = false;
}

function handleImageConfirm(data: { src: string; alt?: string }): void {
  emit('insert', { type: 'image', ...data });
  showImageDialog.value = false;
}

function handleToolbarMousedown(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;
  if (target?.closest('button')) {
    event.preventDefault();
  }
}
</script>

<style>
.chips-richtext-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
}

.chips-richtext-toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.chips-richtext-toolbar-divider {
  width: 1px;
  height: 24px;
  margin: 0 4px;
  background: #ddd;
}

.chips-richtext-toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.chips-richtext-toolbar-button:hover {
  background: #e8e8e8;
}

.chips-richtext-toolbar-button--active {
  background: #ddd;
  border-color: #ccc;
}

.chips-richtext-toolbar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chips-richtext-toolbar-icon {
  font-size: 14px;
  font-weight: bold;
}

.chips-richtext-toolbar-icon--italic {
  font-style: italic;
}

.chips-richtext-toolbar-icon--underline {
  text-decoration: underline;
}

.chips-richtext-toolbar-icon--strike {
  text-decoration: line-through;
}

.chips-richtext-toolbar-select {
  height: 32px;
  padding: 0 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}
</style>
