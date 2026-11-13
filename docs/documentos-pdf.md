# Documentos PDF de las comisiones

Los ocho PDF de `public/documentos` salen de `scripts/build-documentos.py` (13-nov-2026). No se editan a mano.

## Regenerar

`python3 scripts/build-documentos.py`. Solo pide reportlab. El script falla si una guía o el formato no caben en dos páginas, o si una etiqueta no cabe en su campo. Revisa el resultado con `pdftoppm -r 70` y `pdffonts` (solo deben aparecer SourceSans3 y SourceSerif4).

El contenido está en `scripts/documentos/`: `guias.py` (seis comisiones, ciclo del mes y reporte), `formato.py` (APJ-F01) y `bases.py` (base y anexos A a F). Para corregir un texto, edita ese archivo y vuelve a generar.

## Fuentes

Source Sans 3 (400, 600, 700) y Source Serif 4 (400, 600) en `scripts/fonts/`, instancias estáticas de las fuentes variables del sitio (`@fontsource-variable`). Licencia SIL Open Font License 1.1 en `scripts/fonts/OFL.txt`. `scripts/fonts/convertir.py` las regenera si cambia esa versión; necesita fonttools y brotli en un entorno virtual aparte.

## Contenido

- `guia-<comisión>.pdf` (6, A4, 2 p.): para qué existe, qué hace, primer mes con casillas, qué confirmar, riesgos propios, con quién se coordina, qué dejar al relevo, ciclo del mes y reporte mensual para llenar.
- `formato-evento.pdf` (APJ-F01, A4, 2 p.): datos, programa, recursos, presupuesto, lista previa, firma, decisión del Comité y cierre.
- `bases-y-anexos-para-aprobacion.pdf` (A4, 13 p.): portada con contenido, siete páginas de base y anexos A a F. El Anexo C remite al APJ-F01.

## Pendiente

- Aprobación del Comité de las bases, las guías y el formato. Los campos de acuerdo, firmas, nombres y fechas están en blanco a propósito; al aprobarse, cambiar `ESTADO` y `FECHA` en el script y `ESTADO` en `bases.py`.
- Decidir si los campos nuevos del APJ-F01 (folio, aforo, sala, tablas de programa, recursos y presupuesto, lista previa, firmas y cierre) pasan a Mi comisión › Actividades. Hoy el portal tiene título, sede, inicio, fin y los ocho campos de `workFields.event`.
