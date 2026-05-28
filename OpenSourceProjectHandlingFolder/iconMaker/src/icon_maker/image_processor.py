"""Image processing utilities for icon generation."""

from pathlib import Path
from typing import Union
from PIL import Image
import io


def load_image(file_path: Union[str, Path]) -> Image.Image:
    """Load an image from SVG or PNG file.
    
    Args:
        file_path: Path to the input image file (SVG or PNG)
        
    Returns:
        PIL Image object
        
    Raises:
        ValueError: If file format is not supported
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    suffix = path.suffix.lower()
    
    if suffix == ".svg":
        return _load_svg(path)
    elif suffix in (".png", ".jpg", ".jpeg", ".bmp", ".gif"):
        return Image.open(path)
    else:
        raise ValueError(f"Unsupported file format: {suffix}")


def _load_svg(path: Path, output_size: int = 512) -> Image.Image:
    """Load SVG file and convert to PIL Image.
    
    Args:
        path: Path to SVG file
        output_size: Output dimension (width and height)
    """
    try:
        import cairosvg
    except ImportError:
        raise ImportError(
            "cairosvg is required for SVG support. "
            "Install it with: pip install icon-maker[svg]"
        )
    
    png_data = cairosvg.svg2png(url=str(path), output_width=output_size, output_height=output_size)
    return Image.open(io.BytesIO(png_data))


def add_white_background(image: Image.Image) -> Image.Image:
    """Add white background to an image (handles transparency).
    
    Args:
        image: PIL Image object (may have transparency)
        
    Returns:
        PIL Image with white background
    """
    if image.mode in ("RGBA", "LA", "PA"):
        background = Image.new("RGBA", image.size, (255, 255, 255, 255))
        background.paste(image, mask=image.split()[-1])
        return background.convert("RGB")
    elif image.mode == "P":
        return image.convert("RGB")
    elif image.mode != "RGB":
        return image.convert("RGB")
    return image


def resize_image(image: Image.Image, size: int) -> Image.Image:
    """Resize image to specified dimensions.
    
    Args:
        image: PIL Image object
        size: Target size (width and height)
        
    Returns:
        Resized PIL Image
    """
    return image.resize((size, size), Image.Resampling.LANCZOS)
