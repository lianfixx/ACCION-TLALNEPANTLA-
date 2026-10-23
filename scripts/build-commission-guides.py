from pathlib import Path
import json, re
from html import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether, PageBreak, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
root=Path(__file__).resolve().parent.parent
out=root/'public/documentos';out.mkdir(exist_ok=True)
data=json.loads((root/'lib/commission-guides.ts').read_text().split('>=',1)[1].strip().rstrip(';'))
names={'gobierno':'Gobierno','administracion':'Administración','comunicacion':'Comunicación','cultura':'Cultura','tecnologia':'Tecnología e IA','mujeres':'Mujeres al frente'}
pdfmetrics.registerFont(TTFont('APJ','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('APJ-Bold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
blue=HexColor('#084080');ink=HexColor('#16334e')
styles={
 'title':ParagraphStyle('title',fontName='APJ-Bold',fontSize=28,leading=32,textColor=blue,spaceAfter=18),
 'h':ParagraphStyle('h',fontName='APJ-Bold',fontSize=12,leading=17,textColor=ink,spaceBefore=15,spaceAfter=6),
 'p':ParagraphStyle('p',fontName='APJ',fontSize=10,leading=15,textColor=ink,spaceAfter=8),
 'small':ParagraphStyle('small',fontName='APJ',fontSize=8,leading=12,textColor=HexColor('#516c80'),spaceAfter=6),
}
def para(text,style='p'): return Paragraph(escape(text),styles[style])
def frame(c,d):
 c.setStrokeColor(blue);c.setLineWidth(2);c.line(45,796,550,796)
 c.setFont('APJ-Bold',9);c.setFillColor(blue);c.drawString(45,809,'ACCIÓN POLÍTICA JUVENIL')
 c.setFont('APJ',8);c.drawRightString(550,809,'TLALNEPANTLA')
 c.setFillColor(HexColor('#516c80'));c.drawString(45,29,'Versión 1.2 · 9 de octubre de 2026 · Proyecto para aprobación del Comité');c.drawRightString(550,29,str(d.page))
def build(name,story):
 doc=SimpleDocTemplate(str(out/name),pagesize=(595,842),rightMargin=45,leftMargin=45,topMargin=65,bottomMargin=50,title=name.removesuffix('.pdf').replace('-',' '),author='Acción Política Juvenil Tlalnepantla')
 doc.build(story,onFirstPage=frame,onLaterPages=frame)
for key,name in names.items():
 g=data[key];story=[para(name,'title'),para('Guía de la comisión · Comité Directivo Municipal del PAN en Tlalnepantla de Baz','small'),para('Para su adopción institucional, el Comité deberá aprobar esta versión e identificar a la persona responsable. La guía orienta el trabajo interno; no concede un nombramiento ni facultades de representación.','small'),para('Periodo __________________  Responsable __________________','small'),para('Acuerdo __________________  Fecha de aprobación ____________','small')]
 for field,title in [('start','Para empezar'),('approval','Qué debes confirmar'),('support','Con quién te coordinas'),('report','Qué incluir en el reporte mensual'),('handover','Qué dejar al siguiente equipo')]:
  story.append(KeepTogether([para(title,'h'),para(g[field])]))
 story+=[PageBreak(),para('Tu espacio de trabajo','title')]
 steps=[('Registro y revisión','Crea tu usuario y contraseña. Este registro personal es para personas con 18 años cumplidos. Completa tu solicitud con entidad, municipio, disponibilidad y comisión. Si te interesa coordinar, presenta tus tres propuestas. En tu cuenta encontrarás el folio y las respuestas.'),('Documentos personales','En Documentos personales puedes adjuntar la INE por ambos lados y el comprobante de domicilio después de leer y aceptar el aviso específico. Los revisa administración; tu equipo no tiene acceso a esos archivos.'),('Incorporación al equipo','Administración revisa la solicitud. Para habilitar o restablecer la comisión, debe marcar como revisados los tres documentos vigentes más recientes: INE frente, INE reverso y domicilio. La coordinación se asigna expresamente. El registro interno no sustituye una designación ni la toma de protesta prevista en el Comité.'),('Actividades y autorizaciones','Abre Actividades y elige Formato de evento o Consulta o autorización. Guarda la propuesta, envíala a revisión y responde los ajustes en la misma conversación. Un espacio está confirmado cuando administración lo registra así.'),('Evidencias y reporte mensual','Adjunta documentos de trabajo en la actividad correspondiente. En el reporte del mes explica lo realizado, los recursos utilizados y lo pendiente. Evita identificaciones, datos sensibles y listas personales en archivos compartidos.'),('Último paso del registro','La entrega del comprobante, el registro de folio y su revisión en Afiliación PAN requieren comisión activa y los tres documentos vigentes revisados. Realiza el trámite en la app oficial; si ya estás afiliado, entrega el comprobante sin repetirlo. Este paso se completa cuando administración revisa el comprobante; un folio o acuse sólo da seguimiento. Si después falta, vence o requiere corrección un documento personal, PAN queda pendiente. La comisión ya activa conserva sus actividades.'),('Entrega y continuidad','Prepara una Entrega de comisión con resultados, pendientes e instrucciones útiles. Administración revisa el cierre y el archivo queda disponible para el siguiente equipo activo durante su plazo. Descarga la entrega antes de la fecha de vencimiento que muestra el sistema.')]
 # Place the final onboarding step immediately after commission confirmation.
 steps.insert(3,steps.pop(5))
 for title,body in steps:story.append(KeepTogether([para(title,'h'),para(body)]))
 build('guia-'+key+'.pdf',story)
story=[para('Formato de Evento','title'),para('APJ-F01 · Comité Directivo Municipal del PAN en Tlalnepantla de Baz','small'),para('Versión 1.2 · 9 de octubre de 2026 · Para aprobación · Periodo __________ · Folio interno __________','small'),para('Completa este formato en Actividades dentro de Mi comisión. Esta copia sirve para preparar la propuesta o trabajarla durante una reunión.','p')]
fields=[('Nombre de la actividad',''),('Comisión y persona responsable',''),('Objetivo y a quién se dirige',''),('Fecha, horario de inicio y fin',''),('Lugar y sala solicitados',''),('Programa, horarios y responsables',''),('Materiales, transporte, alimentos y otros apoyos',''),('Presupuesto y cómo se cubrirá',''),('Invitaciones, permisos y pendientes por confirmar',''),('Cómo se revisará el resultado','')]
for index,(title,_) in enumerate(fields):
 if index==5:story.append(PageBreak())
 story.append(para(title,'h'))
 table=Table([['']]* (2 if index<5 else 3),colWidths=[505],rowHeights=18)
 table.setStyle(TableStyle([('LINEBELOW',(0,0),(-1,-1),.4,HexColor('#ccd9e3'))]));story.append(table)
story += [Spacer(1,15),para('Revisión del Comité','h'),para('Registrar la decisión, sus condiciones, el nombre y cargo de quien autoriza, la fecha y la referencia del acuerdo o facultad aplicable. Presentar el formato no confirma el espacio ni autoriza gastos.','p'),Spacer(1,32),para('Al terminar, adjunta las evidencias y registra los resultados en la misma actividad.','small')]
build('formato-evento.pdf',story)
print('Generated',len(names)+1,'PDF files')
