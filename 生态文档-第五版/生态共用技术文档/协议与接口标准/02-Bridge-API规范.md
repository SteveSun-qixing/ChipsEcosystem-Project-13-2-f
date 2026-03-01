# Bridge API规范

## 概述

Bridge API是插件访问系统能力的标准接口，通过Electron的contextBridge机制暴露给渲染进程。Bridge API是插件访问底层能力的唯一通道，插件不能直接访问Node.js API、文件系统或网络。

## 核心接口

### invoke方法

invoke方法用于发起请求到主进程，语法是await window.chips.invoke(service, method, payload)。service参数指定目标服务的标识符，如card、box、file、theme等。method参数指定要调用的方法名，如read、write、create、delete等。payload参数是包含请求数据的对象。

invoke方法返回一个Promise对象，resolve时返回处理结果，reject时返回错误信息。错误信息包含错误代码和错误描述，便于定位问题。

### on方法

on方法用于订阅事件，语法是window.chips.on(eventType, callback)。eventType参数指定要订阅的事件类型，使用点号分隔的命名空间，如card.created、box.updated等。callback参数是事件发生时要执行的回调函数，回调函数接收事件对象作为参数。

返回订阅ID，可以用于取消订阅。

### emit方法

emit方法用于发送事件到主进程，语法是window.chips.emit(eventType, payload)。eventType参数指定事件类型。payload参数是事件数据对象。

## 子域API

### file子域

file子域提供文件操作能力，包括file.read(path, options)读取文件，file.write(path, data)写入文件，file.exists(path)检查文件是否存在，file.mkdir(path)创建目录，file.delete(path)删除文件，file.list(path)列出目录内容，file.copy(src, dest)复制文件，file.move(src, dest)移动文件。

### dialog子域

dialog子域提供对话框能力，包括dialog.open(options)打开文件选择对话框，dialog.save(options)打开文件保存对话框，dialog.message(options)显示消息对话框，dialog.confirm(options)显示确认对话框。

options参数包含对话框的标题、默认路径、过滤器等配置。

### clipboard子域

clipboard子域提供剪贴板能力，包括clipboard.readText()读取文本，clipboard.writeText(text)写入文本，clipboard.readImage()读取图片，clipboard.writeImage(image)写入图片。

### shell子域

shell子域提供系统Shell能力，包括shell.openPath(path)用系统默认程序打开文件，shell.showItemInFolder(path)在文件管理器中显示文件，shell.openExternal(url)用浏览器打开URL。

### window子域

window子域提供窗口管理能力，包括window.minimize()最小化窗口，window.maximize()最大化窗口，window.close()关闭窗口，window.setTitle(title)设置窗口标题，window.setSize(width, height)设置窗口尺寸。

### theme子域

theme子域提供主题能力，包括theme.getCurrent()获取当前主题信息，theme.getAll()获取所有已安装主题列表，theme.getCss(themeId)获取主题的CSS代码。

### storage子域

storage子域提供本地存储能力，包括storage.get(key)读取数据，storage.set(key, value)写入数据，storage.delete(key)删除数据，storage.clear()清空所有数据。

存储数据以键值对形式保存在本地，与特定插件关联，不同插件的数据互相隔离。

### module子域

module子域提供模块加载能力，包括module.load(moduleId)加载模块，module.unload(moduleId)卸载模块，module.list()获取已加载模块列表。

## 类型定义

Bridge API使用TypeScript编写完整的类型定义。所有接口都有明确的类型标注，包括请求参数类型和响应数据类型。类型定义文件chips.d.ts随SDK一起发布，开发者可以导入到项目中获得代码补全和类型检查。

## 安全限制

Bridge API强制执行安全限制，插件只能通过API访问系统能力，不能直接调用Node.js或Electron API。文件操作只能访问允许的目录，不能访问系统敏感位置。网络请求只能通过特定接口发起。剪贴板访问需要用户授权。

## 错误处理

所有API方法都可能抛出错误，错误对象包含code属性表示错误类型，message属性表示错误描述。常见错误代码包括PERMISSION_DENIED权限不足，NOT_FOUND资源不存在，INVALID_ARGUMENT参数无效，INTERNAL_ERROR内部错误，NETWORK_ERROR网络错误。

开发者应该捕获错误并向用户提供有意义的错误提示。

## 使用示例

读取文件内容的示例：调用await window.chips.invoke('file', 'read', {path: '/path/to/file'})，返回文件内容字符串或Buffer。

保存文件的示例：调用await window.chips.invoke('file', 'write', {path: '/path/to/file', data: 'content'})，返回操作结果。

订阅卡片创建事件的示例：调用const subscriptionId = window.chips.on('card.created', (event) => { console.log('New card created:', event.data) })，返回订阅ID用于后续取消订阅。

打开文件选择对话框的示例：调用const result = await window.chips.invoke('dialog', 'open', {filters: [{name: 'Cards', extensions: ['card']}]})，返回用户选择的文件路径数组。