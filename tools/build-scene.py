"""Generates the pixel-art layers of the launcher scene (desktop/scene/*.png).

Every layer is 400x120 and tiles horizontally so the CSS can scroll it forever.
Run: python tools/build-scene.py
"""
import math
import random
from pathlib import Path
from PIL import Image

W, H = 400, 120
OUT = Path(__file__).resolve().parent.parent / 'desktop' / 'scene'


def hexc(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def layer():
    return Image.new('RGBA', (W, H), (0, 0, 0, 0))


def put(img, x, y, c):
    if 0 <= y < H:
        img.putpixel((x % W, y), c)


def ridge(x, waves, base):
    # sum of sines whose periods divide W, so the silhouette wraps seamlessly
    return base - sum(a * math.sin(2 * math.pi * (k * x / W) + p) for k, a, p in waves)


def mountains():
    img = layer()
    body, shade, edge, snow = hexc('#8fb0d8'), hexc('#7395c2'), hexc('#5674a3'), hexc('#f4f8fc')
    waves = [(2, 14, 0.3), (5, 7, 1.7), (9, 3, 4.1)]
    tops = [round(ridge(x, waves, 58)) for x in range(W)]
    for x in range(W):
        top = tops[x]
        # the slope facing right stays in shadow
        facing_away = ridge(x + 0.5, waves, 58) > ridge(x - 0.5, waves, 58)
        for y in range(top, H):
            put(img, x, y, shade if facing_away else body)
        if top < 50:  # snow caps on the higher peaks
            for y in range(top, top + (50 - top) // 2 + 1):
                put(img, x, y, snow)
        put(img, x, top, edge)
    return img


def hills():
    img = layer()
    body, light, edge = hexc('#6cb85c'), hexc('#94d46e'), hexc('#3c7c44')
    tops = [round(ridge(x, [(3, 6, 2.2), (7, 3, 0.4)], 80)) for x in range(W)]
    for x in range(W):
        for y in range(tops[x], H):
            put(img, x, y, body)
        put(img, x, tops[x] + 1, light)
        put(img, x, tops[x], edge)
    return img


def trees():
    img = layer()
    rnd = random.Random(7)
    dark, mid, light, outline = hexc('#1f5c38'), hexc('#2f8048'), hexc('#5cae5c'), hexc('#123a24')
    x = 0
    while x < W:
        r = rnd.choice([7, 8, 9, 10])
        cy = 96 - r + rnd.randint(-2, 2)
        for dx in range(-r - 1, r + 2):
            for dy in range(-r - 1, H - cy):
                d = math.hypot(dx, min(dy, 0))
                if d > r + 0.5:
                    continue
                # light comes from the upper left
                lit = (-dx - dy) / (r * 1.4)
                c = outline if d > r - 0.5 else light if lit > 0.45 else mid if lit > -0.2 else dark
                put(img, x + dx, cy + dy, c)
        x += r + rnd.randint(4, 8)
    return img


GRASS = [
    '......d.....d...',
    '.....dl....dl...',
    '..d..dl..d.dl...',
    '.dl.dml.dl.dml..',
    '.dl.dml.dmldml..',
    'dml.dmmldmmdmmld',
    'dmmdmmmmdmmmmmld',
    'dmmmmmmmmmmmmmmd',
]


def grass(frame):
    img = layer()
    pal = {'d': hexc('#2c7034'), 'm': hexc('#4ca444'), 'l': hexc('#a4e070')}
    ground = hexc('#5cb04c')
    for x in range(W):
        for y in range(110, H):
            put(img, x, y, ground)
    for row_y, offset in ((100, 8), (108, 0)):
        for tx in range(0, W, 16):
            for ty, line in enumerate(GRASS):
                # frame 2 leans the blade tips one pixel to the right
                sway = frame if ty < 4 else 0
                for i, ch in enumerate(line):
                    if ch != '.':
                        put(img, tx + offset + i + sway, row_y + ty, pal[ch])
    rnd = random.Random(3)
    for _ in range(26):
        fx, fy = rnd.randrange(W), rnd.randrange(114, H - 1)
        petal = hexc(rnd.choice(['#f8f0f0', '#f86878', '#f8d048']))
        for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
            put(img, fx + dx, fy + dy, petal)
        put(img, fx, fy, hexc('#f8a020'))
    return img


def clouds():
    img = layer()
    white, shadow = hexc('#ffffff'), hexc('#d8e6f4')
    # each cloud is a row of round puffs cut flat at the bottom
    for cx, cy, puffs in ((40, 20, [(-10, 4), (-3, 7), (6, 5), (13, 3)]), (170, 36, [(-6, 4), (2, 6), (9, 3)]),
                          (280, 16, [(-16, 4), (-8, 7), (2, 9), (12, 6), (19, 3)]), (360, 42, [(-4, 3), (3, 5)])):
        for px, r in puffs:
            for dx in range(-r, r + 1):
                for dy in range(-r, 1):
                    if math.hypot(dx, dy) <= r + 0.3:
                        put(img, cx + px + dx, cy + dy, white)
        left, right = min(px - r for px, r in puffs), max(px + r for px, r in puffs)
        for dx in range(left, right + 1):
            put(img, cx + dx, cy + 1, shadow)
            put(img, cx + dx, cy + 2, shadow)
    return img


def stars():
    img = layer()
    rnd = random.Random(11)
    for _ in range(70):
        put(img, rnd.randrange(W), rnd.randrange(0, 70), hexc('#ffffff', rnd.choice([120, 200, 255])))
    return img


def ball():
    # 16x16 capsule ball used by the emblem and the play button
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    red, red_dark, white, grey, ink = hexc('#f04040'), hexc('#b82030'), hexc('#ffffff'), hexc('#d0d4dc'), hexc('#202838')
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - 7.5, y - 7.5)
            if d > 7.6:
                continue
            if d > 6.6 or 7 <= y <= 8:
                c = ink
            elif y < 7:
                c = white if (x, y) in ((4, 3), (5, 3), (4, 4)) else red_dark if x > 10 else red
            else:
                c = grey if x > 10 or y > 12 else white
            img.putpixel((x, y), c)
    for y in range(5, 11):
        for x in range(5, 11):
            d = math.hypot(x - 7.5, y - 7.5)
            if d <= 2.9:
                img.putpixel((x, y), ink if d > 1.9 else white)
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, img in (('mountains', mountains()), ('hills', hills()), ('trees', trees()),
                      ('clouds', clouds()), ('stars', stars()), ('ball', ball())):
        img.save(OUT / f'{name}.png', optimize=True)
    # two-frame sprite (stacked vertically) for the swaying tall grass
    sheet = Image.new('RGBA', (W, H * 2))
    sheet.paste(grass(0), (0, 0))
    sheet.paste(grass(1), (0, H))
    sheet.save(OUT / 'grass.png', optimize=True)


if __name__ == '__main__':
    main()
