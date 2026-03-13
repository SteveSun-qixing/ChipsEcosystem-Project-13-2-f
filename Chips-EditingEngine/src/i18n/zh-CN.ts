/**
 * 简体中文 UI 文案
 * 应用内翻译由本地管理，不依赖 Host i18n 服务。
 * Host i18n 仅负责系统级字符串（如 system.ready / system.error）。
 */
const zhCN: Record<string, string> = {
    // HeaderBar
    'header_bar.toggle_layout': '切换布局',
    'header_bar.toggle_theme': '切换主题',
    'header_bar.status.ready': '就绪',
    'header_bar.status.loading': '加载中…',
    'header_bar.status.error': '异常',

    // Dock
    'engine_settings.title': '引擎设置',

    // Workspace
    'workspace.empty.title': '还没有内容',
    'workspace.empty.hint': '从 Dock 创建卡片或盒子',
    'workspace.error.load': '加载工作区失败',

    // Card Windows
    'card_window.untitled': '无标题卡片',
    'card_window.close': '关闭',
    'card_window.minimize': '最小化',

    // Common
    'common.confirm': '确定',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.discard': '放弃',

    // App Tools
    'app.tool_file_manager': '文件管理器',
    'app.tool_edit_panel': '编辑面板',
    'app.tool_card_box_library': '卡箱库',
};

export default zhCN;
