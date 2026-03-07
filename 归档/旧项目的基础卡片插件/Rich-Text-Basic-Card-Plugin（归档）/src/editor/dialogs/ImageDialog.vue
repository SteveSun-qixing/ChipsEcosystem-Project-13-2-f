<template>
  <div class="chips-richtext-dialog-overlay" @click.self="emit('cancel')">
    <div class="chips-richtext-dialog">
      <div class="chips-richtext-dialog-header">
        <h3>{{ t('richtext.dialog.image_title') }}</h3>
        <button class="chips-richtext-dialog-close" @click="emit('cancel')">×</button>
      </div>

      <div class="chips-richtext-dialog-body">
        <!-- 标签页切换 -->
        <div class="chips-richtext-dialog-tabs">
          <button
            :class="{ active: activeTab === 'upload' }"
            @click="activeTab = 'upload'"
          >
            {{ t('richtext.dialog.image_upload') }}
          </button>
          <button
            :class="{ active: activeTab === 'url' }"
            @click="activeTab = 'url'"
          >
            {{ t('richtext.dialog.image_url') }}
          </button>
        </div>

        <!-- 上传标签页 -->
        <div v-if="activeTab === 'upload'" class="chips-richtext-dialog-tab-content">
          <div
            class="chips-richtext-dialog-dropzone"
            :class="{ dragover: isDragover }"
            @dragover.prevent="isDragover = true"
            @dragleave="isDragover = false"
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
          >
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              @change="handleFileSelect"
              hidden
            />
            <div v-if="!previewSrc">
              <p>{{ t('richtext.hint.image_upload_hint') }}</p>
              <p class="chips-richtext-dialog-hint">
                {{ t('richtext.hint.image_max_size', { max: maxSize || 5 }) }}
              </p>
            </div>
            <img v-else :src="previewSrc" class="chips-richtext-dialog-preview" />
          </div>
        </div>

        <!-- URL标签页 -->
        <div v-if="activeTab === 'url'" class="chips-richtext-dialog-tab-content">
          <div class="chips-richtext-dialog-field">
            <label>{{ t('richtext.dialog.image_url') }}</label>
            <input
              type="text"
              v-model="imageUrl"
              :placeholder="t('richtext.dialog.image_url_placeholder')"
            />
          </div>
        </div>

        <!-- Alt文本 -->
        <div class="chips-richtext-dialog-field">
          <label>{{ t('richtext.dialog.image_alt') }}</label>
          <input
            type="text"
            v-model="altText"
            :placeholder="t('richtext.dialog.image_alt_placeholder')"
          />
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="chips-richtext-dialog-error">
          {{ error }}
        </div>
      </div>

      <div class="chips-richtext-dialog-footer">
        <button
          class="chips-richtext-dialog-button chips-richtext-dialog-button--secondary"
          @click="emit('cancel')"
        >
          {{ t('richtext.dialog.cancel') }}
        </button>
        <button
          class="chips-richtext-dialog-button chips-richtext-dialog-button--primary"
          @click="handleConfirm"
          :disabled="!isValid"
        >
          {{ t('richtext.dialog.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { t } from '../../utils/i18n';

// Props
const props = defineProps<{
  maxSize?: number;
}>();

// Emits
const emit = defineEmits<{
  (e: 'confirm', data: { src: string; alt?: string }): void;
  (e: 'cancel'): void;
}>();

// State
const activeTab = ref<'upload' | 'url'>('upload');
const isDragover = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const previewSrc = ref('');
const imageUrl = ref('');
const altText = ref('');
const error = ref('');

// Computed
const maxSizeBytes = computed(() => (props.maxSize || 5) * 1024 * 1024);

const isValid = computed(() => {
  if (activeTab.value === 'upload') {
    return !!previewSrc.value;
  } else {
    return !!imageUrl.value.trim();
  }
});

// Methods
function triggerFileInput(): void {
  fileInput.value?.click();
}

function handleFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    processFile(file);
  }
}

function handleDrop(event: DragEvent): void {
  isDragover.value = false;
  const file = event.dataTransfer?.files[0];
  if (file) {
    processFile(file);
  }
}

function processFile(file: File): void {
  error.value = '';

  // 检查类型
  if (!file.type.startsWith('image/')) {
    error.value = t('richtext.error.unsupported_format');
    return;
  }

  // 检查大小
  if (file.size > maxSizeBytes.value) {
    error.value = t('richtext.error.image_too_large', { max: props.maxSize || 5 });
    return;
  }

  // 生成预览
  const reader = new FileReader();
  reader.onload = (e) => {
    previewSrc.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

function handleConfirm(): void {
  if (!isValid.value) return;

  if (activeTab.value === 'upload' && previewSrc.value) {
    // 上传模式：返回base64
    emit('confirm', {
      src: previewSrc.value,
      alt: altText.value || undefined,
    });
  } else if (activeTab.value === 'url' && imageUrl.value) {
    // URL模式
    emit('confirm', {
      src: imageUrl.value,
      alt: altText.value || undefined,
    });
  }
}
</script>

<style>
.chips-richtext-dialog-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.chips-richtext-dialog-tabs button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.chips-richtext-dialog-tabs button.active {
  background: #0066cc;
  color: white;
  border-color: #0066cc;
}

.chips-richtext-dialog-tab-content {
  margin-bottom: 16px;
}

.chips-richtext-dialog-dropzone {
  border: 2px dashed #ddd;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.chips-richtext-dialog-dropzone:hover {
  border-color: #0066cc;
}

.chips-richtext-dialog-dropzone.dragover {
  border-color: #0066cc;
  background: #f0f7ff;
}

.chips-richtext-dialog-preview {
  max-width: 100%;
  max-height: 200px;
}

.chips-richtext-dialog-hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}
</style>
