from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "icons"
BACKGROUND = "#1F2937"
FOREGROUND = "#FFFFFF"


def load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def make_icon(size: int) -> None:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    radius = max(3, size // 8)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=BACKGROUND)

    box_margin = max(2, size // 8)
    stroke_width = max(1, size // 18)
    draw.rounded_rectangle(
        (box_margin, box_margin, size - box_margin - 1, size - box_margin - 1),
        radius=max(2, radius // 2),
        outline="#4B5563",
        width=stroke_width,
    )

    font = load_font(max(8, int(size * 0.34)))
    text = "BB"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    position = ((size - text_width) / 2, (size - text_height) / 2 - bbox[1])
    draw.text(position, text, fill=FOREGROUND, font=font)

    image.save(ICON_DIR / f"icon{size}.png")


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    for size in (16, 48, 128):
        make_icon(size)


if __name__ == "__main__":
    main()
