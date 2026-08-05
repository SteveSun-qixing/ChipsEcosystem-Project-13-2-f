# Layout

> **Relevant source files**
> * [index.html](https://github.com/viliusle/miniPaint/blob/6d0b95e5/index.html)
> * [manifest-disabled.json](https://github.com/viliusle/miniPaint/blob/6d0b95e5/manifest-disabled.json)
> * [src/css/layout.css](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/css/layout.css)
> * [src/js/core/base-gui.js](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js)

## Purpose and Scope

This document describes the overall UI layout system of miniPaint, explaining how the application interface is structured, organized, and rendered. It covers the grid-based layout, responsive design implementation, and how various UI components are positioned and interact with each other. For information about specific UI components like menus or tools panels, see [Menu System](/viliusle/miniPaint/3.2-menu-system) and [Tools Panel](/viliusle/miniPaint/3.3-tools-panel).

## Overall Layout Structure

miniPaint uses a CSS grid-based layout system to organize its interface into distinct functional areas. The application UI is divided into several main regions: a top menu bar, a submenu area, left sidebar (tools), main canvas area, and right sidebar (layers, colors, etc.).

### Main Layout Grid

```mermaid
flowchart TD

mermaid-nlh44bkfkwd-flowchart-wrapper["wrapper (Main Container)"]
mermaid-nlh44bkfkwd-flowchart-submenu["submenu (Top Controls)"]
mermaid-nlh44bkfkwd-flowchart-sidebar_left["sidebar_left (Tools)"]
mermaid-nlh44bkfkwd-flowchart-middle_area["middle_area (Canvas)"]
mermaid-nlh44bkfkwd-flowchart-sidebar_right["sidebar_right (Panels)"]

subgraph mermaid-nlh44bkfkwd-subGraph0 ["Layout Grid Structure"]
    mermaid-nlh44bkfkwd-flowchart-wrapper
    mermaid-nlh44bkfkwd-flowchart-submenu
    mermaid-nlh44bkfkwd-flowchart-sidebar_left
    mermaid-nlh44bkfkwd-flowchart-middle_area
    mermaid-nlh44bkfkwd-flowchart-sidebar_right
end
```

Sources: [index.html L33-L92](https://github.com/viliusle/miniPaint/blob/6d0b95e5/index.html#L33-L92)

 [src/css/layout.css L1-L20](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/css/layout.css#L1-L20)

The layout is defined as a CSS grid with the following template areas:

* `submenu`: Spans across the top, containing logo and tool attributes
* `sidebar_left`: Left side, containing tool buttons
* `main`: Middle area, containing the canvas
* `sidebar_right`: Right side, containing layers, colors, and information panels

### HTML Structure

The basic HTML structure that implements this layout is:

```mermaid
flowchart TD

mermaid-lsqo5h09h2b-flowchart-body["body"]
mermaid-lsqo5h09h2b-flowchart-wrapper["div.wrapper"]
mermaid-lsqo5h09h2b-flowchart-menu["nav.main_menu"]
mermaid-lsqo5h09h2b-flowchart-submenu["div.submenu"]
mermaid-lsqo5h09h2b-flowchart-tools["div.sidebar_left"]
mermaid-lsqo5h09h2b-flowchart-middle["div.middle_area"]
mermaid-lsqo5h09h2b-flowchart-right["div.sidebar_right"]
mermaid-lsqo5h09h2b-flowchart-mobile["div.mobile_menu"]
mermaid-lsqo5h09h2b-flowchart-popups["div#popups"]
mermaid-lsqo5h09h2b-flowchart-canvas_wrapper["div.canvas_wrapper"]
mermaid-lsqo5h09h2b-flowchart-canvas["canvas#canvas_minipaint"]
mermaid-lsqo5h09h2b-flowchart-preview["div.preview"]
mermaid-lsqo5h09h2b-flowchart-colors["div.colors"]
mermaid-lsqo5h09h2b-flowchart-info["div.block#info_base"]
mermaid-lsqo5h09h2b-flowchart-details["div.details"]
mermaid-lsqo5h09h2b-flowchart-layers["div.layers"]

subgraph mermaid-lsqo5h09h2b-subGraph0 ["HTML Component Structure"]
    mermaid-lsqo5h09h2b-flowchart-body
    mermaid-lsqo5h09h2b-flowchart-wrapper
    mermaid-lsqo5h09h2b-flowchart-menu
    mermaid-lsqo5h09h2b-flowchart-submenu
    mermaid-lsqo5h09h2b-flowchart-tools
    mermaid-lsqo5h09h2b-flowchart-middle
    mermaid-lsqo5h09h2b-flowchart-right
    mermaid-lsqo5h09h2b-flowchart-mobile
    mermaid-lsqo5h09h2b-flowchart-popups
    mermaid-lsqo5h09h2b-flowchart-canvas_wrapper
    mermaid-lsqo5h09h2b-flowchart-canvas
    mermaid-lsqo5h09h2b-flowchart-preview
    mermaid-lsqo5h09h2b-flowchart-colors
    mermaid-lsqo5h09h2b-flowchart-info
    mermaid-lsqo5h09h2b-flowchart-details
    mermaid-lsqo5h09h2b-flowchart-layers
end
```

Sources: [index.html L32-L103](https://github.com/viliusle/miniPaint/blob/6d0b95e5/index.html#L32-L103)

## Component Details

### Left Sidebar (Tools)

The left sidebar contains tool buttons arranged in a vertical panel. Each tool is represented by an icon button with a specific class that determines its appearance.

Key characteristics:

* Fixed width (40px by default)
* Scrollable when tools exceed the available height
* Each tool is 30x25px with specific icon styling

```mermaid
flowchart TD

mermaid-tef4nm0qlml-flowchart-tools["sidebar_left"]
mermaid-tef4nm0qlml-flowchart-select["item.select"]
mermaid-tef4nm0qlml-flowchart-brush["item.brush"]
mermaid-tef4nm0qlml-flowchart-pencil["item.pencil"]
mermaid-tef4nm0qlml-flowchart-shapes["item.shape"]
mermaid-tef4nm0qlml-flowchart-text["item.text"]
mermaid-tef4nm0qlml-flowchart-other["...other tools"]

subgraph mermaid-tef4nm0qlml-subGraph0 ["Left Sidebar Structure"]
    mermaid-tef4nm0qlml-flowchart-tools
    mermaid-tef4nm0qlml-flowchart-select
    mermaid-tef4nm0qlml-flowchart-brush
    mermaid-tef4nm0qlml-flowchart-pencil
    mermaid-tef4nm0qlml-flowchart-shapes
    mermaid-tef4nm0qlml-flowchart-text
    mermaid-tef4nm0qlml-flowchart-other
end
```

Sources: [src/css/layout.css L252-L329](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/css/layout.css#L252-L329)

 [index.html L45](https://github.com/viliusle/miniPaint/blob/6d0b95e5/index.html#L45-L45)

### Right Sidebar (Panels)

The right sidebar contains multiple expandable panels for various functions:

* Preview panel: Shows a thumbnail of the entire canvas
* Colors panel: For color selection
* Information panel: Displays image statistics
* Layer details panel: Shows details of the selected layer
* Layers panel: For managing layers

Each panel can be expanded or collapsed using a toggle header.

```mermaid
flowchart TD

mermaid-or9fhfuogjc-flowchart-sidebar["sidebar_right"]
mermaid-or9fhfuogjc-flowchart-preview["div.preview.block"]
mermaid-or9fhfuogjc-flowchart-colors["div.colors.block"]
mermaid-or9fhfuogjc-flowchart-info["div.block#info_base"]
mermaid-or9fhfuogjc-flowchart-details["div.details.block"]
mermaid-or9fhfuogjc-flowchart-layers["div.layers.block"]
mermaid-or9fhfuogjc-flowchart-preview_toggle["h2.toggle"]
mermaid-or9fhfuogjc-flowchart-preview_content["div#toggle_preview"]
mermaid-or9fhfuogjc-flowchart-layers_title["h2.trn"]
mermaid-or9fhfuogjc-flowchart-layers_content["div#layers_base"]

subgraph mermaid-or9fhfuogjc-subGraph0 ["Right Sidebar Structure"]
    mermaid-or9fhfuogjc-flowchart-sidebar
    mermaid-or9fhfuogjc-flowchart-preview
    mermaid-or9fhfuogjc-flowchart-colors
    mermaid-or9fhfuogjc-flowchart-info
    mermaid-or9fhfuogjc-flowchart-details
    mermaid-or9fhfuogjc-flowchart-layers
    mermaid-or9fhfuogjc-flowchart-preview_toggle
    mermaid-or9fhfuogjc-flowchart-preview_content
    mermaid-or9fhfuogjc-flowchart-layers_title
    mermaid-or9fhfuogjc-flowchart-layers_content
end
```

Sources: [index.html L66-L91](https://github.com/viliusle/miniPaint/blob/6d0b95e5/index.html#L66-L91)

 [src/css/layout.css L333-L348](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/css/layout.css#L333-L348)

### Canvas Area

The central canvas area contains:

* Rulers (optional)
* Main canvas wrapper
* Transparent grid background
* The actual canvas element

```mermaid
flowchart TD

mermaid-jctq0c2wnr-flowchart-middle["middle_area"]
mermaid-jctq0c2wnr-flowchart-ruler_left["canvas.ruler_left"]
mermaid-jctq0c2wnr-flowchart-ruler_top["canvas.ruler_top"]
mermaid-jctq0c2wnr-flowchart-wrapper["div.main_wrapper"]
mermaid-jctq0c2wnr-flowchart-canvas_wrapper["div.canvas_wrapper"]
mermaid-jctq0c2wnr-flowchart-mouse["div#mouse"]
mermaid-jctq0c2wnr-flowchart-background["div.transparent-grid"]
mermaid-jctq0c2wnr-flowchart-canvas["canvas#canvas_minipaint"]

subgraph mermaid-jctq0c2wnr-subGraph0 ["Canvas Area Structure"]
    mermaid-jctq0c2wnr-flowchart-middle
    mermaid-jctq0c2wnr-flowchart-ruler_left
    mermaid-jctq0c2wnr-flowchart-ruler_top
    mermaid-jctq0c2wnr-flowchart-wrapper
    mermaid-jctq0c2wnr-flowchart-canvas_wrapper
    mermaid-jctq0c2wnr-flowchart-mouse
    mermaid-jctq0c2wnr-flowchart-background
    mermaid-jctq0c2wnr-flowchart-canvas
end
```

Sources: [index.html L48-L64](https://github.com/viliusle/miniPaint/blob/6d0b95e5/index.html#L48-L64)

 [src/css/layout.css L613-L735](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/css/layout.css#L613-L735)

## Responsive Design Implementation

miniPaint implements responsive design to adapt to different screen sizes, particularly focusing on mobile devices.

### Desktop vs Mobile Layout

```mermaid
flowchart TD

mermaid-g2dfxhf4xa-flowchart-layout["Layout"]
mermaid-g2dfxhf4xa-flowchart-desktop["Desktop Layout"]
mermaid-g2dfxhf4xa-flowchart-mobile["Mobile Layout"]
mermaid-g2dfxhf4xa-flowchart-visible_sidebars["Always Visible Sidebars"]
mermaid-g2dfxhf4xa-flowchart-hidden_sidebars["Hidden Sidebars with Toggle"]
mermaid-g2dfxhf4xa-flowchart-mobile_buttons["Mobile Menu Buttons"]
mermaid-g2dfxhf4xa-flowchart-undo_visible["Visible Undo Button"]

subgraph mermaid-g2dfxhf4xa-subGraph0 ["Responsive Layout Flow"]
    mermaid-g2dfxhf4xa-flowchart-layout
    mermaid-g2dfxhf4xa-flowchart-desktop
    mermaid-g2dfxhf4xa-flowchart-mobile
    mermaid-g2dfxhf4xa-flowchart-visible_sidebars
    mermaid-g2dfxhf4xa-flowchart-hidden_sidebars
    mermaid-g2dfxhf4xa-flowchart-mobile_buttons
    mermaid-g2dfxhf4xa-flowchart-undo_visible
end
```

Sources: [src/css/layout.css L193-L197](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/css/layout.css#L193-L197)

 [src/css/layout.css L582-L610](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/css/layout.css#L582-L610)

Key responsive features include:

1. Sidebars become hidden off-screen on mobile devices (width ≤ 700px)
2. Toggle buttons appear to show/hide sidebars
3. Canvas area adjusts to available space
4. Undo button becomes visible on smaller screens

### Media Queries

The layout uses several media queries to adapt to different screen sizes:

1. Mobile devices (max-width: 700px): * Moves sidebars off-screen * Adds slide-out behavior * Shows mobile menu buttons
2. Smaller height screens (max-height: 690px): * Adjusts left sidebar width to 75px
3. Very small screens (max-height: 450px): * Further adjusts left sidebar width to 88px

Sources: [src/css/layout.css L582-L610](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/css/layout.css#L582-L610)

 [src/css/layout.css L731-L745](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/css/layout.css#L731-L745)

## Canvas Sizing and Positioning

The canvas element is dynamically sized based on:

1. The actual document dimensions (WIDTH and HEIGHT in config)
2. The current zoom level
3. The available viewport size

```mermaid
flowchart TD

mermaid-ey0rcbdubyc-flowchart-start["Initialize Canvas"]
mermaid-ey0rcbdubyc-flowchart-get_wrapper["Get Main Wrapper Dimensions"]
mermaid-ey0rcbdubyc-flowchart-calc_size["Calculate Canvas Size Based on:<br>        - Document size<br>        - Zoom level<br>        - Available space"]
mermaid-ey0rcbdubyc-flowchart-set_size["Set Canvas width/height"]
mermaid-ey0rcbdubyc-flowchart-update_wrapper["Update Canvas Wrapper Size"]

subgraph mermaid-ey0rcbdubyc-subGraph0 ["Canvas Sizing Logic"]
    mermaid-ey0rcbdubyc-flowchart-start
    mermaid-ey0rcbdubyc-flowchart-get_wrapper
    mermaid-ey0rcbdubyc-flowchart-calc_size
    mermaid-ey0rcbdubyc-flowchart-set_size
    mermaid-ey0rcbdubyc-flowchart-update_wrapper
end
```

Sources: [src/js/core/base-gui.js L239-L270](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L239-L270)

The `prepare_canvas()` method in Base_gui_class handles this sizing logic, ensuring that:

1. The canvas doesn't exceed the available viewport
2. The proper scaling is applied based on zoom
3. The wrapper dimensions match the canvas size

## Panel Toggling System

miniPaint implements a panel toggling system that allows users to show/hide panels in the interface.

```mermaid
flowchart TD

mermaid-9nq2fts5pc7-flowchart-toggle["Toggle Button Click"]
mermaid-9nq2fts5pc7-flowchart-toggle_class["Toggle 'toggled' Class on Button"]
mermaid-9nq2fts5pc7-flowchart-toggle_panel["Toggle 'hidden' Class on Target Panel"]
mermaid-9nq2fts5pc7-flowchart-save_state["Save State to Cookie"]
mermaid-9nq2fts5pc7-flowchart-load["Page Load"]
mermaid-9nq2fts5pc7-flowchart-read_cookie["Read State from Cookie"]
mermaid-9nq2fts5pc7-flowchart-apply_state["Apply Saved State"]

subgraph mermaid-9nq2fts5pc7-subGraph0 ["Panel Toggle System"]
    mermaid-9nq2fts5pc7-flowchart-toggle
    mermaid-9nq2fts5pc7-flowchart-toggle_class
    mermaid-9nq2fts5pc7-flowchart-toggle_panel
    mermaid-9nq2fts5pc7-flowchart-save_state
    mermaid-9nq2fts5pc7-flowchart-load
    mermaid-9nq2fts5pc7-flowchart-read_cookie
    mermaid-9nq2fts5pc7-flowchart-apply_state
end
```

Sources: [src/js/core/base-gui.js L187-L201](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L187-L201)

 [src/js/core/base-gui.js L272-L284](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L272-L284)

Key features:

* Toggle buttons are identified by class `.toggle`
* Target panel ID is specified in `data-target` attribute
* Panel state (expanded/collapsed) is saved in cookies
* States are restored when the application loads

## Mobile Menu System

On mobile devices, the sidebars are hidden by default and can be toggled with dedicated buttons.

```mermaid
flowchart TD

mermaid-comt69iic8v-flowchart-left_button["Left Mobile Menu Button"]
mermaid-comt69iic8v-flowchart-toggle_left["Toggle .active Class on .sidebar_left"]
mermaid-comt69iic8v-flowchart-right_button["Right Mobile Menu Button"]
mermaid-comt69iic8v-flowchart-toggle_right["Toggle .active Class on .sidebar_right"]
mermaid-comt69iic8v-flowchart-show_hide_left["Show/Hide Left Sidebar"]
mermaid-comt69iic8v-flowchart-show_hide_right["Show/Hide Right Sidebar"]

subgraph mermaid-comt69iic8v-subGraph0 ["Mobile Menu System"]
    mermaid-comt69iic8v-flowchart-left_button
    mermaid-comt69iic8v-flowchart-toggle_left
    mermaid-comt69iic8v-flowchart-right_button
    mermaid-comt69iic8v-flowchart-toggle_right
    mermaid-comt69iic8v-flowchart-show_hide_left
    mermaid-comt69iic8v-flowchart-show_hide_right
end
```

Sources: [src/js/core/base-gui.js L203-L208](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L203-L208)

 [index.html L93-L100](https://github.com/viliusle/miniPaint/blob/6d0b95e5/index.html#L93-L100)

 [src/css/layout.css L582-L610](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/css/layout.css#L582-L610)

## Layout Initialization Process

When the application starts, the layout is initialized through the following process:

```mermaid
sequenceDiagram
  participant Application
  participant Base_gui_class
  participant DOM Elements

  Application->>Base_gui_class: init()
  Base_gui_class->>Base_gui_class: load_modules()
  Base_gui_class->>Base_gui_class: load_default_values()
  Base_gui_class->>Base_gui_class: render_main_gui()
  Base_gui_class->>Base_gui_class: autodetect_dimensions()
  Base_gui_class->>Base_gui_class: change_theme()
  Base_gui_class->>Base_gui_class: prepare_canvas()
  Base_gui_class->>DOM Elements: render_main_tools()
  Base_gui_class->>DOM Elements: render_main_preview()
  Base_gui_class->>DOM Elements: render_main_colors()
  Base_gui_class->>DOM Elements: render_main_layers()
  Base_gui_class->>DOM Elements: render_main_information()
  Base_gui_class->>DOM Elements: render_main_details()
  Base_gui_class->>DOM Elements: render_main_menu()
  Base_gui_class->>Base_gui_class: load_saved_changes()
  Base_gui_class->>Base_gui_class: set_events()
  Base_gui_class->>Base_gui_class: load_translations()
  Application->>DOM Elements: Window resize event
  DOM Elements->>Base_gui_class: prepare_canvas()
```

Sources: [src/js/core/base-gui.js L72-L152](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L72-L152)

 [src/js/core/base-gui.js L209-L214](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L209-L214)

## Theme Support

The layout supports multiple themes with a class-based theming system. The theme affects colors and styles throughout the interface.

```mermaid
flowchart TD

mermaid-4ony3x3513g-flowchart-theme_change["change_theme() Method"]
mermaid-4ony3x3513g-flowchart-get_cookie["Get Theme from Cookie"]
mermaid-4ony3x3513g-flowchart-choose_cookie["Use Cookie Value"]
mermaid-4ony3x3513g-flowchart-get_setting["Get Default from Settings"]
mermaid-4ony3x3513g-flowchart-remove_old["Remove Old Theme Classes"]
mermaid-4ony3x3513g-flowchart-add_new["Add New Theme Class to Body"]

subgraph mermaid-4ony3x3513g-subGraph0 ["Theme System"]
    mermaid-4ony3x3513g-flowchart-theme_change
    mermaid-4ony3x3513g-flowchart-get_cookie
    mermaid-4ony3x3513g-flowchart-choose_cookie
    mermaid-4ony3x3513g-flowchart-get_setting
    mermaid-4ony3x3513g-flowchart-remove_old
    mermaid-4ony3x3513g-flowchart-add_new
end
```

Sources: [src/js/core/base-gui.js L474-L490](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L474-L490)

Themes are applied by adding a class to the `body` element, which then cascades to affect all themed elements through CSS variables.

## Conclusion

miniPaint's layout system is designed to be responsive, flexible, and user-friendly across different device sizes. The grid-based structure provides a clear separation of components while maintaining a cohesive interface. The toggle system allows users to customize their workspace by showing only the panels they need.

The responsive design ensures that the application remains usable on mobile devices through an adaptive layout that changes based on the available screen space. The central canvas area dynamically adjusts to make the most of the available space while maintaining the proper aspect ratio and scaling based on zoom level.

By understanding this layout system, developers can effectively modify, extend, or debug the miniPaint interface while maintaining its responsive and user-friendly design.