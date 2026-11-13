"""Regenera los TTF estáticos de esta carpeta a partir de las fuentes variables del sitio.

Solo hace falta si cambia la versión de @fontsource-variable. Requiere fonttools y brotli
en un entorno virtual aparte (no se agregan al proyecto):

    python3 -m venv /tmp/fv && /tmp/fv/bin/pip install fonttools brotli
    /tmp/fv/bin/python scripts/fonts/convertir.py

Los nombres internos se ajustan por peso para que reportlab no los confunda.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'node_modules/@fontsource-variable'
OUT = Path(__file__).resolve().parent
JOBS = [
    ('source-sans-3/files/source-sans-3-latin-wght-normal.woff2', 'SourceSans3', {'Regular': 400, 'Semibold': 600, 'Bold': 700}),
    ('source-serif-4/files/source-serif-4-latin-wght-normal.woff2', 'SourceSerif4', {'Regular': 400, 'Semibold': 600}),
]
for path, family, weights in JOBS:
    for style, weight in weights.items():
        font = TTFont(SRC / path)
        font.flavor = None
        location = {a.axisTag: (weight if a.axisTag == 'wght' else a.defaultValue) for a in font['fvar'].axes}
        static = instantiateVariableFont(font, location)
        for name_id, value in ((4, f'{family} {style}'), (6, f'{family}-{style}'), (2, style)):
            static['name'].setName(value, name_id, 3, 1, 0x409)
            static['name'].setName(value, name_id, 1, 0, 0)
        static.save(OUT / f'{family}-{style}.ttf')
        print(f'{family}-{style}.ttf')
