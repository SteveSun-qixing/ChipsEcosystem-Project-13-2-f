# Ecosystem

> **Relevant source files**
> * [README.md](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1)
> * [docs/ecosystem.md](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/ecosystem.md?plain=1)

## Purpose and Scope

This document provides a comprehensive overview of the DPlayer ecosystem, including related tools, plugins, API implementations, and integrations. It covers the broader environment surrounding the DPlayer core functionality, illustrating how DPlayer can be extended, integrated with other systems, and implemented in various applications. This page focuses on the third-party projects and tools that enhance or build upon DPlayer, rather than the internal components of DPlayer itself.

For information about the core DPlayer architecture, refer to [Core Architecture](/DIYgod/DPlayer/2-core-architecture). For details about the specific features of DPlayer, see [Features](/DIYgod/DPlayer/3-features).

## Ecosystem Overview

DPlayer has developed a rich ecosystem of supporting tools, plugins, and integrations that extend its functionality across various platforms and use cases. The ecosystem consists of several key categories, as illustrated below:

```mermaid
flowchart TD

LiteVersion["DPlayer-Lite"]
P2PEngine["hlsjs-p2p-engine"]
CBPlayer["CBPlayer (P2P integration)"]
DPlayer["DPlayer Core"]
DanmakuAPI["Danmaku API Implementations"]
CMSPlugins["CMS Plugins"]
FrameworkIntegrations["Framework Integrations"]
RelatedProjects["Related Projects"]
Thumbnails["DPlayer-thumbnails"]
VueIntegration["Vue-DPlayer"]
ReactIntegration["react-dplayer"]
ReactIntegration2["rc-dplayer"]
HexoIntegration["Hexo-tag-dplayer"]
TypechoPlugin["DPlayer-for-typecho"]
WordPressPlugin["DPlayer-WordPress"]
WordPressPlugin2["DPlayerHandle"]
WordPressPlugin3["Selection"]
ZBlogPlugin["DPlayer_for_Z-BlogPHP"]
DiscuzPlugin["DPlayer for Discuz!"]
NodeAPI["DPlayer-node (Node.js)"]
LaravelAPI["laravel-danmaku (PHP)"]
WebSocketAPI["dplayer-live-backend (WebSocket)"]
RubyAPI["RailsGun (Ruby)"]

subgraph subGraph5 ["DPlayer Ecosystem"]
    DPlayer
    DanmakuAPI
    CMSPlugins
    FrameworkIntegrations
    RelatedProjects
    DPlayer --> DanmakuAPI
    DPlayer --> CMSPlugins
    DPlayer --> FrameworkIntegrations
    DPlayer --> RelatedProjects

subgraph subGraph4 ["Related Projects"]
    LiteVersion
    P2PEngine
    CBPlayer
end

subgraph Tooling ["Tooling"]
    Thumbnails
end

subgraph subGraph3 ["Framework Integrations"]
    VueIntegration
    ReactIntegration
    ReactIntegration2
    HexoIntegration
end

subgraph subGraph2 ["CMS Plugins"]
    TypechoPlugin
    WordPressPlugin
    WordPressPlugin2
    WordPressPlugin3
    ZBlogPlugin
    DiscuzPlugin
end

subgraph subGraph1 ["Danmaku API Implementations"]
    NodeAPI
    LaravelAPI
    WebSocketAPI
    RubyAPI
end
end
```

Sources: [README.md L63-L92](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L63-L92)

 [docs/ecosystem.md L16-L44](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/ecosystem.md?plain=1#L16-L44)

## Tooling

The tooling category consists of utilities that enhance DPlayer's functionality or help developers work with DPlayer more effectively.

### DPlayer-thumbnails

This is a utility for generating video thumbnails that can be used with DPlayer's video preview feature. Thumbnails allow users to see a preview of the video content when hovering over the progress bar, enhancing the user experience.

```mermaid
flowchart TD

Video["Input Video"]
Processor["Thumbnail Generator"]
Config["Configuration Settings"]
Output["Thumbnail Images"]
DPlayer["DPlayer Instance (preview feature)"]

subgraph subGraph0 ["DPlayer-thumbnails Workflow"]
    Video
    Processor
    Config
    Output
    DPlayer
    Video --> Processor
    Config --> Processor
    Processor --> Output
    Output --> DPlayer
end
```

Sources: [README.md L65-L66](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L65-L66)

 [docs/ecosystem.md L19-L20](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/ecosystem.md?plain=1#L19-L20)

## Danmaku API Implementations

Danmaku (scrolling comments) is a key feature of DPlayer. These backend implementations provide server-side support for storing, retrieving, and managing danmaku comments.

### Available Implementations

| Implementation | Language/Platform | Description |
| --- | --- | --- |
| DPlayer-node | Node.js | A Node.js-based danmaku API backend |
| laravel-danmaku | PHP/Laravel | A Laravel-based implementation for PHP applications |
| dplayer-live-backend | Node.js/WebSocket | Specialized for live streaming with WebSocket support |
| RailsGun | Ruby/Rails | A Ruby on Rails implementation |

```mermaid
sequenceDiagram
  participant DPlayer Instance
  participant Danmaku API Server
  participant Database

  DPlayer Instance->>Danmaku API Server: Send new danmaku
  Danmaku API Server->>Database: Store danmaku data
  Danmaku API Server->>DPlayer Instance: Confirm storage
  DPlayer Instance->>Danmaku API Server: Request danmaku for video
  Danmaku API Server->>Database: Query danmaku data
  Database->>Danmaku API Server: Return results
  Danmaku API Server->>DPlayer Instance: Send danmaku data
  DPlayer Instance->>DPlayer Instance: Display danmaku on video
```

Sources: [README.md L69-L73](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L69-L73)

 [docs/ecosystem.md L22-L26](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/ecosystem.md?plain=1#L22-L26)

## Plugins and Integrations

DPlayer has been integrated with various content management systems (CMS) and frontend frameworks, making it accessible to developers in different environments.

### CMS Plugins

These plugins integrate DPlayer into popular content management systems, allowing site administrators to easily add DPlayer to their websites without extensive coding.

```mermaid
flowchart TD

WP["WordPress"]
WP1["DPlayer for WordPress"]
WP2["DPlayerHandle"]
WP3["Selection"]
Typecho["Typecho"]
TP1["DPlayer-for-typecho"]
ZBlog["Z-BlogPHP"]
ZB1["DPlayer_for_Z-BlogPHP"]
Discuz["Discuz!"]
DZ1["DPlayer for Discuz!"]

subgraph subGraph0 ["CMS Integrations"]
    WP
    WP1
    WP2
    WP3
    Typecho
    TP1
    ZBlog
    ZB1
    Discuz
    DZ1
    WP --> WP1
    WP --> WP2
    WP --> WP3
    Typecho --> TP1
    ZBlog --> ZB1
    Discuz --> DZ1
end
```

Sources: [README.md L76-L82](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L76-L82)

 [docs/ecosystem.md L30-L36](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/ecosystem.md?plain=1#L30-L36)

### Framework Integrations

These packages provide ready-to-use DPlayer components for popular JavaScript frameworks.

| Integration | Framework | Description |
| --- | --- | --- |
| Vue-DPlayer | Vue.js | Vue component wrapping DPlayer |
| react-dplayer | React | React component for DPlayer |
| rc-dplayer | React | Alternative React implementation |
| Hexo-tag-dplayer | Hexo | Plugin for the Hexo static site generator |

```mermaid
flowchart TD

FComp["Framework Component"]
Props["Component Props"]
DPlayer["DPlayer Instance"]
Events["Framework Events"]

subgraph subGraph0 ["Framework Integration Pattern"]
    FComp
    Props
    DPlayer
    Events
    Props --> FComp
    FComp --> DPlayer
    DPlayer --> Events
end
```

Sources: [README.md L83-L86](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L83-L86)

 [docs/ecosystem.md L37-L39](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/ecosystem.md?plain=1#L37-L39)

## Related Projects

Several projects have been developed that are related to but distinct from the core DPlayer implementation.

### DPlayer-Lite

A lightweight version of DPlayer with reduced features but smaller footprint, suitable for simpler use cases or performance-constrained environments.

### P2P Streaming Integrations

| Project | Description |
| --- | --- |
| hlsjs-p2p-engine | Adds peer-to-peer capabilities to HLS streaming in DPlayer |
| CBPlayer | Pre-integrated DPlayer with P2P plugin supporting HLS, MP4, and MPEG-DASH |

```mermaid
flowchart TD

DPlayer["DPlayer"]
HLSjs["hls.js"]
P2PEngine["hlsjs-p2p-engine"]
CDN["CDN Server"]
Peer1["Peer 1"]
Peer2["Peer 2"]

subgraph subGraph0 ["P2P Integration Architecture"]
    DPlayer
    HLSjs
    P2PEngine
    CDN
    Peer1
    Peer2
    DPlayer --> HLSjs
    HLSjs --> P2PEngine
    P2PEngine --> CDN
    P2PEngine --> Peer1
    P2PEngine --> Peer2
    Peer1 --> Peer2
end
```

Sources: [README.md L89-L92](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L89-L92)

 [docs/ecosystem.md L42-L44](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/ecosystem.md?plain=1#L42-L44)

## Implementations and Users

DPlayer has been adopted by various websites and applications across different sectors, demonstrating its versatility and reliability.

### Notable Implementations

* Educational platforms: 学习强国, 极客时间, 新东方云教室
* Social platforms: 小红书, 浙江大学 CC98 论坛, 纸飞机南航青年网络社区
* Media sites: 嘀哩嘀哩, 银色子弹, otomads
* Software applications: Cloudreve, arozos, BBHouse, Tampermonkey 阿里云盘

```mermaid
flowchart TD

DPlayer["DPlayer"]
Education["Educational Platforms"]
Social["Social Platforms"]
Media["Media Sites"]
Software["Software Applications"]
Ed1["学习强国"]
Ed2["极客时间"]
Ed3["新东方云教室"]
Soc1["小红书"]
Soc2["CC98 论坛"]
Soc3["纸飞机社区"]
Med1["嘀哩嘀哩"]
Med2["银色子弹"]
Med3["otomads"]
Sw1["Cloudreve"]
Sw2["arozos"]
Sw3["BBHouse"]

subgraph subGraph0 ["DPlayer Implementation Categories"]
    DPlayer
    Education
    Social
    Media
    Software
    Ed1
    Ed2
    Ed3
    Soc1
    Soc2
    Soc3
    Med1
    Med2
    Med3
    Sw1
    Sw2
    Sw3
    DPlayer --> Education
    DPlayer --> Social
    DPlayer --> Media
    DPlayer --> Software
    Education --> Ed1
    Education --> Ed2
    Education --> Ed3
    Social --> Soc1
    Social --> Soc2
    Social --> Soc3
    Media --> Med1
    Media --> Med2
    Media --> Med3
    Software --> Sw1
    Software --> Sw2
    Software --> Sw3
end
```

Sources: [README.md L94-L112](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L94-L112)

 [docs/ecosystem.md L46-L63](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/ecosystem.md?plain=1#L46-L63)

## Contributing to the Ecosystem

DPlayer welcomes contributions to its ecosystem. Developers can create new tools, plugins, or integrations to extend DPlayer's functionality.

### How to Contribute

1. Develop your DPlayer extension, following the existing patterns in similar projects
2. Document your project thoroughly
3. Submit your project in the <FileRef file-url="[https://github.com/DIYgod/DPlayer/blob/f00e304c/\"Let](https://github.com/DIYgod/DPlayer/blob/f00e304c/%5C%22Let) me know!"" undefined  file-path=""Let me know!"">Hii issue on GitHub
4. Consider contributing to the core DPlayer repository if your extension could benefit from closer integration

```mermaid
flowchart TD

Idea["Project Idea"]
Development["Development"]
Documentation["Documentation"]
Submission["Submission to Ecosystem"]
Maintenance["Ongoing Maintenance"]

subgraph subGraph0 ["Contribution Workflow"]
    Idea
    Development
    Documentation
    Submission
    Maintenance
    Idea --> Development
    Development --> Documentation
    Documentation --> Submission
    Submission --> Maintenance
end
```

Sources: [README.md L61](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L61-L61)

 [docs/ecosystem.md L7](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/ecosystem.md?plain=1#L7-L7)

## Ecosystem Growth and Support

The DPlayer ecosystem continues to grow through community contributions. The diverse range of implementations across different languages, frameworks, and platforms demonstrates the flexibility and extensibility of DPlayer's design.

For developers looking to extend DPlayer or integrate it into their projects, the existing ecosystem provides valuable examples and patterns to follow. The variety of danmaku API implementations allows developers to choose the backend technology that best fits their technology stack.

Sources: [README.md L55-L58](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L55-L58)

 [docs/ecosystem.md L65-L69](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/ecosystem.md?plain=1#L65-L69)