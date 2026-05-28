"""Command-line interface for icon maker."""

import click
from pathlib import Path
from typing import Optional

from .image_processor import load_image, add_white_background, resize_image
from .png_ico_generator import save_png, generate_ico
from .icns_generator import generate_icns


@click.command()
@click.argument("input_file", type=click.Path(exists=True))
@click.option(
    "-o", "--output-dir",
    type=click.Path(),
    default=".",
    help="Output directory for generated icons",
)
@click.option(
    "-n", "--name",
    type=str,
    default=None,
    help="Base name for output files (default: input filename)",
)
@click.option(
    "--png/--no-png",
    default=True,
    help="Generate PNG file",
)
@click.option(
    "--ico/--no-ico",
    default=True,
    help="Generate ICO file",
)
@click.option(
    "--icns/--no-icns",
    default=True,
    help="Generate ICNS file (macOS only)",
)
@click.option(
    "-s", "--size",
    type=int,
    default=512,
    help="Base size for all outputs (PNG, ICO, ICNS)",
)
@click.option(
    "--ico-sizes",
    type=str,
    default="256,512",
    help="Comma-separated list of sizes for ICO",
)
def main(
    input_file: str,
    output_dir: str,
    name: Optional[str],
    png: bool,
    ico: bool,
    icns: bool,
    size: int,
    ico_sizes: str,
):
    """Convert SVG/PNG to PNG, ICO, and ICNS icons with white background.
    
    INPUT_FILE: Path to input SVG or PNG file
    """
    input_path = Path(input_file)
    
    if name is None:
        name = input_path.stem
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    click.echo(f"Loading image: {input_path}")
    image = load_image(input_path)
    
    # Resize to target size first for best quality
    if image.size != (size, size):
        click.echo(f"Resizing to {size}x{size}...")
        image = resize_image(image, size)
    
    click.echo("Adding white background...")
    image = add_white_background(image)
    
    if png:
        png_path = output_path / f"{name}.png"
        save_png(image, png_path, size)
        click.echo(f"Generated PNG: {png_path}")
    
    if ico:
        ico_path = output_path / f"{name}.ico"
        sizes = [int(s.strip()) for s in ico_sizes.split(",")]
        generate_ico(image, ico_path, sizes)
        click.echo(f"Generated ICO: {ico_path}")
    
    if icns:
        try:
            icns_path = output_path / f"{name}.icns"
            generate_icns(image, icns_path, size)
            click.echo(f"Generated ICNS: {icns_path}")
        except RuntimeError as e:
            click.echo(f"Warning: {e}", err=True)
    
    click.echo("Done!")


if __name__ == "__main__":
    main()
