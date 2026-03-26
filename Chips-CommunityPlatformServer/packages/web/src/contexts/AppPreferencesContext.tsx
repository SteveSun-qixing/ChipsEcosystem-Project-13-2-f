import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Locale = 'zh-CN' | 'en-US';
type ThemeId = 'chips-community.midnight' | 'chips-community.paper';

type TranslationDictionary = Record<string, string>;

const LOCALE_STORAGE_KEY = 'ccps.locale';
const THEME_STORAGE_KEY = 'ccps.theme';

const dictionaries: Record<Locale, TranslationDictionary> = {
  'zh-CN': {
    'common.loading': '加载中…',
    'common.retry': '重试',
    'common.search': '搜索',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.delete': '删除',
    'common.save': '保存',
    'common.create': '创建',
    'common.upload': '上传',
    'common.public': '公开',
    'common.private': '私密',
    'common.language': '语言',
    'common.theme': '主题',
    'common.owner': '作者',
    'common.createdAt': '创建时间',
    'common.updatedAt': '更新时间',
    'common.fileSize': '文件大小',
    'common.layout': '布局',
    'common.visibility': '可见性',
    'common.open': '打开',
    'common.visit': '访问',
    'common.view': '查看',
    'common.manage': '管理',
    'common.rooms': '房间',
    'common.cards': '卡片',
    'common.boxes': '箱子',
    'common.users': '用户',
    'common.profile': '个人资料',
    'common.status': '状态',
    'common.empty': '暂无内容',
    'common.backHome': '返回首页',
    'common.lightTheme': '纸页主题',
    'common.darkTheme': '夜幕主题',
    'common.localeChinese': '中文',
    'common.localeEnglish': '英文',
    'common.rootDirectory': '空间根目录',
    'common.processing': '处理中',
    'common.ready': '已就绪',
    'common.error': '出错了',
    'common.pending': '等待处理',
    'common.noDescription': '暂无描述',
    'common.slug': '短链接',
    'common.systemId': '系统 ID',
    'common.themeName': '主题',
    'brand.name': 'Chips Community',
    'brand.tagline': '公开发布与浏览',
    'nav.home': '首页',
    'nav.discover': '发现',
    'nav.upload': '上传中心',
    'nav.workspace': '工作台',
    'nav.admin': '平台后台',
    'nav.login': '登录',
    'nav.register': '注册',
    'nav.logout': '退出登录',
    'nav.mySpace': '我的空间',
    'home.heroTitle': '把薯片卡片变成可分享的个人社区空间',
    'home.heroSubtitle': '上传卡片与箱子，自动走资源 CDN 化与 HTML 转化链路，再用房间组织你的公开空间。',
    'home.heroPrimary': '立即开始发布',
    'home.heroSecondary': '查看我的空间',
    'home.latestCards': '最新公开卡片',
    'home.latestBoxes': '最新公开箱子',
    'home.searchTitle': '搜索用户、卡片与箱子',
    'home.searchPlaceholder': '输入用户名、卡片标题或箱子标题',
    'home.searchHint': '支持同时搜索用户、卡片、箱子',
    'home.resultsTitle': '搜索结果',
    'home.stepsTitle': '基础发布流程',
    'home.stepUpload': '上传标准 `.card` / `.box` 文件',
    'home.stepPipeline': '服务端完成资源上 CDN 与 HTML 转化',
    'home.stepPublish': '生成稳定链接并进入你的公开空间',
    'home.noSearchResults': '没有找到匹配内容',
    'auth.loginTitle': '欢迎回来',
    'auth.loginSubtitle': '登录薯片社区，继续管理你的房间、卡片和箱子。',
    'auth.registerTitle': '创建社区账号',
    'auth.registerSubtitle': '注册后即可拥有自己的公开空间与上传能力。',
    'auth.username': '用户名',
    'auth.password': '密码',
    'auth.confirmPassword': '确认密码',
    'auth.displayName': '显示名称',
    'auth.bio': '简介',
    'auth.loginAction': '登录',
    'auth.registerAction': '注册',
    'auth.hasAccount': '已经有账号了？',
    'auth.noAccount': '还没有账号？',
    'auth.toLogin': '去登录',
    'auth.toRegister': '去注册',
    'auth.validation.required': '请输入用户名和密码',
    'auth.validation.usernameLength': '用户名长度必须在 3 到 32 个字符之间',
    'auth.validation.usernamePattern': '用户名只能包含字母、数字、下划线和连字符',
    'auth.validation.passwordLength': '密码长度至少为 8 位',
    'auth.validation.passwordMismatch': '两次输入的密码不一致',
    'space.title': '{name} 的空间',
    'space.ownerCta': '继续管理我的空间',
    'space.publishCta': '上传新的卡片或箱子',
    'space.rootCards': '根目录卡片',
    'space.rootBoxes': '根目录箱子',
    'space.empty': '这个空间还没有公开内容。',
    'room.notFound': '没有找到这个房间。',
    'room.contentsTitle': '房间内容',
    'room.cardCount': '{count} 张卡片',
    'room.boxCount': '{count} 个箱子',
    'card.previewTitle': '卡片预览',
    'card.openHtml': '打开 HTML 页面',
    'card.notReady': '卡片仍在处理链路中，请稍后刷新。',
    'card.errorState': '卡片处理失败，可回到工作台查看错误详情。',
    'card.metadataTitle': '卡片信息',
    'card.identifierLabel': '卡片文件 ID',
    'card.themeLabel': '卡片主题',
    'box.summaryTitle': '箱子摘要',
    'box.referenceTitle': '引用卡片列表',
    'box.empty': '这个箱子还没有可展示的引用条目。',
    'box.communityCard': '社区卡片',
    'box.sourceLink': '原始链接',
    'box.identifierLabel': '箱子文件 ID',
    'dashboard.title': '社区工作台',
    'dashboard.subtitle': '管理个人资料、房间、卡片和箱子。',
    'dashboard.refresh': '刷新数据',
    'dashboard.quickActions': '快捷操作',
    'dashboard.editProfile': '编辑资料',
    'dashboard.roomsTitle': '房间管理',
    'dashboard.cardsTitle': '卡片管理',
    'dashboard.boxesTitle': '箱子管理',
    'dashboard.createRoomTitle': '新建房间',
    'dashboard.roomName': '房间名称',
    'dashboard.roomDescription': '房间描述',
    'dashboard.profileSaved': '资料已保存',
    'dashboard.avatarUpload': '上传头像',
    'dashboard.deleteWarn': '再次点击确认删除',
    'dashboard.noRooms': '还没有创建房间',
    'dashboard.noCards': '还没有上传卡片',
    'dashboard.noBoxes': '还没有上传箱子',
    'upload.title': '上传中心',
    'upload.subtitle': '第一版先支持最基础的卡片与箱子上传、浏览与删除。',
    'upload.modeCard': '上传卡片',
    'upload.modeBox': '上传箱子',
    'upload.file': '选择文件',
    'upload.room': '所属房间',
    'upload.visibility': '可见性',
    'upload.submitCard': '开始上传卡片',
    'upload.submitBox': '开始上传箱子',
    'upload.cardHint': '上传后会自动进入资源替换、CDN 化与 HTML 转化流水线。',
    'upload.boxHint': '箱子会解析摘要信息并生成社区内的引用映射。',
    'upload.resultTitle': '上传结果',
    'upload.polling': '正在轮询卡片处理状态…',
    'upload.toCard': '查看卡片页面',
    'upload.fileRequired': '请先选择需要上传的文件',
    'upload.invalidExtension': '请选择 {extension} 文件',
    'detail.ownerSpace': '访问作者空间',
    'detail.notFound': '没有找到目标内容。',
  },
  'en-US': {
    'common.loading': 'Loading…',
    'common.retry': 'Retry',
    'common.search': 'Search',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.create': 'Create',
    'common.upload': 'Upload',
    'common.public': 'Public',
    'common.private': 'Private',
    'common.language': 'Language',
    'common.theme': 'Theme',
    'common.owner': 'Owner',
    'common.createdAt': 'Created',
    'common.updatedAt': 'Updated',
    'common.fileSize': 'File size',
    'common.layout': 'Layout',
    'common.visibility': 'Visibility',
    'common.open': 'Open',
    'common.visit': 'Visit',
    'common.view': 'View',
    'common.manage': 'Manage',
    'common.rooms': 'Rooms',
    'common.cards': 'Cards',
    'common.boxes': 'Boxes',
    'common.users': 'Users',
    'common.profile': 'Profile',
    'common.status': 'Status',
    'common.empty': 'Nothing here yet',
    'common.backHome': 'Back home',
    'common.lightTheme': 'Paper Theme',
    'common.darkTheme': 'Midnight Theme',
    'common.localeChinese': 'Chinese',
    'common.localeEnglish': 'English',
    'common.rootDirectory': 'Space root',
    'common.processing': 'Processing',
    'common.ready': 'Ready',
    'common.error': 'Error',
    'common.pending': 'Pending',
    'common.noDescription': 'No description',
    'common.slug': 'Slug',
    'common.systemId': 'System ID',
    'common.themeName': 'Theme',
    'brand.name': 'Chips Community',
    'brand.tagline': 'Public publishing and discovery',
    'nav.home': 'Home',
    'nav.discover': 'Discover',
    'nav.upload': 'Upload',
    'nav.workspace': 'Workspace',
    'nav.admin': 'Admin',
    'nav.login': 'Log in',
    'nav.register': 'Register',
    'nav.logout': 'Log out',
    'nav.mySpace': 'My space',
    'home.heroTitle': 'Turn Chips cards into a shareable community space',
    'home.heroSubtitle': 'Upload cards and boxes, run them through CDN + HTML conversion, then organize everything with rooms.',
    'home.heroPrimary': 'Start publishing',
    'home.heroSecondary': 'Open my space',
    'home.latestCards': 'Latest public cards',
    'home.latestBoxes': 'Latest public boxes',
    'home.searchTitle': 'Search users, cards, and boxes',
    'home.searchPlaceholder': 'Type a username, card title, or box title',
    'home.searchHint': 'Search users, cards, and boxes together',
    'home.resultsTitle': 'Search results',
    'home.stepsTitle': 'Base publishing flow',
    'home.stepUpload': 'Upload standard `.card` / `.box` files',
    'home.stepPipeline': 'Server runs CDN replacement and HTML conversion',
    'home.stepPublish': 'Stable links appear inside your public space',
    'home.noSearchResults': 'No matching content found',
    'auth.loginTitle': 'Welcome back',
    'auth.loginSubtitle': 'Log in to manage your rooms, cards, and boxes.',
    'auth.registerTitle': 'Create your account',
    'auth.registerSubtitle': 'Every account gets its own public space and upload flow.',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm password',
    'auth.displayName': 'Display name',
    'auth.bio': 'Bio',
    'auth.loginAction': 'Log in',
    'auth.registerAction': 'Register',
    'auth.hasAccount': 'Already have an account?',
    'auth.noAccount': 'Need an account?',
    'auth.toLogin': 'Go to login',
    'auth.toRegister': 'Go to register',
    'auth.validation.required': 'Enter both username and password',
    'auth.validation.usernameLength': 'Username must be between 3 and 32 characters',
    'auth.validation.usernamePattern': 'Username can only contain letters, numbers, underscores, and hyphens',
    'auth.validation.passwordLength': 'Password must be at least 8 characters long',
    'auth.validation.passwordMismatch': 'Passwords do not match',
    'space.title': '{name}’s space',
    'space.ownerCta': 'Manage my space',
    'space.publishCta': 'Upload new content',
    'space.rootCards': 'Root cards',
    'space.rootBoxes': 'Root boxes',
    'space.empty': 'This space has no public content yet.',
    'room.notFound': 'Room not found.',
    'room.contentsTitle': 'Room content',
    'room.cardCount': '{count} cards',
    'room.boxCount': '{count} boxes',
    'card.previewTitle': 'Card preview',
    'card.openHtml': 'Open HTML page',
    'card.notReady': 'This card is still moving through the processing pipeline.',
    'card.errorState': 'Card processing failed. Check the workspace for details.',
    'card.metadataTitle': 'Card info',
    'card.identifierLabel': 'Card file ID',
    'card.themeLabel': 'Theme',
    'box.summaryTitle': 'Box summary',
    'box.referenceTitle': 'Referenced cards',
    'box.empty': 'This box has no visible references yet.',
    'box.communityCard': 'Community card',
    'box.sourceLink': 'Source link',
    'box.identifierLabel': 'Box file ID',
    'dashboard.title': 'Community workspace',
    'dashboard.subtitle': 'Manage your profile, rooms, cards, and boxes.',
    'dashboard.refresh': 'Refresh',
    'dashboard.quickActions': 'Quick actions',
    'dashboard.editProfile': 'Edit profile',
    'dashboard.roomsTitle': 'Rooms',
    'dashboard.cardsTitle': 'Cards',
    'dashboard.boxesTitle': 'Boxes',
    'dashboard.createRoomTitle': 'Create room',
    'dashboard.roomName': 'Room name',
    'dashboard.roomDescription': 'Room description',
    'dashboard.profileSaved': 'Profile saved',
    'dashboard.avatarUpload': 'Upload avatar',
    'dashboard.deleteWarn': 'Click again to confirm deletion',
    'dashboard.noRooms': 'No rooms yet',
    'dashboard.noCards': 'No cards uploaded yet',
    'dashboard.noBoxes': 'No boxes uploaded yet',
    'upload.title': 'Upload center',
    'upload.subtitle': 'Version one focuses on the cleanest basic upload, browse, and delete flows.',
    'upload.modeCard': 'Upload card',
    'upload.modeBox': 'Upload box',
    'upload.file': 'Choose file',
    'upload.room': 'Target room',
    'upload.visibility': 'Visibility',
    'upload.submitCard': 'Upload card',
    'upload.submitBox': 'Upload box',
    'upload.cardHint': 'Cards continue through CDN replacement and HTML conversion after upload.',
    'upload.boxHint': 'Boxes are parsed into summaries and community reference matches.',
    'upload.resultTitle': 'Upload result',
    'upload.polling': 'Polling card processing status…',
    'upload.toCard': 'Open card page',
    'upload.fileRequired': 'Choose a file before uploading',
    'upload.invalidExtension': 'Please choose a {extension} file',
    'detail.ownerSpace': 'Visit author space',
    'detail.notFound': 'Target content not found.',
  },
};

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

function detectLocale(): Locale {
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')) {
    return 'en-US';
  }
  return 'zh-CN';
}

function detectTheme(): ThemeId {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'chips-community.paper';
  }
  return 'chips-community.midnight';
}

interface AppPreferencesContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  themeId: ThemeId;
  setThemeId: (themeId: ThemeId) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (value: string | number | Date) => string;
  formatNumber: (value: number) => string;
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === 'undefined') {
      return 'zh-CN';
    }

    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored === 'en-US' || stored === 'zh-CN' ? stored : detectLocale();
  });

  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') {
      return 'chips-community.midnight';
    }

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'chips-community.paper' || stored === 'chips-community.midnight'
      ? stored
      : detectTheme();
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }

    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
    }

    document.documentElement.dataset.chipsThemeId = themeId;
  }, [themeId]);

  const value = useMemo<AppPreferencesContextValue>(() => {
    const dictionary = dictionaries[locale];

    return {
      locale,
      setLocale,
      themeId,
      setThemeId,
      t(key, params) {
        return interpolate(dictionary[key] ?? key, params);
      },
      formatDate(value) {
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).format(new Date(value));
      },
      formatNumber(value) {
        return new Intl.NumberFormat(locale).format(value);
      },
    };
  }, [locale, themeId]);

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences(): AppPreferencesContextValue {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  }
  return context;
}
