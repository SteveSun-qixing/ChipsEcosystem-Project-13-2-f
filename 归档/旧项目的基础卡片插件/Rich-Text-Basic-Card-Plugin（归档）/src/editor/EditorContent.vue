<template>
  <div
    ref="editorRef"
    class="chips-richtext-editor-content chips-richtext-typography"
    :class="{
      'chips-richtext-editor-content--focused': isFocused,
      'chips-richtext-editor-content--empty': isEmpty
    }"
    contenteditable="true"
    @input="handleInput"
    @keydown="handleKeydown"
    @mouseup="handleSelectionChange"
    @keyup="handleSelectionChange"
    @focus="handleFocus"
    @blur="handleBlur"
    @paste="handlePaste"
    :data-placeholder="placeholder || t('richtext.hint.placeholder')"
  ></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { sanitizeHtml } from '../utils/sanitizer';
import { getBlockParent } from '../utils/dom';
import { t } from '../utils/i18n';
import type { FormatType, BlockType } from '../types';

// Props
const props = defineProps<{
  initialContent: string;
  placeholder?: string;
}>();

// Emits
const emit = defineEmits<{
  (e: 'contentChange', html: string): void;
  (
    e: 'selectionChange',
    selection: { startOffset: number; endOffset: number; collapsed: boolean } | null,
    formats: Set<FormatType>,
    block: BlockType
  ): void;
  (e: 'focus'): void;
  (e: 'blur'): void;
}>();

// Refs
const editorRef = ref<HTMLElement | null>(null);
const isFocused = ref(false);
let lastSelectionRange: Range | null = null;

// Computed
const isEmpty = computed(() => {
  const text = editorRef.value?.textContent || '';
  return text.trim().length === 0;
});

// 初始化内容
onMounted(() => {
  if (editorRef.value && props.initialContent) {
    editorRef.value.innerHTML = props.initialContent;
  }
});

// 监听初始内容变化
watch(
  () => props.initialContent,
  (newContent) => {
    if (editorRef.value && newContent !== editorRef.value.innerHTML) {
      editorRef.value.innerHTML = newContent;
    }
  }
);

// 处理输入
function handleInput(): void {
  const html = editorRef.value?.innerHTML || '';
  emit('contentChange', html);
}

function isRangeInsideEditor(range: Range): boolean {
  const editor = editorRef.value;
  if (!editor) return false;

  const container = range.commonAncestorContainer;
  return container === editor || editor.contains(container);
}

function saveSelectionRange(): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  if (!isRangeInsideEditor(range)) return;

  lastSelectionRange = range.cloneRange();
}

// 处理键盘事件
function handleKeydown(event: KeyboardEvent): void {
  const isMac = navigator.platform.includes('Mac');
  const modifier = isMac ? event.metaKey : event.ctrlKey;

  // Ctrl/Cmd + B: 加粗
  if (modifier && event.key === 'b') {
    event.preventDefault();
    document.execCommand('bold', false);
    handleInput();
    return;
  }

  // Ctrl/Cmd + I: 斜体
  if (modifier && event.key === 'i') {
    event.preventDefault();
    document.execCommand('italic', false);
    handleInput();
    return;
  }

  // Ctrl/Cmd + U: 下划线
  if (modifier && event.key === 'u') {
    event.preventDefault();
    document.execCommand('underline', false);
    handleInput();
    return;
  }

  // Tab: 列表缩进
  if (event.key === 'Tab') {
    const selection = window.getSelection();
    const node = selection?.anchorNode?.parentElement;
    if (node?.closest('li')) {
      event.preventDefault();
      if (event.shiftKey) {
        document.execCommand('outdent', false);
      } else {
        document.execCommand('indent', false);
      }
      handleInput();
    }
  }
}

// 处理选区变化
function handleSelectionChange(): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    emit('selectionChange', null, new Set<FormatType>(), 'paragraph');
    return;
  }

  const range = selection.getRangeAt(0);
  if (!isRangeInsideEditor(range)) {
    emit('selectionChange', null, new Set<FormatType>(), 'paragraph');
    return;
  }
  saveSelectionRange();

  // 获取当前生效的格式
  const formats = new Set<FormatType>();
  try {
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('strikeThrough')) formats.add('strikethrough');
    if (document.queryCommandState('superscript')) formats.add('superscript');
    if (document.queryCommandState('subscript')) formats.add('subscript');
  } catch {
    // queryCommandState 在部分浏览器实现不稳定，失败时降级为空状态
  }

  // 获取当前块类型
  let block: BlockType = 'paragraph';
  const blockNode = getBlockParent(range.commonAncestorContainer);
  if (blockNode) {
    const tagName = blockNode.tagName.toLowerCase();
    if (tagName.match(/^h[1-6]$/)) {
      block = ('heading' + tagName[1]) as BlockType;
    } else if (tagName === 'li') {
      const list = blockNode.closest('ol, ul');
      block = list?.tagName === 'OL' ? 'orderedList' : 'unorderedList';
    } else if (tagName === 'blockquote') {
      block = 'blockquote';
    }
  }

  emit(
    'selectionChange',
    {
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      collapsed: range.collapsed,
    },
    formats,
    block
  );
}

// 处理聚焦
function handleFocus(): void {
  isFocused.value = true;
  handleSelectionChange();
  emit('focus');
}

// 处理失焦
function handleBlur(): void {
  saveSelectionRange();
  isFocused.value = false;
  emit('blur');
}

// 处理粘贴
function handlePaste(event: ClipboardEvent): void {
  event.preventDefault();

  // 获取粘贴内容
  const html = event.clipboardData?.getData('text/html');
  const text = event.clipboardData?.getData('text/plain');

  if (html) {
    // 粘贴HTML，需要过滤
    const safeHtml = sanitizeHtml(html);
    document.execCommand('insertHTML', false, safeHtml);
  } else if (text) {
    // 粘贴纯文本
    document.execCommand('insertText', false, text);
  }

  handleInput();
}

function getHtml(): string {
  return editorRef.value?.innerHTML || '';
}

function focusEditor(): void {
  editorRef.value?.focus();
}

function restoreSelection(): boolean {
  if (!lastSelectionRange) return false;

  const selection = window.getSelection();
  if (!selection) return false;

  selection.removeAllRanges();
  selection.addRange(lastSelectionRange.cloneRange());
  return true;
}

function refreshSelection(): void {
  handleSelectionChange();
}

defineExpose({
  getHtml,
  focusEditor,
  restoreSelection,
  refreshSelection,
});
</script>

<style>
@import '../styles/richtext-typography.css';

.chips-richtext-editor-content {
  flex: 1;
  min-height: 200px;
  padding: 16px;
  outline: none;
  overflow-y: auto;
}

.chips-richtext-editor-content:empty::before {
  content: attr(data-placeholder);
  pointer-events: none;
  color: #999;
}

.chips-richtext-editor-content--focused {
  /* 聚焦样式可由主题包覆盖 */
}
</style>
