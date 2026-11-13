#!/usr/bin/env python3
"""Genera los PDF de public/documentos con un mismo sistema visual.

    python3 scripts/build-documentos.py

Produce las seis guías de comisión, el Formato de evento APJ-F01 y las bases con sus anexos.
El contenido está en scripts/documentos/; las fuentes y su licencia, en scripts/fonts/.
Solo requiere reportlab.
"""
import sys
from io import BytesIO
from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily, stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (BaseDocTemplate, CondPageBreak, Flowable, Frame, KeepTogether, PageBreak,
                                PageTemplate, Paragraph, Spacer, Table, TableStyle)

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = ROOT / 'public' / 'documentos'
LOGO = ROOT / 'public' / 'images' / 'real' / 'pan-logo-oficial.png'
sys.dont_write_bytecode = True
sys.path.insert(0, str(HERE / 'documentos'))
import bases  # noqa: E402
import formato  # noqa: E402
import guias  # noqa: E402

ORG = 'Acción Política Juvenil Tlalnepantla'
FECHA = 'noviembre de 2026'
ESTADO = 'Versión vigente'

# Fuentes ------------------------------------------------------------------------------
SANS, SANS_SB, SANS_B = 'SourceSans3-Regular', 'SourceSans3-Semibold', 'SourceSans3-Bold'
SERIF, SERIF_SB = 'SourceSerif4-Regular', 'SourceSerif4-Semibold'
for name in (SANS, SANS_SB, SANS_B, SERIF, SERIF_SB):
    pdfmetrics.registerFont(TTFont(name, str(HERE / 'fonts' / f'{name}.ttf')))
registerFontFamily('SourceSans3', normal=SANS, bold=SANS_SB, italic=SANS, boldItalic=SANS_SB)
registerFontFamily(SANS, normal=SANS, bold=SANS_SB, italic=SANS, boldItalic=SANS_SB)

# Colores del sitio ---------------------------------------------------------------------
TITLE = HexColor('#253775')
ACCENT = HexColor('#0043a1')
INK = HexColor('#172340')
MUTED = HexColor('#59667c')
RULE = HexColor('#dbe2ec')
TINT = HexColor('#f0f5fa')
MARK = HexColor('#b94a09')

# Página ----------------------------------------------------------------------------------
W, H = A4
ML = MR = 56
MT, MB = 68, 52
CW = W - ML - MR
ROW = 8 * mm  # renglón para escribir a mano


def style(name, **kw):
    base = dict(fontName=SANS, fontSize=10.5, leading=15, textColor=INK)
    base.update(kw)
    return ParagraphStyle(name, **base)


S = {
    'kicker': style('kicker', fontName=SANS_SB, fontSize=10, leading=13, textColor=ACCENT, spaceAfter=4),
    'title': style('title', fontName=SERIF_SB, fontSize=30, leading=35, textColor=TITLE, spaceAfter=6),
    'status': style('status', fontSize=9.5, leading=13, textColor=MUTED, spaceAfter=12),
    'lead': style('lead', fontSize=12, leading=17, spaceAfter=2),
    'body': style('body', spaceAfter=7),
    'item': style('item', leftIndent=13, bulletIndent=1, spaceAfter=3.5, bulletFontName=SANS, bulletColor=ACCENT),
    'check': style('check', spaceAfter=0),
    'nota': style('nota', fontSize=9.5, leading=13.5, textColor=MUTED, spaceBefore=2, spaceAfter=8),
    'h1': style('h1', fontName=SERIF_SB, fontSize=20, leading=25, textColor=TITLE, spaceBefore=4, spaceAfter=10,
                keepWithNext=1),
    'h2': style('h2', fontName=SERIF_SB, fontSize=13.5, leading=17, textColor=TITLE, spaceBefore=12, spaceAfter=5,
                keepWithNext=1),
    'h2f': style('h2f', fontName=SERIF_SB, fontSize=13.5, leading=17, textColor=TITLE, spaceBefore=6, spaceAfter=5,
                 keepWithNext=1),
    'h3': style('h3', fontName=SERIF_SB, fontSize=12, leading=15, textColor=TITLE, spaceAfter=6),
    'label': style('label', fontName=SANS_SB, fontSize=9.5, leading=12.5),
    'th': style('th', fontName=SANS_SB, fontSize=9.5, leading=12, textColor=TITLE),
    'cell': style('cell', fontSize=10, leading=13.5),
    'cellb': style('cellb', fontName=SANS_SB, fontSize=10, leading=13.5),
    'step': style('step', fontName=SANS_B, fontSize=10.5, leading=13, textColor=ACCENT, spaceAfter=2),
    'stepbody': style('stepbody', fontSize=9.5, leading=13),
}


def P(text, st='body', **kw):
    return Paragraph(text, S[st], **kw)


def bullets(items):
    return [Paragraph(t, S['item'], bulletText='•') for t in items]


# Elementos para llenar --------------------------------------------------------------------
class Lines(Flowable):
    """Etiqueta (con indicación opcional) y renglones a todo el ancho disponible."""

    def __init__(self, label, n=1, hint=None, row=ROW, pad=5):
        super().__init__()
        self.label, self.n, self.hint, self.row, self.pad = label, n, hint, row, pad

    def wrap(self, aw, ah):
        text = self.label
        if self.hint:
            text += f'<font name="{SANS}" color="#59667c">   {self.hint}</font>'
        self.p = Paragraph(text, S['label'])
        _, self.ph = self.p.wrap(aw, ah)
        self.aw = aw
        self.height = self.ph + self.n * self.row + self.pad
        return aw, self.height

    def draw(self):
        c = self.canv
        self.p.drawOn(c, 0, self.height - self.ph)
        c.setStrokeColor(RULE)
        c.setLineWidth(0.9)
        for i in range(1, self.n + 1):
            y = self.height - self.ph - i * self.row
            c.line(0, y, self.aw, y)


class FieldRow(Flowable):
    """Varios campos en una fila: etiqueta arriba, renglón debajo."""

    def __init__(self, fields, n=1, row=ROW, gap=16, pad=5):
        super().__init__()
        self.fields, self.n, self.row, self.gap, self.pad = fields, n, row, gap, pad

    def wrap(self, aw, ah):
        self.aw = aw
        self.height = 12.5 + self.n * self.row + self.pad
        return aw, self.height

    def draw(self):
        c = self.canv
        total = sum(w for _, w in self.fields)
        avail = self.aw - self.gap * (len(self.fields) - 1)
        x = 0
        for label, weight in self.fields:
            w = avail * weight / total
            if stringWidth(label, SANS_SB, 9.5) > w:
                raise ValueError(f'La etiqueta no cabe en su campo: {label}')
            c.setFont(SANS_SB, 9.5)
            c.setFillColor(INK)
            c.drawString(x, self.height - 9.5, label)
            c.setStrokeColor(RULE)
            c.setLineWidth(0.9)
            for i in range(1, self.n + 1):
                y = self.height - 12.5 - i * self.row
                c.line(x, y, x + w, y)
            x += w + self.gap


def draw_box(c, x, y, size=9.5):
    c.setStrokeColor(MUTED)
    c.setFillColor(white)
    c.setLineWidth(0.9)
    c.rect(x, y, size, size, stroke=1, fill=1)


class CheckLine(Flowable):
    """Casilla dibujada y texto; el subconjunto latino no trae ☐ ni ✓."""

    def __init__(self, text, st='check', gap=8):
        super().__init__()
        self.text, self.st, self.gap = text, st, gap

    def wrap(self, aw, ah):
        self.p = Paragraph(self.text, S[self.st])
        _, h = self.p.wrap(aw - 9.5 - self.gap, ah)
        self.height = h + 5
        return aw, self.height

    def draw(self):
        st = S[self.st]
        self.p.drawOn(self.canv, 9.5 + self.gap, 5)
        baseline = self.height - st.fontSize  # primera línea
        draw_box(self.canv, 0, baseline - 1.2)


class Choices(Flowable):
    """Opciones con casilla en una sola línea."""

    def __init__(self, options, size=10.5, font=SANS_SB, gap=26, box=9.5):
        super().__init__()
        self.options, self.size, self.font, self.gap, self.box = options, size, font, gap, box

    def wrap(self, aw, ah):
        self.height = max(self.box, self.size) + 3
        self.width = sum(self.box + 6 + stringWidth(o, self.font, self.size) for o in self.options) \
            + self.gap * (len(self.options) - 1)
        return self.width, self.height

    def draw(self):
        c = self.canv
        x = 0
        for opt in self.options:
            draw_box(c, x, 1.5, self.box)
            c.setFont(self.font, self.size)
            c.setFillColor(INK)
            c.drawString(x + self.box + 6, 2.5, opt)
            x += self.box + 6 + stringWidth(opt, self.font, self.size) + self.gap


# Tablas -----------------------------------------------------------------------------------
class T(Table):
    """Tabla con la fuente del sistema fijada; sin esto, reportlab declara Helvetica en las celdas vacías."""

    def __init__(self, *args, **kw):
        super().__init__(*args, **kw)
        self.setStyle(TableStyle([('FONTNAME', (0, 0), (-1, -1), SANS), ('TEXTCOLOR', (0, 0), (-1, -1), INK)]))


def widths(ratios, width):
    total = sum(ratios)
    return [width * r / total for r in ratios]


def info_table(headers, rows, ratios, width=CW):
    data = [[P(h, 'th') for h in headers]] + [[P(a, 'cellb'), P(b, 'cell')] for a, b in rows]
    t = T(data, colWidths=widths(ratios, width), repeatRows=1)
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEBELOW', (0, 0), (-1, 0), 1, TITLE),
        ('LINEBELOW', (0, 1), (-1, -1), 0.8, RULE),
        ('LEFTPADDING', (0, 0), (0, -1), 0),
        ('LEFTPADDING', (1, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    t.spaceAfter = 8
    return t


def form_table(headers, ratios, rows, width=CW, row=ROW, extra=None):
    """Tabla para llenar a mano. `rows` es un número de filas vacías o una lista de textos para la
    primera columna. `extra(i, j)` puede devolver el contenido de una celda."""
    n = len(headers)
    data = [[P(h, 'th') for h in headers]]
    first = rows if isinstance(rows, list) else [''] * rows
    for i, label in enumerate(first):
        line = [P(label, 'cell') if label else ''] + [''] * (n - 1)
        if extra:
            for j in range(n):
                value = extra(i, j)
                if value is not None:
                    line[j] = value
        data.append(line)
    t = T(data, colWidths=widths(ratios, width), minRowHeights=[20] + [row] * len(first))
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TINT),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEABOVE', (0, 0), (-1, 0), 0.8, RULE),
        ('LINEBELOW', (0, 0), (-1, -1), 0.8, RULE),
        ('LINEBEFORE', (1, 0), (-1, -1), 0.8, RULE),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    t.spaceAfter = 10
    return t


def boxed(flowables, width=CW, pad=14, fill=TINT, border=None):
    t = T([[flowables]], colWidths=[width], cornerRadii=[5, 5, 5, 5])
    cmds = [('LEFTPADDING', (0, 0), (-1, -1), pad), ('RIGHTPADDING', (0, 0), (-1, -1), pad),
            ('TOPPADDING', (0, 0), (-1, -1), pad - 2), ('BOTTOMPADDING', (0, 0), (-1, -1), pad - 4),
            ('BACKGROUND', (0, 0), (-1, -1), fill)]
    if border:
        cmds.append(('BOX', (0, 0), (-1, -1), 1, border))
    t.setStyle(TableStyle(cmds))
    t.spaceBefore = 6
    t.spaceAfter = 12
    return t


# Documento --------------------------------------------------------------------------------
class APJCanvas(Canvas):
    def __init__(self, *args, **kw):
        kw.setdefault('initialFontName', SANS)
        kw.setdefault('initialFontSize', 10.5)
        kw.setdefault('initialLeading', 15)
        kw.setdefault('invariant', 1)
        kw.setdefault('lang', 'es-MX')
        super().__init__(*args, **kw)


def decorate(docname):
    def on_page(c, doc):
        c.saveState()
        c.setFont(SANS_SB, 9)
        c.setFillColor(TITLE)
        c.drawString(ML, H - 42, ORG)
        c.setStrokeColor(RULE)
        c.setLineWidth(0.8)
        c.line(ML, H - 50, W - MR, H - 50)
        if doc.page == 1:
            c.drawImage(str(LOGO), W - MR - 24, H - 46, 24, 24, mask='auto')
        c.setFont(SANS, 9)
        c.setFillColor(MUTED)
        c.drawString(ML, 30, f'{ORG} · {docname} · p. {doc.page}')
        c.restoreState()
    return on_page


class Doc(BaseDocTemplate):
    def __init__(self, target, docname, subject):
        super().__init__(target, pagesize=A4, leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
                         title=f'{docname} · {ORG}', author=ORG, subject=subject,
                         creator='scripts/build-documentos.py', lang='es-MX', invariant=1,
                         initialFontName=SANS, initialFontSize=10.5, initialLeading=15)
        frame = Frame(ML, MB, CW, H - MT - MB, id='cuerpo', leftPadding=0, rightPadding=0, topPadding=0,
                      bottomPadding=0)
        self.addPageTemplates([PageTemplate('pagina', [frame], onPage=decorate(docname))])
        self.toc = {}

    def afterFlowable(self, flowable):
        key = getattr(flowable, 'toc_key', None)
        if key:
            self.toc.setdefault(key, self.page)


def build(filename, docname, subject, story, pages=None):
    doc = Doc(str(OUT / filename), docname, subject)
    doc.build(story, canvasmaker=APJCanvas)
    if pages is not None and doc.page != pages:
        print(f'AVISO {filename}: {doc.page} p.')
    return doc.page


def cover(kicker, title, status):
    return [P(kicker, 'kicker'), P(title, 'title'), P(status, 'status')]


# Guías ------------------------------------------------------------------------------------
def cycle_box():
    cells = [[P(name, 'step'), P(text, 'stepbody')] for name, text in guias.CICLO]
    inner = CW - 28
    t = T([cells], colWidths=[inner / 4] * 4)
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (0, -1), 0),
        ('LEFTPADDING', (1, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('LINEBEFORE', (1, 0), (-1, -1), 0.8, RULE),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    return boxed([P('Cómo se trabaja cada mes', 'h3'), t])


def guide_story(g):
    story = cover('Guía de comisión', g['nombre'], f'{ESTADO} · {FECHA}')
    story += [FieldRow([('Coordinación', 3), ('Periodo', 2)]), Spacer(1, 8), P(g['para_que'], 'lead')]
    story += [P('Qué hace', 'h2'), *bullets(g['hace'])]
    story += [KeepTogether([P('Tu primer mes', 'h2')] + [CheckLine(t) for t in g['primer_mes']])]
    story += [P(g['confirmar_titulo'], 'h2'), *bullets(g['confirmar'])]
    story += [P('Cuida esto', 'h2'), *bullets(g['cuida'])]
    story += [PageBreak()]
    story += [P('Con quién te coordinas', 'h2', ), info_table(['Con quién', 'Para qué'], g['coordina'], [1.3, 3])]
    story += [P('Qué dejar al relevo', 'h2'), *bullets(g['relevo'])]
    story += [Spacer(1, 6), cycle_box()]
    report = [P('Reporte del mes', 'h2'),
              FieldRow([('Mes', 2), ('Quién lo prepara', 3)])]
    for label, hint in guias.REPORTE:
        report.append(Lines(label, 2, hint or g['resultados']))
    story += [KeepTogether(report)]
    return story


# Formato APJ-F01 --------------------------------------------------------------------------
def heading_with(text, flowable, ratio=0.5):
    """Encabezado de sección con un elemento alineado a la derecha en la misma línea."""
    t = T([[P(text, 'h2f'), flowable]], colWidths=[CW * ratio, CW * (1 - ratio)])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'BOTTOM'), ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                           ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                           ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 6)]))
    return t


def form_story():
    f = formato
    side = [FieldRow([('Folio', 1)], pad=2), FieldRow([('Fecha de envío', 1)], pad=0)]
    head = T([[[P(f.CODIGO, 'kicker'), P(f.TITULO, 'title'), P(f'{ESTADO} · {FECHA}', 'status')], side]],
                 colWidths=[CW - 170, 170])
    head.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                              ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0),
                              ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
    story = [head, Spacer(1, 6), P(f.INDICACION, 'body'), Spacer(1, 4)]
    story += [FieldRow(row) for row in f.DATOS]
    story += [Lines(*f.OBJETIVO), FieldRow(f.PUBLICO), FieldRow(f.CUANDO), FieldRow(f.DONDE), Lines(*f.EQUIPO)]
    headers, ratios, n = f.PROGRAMA
    story += [P('Programa', 'h2f'), form_table(headers, ratios, n), Lines(*f.RESULTADO)]
    story += [PageBreak()]

    headers, ratios, n = f.RECURSOS
    yes_no = lambda i, j: Choices(['Sí', 'No'], size=9.5, font=SANS, gap=14, box=8.5) if j == 3 else None  # noqa: E731
    story += [P(f'Recursos y apoyos<font name="{SANS}" size="9.5" color="#59667c">   {f.RECURSOS_NOTA}</font>', 'h2f'),
              form_table(headers, ratios, n, extra=yes_no)]

    headers, ratios, n = f.PRESUPUESTO
    budget = form_table(headers, ratios, [''] * n + ['Total'])
    budget.setStyle(TableStyle([('LINEABOVE', (0, -1), (-1, -1), 1, TITLE)]))
    budget._cellvalues[-1][0] = P('Total', 'cellb')
    no_money = Choices(['No requiere dinero'])
    no_money.hAlign = 'RIGHT'
    story += [heading_with('Presupuesto', no_money), budget]

    third = CW / 3
    items = [CheckLine(t) for t in f.LISTA_PREVIA]
    rows = [items[i:i + 3] + [''] * (3 - len(items[i:i + 3])) for i in range(0, len(items), 3)]
    checklist = T(rows, colWidths=[third] * 3, hAlign='LEFT')
    checklist.setStyle(TableStyle([('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                                   ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    story += [P('Lista previa', 'h2f'), checklist, Lines(*f.PENDIENTES)]
    story += [FieldRow([('Nombre y firma de quien propone', 3), ('Fecha', 1.3)], row=24)]

    choices = Choices(f.DECISIONES)
    choices.hAlign = 'RIGHT'
    top = T([[P('Decisión del Comité', 'h3'), choices]], colWidths=[(CW - 28) * 0.4, (CW - 28) * 0.6])
    top.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'BOTTOM'), ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                             ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                             ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
    decision = [top,
                Lines('Condiciones o ajustes', 2),
                FieldRow([('Nombre', 3), ('Cargo', 3)]),
                FieldRow([('Fecha', 1.5), ('Firma', 3), ('Referencia del acuerdo', 2.6)], row=26, pad=0)]
    box = boxed(decision, fill=white, border=RULE)
    box.spaceBefore, box.spaceAfter = 4, 4
    story += [box]
    story += [KeepTogether([P('Cierre', 'h2f'), FieldRow(f.CIERRE, pad=0)])]
    return story


# Bases y anexos -------------------------------------------------------------------------
def block_flowables(block):
    kind = block[0]
    if kind == 'h1':
        p = P(block[1], 'h1')
        p.toc_key = block[1]
        return [CondPageBreak(260), p]
    if kind == 'anexo':
        _, code, name = block
        p = P(name, 'h1')
        p.toc_key = f'{code} · {name}'
        return [PageBreak(), P(code, 'kicker'), p]
    if kind == 'h2':
        return [P(block[1], 'h2')]
    if kind == 'p':
        return [P(block[1])]
    if kind == 'nota':
        return [P(block[1], 'nota')]
    if kind == 'lista':
        return bullets(block[1])
    if kind == 'tabla':
        _, headers, rows, ratios = block
        return [info_table(headers, rows, ratios)]
    if kind == 'campos':
        return [FieldRow(block[1])]
    if kind == 'renglones':
        _, label, n, hint = block
        return [Lines(label, n, hint)]
    if kind == 'formtabla':
        _, heading, headers, ratios, rows = block
        out = [P(heading, 'label'), Spacer(1, 4)] if heading else []
        return [KeepTogether(out + [form_table(headers, ratios, rows)])]
    if kind == 'recuadro':
        _, heading, text = block
        box = boxed([P(heading, 'h3'), P(text, 'cell')])
        box.toc_key = heading
        return [Spacer(1, 6), box]
    if kind == 'firmas':
        return [Spacer(1, 10)] + [FieldRow([(label, 1)], row=34) for label in block[1]]
    raise ValueError(kind)


def bases_story(toc):
    story = cover('Comisiones · base permanente y anexos', bases.TITULO, bases.ESTADO)
    story += [P(text) for _, text in bases.PORTADA]
    entries = [b[1] for b in bases.CUERPO if b[0] == 'h1']
    for b in bases.ANEXOS:
        if b[0] == 'anexo':
            entries.append(f'{b[1]} · {b[2]}')
        elif b[0] == 'recuadro':
            entries.append(b[1])
    rows = [[P(e, 'cell'), P(str(toc.get(e, '')), 'cell')] for e in entries]
    t = T(rows, colWidths=[CW - 50, 50])
    t.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, -1), 0.8, RULE), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                           ('ALIGN', (1, 0), (1, -1), 'RIGHT'), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                           ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    story += [P('Contenido', 'h2'), t, PageBreak()]
    for block in bases.CUERPO + bases.ANEXOS:
        story += block_flowables(block)
    return story


def build_bases():
    name = 'bases-y-anexos.pdf'
    docname = 'Bases de operación'
    subject = 'Base permanente y anexos de las comisiones, para aprobación del Comité'
    probe = Doc(BytesIO(), docname, subject)
    probe.build(bases_story({}), canvasmaker=APJCanvas)
    pages = build(name, docname, subject, bases_story(probe.toc))
    return name, pages


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    for key, g in guias.GUIAS.items():
        name = f'guia-{key}.pdf'
        results.append((name, build(name, f'Guía de {g["nombre"]}', f'Guía de la comisión de {g["nombre"]}',
                                    guide_story(g), pages=2)))
    results.append(('formato-evento.pdf', build('formato-evento.pdf', 'Formato de evento APJ-F01',
                                                'Formato para proponer una actividad', form_story(), pages=2)))
    results.append(build_bases())
    for name, pages in results:
        print(f'{name}: {pages} p.')


if __name__ == '__main__':
    main()
