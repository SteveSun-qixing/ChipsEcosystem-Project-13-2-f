# Danmaku System

> **Relevant source files**
> * [docs/guide.md](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1)
> * [docs/zh/guide.md](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1)
> * [src/js/api.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/api.js)
> * [src/js/comment.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/comment.js)
> * [src/js/danmaku.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js)
> * [src/js/i18n.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/i18n.js)

The Danmaku System provides scrolling comments (also known as "bullet comments" or "弾幕") that overlay on top of videos in DPlayer. This feature allows viewers to see comments synchronously with the video content, creating a shared viewing experience. This page documents the architecture, components, and usage of the danmaku system in DPlayer.

## Overview

DPlayer's danmaku system implements a fully-featured comment overlay with support for different display types (scrolling/top/bottom), color customization, opacity control, and API integration. The system synchronizes comments with video timestamps and manages positioning to avoid excessive overlapping.

```

```

Sources: [src/js/danmaku.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js)

 [src/js/api.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/api.js)

 [src/js/comment.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/comment.js)

## Architecture

The danmaku system consists of three main components:

1. **Danmaku Class**: Core class that handles loading, displaying, and managing danmaku comments
2. **API Backend**: Provides methods for sending and retrieving danmaku from servers
3. **Comment UI**: Manages the user interface for creating and sending danmaku

```

```

Sources: [src/js/danmaku.js L3-L357](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js#L3-L357)

 [src/js/api.js L3-L46](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/api.js#L3-L46)

 [src/js/comment.js L3-L97](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/comment.js#L3-L97)

## Configuration

The danmaku system is highly configurable through the DPlayer constructor options:

| Option | Default | Description |
| --- | --- | --- |
| danmaku.id | *required* | Unique identifier for danmaku pool |
| danmaku.api | *required* | API endpoint for danmaku |
| danmaku.token | - | Backend verification token |
| danmaku.maximum | - | Maximum number of danmaku to load |
| danmaku.addition | - | Additional danmaku sources (e.g., bilibili) |
| danmaku.user | 'DIYgod' | Username for danmaku author |
| danmaku.bottom | - | Distance from player bottom (e.g., '10%') |
| danmaku.unlimited | false | Display all danmaku even when overlapping |
| danmaku.speedRate | 1 | Speed multiplier for danmaku movement |

Example configuration:

```javascript
const dp = new DPlayer({    container: document.getElementById('dplayer'),    danmaku: {        id: '9E2E3368B56CDBB4',        api: 'https://api.prprpr.me/dplayer/',        token: 'tokendemo',        maximum: 1000,        addition: ['https://api.prprpr.me/dplayer/v3/bilibili?aid=4157142'],        user: 'DIYgod',        bottom: '15%',        unlimited: true,        speedRate: 0.5,    }});
```

Sources: [docs/guide.md L117-L126](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L117-L126)

 [docs/zh/guide.md L107-L116](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L107-L116)

## Danmaku Class Implementation

The `Danmaku` class is the core of the system, responsible for managing danmaku lifecycle:

```

```

Sources: [src/js/danmaku.js L24-L269](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js#L24-L269)

### Key Methods

1. **load()**: Loads danmaku from all configured endpoints * Handles both main API and additional sources (e.g., bilibili) * Merges and sorts danmaku by timestamp
2. **send()**: Sends a new danmaku * Submits to the API * Adds to local danmaku array * Draws it on screen immediately
3. **draw()**: Renders danmaku on screen * Creates DOM elements * Calculates positioning to avoid overlap * Sets animation properties based on type * Manages tunnels for scrolling danmaku
4. **frame()**: Animation loop for displaying danmaku * Checks current video timestamp * Shows danmaku that should appear at the current time * Uses requestAnimationFrame for smooth animation
5. **seek()**: Repositions danmaku when video position changes * Clears existing danmaku * Updates danmaku index to match current time

Sources: [src/js/danmaku.js L24-L45](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js#L24-L45)

 [src/js/danmaku.js L85-L115](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js#L85-L115)

 [src/js/danmaku.js L153-L268](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js#L153-L268)

 [src/js/danmaku.js L117-L130](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js#L117-L130)

 [src/js/danmaku.js L288-L297](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js#L288-L297)

## Danmaku Types

DPlayer supports three types of danmaku:

1. **Right/Rolling**: Scrolls horizontally from right to left (default)
2. **Top**: Fixed position at the top of video
3. **Bottom**: Fixed position at the bottom of video

```

```

The system assigns each danmaku to a "tunnel" - a horizontal lane that helps organize comments to minimize overlap. For scrolling danmaku, it also calculates timing to avoid collisions within the same tunnel.

Sources: [src/js/danmaku.js L153-L268](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js#L153-L268)

## API Backend

The `apiBackend` handles communication with danmaku servers:

### Default Implementation

* **read()**: Retrieves danmaku list from server * Makes GET request to API endpoint * Parses response data into danmaku format * Handles error cases
* **send()**: Submits new danmaku to server * Makes POST request with danmaku data * Includes token, user info, timestamp, text, color, type * Handles success/error callbacks

Sources: [src/js/api.js L3-L46](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/api.js#L3-L46)

### Custom API Integration

DPlayer allows custom API backends by overriding the default implementation:

```javascript
const dp = new DPlayer({    // ...    apiBackend: {        read: function (options) {            // Custom read implementation            options.success(danmakuData);        },        send: function (options) {            // Custom send implementation            options.success();        },    },});
```

This is particularly useful for implementing WebSocket-based danmaku for live streaming.

Sources: [docs/guide.md L749-L757](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L749-L757)

 [docs/zh/guide.md L733-L747](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L733-L747)

## Comment UI

The `Comment` class manages the user interface for sending danmaku:

1. **User Interface**: * Comment input box * Color selection * Type selection (top/bottom/right) * Send button
2. **Key Methods**: * **show()/hide()**: Toggle comment interface visibility * **showSetting()/hideSetting()**: Toggle settings panel * **send()**: Validate and send danmaku

```

```

Sources: [src/js/comment.js L3-L97](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/comment.js#L3-L97)

## Internationalization

The danmaku system includes full internationalization support for UI elements and notifications through the i18n module:

* Supports multiple languages (English, Chinese, Japanese, Korean, German, Russian)
* Translates key UI elements like input placeholders, type labels, and error messages

Sources: [src/js/i18n.js L71-L104](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/i18n.js#L71-L104)

 [src/js/i18n.js L116-L155](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/i18n.js#L116-L155)

## Public API

DPlayer exposes several methods for controlling the danmaku system:

| Method | Description |
| --- | --- |
| `dp.danmaku.send(danmaku, callback)` | Send a new danmaku |
| `dp.danmaku.draw(danmaku)` | Draw a danmaku without sending to server |
| `dp.danmaku.opacity(percentage)` | Set danmaku opacity (0-1) |
| `dp.danmaku.clear()` | Clear all danmaku |
| `dp.danmaku.hide()` | Hide danmaku |
| `dp.danmaku.show()` | Show danmaku |
| `dp.danmaku.unlimit(boolean)` | Toggle unlimited mode |
| `dp.danmaku.speed(rate)` | Set danmaku speed |

Example usage:

```javascript
// Send a new danmakudp.danmaku.send({    text: 'DPlayer is amazing',    color: '#fff',    type: 'right' // 'right', 'top', or 'bottom'}, function() {    console.log('Danmaku sent successfully');}); // Draw a danmaku instantly (e.g., for live scenarios)dp.danmaku.draw({    text: 'Live comment',    color: '#fff',    type: 'top'}); // Set opacity to 50%dp.danmaku.opacity(0.5);
```

Sources: [docs/guide.md L256-L292](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L256-L292)

 [docs/zh/guide.md L242-L279](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L242-L279)

## Events

The danmaku system triggers events that applications can listen for:

| Event | Description |
| --- | --- |
| `danmaku_show` | Triggered when danmaku is shown |
| `danmaku_hide` | Triggered when danmaku is hidden |
| `danmaku_clear` | Triggered when danmaku is cleared |
| `danmaku_loaded` | Triggered when danmaku is loaded |
| `danmaku_send` | Triggered when danmaku is sent |
| `danmaku_opacity` | Triggered when opacity changes |

Example:

```javascript
dp.on('danmaku_send', function(danmaku) {    console.log('Danmaku sent:', danmaku);});
```

Sources: [docs/guide.md L348-L354](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L348-L354)

 [docs/zh/guide.md L335-L341](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L335-L341)

## Live Danmaku Support

DPlayer supports live danmaku for streaming scenarios through custom API backends:

1. **Configuration**: * Set `live: true` in DPlayer options * Implement custom `apiBackend` for WebSocket communication
2. **Drawing Live Danmaku**: * Use `dp.danmaku.draw()` to display messages received from WebSocket

This approach allows real-time danmaku without the constraint of video timestamp synchronization.

Sources: [docs/guide.md L745-L775](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L745-L775)

 [docs/zh/guide.md L729-L759](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L729-L759)

## Performance Considerations

The danmaku system includes several optimizations for performance:

1. **Tunneling System**: Organizes danmaku into lanes to minimize redrawing
2. **Animation Timing**: Uses `requestAnimationFrame` for smooth performance
3. **DOM Recycling**: Removes danmaku elements after animation completes
4. **Canvas Measurement**: Uses canvas for text width measurement without DOM insertion

These optimizations help maintain performance even with high danmaku density.

Sources: [src/js/danmaku.js L168-L199](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js#L168-L199)

 [src/js/danmaku.js L127-L129](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js#L127-L129)

 [src/js/danmaku.js L222-L224](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js#L222-L224)

 [src/js/danmaku.js L279-L286](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/danmaku.js#L279-L286)

## Integration with External Systems

### bilibili Danmaku

DPlayer can import danmaku from bilibili:

```
danmaku: {    // ...    addition: ['https://api.prprpr.me/dplayer/v3/bilibili?aid=4157142']}
```

This loads danmaku from bilibili and merges it with the main danmaku pool.

### Server Implementation

For self-hosted danmaku servers, DPlayer recommends using [DPlayer-node](https://github.com/DIYgod/DPlayer/blob/f00e304c/DPlayer-node)

 which implements the expected API format.

Sources: [docs/guide.md L417-L444](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/guide.md?plain=1#L417-L444)

 [docs/zh/guide.md L401-L428](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/zh/guide.md?plain=1#L401-L428)