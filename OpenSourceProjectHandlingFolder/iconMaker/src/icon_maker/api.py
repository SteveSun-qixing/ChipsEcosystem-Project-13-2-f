"""Main API for icon generation."""

from pathlib import Path
from typing import Optional, Union, List, Dict
from PIL import Image

from .image_processor import load_image, add_white_background, resize_image
from .png_ico_generator import save_png, generate_ico
from .icns_generator import generate_icns

DEFAULT_SIZE = 512


def generate_icons(
    input_file: Union[str, Path],
    output_dir: Union[str, Path] = ".",
    name: Optional[str] = None,
    size: int = DEFAULT_SIZE,
    ico_sizes: Optional[List[int]] = None,
    formats: Optional[List[str]] = None,
) -> Dict[str, Path]:
    """Generate icon files from input image.
    
    Args:
        input_file: Path to input SVG or PNG file
        output_dir: Output directory for generated icons
        name: Base name for output files (default: input filename)
        size: Size for all outputs (PNG, ICO base, ICNS) - default 512
        ico_sizes: List of sizes for ICO (default: [256, 512])
        formats: List of formats to generate (default: ["png", "ico", "icns"])
        
    Returns:
        Dictionary mapping format names to output file paths
    """
    if ico_sizes is None:
        ico_sizes = [256, 512]
    
    if formats is None:
        formats = ["png", "ico", "icns"]
    
    input_path = Path(input_file)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    if name is None:
        name = input_path.stem
    
    # Load image (SVG will be loaded at high resolution)
    image = load_image(input_path)
    
    # Resize to target size first to ensure quality
    if image.size != (size, size):
        image = resize_image(image, size)
    
    # Add white background
    image = add_white_background(image)
    
    results = {}
    
    if "png" in formats:
        png_path = output_path / f"{name}.png"
        save_png(image, png_path, size)
        results["png"] = png_path
    
    if "ico" in formats:
        ico_path = output_path / f"{name}.ico"
        generate_ico(image, ico_path, ico_sizes)
        results["ico"] = ico_path
    
    if "icns" in formats:
        try:
            icns_path = output_path / f"{name}.icns"
            generate_icns(image, icns_path, size)
            results["icns"] = icns_path
        except RuntimeError:
            pass  # Not on macOS
    
    return results
