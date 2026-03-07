<template>
  <div
    class="chips-richtext-content chips-richtext-typography"
    :class="{
      'chips-richtext-content--readonly': options?.readonly
    }"
    v-html="processedContent"
    @click="handleClick"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RenderOptions } from '../types';

// Props
const props = defineProps<{
  content: string;
  options?: RenderOptions;
  onLinkClick?: (url: string) => void;
  onImageClick?: (src: string) => void;
}>();

/**
 * 处理后的内容
 * 为HTML元素添加样式类名
 */
const processedContent = computed(() => {
  let html = props.content;

  // 添加样式类名
  html = html.replace(/<p>/g, '<p class="chips-richtext-paragraph">');
  html = html.replace(/<h1>/g, '<h1 class="chips-richtext-h1">');
  html = html.replace(/<h2>/g, '<h2 class="chips-richtext-h2">');
  html = html.replace(/<h3>/g, '<h3 class="chips-richtext-h3">');
  html = html.replace(/<h4>/g, '<h4 class="chips-richtext-h4">');
  html = html.replace(/<h5>/g, '<h5 class="chips-richtext-h5">');
  html = html.replace(/<h6>/g, '<h6 class="chips-richtext-h6">');
  html = html.replace(/<ul>/g, '<ul class="chips-richtext-ul">');
  html = html.replace(/<ol>/g, '<ol class="chips-richtext-ol">');
  html = html.replace(/<li>/g, '<li class="chips-richtext-li">');
  html = html.replace(/<blockquote>/g, '<blockquote class="chips-richtext-blockquote">');
  html = html.replace(/<a /g, '<a class="chips-richtext-link" ');
  html = html.replace(/<img /g, '<img class="chips-richtext-image" ');
  html = html.replace(/<code>/g, '<code class="chips-richtext-code">');

  return html;
});

/**
 * 处理点击事件
 */
function handleClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;

  // 处理链接点击
  if (target.tagName === 'A') {
    event.preventDefault();
    const href = target.getAttribute('href');
    if (href && props.onLinkClick) {
      props.onLinkClick(href);
    }
    return;
  }

  // 处理图片点击
  if (target.tagName === 'IMG') {
    const src = target.getAttribute('src');
    if (src && props.onImageClick) {
      props.onImageClick(src);
    }
    return;
  }
}
</script>

<style>
@import '../styles/richtext-typography.css';

/* 基础布局样式（功能性，不涉及视觉） */
.chips-richtext-content {
  background: var(--richtext-bg-color, transparent);
}

/* 响应式断点样式 */
.chips-richtext--mobile .chips-richtext-typography {
  font-size: 14px;
  line-height: 1.6;
}

.chips-richtext--mobile .chips-richtext-h1 {
  font-size: 24px;
}

.chips-richtext--tablet .chips-richtext-typography {
  font-size: 15px;
  line-height: 1.7;
}

.chips-richtext--desktop .chips-richtext-typography {
  font-size: 16px;
  line-height: 1.8;
}

/* 错误样式 */
.chips-richtext-error {
  padding: 16px;
  text-align: center;
  color: #666;
}

.chips-richtext-error small {
  color: #999;
}
</style>
