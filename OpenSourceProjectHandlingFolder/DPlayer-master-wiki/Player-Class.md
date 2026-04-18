# Player Class

> **Relevant source files**
> * [dist/DPlayer.min.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/dist/DPlayer.min.js)
> * [dist/DPlayer.min.js.map](https://github.com/DIYgod/DPlayer/blob/f00e304c/dist/DPlayer.min.js.map)
> * [src/js/controller.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/controller.js)
> * [src/js/options.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/options.js)
> * [src/js/player.js](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js)

The Player Class (`DPlayer`) is the central component of the DPlayer video player system. It serves as the main entry point for applications integrating the player and coordinates all aspects of video playback, user interface interactions, and feature extensions.

## Purpose and Scope

This document describes the `DPlayer` class implementation, including its initialization process, core methods, properties, and interactions with other components. For information about the Controller System which manages user interactions with the player, see [Controller System](/DIYgod/DPlayer/2.3-controller-system).

## Class Overview

The `DPlayer` class acts as the orchestrator for the entire player system, coordinating between various components to provide a complete video player experience.

```

```

Sources: [src/js/player.js L28-L714](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L28-L714)

## Initialization Process

When a new instance of `DPlayer` is created, it performs the following initialization steps:

1. Processes and validates the provided options
2. Sets up the container element and adds necessary CSS classes
3. Creates the Template for UI rendering
4. Initializes core components (Controller, Bar, Bezel, etc.)
5. Sets up event listeners
6. Initializes the video element and media playback systems

```

```

Sources: [src/js/player.js L35-L189](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L35-L189)

### Constructor Parameters

The constructor accepts a single `options` parameter which is an object that configures all aspects of the player:

```
constructor(options) {    this.options = handleOption({ preload: options.video.type === 'webtorrent' ? 'none' : 'metadata', ...options });    // Initialization continues...}
```

The options are processed by the `handleOption` function which merges them with default values.

Sources: [src/js/player.js L35-L189](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L35-L189)

 [src/js/options.js L4-L71](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/options.js#L4-L71)

## Core Properties

The `DPlayer` instance maintains several important properties:

| Property | Type | Description |
| --- | --- | --- |
| `options` | Object | Processed configuration options |
| `events` | Events | Event management system |
| `user` | User | User settings manager |
| `container` | HTMLElement | DOM container for the player |
| `template` | Template | UI template object |
| `video` | HTMLVideoElement | The main video element |
| `controller` | Controller | Controls user interface |
| `danmaku` | Danmaku | Manages danmaku (comments) system |
| `fullScreen` | FullScreen | Handles fullscreen functionality |
| `paused` | Boolean | Current playback state |
| `plugins` | Object | Holds plugin instances (hls, flv, etc.) |

Sources: [src/js/player.js L35-L189](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L35-L189)

## Core Methods

### Playback Control

```

```

#### play()

Starts video playback. If called programmatically, it will attempt to call the native `video.play()` and handle any autoplay restrictions gracefully.

```javascript
play(fromNative) {    this.paused = false;    // Update UI    if (!fromNative) {        const playedPromise = Promise.resolve(this.video.play());        playedPromise.catch(() => {            this.pause();        }).then(() => {});    }    // Additional setup...}
```

Sources: [src/js/player.js L218-L248](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L218-L248)

#### pause()

Pauses video playback.

```sql
pause(fromNative) {    this.paused = true;    // Update UI    if (!fromNative) {        this.video.pause();    }    // Additional cleanup...}
```

Sources: [src/js/player.js L253-L272](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L253-L272)

#### seek()

Seeks to a specific time in the video.

```sql
seek(time) {    time = Math.max(time, 0);    if (this.video.duration) {        time = Math.min(time, this.video.duration);    }    // Show notice to user    this.video.currentTime = time;    // Update UI and other components}
```

Sources: [src/js/player.js L194-L213](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L194-L213)

#### volume()

Controls the player volume.

```sql
volume(percentage, nostorage, nonotice) {    percentage = parseFloat(percentage);    if (!isNaN(percentage)) {        percentage = Math.max(percentage, 0);        percentage = Math.min(percentage, 1);        // Update UI        // Store user preference if nostorage is false        // Show notice if nonotice is false        this.video.volume = percentage;    }    return this.video.volume;}
```

Sources: [src/js/player.js L287-L310](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L287-L310)

### Media Source Extensions

The `DPlayer` class supports various media formats through Media Source Extensions (MSE):

```

```

The `initMSE` method initializes the appropriate media handler based on the video type:

```
initMSE(video, type) {    this.type = type;    if (this.options.video.customType && this.options.video.customType[type]) {        // Handle custom type    } else {        // Auto-detect or use specified type        // Initialize appropriate library (HLS.js, flv.js, dash.js, WebTorrent)    }}
```

Sources: [src/js/player.js L360-L484](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L360-L484)

### Event System

The `DPlayer` class uses an event system to communicate between components and expose events to external code:

```
on(name, callback) {    this.events.on(name, callback);}
```

This allows applications to listen for player events:

```javascript
const dp = new DPlayer({...});dp.on('play', () => {    console.log('Video started playing');});
```

Sources: [src/js/player.js L326-L328](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L326-L328)

### Quality Switching

The player supports switching between different quality levels for the same video:

```sql
switchQuality(index) {    index = typeof index === 'string' ? parseInt(index) : index;    if (this.qualityIndex === index || this.switchingQuality) {        return;    }    // Save current state    // Create new video element with new quality source    // Initialize new video    // Handle transition between qualities}
```

Sources: [src/js/player.js L572-L642](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L572-L642)

### Video Switching

The player can switch to an entirely new video:

```
switchVideo(video, danmakuAPI) {    this.pause();    this.video.poster = video.pic ? video.pic : '';    this.video.src = video.url;    this.initMSE(this.video, video.type || 'auto');    // Reset UI state    // Reload danmaku if provided}
```

Sources: [src/js/player.js L336-L358](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L336-L358)

## Component Interactions

The `DPlayer` class coordinates between multiple components to provide a complete player experience:

```

```

Sources: [src/js/player.js L35-L189](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L35-L189)

 [src/js/controller.js L9-L422](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/controller.js#L9-L422)

## Lifecycle Management

### Initialization

When the `DPlayer` instance is created, it:

1. Processes options
2. Sets up the DOM structure
3. Initializes all components
4. Sets up event listeners
5. Prepares the video element
6. Adds the instance to a global instances array

Sources: [src/js/player.js L35-L189](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L35-L189)

### Destruction

When the `destroy()` method is called, it:

1. Removes the instance from the global instances array
2. Pauses playback
3. Removes event listeners
4. Destroys all components
5. Clears the video source
6. Empties the container

```
destroy() {    instances.splice(instances.indexOf(this), 1);    this.pause();    document.removeEventListener('click', this.docClickFun, true);    this.container.removeEventListener('click', this.containerClickFun, true);    this.fullScreen.destroy();    this.hotkey.destroy();    this.contextmenu.destroy();    this.controller.destroy();    this.timer.destroy();    this.video.src = '';    this.container.innerHTML = '';    this.events.trigger('destroy');}
```

Sources: [src/js/player.js L695-L708](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L695-L708)

## Usage Patterns

The `DPlayer` class is typically used as follows:

1. Import the DPlayer class
2. Create a new instance with configuration options
3. Attach event listeners as needed
4. Control playback through the provided methods

```javascript
const dp = new DPlayer({    container: document.getElementById('player'),    video: {        url: 'video.mp4',        type: 'auto'    }}); dp.on('play', () => {    console.log('Video playing');}); document.getElementById('playButton').addEventListener('click', () => {    dp.play();});
```

## Mutex System

DPlayer includes a mutex system that ensures only one player plays at a time when multiple instances exist:

```javascript
if (this.options.mutex) {    for (let i = 0; i < instances.length; i++) {        if (this !== instances[i]) {            instances[i].pause();        }    }}
```

This is useful for pages with multiple video players where you want to automatically pause other videos when one starts playing.

Sources: [src/js/player.js L241-L247](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L241-L247)

## Plugin System

The DPlayer class includes a plugin system that allows integration with various media libraries:

* HLS.js for HLS streaming
* flv.js for FLV format
* dash.js for DASH streaming
* WebTorrent for peer-to-peer streaming

Each plugin is created when needed and stored in the `plugins` object, then destroyed when no longer needed.

Sources: [src/js/player.js L360-L484](https://github.com/DIYgod/DPlayer/blob/f00e304c/src/js/player.js#L360-L484)