from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1] / "public" / "brand"
SCALE = 2
SIZE = 512 * SCALE


def cubic(a, b, c, d, steps=36):
    points = []
    for index in range(steps + 1):
        t = index / steps
        u = 1 - t
        points.append((
            round((u**3*a[0] + 3*u*u*t*b[0] + 3*u*t*t*c[0] + t**3*d[0]) * SCALE),
            round((u**3*a[1] + 3*u*u*t*b[1] + 3*u*t*t*c[1] + t**3*d[1]) * SCALE),
        ))
    return points


def leaf_mask(first, second):
    points = cubic(*first) + cubic(*second)[1:]
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask


def gradient_layer(top, bottom):
    image = Image.new("RGB", (SIZE, SIZE))
    pixels = image.load()
    for y in range(SIZE):
        amount = y / max(1, SIZE - 1)
        colour = tuple(round(top[i] * (1 - amount) + bottom[i] * amount) for i in range(3))
        for x in range(SIZE):
            pixels[x, y] = colour
    return image


def line(draw, curves, colour, width):
    points = []
    for curve in curves:
        segment = cubic(*curve)
        points.extend(segment if not points else segment[1:])
    draw.line(points, fill=colour, width=width * SCALE, joint="curve")
    radius = width * SCALE // 2
    for x, y in (points[0], points[-1]):
        draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=colour)


def main():
    icon = gradient_layer((21, 81, 61), (8, 41, 31))
    draw = ImageDraw.Draw(icon)
    draw.rounded_rectangle((0, 0, SIZE-1, SIZE-1), radius=118*SCALE, fill=(10, 48, 36))
    draw.ellipse((71*SCALE, 71*SCALE, 441*SCALE, 441*SCALE), outline=(112, 95, 47), width=3*SCALE)

    left = leaf_mask(
        ((276,251), (213,254), (160,229), (148,143)),
        ((148,143), (224,132), (275,174), (276,251)),
    )
    right = leaf_mask(
        ((285,218), (287,142), (333,94), (408,87)),
        ((408,87), (411,162), (365,209), (285,218)),
    )
    icon.paste(gradient_layer((205, 241, 119), (16, 185, 129)), (0, 0), left)
    icon.paste(gradient_layer((30, 198, 131), (16, 150, 104)), (0, 0), right)

    draw = ImageDraw.Draw(icon)
    line(draw, [((255,364),(253,331),(260,300),(264,274)), ((264,274),(269,234),(280,193),(295,160))], (245,247,242), 15)
    line(draw, [((128,380),(203,346),(306,344),(385,375))], (168,139,48), 12)
    line(draw, [((150,407),(219,384),(296,382),(360,405))], (112,95,47), 7)

    for size in (512, 192, 180, 32):
        output = icon.resize((size, size), Image.Resampling.LANCZOS)
        output.save(ROOT / f"app-icon-{size}.png", format="PNG", optimize=True)


if __name__ == "__main__":
    main()
