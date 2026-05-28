"""Generate PNG and ICO icon files."""

from pathlib import Path
from typing import Union, List, Optional
from PIL import Image


def save_png(image: Image.Image, output_path: Union[str, Path], size: Optional[int] = None) -> Path:
    """Save image as PNG file.
    
    Args:
        image: PIL Image object
        output_path: Output file path
        size: Optional resize dimension
        
    Returns:
        Path to saved file
    """
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    if size:
        image = image.resize((size, size), Image.Resampling.LANCZOS)
    
    image.save(path, "PNG")
    return path


def generate_ico(
    image: Image.Image,
    output_path: Union[str, Path],
    sizes: Optional[List[int]] = None,
) -> Path:
    """Generate ICO file with multiple sizes.
    
    Args:
        image: PIL Image object (should have white background)
        output_path: Output file path
        sizes: List of sizes to include (default: [16, 32, 48, 64, 128, 256])
        
    Returns:
        Path to saved file
    """
    if sizes is None:
        sizes = [16, 32, 48, 64, 128, 256]
    
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    # Create resized versions
    images = []
    for size in sizes:
        resized = image.resize((size, size), Image.Resampling.LANCZOS)
        images.append(resized)
    
    # Save as ICO
    images[0].save(
        path,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=images[1:],
    )
    return path
