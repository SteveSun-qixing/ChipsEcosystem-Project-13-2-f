# Features

> **Relevant source files**
> * [README.md](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1)
> * [docs/guide.md](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1)
> * [docs/zh/guide.md](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1)

This page provides a comprehensive overview of the key features available in DPlayer, a versatile HTML5 video player with robust danmaku (scrolling comments) capabilities. For information about the core architecture and initialization, see [Core Architecture](/DIYgod/DPlayer/2-core-architecture).

## Feature Overview

DPlayer offers a rich set of features that make it a powerful choice for web-based video playback. Below is a diagram showing the major feature components and how they relate to the DPlayer core:

```

```

Sources: [README.md L17-L37](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L17-L37)

## Media Format Support

DPlayer natively supports several video file formats:

| Format | Description |
| --- | --- |
| MP4 H.264 | Most widely supported video format across browsers |
| WebM | Open web video format, particularly efficient for web delivery |
| Ogg Theora Vorbis | Free and open video format |

Sources: [README.md L27-L30](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L27-L30)

## Streaming Format Support

DPlayer provides comprehensive support for modern streaming formats through Media Source Extensions (MSE) integration:

```

```

### HLS Support

Enables HTTP Live Streaming with the help of [hls.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/hls.js)

 You need to:

1. Load the hls.js library before DPlayer
2. Configure the player with the appropriate type:

```

```

### FLV Support

Provides Flash Video support through [flv.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/flv.js)

:

```

```

### MPEG DASH Support

Implements DASH (Dynamic Adaptive Streaming over HTTP) via [dash.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/dash.js)

 or [shaka-player](https://github.com/DIYgod/DPlayer/blob/f00e304c/shaka-player)

:

```

```

### WebTorrent Support

Allows P2P video streaming using [WebTorrent](https://github.com/DIYgod/DPlayer/blob/f00e304c/WebTorrent)

:

```

```

### Custom Streaming Types

DPlayer can be extended to work with any MSE library through the `customType` option:

```

```

Sources: [README.md L21-L26](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L21-L26)

 [docs/guide.md L446-L728](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L446-L728)

 [docs/zh/guide.md L434-L712](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L434-L712)

## Danmaku System

The danmaku system is one of DPlayer's signature features, allowing users to send comments that float across the video, creating an interactive viewing experience.

```

```

### Danmaku Configuration

The danmaku system has several configuration options:

| Option | Description | Default |
| --- | --- | --- |
| id | Unique identifier for the danmaku pool | *required* |
| api | Backend API for danmaku storage | *required* |
| token | Backend verification token | - |
| maximum | Maximum number of danmaku to display | - |
| addition | Additional danmaku sources (e.g., bilibili) | - |
| user | Username for sending danmaku | 'DIYgod' |
| bottom | Bottom margin to prevent overlapping with subtitles | - |
| unlimited | Display all danmaku even if they overlap | false |
| speedRate | Danmaku speed multiplier | 1 |

Example configuration:

```

```

### Danmaku API Methods

DPlayer provides several methods for interacting with danmaku:

* `dp.danmaku.send(danmaku, callback)`: Submit a new danmaku
* `dp.danmaku.draw(danmaku)`: Draw a new danmaku in real-time
* `dp.danmaku.opacity(percentage)`: Set danmaku opacity (0-1)
* `dp.danmaku.clear()`: Clear all danmaku
* `dp.danmaku.hide()`: Hide danmaku
* `dp.danmaku.show()`: Show danmaku

### Backend Integration

You can integrate DPlayer with various backend systems for danmaku storage:

1. Ready-made API: [https://api.prprpr.me/dplayer/](https://api.prprpr.me/dplayer/)
2. Self-hosted options: * [DPlayer-node](https://github.com/DIYgod/DPlayer/blob/f00e304c/DPlayer-node)  (Node.js) * [laravel-danmaku](https://github.com/DIYgod/DPlayer/blob/f00e304c/laravel-danmaku)  (PHP) * [RailsGun](https://github.com/DIYgod/DPlayer/blob/f00e304c/RailsGun)  (Ruby)
3. WebSocket for live danmaku

Sources: [README.md L32](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L32-L32)

 [docs/guide.md L415-L457](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L415-L457)

 [docs/zh/guide.md L399-L428](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L399-L428)

## Quality Switching

DPlayer supports quality switching, allowing users to select from multiple quality options for the same video.

```

```

To implement quality switching:

```

```

The player will generate a quality selection menu. You can also programmatically switch quality with `dp.switchQuality(index)`.

Sources: [README.md L35](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L35-L35)

 [docs/guide.md L371-L413](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L371-L413)

 [docs/zh/guide.md L355-L397](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L355-L397)

## Screenshot Feature

DPlayer allows users to take screenshots of the current video frame:

```

```

When enabled, a screenshot button appears in the player controls. Clicking it captures the current frame and downloads it as a PNG image. The player triggers a `screenshot` event when a screenshot is taken.

**Note**: Both the video and poster image must have CORS (Cross-Origin Resource Sharing) enabled for the screenshot feature to work properly.

Sources: [README.md L33](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L33-L33)

 [docs/guide.md L93-L94](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L93-L94)

 [docs/zh/guide.md L83-L84](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L83-L84)

## Hotkey Support

DPlayer includes built-in keyboard shortcuts for common actions:

| Key | Action |
| --- | --- |
| Space | Toggle play/pause |
| Arrow Left | Seek backward |
| Arrow Right | Seek forward |
| Arrow Up | Volume up |
| Arrow Down | Volume down |
| F | Toggle fullscreen |

This feature is enabled by default but can be disabled:

```

```

Sources: [README.md L34](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L34-L34)

 [docs/guide.md L96-L97](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L96-L97)

 [docs/zh/guide.md L84-L85](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L84-L85)

## Subtitle Support

DPlayer supports WebVTT subtitles:

```

```

Example configuration:

```

```

The player provides events for subtitle visibility changes (`subtitle_show`, `subtitle_hide`) and content changes (`subtitle_change`).

Sources: [README.md L37](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L37-L37)

 [docs/guide.md L111-L116](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L111-L116)

 [docs/zh/guide.md L101-L106](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L101-L106)

## Thumbnails

DPlayer supports video thumbnails that display when hovering over the progress bar:

```

```

The thumbnails feature requires a specially formatted image file containing multiple frames from the video. You can generate this file using the [DPlayer-thumbnails](https://github.com/DIYgod/DPlayer/blob/f00e304c/DPlayer-thumbnails)

 tool.

Sources: [README.md L36](https://github.com/DIYgod/DPlayer/blob/f00e304c/README.md?plain=1#L36-L36)

 [docs/guide.md L108](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L108-L108)

 [docs/zh/guide.md L98](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L98-L98)

## Additional Features

### Context Menu Customization

DPlayer allows customization of the right-click context menu:

```

```

Each menu item can have either a `link` property to navigate to a URL or a `click` property to execute a custom function.

Sources: [docs/guide.md L127](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L127-L127)

 [docs/zh/guide.md L117](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L117-L117)

### Progress Bar Highlights

You can add custom time markers to the progress bar:

```

```

These markers appear on the progress bar and display the specified text when hovered.

Sources: [docs/guide.md L128](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L128-L128)

 [docs/zh/guide.md L118](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L118-L118)

### Live Mode

DPlayer includes specialized support for live streams:

```

```

In live mode, the progress bar is hidden and the UI is adapted for live content. For live danmaku, you'll need to implement a WebSocket backend:

```

```

Sources: [docs/guide.md L730-L775](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L730-L775)

 [docs/zh/guide.md L714-L759](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L714-L759)

### Fullscreen Support

DPlayer provides two types of fullscreen:

1. Browser fullscreen (default)
2. Web fullscreen (within the page)

```

```

Sources: [docs/guide.md L294-L306](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L294-L306)

 [docs/zh/guide.md L280-L292](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L280-L292)

### Miscellaneous Features

* **Loop**: Enable with `loop: true` option
* **Volume Control**: Set default with `volume: 0.7` option and control programmatically with `dp.volume(value)`
* **Playback Speed**: Customize available speeds with `playbackSpeed: [0.5, 0.75, 1, 1.25, 1.5, 2]` and set programmatically with `dp.speed(rate)`
* **Notifications**: Display temporary messages with `dp.notice('Message', duration, opacity)`
* **Custom Logo**: Add a logo with `logo: 'logo.png'` option
* **Internationalization**: Set language with `lang: 'en'` (options: 'en', 'zh-cn', 'zh-tw')
* **Theme Customization**: Set theme color with `theme: '#b7daff'`
* **Mutex**: Prevent multiple players from playing simultaneously with `mutex: true`

Sources: [docs/guide.md L85-L129](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L85-L129)

 [docs/zh/guide.md L77-L119](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L77-L119)

## Feature Integration

The diagram below illustrates how these features integrate with the core DPlayer components:

```

```

Sources: System architecture diagrams from provided context

This overview covers the key features available in DPlayer. For more detailed information about the core architecture and implementation details, see [Core Architecture](/DIYgod/DPlayer/2-core-architecture).