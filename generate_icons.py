import struct
import zlib
import os

def create_png(size, bg_color, text_color, text):
    width = height = size
    pixels = []
    cx, cy = width // 2, height // 2
    r = width // 2 - 2

    for y in range(height):
        row = []
        for x in range(width):
            dx, dy = x - cx, y - cy
            if dx * dx + dy * dy <= r * r:
                row.append(bg_color)
            else:
                row.append((0, 0, 0, 0))
        pixels.append(row)

    font_h = max(size // 4, 8)
    letter_w = max(size // 8, 4)
    start_x = cx - (len(text) * letter_w) // 2
    start_y = cy - font_h // 2

    for i, ch in enumerate(text):
        bx = start_x + i * letter_w
        for dy in range(font_h):
            for dx in range(letter_w - 1):
                px, py = bx + dx, start_y + dy
                if 0 <= px < width and 0 <= py < height:
                    pixels[py][px] = text_color

    raw = b""
    for row in pixels:
        raw += b"\x00"
        for r, g, b, a in row:
            raw += struct.pack("BBBB", r, g, b, a)

    def chunk(ctype, data):
        c = ctype + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")

os.makedirs("frontend", exist_ok=True)
bg = (233, 69, 96, 255)
fg = (255, 255, 255, 255)

for size in [192, 512]:
    data = create_png(size, bg, fg, "TCF")
    with open(f"frontend/icon-{size}.png", "wb") as f:
        f.write(data)
    print(f"icon-{size}.png oluşturuldu")
