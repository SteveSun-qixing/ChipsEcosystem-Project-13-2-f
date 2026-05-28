"""Generate ICNS icon files for macOS."""

import platform
import subprocess
import tempfile
from pathlib import Path
from typing import Union, Tuple, List
from PIL import Image


def get_icon_sizes(base_size: int = 512) -> List[Tuple[int, int]]:
    """Get icon sizes based on base size.
    
    Args:
        base_size: Base size (typically 512)
        
    Returns:
        List of (size, scale) tuples
    """
    return [
        (16, 1),
        (16, 2),
        (32, 1),
        (32, 2),
        (128, 1),
        (128, 2),
        (256, 1),
        (256, 2),
        (base_size, 1),
        (base_size, 2),
    ]


def generate_icns(
    image: Image.Image,
    output_path: Union[str, Path],
    base_size: int = 512,
) -> Path:
    """Generate ICNS file for macOS.
    
    This function creates an iconset directory with all required sizes,
    then uses iconutil to convert it to ICNS format.
    
    Args:
        image: PIL Image object (should have white background)
        output_path: Output ICNS file path
        base_size: Base size for icons (default 512)
        
    Returns:
        Path to saved ICNS file
        
    Raises:
        RuntimeError: If not running on macOS
        subprocess.CalledProcessError: If iconutil fails
    """
    if platform.system() != "Darwin":
        raise RuntimeError("ICNS generation is only supported on macOS")
    
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    icon_sizes = get_icon_sizes(base_size)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        iconset_path = Path(tmpdir) / "icon.iconset"
        iconset_path.mkdir()
        
        # Generate all required icon sizes
        for size, scale in icon_sizes:
            actual_size = size * scale
            resized = image.resize((actual_size, actual_size), Image.Resampling.LANCZOS)
            
            if scale == 1:
                filename = f"icon_{size}x{size}.png"
            else:
                filename = f"icon_{size}x{size}@2x.png"
            
            resized.save(iconset_path / filename, "PNG")
        
        # Use iconutil to create ICNS
        subprocess.run(
            [
                "/usr/bin/iconutil",
                "-c",
                "icns",
                str(iconset_path),
                "-o",
                str(path),
            ],
            check=True,
            capture_output=True,
        )
    
    return path


def generate_icns_with_sips(
    image: Image.Image,
    output_path: Union[str, Path],
) -> Path:
    """Alternative ICNS generation using sips command.
    
    This method is based on the icns-creator-main project approach.
    
    Args:
        image: PIL Image object (should have white background)
        output_path: Output ICNS file path
        
    Returns:
        Path to saved ICNS file
    """
    if platform.system() != "Darwin":
        raise RuntimeError("ICNS generation is only supported on macOS")
    
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Save as PNG first (1024x1024 for best quality)
        png_path = Path(tmpdir) / "temp_icon.png"
        resized = image.resize((1024, 1024), Image.Resampling.LANCZOS)
        resized.save(png_path, "PNG")
        
        # Convert to ICNS using sips
        subprocess.run(
            [
                "sips",
                "-s",
                "format",
                "icns",
                str(png_path),
                "--out",
                str(path),
            ],
            check=True,
            capture_output=True,
        )
    
    return path
