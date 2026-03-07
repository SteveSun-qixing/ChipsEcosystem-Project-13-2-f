<template>
  <div class="chips-richtext-dialog-overlay" @click.self="emit('cancel')">
    <div class="chips-richtext-dialog">
      <div class="chips-richtext-dialog-header">
        <h3>{{ t('richtext.dialog.link_title') }}</h3>
        <button class="chips-richtext-dialog-close" @click="emit('cancel')">×</button>
      </div>

      <div class="chips-richtext-dialog-body">
        <div class="chips-richtext-dialog-field">
          <label>{{ t('richtext.dialog.link_url') }}</label>
          <input
            type="text"
            v-model="url"
            :placeholder="t('richtext.dialog.link_url_placeholder')"
            @keyup.enter="handleConfirm"
          />
          <span v-if="urlError" class="chips-richtext-dialog-error">
            {{ urlError }}
          </span>
        </div>

        <div class="chips-richtext-dialog-field">
          <label>{{ t('richtext.dialog.link_text') }}</label>
          <input
            type="text"
            v-model="text"
            :placeholder="t('richtext.dialog.link_text_placeholder')"
          />
        </div>

        <div class="chips-richtext-dialog-field chips-richtext-dialog-field--checkbox">
          <label>
            <input type="checkbox" v-model="newWindow" />
            {{ t('richtext.dialog.link_new_window') }}
          </label>
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

// Emits
const emit = defineEmits<{
  (e: 'confirm', data: { url: string; text?: string; newWindow?: boolean }): void;
  (e: 'cancel'): void;
}>();

// State
const url = ref('');
const text = ref('');
const newWindow = ref(false);

// Computed
const urlError = computed(() => {
  if (!url.value) return '';

  try {
    new URL(url.value);
    return '';
  } catch {
    // 检查是否是相对路径
    if (url.value.startsWith('/') || url.value.startsWith('./') || url.value.startsWith('#')) {
      return '';
    }
    return t('richtext.error.invalid_url');
  }
});

const isValid = computed(() => {
  return url.value.trim() !== '' && !urlError.value;
});

// Methods
function handleConfirm(): void {
  if (!isValid.value) return;

  emit('confirm', {
    url: url.value,
    text: text.value || undefined,
    newWindow: newWindow.value || undefined,
  });
}
</script>

<style>
.chips-richtext-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.chips-richtext-dialog {
  width: 400px;
  max-width: 90%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.chips-richtext-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.chips-richtext-dialog-header h3 {
  margin: 0;
  font-size: 16px;
}

.chips-richtext-dialog-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
}

.chips-richtext-dialog-close:hover {
  background: #f0f0f0;
}

.chips-richtext-dialog-body {
  padding: 16px;
}

.chips-richtext-dialog-field {
  margin-bottom: 16px;
}

.chips-richtext-dialog-field label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: #333;
}

.chips-richtext-dialog-field input[type='text'] {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.chips-richtext-dialog-field input[type='text']:focus {
  border-color: #0066cc;
  outline: none;
}

.chips-richtext-dialog-field--checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.chips-richtext-dialog-error {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #f00;
}

.chips-richtext-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #eee;
}

.chips-richtext-dialog-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.chips-richtext-dialog-button--secondary {
  background: #f0f0f0;
  color: #333;
}

.chips-richtext-dialog-button--secondary:hover {
  background: #e8e8e8;
}

.chips-richtext-dialog-button--primary {
  background: #0066cc;
  color: white;
}

.chips-richtext-dialog-button--primary:hover {
  background: #0055aa;
}

.chips-richtext-dialog-button--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
