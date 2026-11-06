"""Recadre une illustration détourée sur son contenu et produit @1x, @2x, @3x.
Usage : python3 scripts/prep-illustration.py <source.png> <nom> <taille_base_pt> [marge%]"""
import sys
from PIL import Image
src, name, base = sys.argv[1], sys.argv[2], int(sys.argv[3])
pad = float(sys.argv[4]) if len(sys.argv) > 4 else 0.04
im = Image.open(src).convert('RGBA')
x0, y0, x1, y1 = im.getbbox()
w, h = x1 - x0, y1 - y0
side = int(max(w, h) * (1 + 2 * pad))
canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
canvas.alpha_composite(im.crop((x0, y0, x1, y1)), ((side - w) // 2, (side - h) // 2))
for k, suffix in [(1, ''), (2, '@2x'), (3, '@3x')]:
    out = canvas.resize((base * k, base * k), Image.LANCZOS)
    out.save(f'assets/illustrations/{name}{suffix}.png', optimize=True)
print('ok', name, side)
