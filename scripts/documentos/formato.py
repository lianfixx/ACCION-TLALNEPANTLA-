# Contenido del Formato de evento APJ-F01 (public/documentos/formato-evento.pdf).
# Los campos marcados como «portal» existen en Mi comisión › Actividades (lib/workspace-shared.ts:
# título, sede, inicio, fin y los ocho campos de workFields.event). El resto es solo de papel.

CODIGO = 'APJ-F01'
TITULO = 'Formato de evento'
INDICACION = 'Llénalo a mano o en Mi comisión › Actividades. El evento se anuncia hasta que esté autorizado.'

# Página 1
# Folio y fecha de envío van junto al título.
DATOS = [
    [('Nombre de la actividad', 1)],                                  # portal: título
    [('Comisión', 2), ('Responsable', 2.6), ('Contacto', 2)],
]
OBJETIVO = ('Qué quieres lograr', 2)                                  # portal: objective
PUBLICO = [('A quién va dirigida', 4), ('Aforo esperado', 1.4)]      # portal: audience
CUANDO = [('Fecha', 2), ('Hora de inicio', 1.4), ('Hora de fin', 1.4)]  # portal: inicio y fin
DONDE = [('Sede', 3), ('Sala o espacio', 2)]                          # portal: sede
EQUIPO = ('Quién se hace cargo y cómo se reparten las tareas', 1)     # portal: responsible
PROGRAMA = (['Hora', 'Actividad', 'Responsable'], [1, 3.6, 2], 8)    # portal: program
RESULTADO = ('Cómo sabrás si se cumplió el objetivo', 2)              # portal: result

# Página 2
RECURSOS = (['Concepto', 'Cantidad', 'Quién lo aporta', '¿Confirmado?'], [3, 1.1, 2.4, 1.3], 4)  # portal: resources
RECURSOS_NOTA = 'Materiales, transporte, alimentos y apoyos que deban confirmarse.'
PRESUPUESTO = (['Concepto', 'Monto', 'Fuente o forma de pago'], [3.4, 1.3, 3], 3)                # portal: budget
LISTA_PREVIA = [
    'Sede confirmada por escrito',
    'Invitaciones enviadas',
    'Difusión con Comunicación',
    'Permisos de imagen',
    'Registro probado',
]
PENDIENTES = ('Invitaciones, permisos y pendientes por confirmar', 1)  # portal: permissions
DECISIONES = ['Autorizado', 'Con ajustes', 'No autorizado']
CIERRE = [('Asistencia total', 2), ('Gasto real', 2), ('Dónde quedaron las evidencias', 4)]
