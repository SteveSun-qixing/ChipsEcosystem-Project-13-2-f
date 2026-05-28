# Icon Maker

A tool to convert SVG/PNG images to PNG, ICO, and ICNS icon files with white background.

## Features

- Convert SVG or PNG files to multiple icon formats
- Automatically add white background to transparent images
- Generate PNG files with custom size
- Generate ICO files with multiple sizes (Windows)
- Generate ICNS files (macOS only)
- Command-line interface and Python API

## Installation

```bash
pip install -e .
```

For SVG support:
```bash
pip install -e ".[svg]"
```

## Usage

### Graphical Interface

```bash
# Run the GUI
python3 run_gui.py

# Or if installed via pip
icon-maker-gui
```

### Command Line

```bash
# Basic usage - generates PNG, ICO, and ICNS
icon-maker input.png

# Specify output directory
icon-maker input.svg -o ./output

# Specify output filename
icon-maker input.png -n myicon

# Generate only PNG and ICO
icon-maker input.png --no-icns

# Custom PNG size
icon-maker input.png -s 256

# Custom ICO sizes
icon-maker input.png --ico-sizes "16,32,64,128"
```

### Python API

```python
from icon_maker import generate_icons

# Generate all formats
results = generate_icons("input.png", output_dir="./output")

# Generate specific formats
results = generate_icons(
    "input.svg",
    output_dir="./output",
    name="myicon",
    png_size=256,
    ico_sizes=[16, 32, 64],
    formats=["png", "ico"]
)
```

## Supported Formats

| Format | Description |
|--------|-------------|
| PNG | Portable Network Graphics |
| ICO | Windows icon format |
| ICNS | macOS icon format (macOS only) |

## Requirements

- Python 3.9+
- Pillow
- Click
- cairosvg (optional, for SVG support)
- macOS (for ICNS generation)
