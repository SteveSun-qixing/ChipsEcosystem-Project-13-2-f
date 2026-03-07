<template>
  <div class="chips-richtext-editor">
    <!-- 工具栏 -->
    <Toolbar
      v-if="options?.toolbar"
      :activeFormats="state.activeFormats"
      :currentBlock="state.currentBlock"
      :canUndo="state.canUndo"
      :canRedo="state.canRedo"
      :maxImageSize="options?.maxImageSize"
      @format="handleFormat"
      @insert="handleInsert"
      @undo="handleUndo"
      @redo="handleRedo"
    />

    <!-- 编辑区 -->
    <EditorContent
      ref="editorContentRef"
      :initialContent="initialContent"
      :placeholder="options?.placeholder"
      @contentChange="handleContentChange"
      @selectionChange="handleSelectionChange"
      @focus="handleFocus"
      @blur="handleBlur"
    />

    <!-- 状态栏 -->
    <div class="chips-richtext-statusbar">
      <span class="chips-richtext-wordcount">字数: {{ state.wordCount }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type {
  EditorOptions,
  RichTextEditorState,
  FormatCommand,
  InsertCommand,
  FormatType,
  BlockType,
} from '../types';
import { escapeHtml, capitalize } from '../utils/dom';
import Toolbar from './Toolbar.vue';
import EditorContent from './EditorContent.vue';

interface EditorContentExposed {
  getHtml: () => string;
  focusEditor: () => void;
  restoreSelection: () => boolean;
  refreshSelection: () => void;
}

// Props
const props = defineProps<{
  initialContent: string;
  options?: EditorOptions;
  state: RichTextEditorState;
  onFormat?: (command: FormatCommand) => void;
  onInsert?: (command: InsertCommand) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onContentChange?: (html: string) => void;
  onSelectionChange?: (
    selection: { startOffset: number; endOffset: number; collapsed: boolean } | null,
    formats: Set<FormatType>,
    block: BlockType
  ) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}>();

const editorContentRef = ref<EditorContentExposed | null>(null);

// Handlers
function handleFormat(command: FormatCommand): void {
  prepareCommandExecution();

  if (props.onFormat) {
    props.onFormat(command);
  } else {
    executeFormatCommand(command);
    syncContentAfterCommand();
  }

  editorContentRef.value?.focusEditor();
  editorContentRef.value?.refreshSelection();
}

function handleInsert(command: InsertCommand): void {
  prepareCommandExecution();

  if (props.onInsert) {
    props.onInsert(command);
  } else {
    executeInsertCommand(command);
    syncContentAfterCommand();
  }

  editorContentRef.value?.focusEditor();
  editorContentRef.value?.refreshSelection();
}

function handleUndo(): void {
  if (props.onUndo) {
    props.onUndo();
  } else {
    document.execCommand('undo', false);
    syncContentAfterCommand();
  }

  editorContentRef.value?.focusEditor();
  editorContentRef.value?.refreshSelection();
}

function handleRedo(): void {
  if (props.onRedo) {
    props.onRedo();
  } else {
    document.execCommand('redo', false);
    syncContentAfterCommand();
  }

  editorContentRef.value?.focusEditor();
  editorContentRef.value?.refreshSelection();
}

function handleContentChange(html: string): void {
  props.onContentChange?.(html);
}

function handleSelectionChange(
  selection: { startOffset: number; endOffset: number; collapsed: boolean } | null,
  formats: Set<FormatType>,
  block: BlockType
): void {
  props.onSelectionChange?.(selection, formats, block);
}

function handleFocus(): void {
  props.onFocus?.();
}

function handleBlur(): void {
  props.onBlur?.();
}

function prepareCommandExecution(): void {
  editorContentRef.value?.restoreSelection();
}

function syncContentAfterCommand(): void {
  const html = editorContentRef.value?.getHtml() || '';
  props.onContentChange?.(html);

  if (!props.onContentChange) {
    props.state.content = html;
    props.state.wordCount = html.replace(/<[^>]*>/g, '').replace(/\s/g, '').length;
    props.state.isDirty = true;
  }

  try {
    props.state.canUndo = document.queryCommandEnabled('undo');
    props.state.canRedo = document.queryCommandEnabled('redo');
  } catch {
    props.state.canUndo = false;
    props.state.canRedo = false;
  }
}

function executeFormatCommand(command: FormatCommand): void {
  switch (command.type) {
    case 'bold':
      document.execCommand('bold', false);
      break;
    case 'italic':
      document.execCommand('italic', false);
      break;
    case 'underline':
      document.execCommand('underline', false);
      break;
    case 'strikethrough':
      document.execCommand('strikeThrough', false);
      break;
    case 'superscript':
      document.execCommand('superscript', false);
      break;
    case 'subscript':
      document.execCommand('subscript', false);
      break;
    case 'code':
      wrapSelectionWithTag('code');
      break;
    case 'heading':
      if (command.level === 0) {
        document.execCommand('formatBlock', false, 'p');
      } else {
        document.execCommand('formatBlock', false, `h${command.level}`);
      }
      break;
    case 'orderedList':
      document.execCommand('insertOrderedList', false);
      break;
    case 'unorderedList':
      document.execCommand('insertUnorderedList', false);
      break;
    case 'blockquote':
      document.execCommand('formatBlock', false, 'blockquote');
      break;
    case 'color':
      document.execCommand('foreColor', false, command.value);
      break;
    case 'backgroundColor':
      document.execCommand('hiliteColor', false, command.value);
      break;
    case 'fontSize':
      wrapSelectionWithStyle(`font-size: ${command.value}px`);
      break;
    case 'align':
      document.execCommand(`justify${capitalize(command.value)}`, false);
      break;
    case 'clearFormat':
      document.execCommand('removeFormat', false);
      break;
  }
}

function executeInsertCommand(command: InsertCommand): void {
  switch (command.type) {
    case 'link':
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${escapeHtml(command.url)}" ${
          command.newWindow ? 'target="_blank" rel="noopener"' : ''
        }>${escapeHtml(command.text || command.url)}</a>`
      );
      break;
    case 'image':
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${escapeHtml(command.src)}" ${
          command.alt ? `alt="${escapeHtml(command.alt)}"` : ''
        } ${command.width ? `width="${command.width}"` : ''} ${
          command.height ? `height="${command.height}"` : ''
        } />`
      );
      break;
    case 'horizontalRule':
      document.execCommand('insertHorizontalRule', false);
      break;
  }
}

function wrapSelectionWithTag(tagName: string): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const element = document.createElement(tagName);

  try {
    range.surroundContents(element);
  } catch {
    document.execCommand('insertHTML', false, `<${tagName}>${selection.toString()}</${tagName}>`);
  }
}

function wrapSelectionWithStyle(style: string): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const span = document.createElement('span');
  span.setAttribute('style', style);

  try {
    range.surroundContents(span);
  } catch {
    document.execCommand('insertHTML', false, `<span style="${style}">${selection.toString()}</span>`);
  }
}
</script>

<style>
.chips-richtext-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chips-richtext-statusbar {
  display: flex;
  justify-content: flex-end;
  padding: 4px 8px;
  font-size: 12px;
  color: #666;
  border-top: 1px solid #eee;
}
</style>
