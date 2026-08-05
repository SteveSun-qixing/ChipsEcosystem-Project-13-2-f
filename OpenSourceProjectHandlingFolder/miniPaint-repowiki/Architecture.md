# Architecture

> **Relevant source files**
> * [dist/bundle.js](https://github.com/viliusle/miniPaint/blob/6d0b95e5/dist/bundle.js)
> * [dist/bundle.js.LICENSE.txt](https://github.com/viliusle/miniPaint/blob/6d0b95e5/dist/bundle.js.LICENSE.txt)
> * [dist/bundle.js.map](https://github.com/viliusle/miniPaint/blob/6d0b95e5/dist/bundle.js.map)
> * [images/test-collection.json](https://github.com/viliusle/miniPaint/blob/6d0b95e5/images/test-collection.json)
> * [manifest-disabled.json](https://github.com/viliusle/miniPaint/blob/6d0b95e5/manifest-disabled.json)
> * [package-lock.json](https://github.com/viliusle/miniPaint/blob/6d0b95e5/package-lock.json)
> * [package.json](https://github.com/viliusle/miniPaint/blob/6d0b95e5/package.json)
> * [src/css/layout.css](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/css/layout.css)
> * [src/js/config-menu.js](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/config-menu.js)
> * [src/js/config.js](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/config.js)
> * [src/js/core/base-gui.js](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js)
> * [src/js/core/base-layers.js](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js)
> * [src/js/core/gui/gui-preview.js](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/gui/gui-preview.js)
> * [src/js/modules/file/open.js](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/modules/file/open.js)
> * [src/js/modules/image/palette.js](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/modules/image/palette.js)
> * [src/js/tools/pick_color.js](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/tools/pick_color.js)
> * [src/js/tools/shapes/bezier_curve.js](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/tools/shapes/bezier_curve.js)
> * [src/js/tools/shapes/polygon.js](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/tools/shapes/polygon.js)
> * [webpack.config.js](https://github.com/viliusle/miniPaint/blob/6d0b95e5/webpack.config.js)

This document describes the high-level architecture of miniPaint, explaining the core components and their interactions. It provides developers with a technical understanding of how the image editing system is designed and how data flows through the application.

## Core Architectural Components

miniPaint follows a component-based architecture built around a central configuration object. The system consists of several key components, each with specific responsibilities.

```mermaid
flowchart TD

mermaid-z34jync5cdd-flowchart-config["config.js (Central Configuration)"]
mermaid-z34jync5cdd-flowchart-BaseLayer["Base_layers_class (Layer Management)"]
mermaid-z34jync5cdd-flowchart-BaseGUI["Base_gui_class (UI Management)"]
mermaid-z34jync5cdd-flowchart-BaseTools["Base_tools_class (Tool Framework)"]
mermaid-z34jync5cdd-flowchart-BaseSelection["Base_selection_class (Selection Framework)"]
mermaid-z34jync5cdd-flowchart-State["app.State (Action System)"]
mermaid-z34jync5cdd-flowchart-GUIPreview["GUI_preview_class"]
mermaid-z34jync5cdd-flowchart-GUITools["GUI_tools_class"]
mermaid-z34jync5cdd-flowchart-GUILayers["GUI_layers_class"]
mermaid-z34jync5cdd-flowchart-GUIColors["GUI_colors_class"]
mermaid-z34jync5cdd-flowchart-GUIMenu["GUI_menu_class"]
mermaid-z34jync5cdd-flowchart-GUIDetails["GUI_details_class"]
mermaid-z34jync5cdd-flowchart-DrawingTools["Drawing Tools (brush, pencil, etc.)"]
mermaid-z34jync5cdd-flowchart-SelectionTools["Selection/Crop Tools"]
mermaid-z34jync5cdd-flowchart-ShapeTools["Shape Tools"]
mermaid-z34jync5cdd-flowchart-EffectTools["Effects & Filters"]

subgraph mermaid-z34jync5cdd-Tools ["Tools"]
    mermaid-z34jync5cdd-flowchart-DrawingTools
    mermaid-z34jync5cdd-flowchart-SelectionTools
    mermaid-z34jync5cdd-flowchart-ShapeTools
    mermaid-z34jync5cdd-flowchart-EffectTools
end

subgraph mermaid-z34jync5cdd-subGraph2 ["GUI Components"]
    mermaid-z34jync5cdd-flowchart-GUIPreview
    mermaid-z34jync5cdd-flowchart-GUITools
    mermaid-z34jync5cdd-flowchart-GUILayers
    mermaid-z34jync5cdd-flowchart-GUIColors
    mermaid-z34jync5cdd-flowchart-GUIMenu
    mermaid-z34jync5cdd-flowchart-GUIDetails
end

subgraph mermaid-z34jync5cdd-subGraph1 ["Core Systems"]
    mermaid-z34jync5cdd-flowchart-BaseLayer
    mermaid-z34jync5cdd-flowchart-BaseGUI
    mermaid-z34jync5cdd-flowchart-BaseTools
    mermaid-z34jync5cdd-flowchart-BaseSelection
    mermaid-z34jync5cdd-flowchart-State
end

subgraph mermaid-z34jync5cdd-subGraph0 ["Central State"]
    mermaid-z34jync5cdd-flowchart-config
end
```

Sources: [src/js/config.js L1-L512](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/config.js#L1-L512)

 [src/js/core/base-layers.js L1-L36](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L1-L36)

 [src/js/core/base-gui.js L1-L26](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L1-L26)

### Configuration System

The heart of miniPaint is the centralized configuration system in `config.js`. It serves as a shared state repository for the entire application, managing everything from canvas dimensions to active tools and layers.

Key properties in the configuration object include:

* `WIDTH` and `HEIGHT`: Canvas dimensions
* `ZOOM`: Current zoom level
* `layers`: Array of all image layers
* `layer`: Currently active layer
* `TOOL`: Currently active tool
* `need_render`: Flag indicating whether rendering is needed

All components access this central configuration to maintain a consistent application state.

```mermaid
flowchart TD

mermaid-jqjb1iamo9-flowchart-settings["Application Settings<br>(WIDTH, HEIGHT, ZOOM, etc.)"]
mermaid-jqjb1iamo9-flowchart-layers["Layers Array"]
mermaid-jqjb1iamo9-flowchart-activeLayer["Active Layer (layer)"]
mermaid-jqjb1iamo9-flowchart-activeTool["Active Tool (TOOL)"]
mermaid-jqjb1iamo9-flowchart-renderFlags["Render Flags<br>(need_render, need_render_changed_params)"]
mermaid-jqjb1iamo9-flowchart-Core["Core Systems"]

subgraph mermaid-jqjb1iamo9-subGraph0 ["Configuration Object (config.js)"]
    mermaid-jqjb1iamo9-flowchart-settings
    mermaid-jqjb1iamo9-flowchart-layers
    mermaid-jqjb1iamo9-flowchart-activeLayer
    mermaid-jqjb1iamo9-flowchart-activeTool
    mermaid-jqjb1iamo9-flowchart-renderFlags
end
```

Sources: [src/js/config.js L1-L33](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/config.js#L1-L33)

 [src/js/app.js L7-L10](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/app.js#L7-L10)

### Layer Management System

The layer management system, implemented in `Base_layers_class`, is responsible for managing and rendering layers to the canvas. It's a singleton class that handles layer creation, deletion, modification, and rendering.

```mermaid
flowchart TD

mermaid-6hlzqwy80d7-flowchart-render["render()"]
mermaid-6hlzqwy80d7-flowchart-layerOps["Layer Operations<br>(insert, delete, select, move)"]
mermaid-6hlzqwy80d7-flowchart-renderObjects["render_objects()"]
mermaid-6hlzqwy80d7-flowchart-renderObject["render_object()"]
mermaid-6hlzqwy80d7-flowchart-layer["Layer Object"]
mermaid-6hlzqwy80d7-flowchart-id["id: Unique identifier"]
mermaid-6hlzqwy80d7-flowchart-name["name: Display name"]
mermaid-6hlzqwy80d7-flowchart-type["type: Layer type<br>(image, text, shape)"]
mermaid-6hlzqwy80d7-flowchart-data["data: Layer content"]
mermaid-6hlzqwy80d7-flowchart-visible["visible: Visibility flag"]
mermaid-6hlzqwy80d7-flowchart-opacity["opacity: Layer opacity (0-100)"]
mermaid-6hlzqwy80d7-flowchart-order["order: Rendering order"]
mermaid-6hlzqwy80d7-flowchart-filters["filters: Applied effects"]
mermaid-6hlzqwy80d7-flowchart-renderFunction["render_function: Rendering method"]

subgraph mermaid-6hlzqwy80d7-subGraph1 ["Layer Structure"]
    mermaid-6hlzqwy80d7-flowchart-layer
    mermaid-6hlzqwy80d7-flowchart-id
    mermaid-6hlzqwy80d7-flowchart-name
    mermaid-6hlzqwy80d7-flowchart-type
    mermaid-6hlzqwy80d7-flowchart-data
    mermaid-6hlzqwy80d7-flowchart-visible
    mermaid-6hlzqwy80d7-flowchart-opacity
    mermaid-6hlzqwy80d7-flowchart-order
    mermaid-6hlzqwy80d7-flowchart-filters
    mermaid-6hlzqwy80d7-flowchart-renderFunction
end

subgraph mermaid-6hlzqwy80d7-subGraph0 ["Layer Management (Base_layers_class)"]
    mermaid-6hlzqwy80d7-flowchart-render
    mermaid-6hlzqwy80d7-flowchart-layerOps
    mermaid-6hlzqwy80d7-flowchart-renderObjects
    mermaid-6hlzqwy80d7-flowchart-renderObject
end
```

Sources: [src/js/core/base-layers.js L19-L44](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L19-L44)

 [src/js/core/base-layers.js L127-L214](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L127-L214)

 [src/js/core/base-layers.js L370-L411](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L370-L411)

The rendering process follows these steps:

1. Check if rendering is needed (`config.need_render`)
2. Prepare the canvas with `pre_render()`
3. Get sorted layers with `get_sorted_layers()`
4. Render each visible layer with `render_objects()`
5. Apply filters with `pre_render_object()` and `after_render_object()`
6. Render UI elements like grid, guides, and selection
7. Clean up with `after_render()`

Sources: [src/js/core/base-layers.js L127-L214](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L127-L214)

 [src/js/core/base-layers.js L278-L341](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L278-L341)

### Tools System

The tools system is built around the `Base_tools_class` framework, which provides a common interface for all tools. Each tool (brush, pencil, selection, etc.) inherits from this base class and implements specific behaviors.

```sql
#mermaid-x8fueyg9b4k{font-family:ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica;font-size:16px;fill:#333;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#mermaid-x8fueyg9b4k .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#mermaid-x8fueyg9b4k .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#mermaid-x8fueyg9b4k .error-icon{fill:#dddddd;}#mermaid-x8fueyg9b4k .error-text{fill:#222222;stroke:#222222;}#mermaid-x8fueyg9b4k .edge-thickness-normal{stroke-width:1px;}#mermaid-x8fueyg9b4k .edge-thickness-thick{stroke-width:3.5px;}#mermaid-x8fueyg9b4k .edge-pattern-solid{stroke-dasharray:0;}#mermaid-x8fueyg9b4k .edge-thickness-invisible{stroke-width:0;fill:none;}#mermaid-x8fueyg9b4k .edge-pattern-dashed{stroke-dasharray:3;}#mermaid-x8fueyg9b4k .edge-pattern-dotted{stroke-dasharray:2;}#mermaid-x8fueyg9b4k .marker{fill:#999;stroke:#999;}#mermaid-x8fueyg9b4k .marker.cross{stroke:#999;}#mermaid-x8fueyg9b4k svg{font-family:ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica;font-size:16px;}#mermaid-x8fueyg9b4k p{margin:0;}#mermaid-x8fueyg9b4k g.classGroup text{fill:#dddddd;stroke:none;font-family:ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica;font-size:10px;}#mermaid-x8fueyg9b4k g.classGroup text .title{font-weight:bolder;}#mermaid-x8fueyg9b4k .cluster-label text{fill:#444;}#mermaid-x8fueyg9b4k .cluster-label span{color:#444;}#mermaid-x8fueyg9b4k .cluster-label span p{background-color:transparent;}#mermaid-x8fueyg9b4k .cluster rect{fill:#f8f8f8;stroke:#dddddd;stroke-width:1px;}#mermaid-x8fueyg9b4k .cluster text{fill:#444;}#mermaid-x8fueyg9b4k .cluster span{color:#444;}#mermaid-x8fueyg9b4k .nodeLabel,#mermaid-x8fueyg9b4k .edgeLabel{color:#333333;}#mermaid-x8fueyg9b4k .noteLabel .nodeLabel,#mermaid-x8fueyg9b4k .noteLabel .edgeLabel{color:#333;}#mermaid-x8fueyg9b4k .edgeLabel .label rect{fill:#ffffff;}#mermaid-x8fueyg9b4k .label text{fill:#333333;}#mermaid-x8fueyg9b4k .labelBkg{background:#ffffff;}#mermaid-x8fueyg9b4k .edgeLabel .label span{background:#ffffff;}#mermaid-x8fueyg9b4k .classTitle{font-weight:bolder;}#mermaid-x8fueyg9b4k .node rect,#mermaid-x8fueyg9b4k .node circle,#mermaid-x8fueyg9b4k .node ellipse,#mermaid-x8fueyg9b4k .node polygon,#mermaid-x8fueyg9b4k .node path{fill:#ffffff;stroke:#dddddd;stroke-width:1;}#mermaid-x8fueyg9b4k .divider{stroke:#dddddd;stroke-width:1;}#mermaid-x8fueyg9b4k g.clickable{cursor:pointer;}#mermaid-x8fueyg9b4k g.classGroup rect{fill:#ffffff;stroke:#dddddd;}#mermaid-x8fueyg9b4k g.classGroup line{stroke:#dddddd;stroke-width:1;}#mermaid-x8fueyg9b4k .classLabel .box{stroke:none;stroke-width:0;fill:#ffffff;opacity:0.5;}#mermaid-x8fueyg9b4k .classLabel .label{fill:#dddddd;font-size:10px;}#mermaid-x8fueyg9b4k .relation{stroke:#999;stroke-width:1;fill:none;}#mermaid-x8fueyg9b4k .dashed-line{stroke-dasharray:3;}#mermaid-x8fueyg9b4k .dotted-line{stroke-dasharray:1 2;}#mermaid-x8fueyg9b4k [id$="-compositionStart"],#mermaid-x8fueyg9b4k .composition{fill:#999!important;stroke:#999!important;stroke-width:1;}#mermaid-x8fueyg9b4k [id$="-compositionEnd"],#mermaid-x8fueyg9b4k .composition{fill:#999!important;stroke:#999!important;stroke-width:1;}#mermaid-x8fueyg9b4k [id$="-dependencyStart"],#mermaid-x8fueyg9b4k .dependency{fill:#999!important;stroke:#999!important;stroke-width:1;}#mermaid-x8fueyg9b4k [id$="-dependencyEnd"],#mermaid-x8fueyg9b4k .dependency{fill:#999!important;stroke:#999!important;stroke-width:1;}#mermaid-x8fueyg9b4k [id$="-extensionStart"],#mermaid-x8fueyg9b4k .extension{fill:transparent!important;stroke:#999!important;stroke-width:1;}#mermaid-x8fueyg9b4k [id$="-extensionEnd"],#mermaid-x8fueyg9b4k .extension{fill:transparent!important;stroke:#999!important;stroke-width:1;}#mermaid-x8fueyg9b4k [id$="-aggregationStart"],#mermaid-x8fueyg9b4k .aggregation{fill:transparent!important;stroke:#999!important;stroke-width:1;}#mermaid-x8fueyg9b4k [id$="-aggregationEnd"],#mermaid-x8fueyg9b4k .aggregation{fill:transparent!important;stroke:#999!important;stroke-width:1;}#mermaid-x8fueyg9b4k [id$="-lollipopStart"],#mermaid-x8fueyg9b4k .lollipop{fill:#ffffff!important;stroke:#999!important;stroke-width:1;}#mermaid-x8fueyg9b4k [id$="-lollipopEnd"],#mermaid-x8fueyg9b4k .lollipop{fill:#ffffff!important;stroke:#999!important;stroke-width:1;}#mermaid-x8fueyg9b4k .edgeTerminals{font-size:11px;line-height:initial;}#mermaid-x8fueyg9b4k .classTitleText{text-anchor:middle;font-size:18px;fill:#333;}#mermaid-x8fueyg9b4k .edgeLabel[data-look="neo"]{background-color:#ffffff;text-align:center;}#mermaid-x8fueyg9b4k .edgeLabel[data-look="neo"] p{background-color:#ffffff;}#mermaid-x8fueyg9b4k .edgeLabel[data-look="neo"] rect{opacity:0.5;background-color:#ffffff;fill:#ffffff;}#mermaid-x8fueyg9b4k .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#mermaid-x8fueyg9b4k .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#mermaid-x8fueyg9b4k .node .neo-node{stroke:#dddddd;}#mermaid-x8fueyg9b4k [data-look="neo"].node rect,#mermaid-x8fueyg9b4k [data-look="neo"].cluster rect,#mermaid-x8fueyg9b4k [data-look="neo"].node polygon{stroke:url(#mermaid-x8fueyg9b4k-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#mermaid-x8fueyg9b4k [data-look="neo"].node path{stroke:url(#mermaid-x8fueyg9b4k-gradient);stroke-width:1px;}#mermaid-x8fueyg9b4k [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#mermaid-x8fueyg9b4k [data-look="neo"].node .neo-line path{stroke:#dddddd;filter:none;}#mermaid-x8fueyg9b4k [data-look="neo"].node circle{stroke:url(#mermaid-x8fueyg9b4k-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#mermaid-x8fueyg9b4k [data-look="neo"].node circle .state-start{fill:#000000;}#mermaid-x8fueyg9b4k [data-look="neo"].icon-shape .icon{fill:url(#mermaid-x8fueyg9b4k-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#mermaid-x8fueyg9b4k [data-look="neo"].icon-shape .icon-neo path{stroke:url(#mermaid-x8fueyg9b4k-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#mermaid-x8fueyg9b4k :root{--mermaid-font-family:"trebuchet ms",verdana,arial,sans-serif;}definesimplementsBase_tools_class+load()+mousedown()+mousemove()+mouseup()+render_overlay()Brush_class+mousedown()+mousemove()+mouseup()Pencil_classSelection_classShape_classText_classTool_Instancename: Stringattributes: Objecton_update: Functionon_leave: Functionconfig_TOOLS
```

Sources: [src/js/config.js L82-L508](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/config.js#L82-L508)

 [src/js/tools/pick_color.js L7-L106](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/tools/pick_color.js#L7-L106)

Tools typically override these methods to implement specific behavior:

* `load()`: Called when the tool is activated
* `mousedown()`, `mousemove()`, `mouseup()`: Handle mouse interactions
* `render_overlay()`: Draw tool-specific UI elements

When a tool is used, it may create or modify layers through the action system, maintaining a clean separation between user interaction and state changes.

Sources: [src/js/tools/pick_color.js L32-L75](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/tools/pick_color.js#L32-L75)

 [src/js/tools/shapes/bezier_curve.js L27-L64](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/tools/shapes/bezier_curve.js#L27-L64)

### GUI System

The GUI system, managed by `Base_gui_class` and various subcomponents, handles the user interface. It's responsible for rendering UI elements, handling user interactions, and updating the display in response to state changes.

```mermaid
flowchart TD

mermaid-tcxzzcdl7q8-flowchart-gui["Base_gui_class"]
mermaid-tcxzzcdl7q8-flowchart-preview["GUI_preview_class<br>(Canvas preview)"]
mermaid-tcxzzcdl7q8-flowchart-tools["GUI_tools_class<br>(Tools panel)"]
mermaid-tcxzzcdl7q8-flowchart-layers["GUI_layers_class<br>(Layers panel)"]
mermaid-tcxzzcdl7q8-flowchart-colors["GUI_colors_class<br>(Color picker)"]
mermaid-tcxzzcdl7q8-flowchart-menu["GUI_menu_class<br>(Main menu)"]
mermaid-tcxzzcdl7q8-flowchart-details["GUI_details_class<br>(Layer details)"]
mermaid-tcxzzcdl7q8-flowchart-User["User"]
mermaid-tcxzzcdl7q8-flowchart-config["config.js"]
mermaid-tcxzzcdl7q8-flowchart-render["render()"]

subgraph mermaid-tcxzzcdl7q8-subGraph0 ["GUI System (Base_gui_class)"]
    mermaid-tcxzzcdl7q8-flowchart-gui
    mermaid-tcxzzcdl7q8-flowchart-preview
    mermaid-tcxzzcdl7q8-flowchart-tools
    mermaid-tcxzzcdl7q8-flowchart-layers
    mermaid-tcxzzcdl7q8-flowchart-colors
    mermaid-tcxzzcdl7q8-flowchart-menu
    mermaid-tcxzzcdl7q8-flowchart-details
end
```

Sources: [src/js/core/base-gui.js L25-L69](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L25-L69)

 [src/js/core/base-gui.js L136-L147](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L136-L147)

 [src/js/core/gui/gui-preview.js L30-L66](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/gui/gui-preview.js#L30-L66)

The GUI components include:

* `GUI_preview_class`: Shows a small preview of the entire canvas
* `GUI_tools_class`: Displays and manages the tools panel
* `GUI_layers_class`: Shows and manages the layers panel
* `GUI_colors_class`: Handles color selection
* `GUI_menu_class`: Manages the main menu
* `GUI_details_class`: Shows details for the selected layer or tool

Sources: [src/js/core/gui/gui-preview.js L30-L66](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/gui/gui-preview.js#L30-L66)

 [src/js/core/base-gui.js L60-L68](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L60-L68)

### State Management and Action System

miniPaint uses an action-based state management system. Instead of directly modifying the application state, changes are encapsulated in action objects that can be executed, undone, and redone.

```mermaid
flowchart TD

mermaid-fcpxg2bin6q-flowchart-User["User"]
mermaid-fcpxg2bin6q-flowchart-Tool["Tool Class"]
mermaid-fcpxg2bin6q-flowchart-Action["Action Object"]
mermaid-fcpxg2bin6q-flowchart-app.State["app.State.do_action()"]
mermaid-fcpxg2bin6q-flowchart-Config["config.js"]
mermaid-fcpxg2bin6q-flowchart-Render["Base_layers.render()"]
mermaid-fcpxg2bin6q-flowchart-Insert["Insert_layer_action"]
mermaid-fcpxg2bin6q-flowchart-Delete["Delete_layer_action"]
mermaid-fcpxg2bin6q-flowchart-Update["Update_layer_action"]
mermaid-fcpxg2bin6q-flowchart-Bundle["Bundle_action"]

subgraph mermaid-fcpxg2bin6q-subGraph1 ["Action Types"]
    mermaid-fcpxg2bin6q-flowchart-Insert
    mermaid-fcpxg2bin6q-flowchart-Delete
    mermaid-fcpxg2bin6q-flowchart-Update
    mermaid-fcpxg2bin6q-flowchart-Bundle
end

subgraph mermaid-fcpxg2bin6q-subGraph0 ["Action Flow"]
    mermaid-fcpxg2bin6q-flowchart-User
    mermaid-fcpxg2bin6q-flowchart-Tool
    mermaid-fcpxg2bin6q-flowchart-Action
    mermaid-fcpxg2bin6q-flowchart-app.State
    mermaid-fcpxg2bin6q-flowchart-Config
    mermaid-fcpxg2bin6q-flowchart-Render
end
```

Sources: [src/js/core/base-layers.js L488-L491](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L488-L491)

 [src/js/core/base-layers.js L537-L548](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L537-L548)

 [src/js/modules/file/open.js L145-L150](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/modules/file/open.js#L145-L150)

The action system provides several benefits:

1. **Undo/Redo Support**: Actions can be undone and redone
2. **Atomic Changes**: Complex operations can be grouped into atomic units
3. **State Consistency**: All state changes follow a consistent pattern
4. **Debugging**: State changes are explicit and traceable

Actions are dispatched using `app.State.do_action()`, which executes the action and records it for undo/redo functionality.

Sources: [src/js/core/base-layers.js L488-L491](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L488-L491)

 [src/js/core/base-layers.js L537-L548](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L537-L548)

## Data Flow

The overall data flow in miniPaint follows this pattern:

```mermaid
sequenceDiagram
  participant User
  participant Base_gui_class
  participant Tool Class
  participant app.Actions
  participant config.js
  participant Base_layers_class
  participant canvas_minipaint

  User->>Base_gui_class: Interact with UI
  Base_gui_class->>Tool Class: Activate tool
  User->>Tool Class: Mouse/keyboard input
  Tool Class->>app.Actions: Create action
  Tool Class->>app.Actions: Dispatch via app.State.do_action()
  app.Actions->>config.js: Modify state (config.layers, etc.)
  config.js->>Base_layers_class: Trigger render (config.need_render = true)
  Base_layers_class->>canvas_minipaint: Render content
  canvas_minipaint->>Base_gui_class: Update display
  Base_gui_class->>User: Visual feedback
```

Sources: [src/js/core/base-layers.js L127-L214](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L127-L214)

 [src/js/tools/pick_color.js L58-L74](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/tools/pick_color.js#L58-L74)

 [src/js/modules/file/open.js L145-L150](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/modules/file/open.js#L145-L150)

This data flow ensures that:

1. All state changes are properly tracked
2. The UI stays in sync with the underlying data
3. The rendering system efficiently updates the canvas when needed

## Rendering Pipeline

The rendering process is a critical part of miniPaint, responsible for converting layer data into pixels on the canvas:

```mermaid
flowchart TD

mermaid-i6kukmj1rn-flowchart-Start["Render Start"]
mermaid-i6kukmj1rn-flowchart-NeedRender["config.need_render?"]
mermaid-i6kukmj1rn-flowchart-RequestAnimation["Request next frame"]
mermaid-i6kukmj1rn-flowchart-PreRender["pre_render()"]
mermaid-i6kukmj1rn-flowchart-GetLayers["get_sorted_layers()"]
mermaid-i6kukmj1rn-flowchart-RenderObjects["render_objects()"]
mermaid-i6kukmj1rn-flowchart-ForEachLayer["For each layer:"]
mermaid-i6kukmj1rn-flowchart-LayerVisible["Layer visible?"]
mermaid-i6kukmj1rn-flowchart-NextLayer["Next layer"]
mermaid-i6kukmj1rn-flowchart-PreRenderObject["pre_render_object()"]
mermaid-i6kukmj1rn-flowchart-RenderObject["render_object()"]
mermaid-i6kukmj1rn-flowchart-AfterRenderObject["after_render_object()"]
mermaid-i6kukmj1rn-flowchart-LayersComplete["All layers done?"]
mermaid-i6kukmj1rn-flowchart-RenderGrid["Draw grid"]
mermaid-i6kukmj1rn-flowchart-RenderSelection["Draw selection"]
mermaid-i6kukmj1rn-flowchart-RenderOverlay["Render tool overlay"]
mermaid-i6kukmj1rn-flowchart-RenderPreview["Render preview"]
mermaid-i6kukmj1rn-flowchart-AfterRender["after_render()"]
mermaid-i6kukmj1rn-flowchart-End["Render End"]
```

Sources: [src/js/core/base-layers.js L127-L214](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L127-L214)

 [src/js/core/base-layers.js L278-L341](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L278-L341)

 [src/js/core/base-layers.js L370-L411](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L370-L411)

The rendering pipeline includes these key steps:

1. Check if rendering is needed (`config.need_render`)
2. Prepare the canvas (`pre_render()`)
3. Get layers in the correct order (`get_sorted_layers()`)
4. For each visible layer: * Apply pre-render filters (`pre_render_object()`) * Render the layer content (`render_object()`) * Apply post-render filters (`after_render_object()`)
5. Render UI elements (grid, selection, tool overlay)
6. Update the preview panel
7. Clean up (`after_render()`)
8. Request the next animation frame

Sources: [src/js/core/base-layers.js L127-L214](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L127-L214)

 [src/js/core/base-layers.js L344-L361](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L344-L361)

## Layer Structure

Layers are the fundamental building blocks of miniPaint. Each layer is an object with specific properties that determine its appearance and behavior:

| Property | Description | Example |
| --- | --- | --- |
| `id` | Unique identifier | `1`, `2`, `3` |
| `name` | Display name | `"Background"`, `"Text Layer"` |
| `type` | Layer type | `"image"`, `"text"`, `"shape"` |
| `data` | Layer content (varies by type) | Image data, text content, shape points |
| `x`, `y` | Position | `0`, `100` |
| `width`, `height` | Dimensions | `800`, `600` |
| `visible` | Visibility flag | `true`, `false` |
| `opacity` | Transparency (0-100) | `100`, `50` |
| `order` | Rendering order | `1`, `2` |
| `composition` | Blend mode | `"source-over"`, `"multiply"` |
| `filters` | Applied effects | Array of filter objects |
| `render_function` | Rendering method | `["text", "render"]` |

Sources: [src/js/core/base-layers.js L19-L44](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L19-L44)

 [images/test-collection.json L16-L164](https://github.com/viliusle/miniPaint/blob/6d0b95e5/images/test-collection.json#L16-L164)

Different layer types have different data structures. For example:

* **Image layers** store image data or a link to an image
* **Text layers** store text content and formatting properties
* **Shape layers** store points and shape-specific properties

Sources: [images/test-collection.json L16-L59](https://github.com/viliusle/miniPaint/blob/6d0b95e5/images/test-collection.json#L16-L59)

 [images/test-collection.json L53-L107](https://github.com/viliusle/miniPaint/blob/6d0b95e5/images/test-collection.json#L53-L107)

## Initialization Process

When miniPaint starts, it follows this initialization sequence:

```mermaid
flowchart TD

mermaid-b9mi44ivzq-flowchart-Start["Application Start"]
mermaid-b9mi44ivzq-flowchart-LoadModules["Load modules"]
mermaid-b9mi44ivzq-flowchart-LoadDefaults["Load default values"]
mermaid-b9mi44ivzq-flowchart-RenderMainGUI["Render main GUI"]
mermaid-b9mi44ivzq-flowchart-PrepareCanvas["Prepare canvas"]
mermaid-b9mi44ivzq-flowchart-InitLayers["Initialize layers"]
mermaid-b9mi44ivzq-flowchart-SetEvents["Set up event handlers"]
mermaid-b9mi44ivzq-flowchart-LoadTranslations["Load translations"]
mermaid-b9mi44ivzq-flowchart-Ready["Application Ready"]
```

Sources: [src/js/core/base-gui.js L72-L77](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L72-L77)

 [src/js/core/base-gui.js L136-L152](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L136-L152)

 [src/js/core/base-layers.js L74-L96](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L74-L96)

During initialization:

1. Modules are dynamically loaded
2. Default configuration values are established
3. The main GUI components are rendered
4. The canvas is prepared
5. The layer system is initialized
6. Event handlers are set up
7. Translations are loaded

Sources: [src/js/core/base-gui.js L79-L89](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L79-L89)

 [src/js/core/base-gui.js L91-L133](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L91-L133)

 [src/js/core/base-gui.js L164-L229](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L164-L229)

## Conclusion

miniPaint's architecture follows a component-based design with a central configuration object, a sophisticated layer system, a flexible tools framework, and a comprehensive GUI system. The action-based state management supports undo/redo functionality and maintains a clean separation between user interaction and state changes.

This architecture provides a solid foundation for rich image editing capabilities within a web browser, with a clear separation of concerns and a well-defined data flow.

Sources: [src/js/config.js L1-L512](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/config.js#L1-L512)

 [src/js/core/base-layers.js L1-L884](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-layers.js#L1-L884)

 [src/js/core/base-gui.js L1-L600](https://github.com/viliusle/miniPaint/blob/6d0b95e5/src/js/core/base-gui.js#L1-L600)