/**
 * useTranslation hook
 *
 * 使用本地 i18n 注册表（src/i18n/），完全同步，无 IPC 调用，无副作用。
 * Host locale 在 App 启动时读取并设置到本地；之后翻译纯本地完成。
 */
import { t } from '../i18n';

export function useTranslation() {
    return { t };
}
