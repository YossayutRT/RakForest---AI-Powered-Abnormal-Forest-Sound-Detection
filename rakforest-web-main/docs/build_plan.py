from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path

out = Path(__file__).parent
doc = Document()
s = doc.sections[0]
s.page_height = Cm(29.7); s.page_width = Cm(21)
s.top_margin = s.bottom_margin = Cm(2)
s.left_margin = s.right_margin = Cm(2.2)
for name in ['Normal','Title','Heading 1','Heading 2']:
    st=doc.styles[name]; st.font.name='Tahoma'; st.font.color.rgb=RGBColor(0,0,0)
    st.element.rPr.rFonts.set(qn('w:eastAsia'),'Tahoma')
    st.element.rPr.rFonts.set(qn('w:cs'),'Tahoma')
doc.styles['Normal'].font.size=Pt(10)
doc.styles['Normal'].paragraph_format.space_after=Pt(7)
doc.styles['Normal'].paragraph_format.line_spacing=1.18
doc.styles['Title'].font.size=Pt(22)
doc.styles['Heading 1'].font.size=Pt(15)
doc.styles['Heading 2'].font.size=Pt(12)
def p(t): doc.add_paragraph(t)
def h(t): doc.add_heading(t,1)
def table(headers,rows,widths):
    t=doc.add_table(rows=1, cols=len(headers)); t.autofit=False
    for c,w in zip(t.columns,widths): c.width=Cm(w)
    for c,v in zip(t.rows[0].cells,headers): c.text=v
    rep=OxmlElement('w:tblHeader'); t.rows[0]._tr.get_or_add_trPr().append(rep)
    for row in rows:
        for c,v in zip(t.add_row().cells,row): c.text=v
    for i,r in enumerate(t.rows):
        for c,w in zip(r.cells,widths):
            c.width=Cm(w)
            pr=c._tc.get_or_add_tcPr()
            b=OxmlElement('w:tcBorders')
            for edge in ['top','left','bottom','right']:
                e=OxmlElement('w:'+edge); e.set(qn('w:val'),'single');e.set(qn('w:sz'),'4');e.set(qn('w:color'),'D9D9D9');b.append(e)
            pr.append(b)
            shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'DFEAF2' if i==0 else 'FFFFFF');pr.append(shade)
            for para in c.paragraphs:
                para.paragraph_format.space_after=Pt(5);para.paragraph_format.space_before=Pt(5)
                for run in para.runs: run.font.size=Pt(9);run.bold=(i==0)
    doc.add_paragraph()

doc.add_heading('แผนระบบ RakForest สำหรับหารือกับทีม',0)
p('แนวทาง CNN และ Web app สำหรับโครงงานมหาวิทยาลัยปี 4')
p('วันที่ 12 ตุลาคม 2569')
p('เอกสารนี้เสนอแนวทางระบบจำแนกเสียงเพื่อช่วยแจ้งเตือนเหตุการณ์ในป่า และขอบเขต Web app ที่พัฒนาได้ก่อนโมเดลพร้อม ทีมควรใช้เอกสารนี้ตกลงจำนวนคลาส รูปแบบข้อมูล และวิธีแจ้งเตือนก่อนเริ่มเชื่อมระบบจริง')
h('1 เป้าหมายและสถานะปัจจุบัน')
p('เป้าหมายคือรับเสียงจากป่า จำแนกประเภทเสียงด้วย CNN และส่งผลให้ผู้ใช้งานตรวจสอบผ่านเว็บ คลาสหลักที่สนใจคือเสียงไฟ เสียงเลื่อยยนต์ และเสียงยานพาหนะ การตรวจพบเสียงเป็นหลักฐานสำหรับตรวจสอบเพิ่มเติม ไม่ได้ยืนยันเหตุไฟป่าหรือการกระทำผิดโดยตัวมันเอง')
p('ไฟล์ Data Progress เป็น notebook ที่ export เป็น Python ครอบคลุมการรวบรวมข้อมูล 7 แหล่ง การรวม label การสำรวจและทำความสะอาดข้อมูล การตรวจข้อมูลซ้ำ และการแบ่ง train validation test แบบ group aware ในสัดส่วนเป้าหมาย 70 ต่อ 15 ต่อ 15 ไฟล์ยังไม่ได้สร้างหรือเทรนโมเดล และการผ่าน Data Gate ต้องยืนยันจากผลรันจริง')
p('ข้อมูลเตรียมไว้ 10 คลาส ได้แก่ fire, chainsaw, vehicle, threat_tactical, weather, natural_ambient, human_activity, domestic_noise, silence และ other จำนวนคลาสที่ใช้ฝึกจริงต้องให้ทีมยืนยัน')
h('2 ขอบเขตงานเว็บระยะแรก')
p('พัฒนาเว็บด้วยข้อมูลจำลองที่ระบุชัดเจนว่าเป็นข้อมูลสาธิต เตรียมหน้า Dashboard รายการเหตุการณ์ รายละเอียดผลทำนาย และสถานะรับทราบหรือปิดเหตุการณ์ หน้าจอและสถานะเหล่านี้เป็นข้อเสนอสำหรับทีม ไม่ใช่ข้อกำหนดที่ยืนยันแล้ว')
p('วางชั้น service ระหว่างหน้าจอกับข้อมูล เพื่อเปลี่ยนจาก mock data เป็น API ในภายหลัง ชุดข้อมูลฝึกและ notebook อยู่ในส่วน ML ส่วนเว็บรับผลทำนายและข้อมูลเหตุการณ์ ไม่ต้องนำ dataset ฝึกทั้งหมดเข้ามาในเว็บ')
p('ยังไม่กำหนดอุปกรณ์ภาคสนาม การส่งเสียงต่อเนื่อง ช่องทางแจ้งเตือนภายนอก หรือการติดตั้ง production จนกว่าทีมจะตกลงขอบเขตการสาธิต')

doc.add_page_break()
h('3 แนวทางประมวลผลด้วย CNN')
p('เสียงจากป่า → เตรียมเสียง → Mel Spectrogram → CNN → คะแนนแต่ละคลาส → กติกาแจ้งเตือน → API และฐานข้อมูล → Web app')
p('Data Progress กำหนดเสียงเป็น mono อัตราสุ่ม 16 kHz และคลิปละ 4 วินาที หรือ 64,000 samples ฝั่ง inference ต้องใช้การเตรียมเสียงตรงกับตอนฝึก รวมถึงกติกาตัดคลิป padding และ normalization ตาม configuration ของโมเดล')
p('ทีม ML ต้องกำหนดจำนวน mel bins, FFT size, hop length, การแปลงเป็น log scale และรูปทรง input ของ CNN เพิ่มเติม ค่าเหล่านี้ยังไม่ได้ตกลงในบทสนทนา จึงควรบันทึกเป็น configuration ที่ใช้ร่วมกันทั้งตอนฝึกและทำนาย')
p('ข้อเสนอเริ่มต้นคือเลือกคลาสหลักหนึ่งประเภทต่อคลิปและใช้ Softmax ซึ่งคะแนนทุกคลาสรวมเป็น 1 หากต้องตรวจหลายเสียงพร้อมกัน ต้องเปลี่ยนเป็น multi label พร้อม label และการฝึกที่รองรับ ไม่ใช่เปลี่ยนเฉพาะหน้าจอเว็บ')
table(['ตัวอย่างผลสาธิต','คะแนน'],[['chainsaw','90%'],['natural_ambient','7%'],['vehicle','3%']],[11,5.6])
p('ตัวเลขข้างต้นเป็นตัวอย่างจากแนวคิดการทำงาน ไม่ใช่ผลทดสอบโมเดลจริง และแสดงเพียง 3 คลาสเพื่ออธิบาย หากฝึก 10 คลาส API ต้องส่งคะแนนครบ 10 คลาส คะแนน 90% ไม่ได้ยืนยันว่าทำนายถูก 90% จนกว่าจะประเมินการปรับเทียบคะแนน')
h('4 กติกาแจ้งเตือน')
p('แยกผลจำแนกเสียงออกจากเหตุการณ์แจ้งเตือน Backend ควรพิจารณาคลาสเป้าหมาย คะแนนขั้นต่ำ การพบซ้ำในคลิปต่อเนื่อง และช่วงพักการแจ้งเตือน เพื่อควบคุม false alarm และลดเหตุการณ์ซ้ำ เกณฑ์ตัวเลขต้องเลือกจากผล validation และเป้าหมายการใช้งาน')
p('คลาสบริบทให้เก็บเป็นผลตรวจพบโดยไม่แจ้งภัยอัตโนมัติในข้อเสนอระยะแรก ส่วน threat_tactical ต้องให้ทีมตัดสินใจเป็นพิเศษ เจ้าหน้าที่ควรรับทราบเหตุการณ์ ตรวจสอบ และระบุว่าเป็นเหตุจริงหรือแจ้งเตือนผิดได้')
p('การประเมินควรดู precision recall และ confusion matrix รายคลาส รวมถึง false alarm และเวลาตั้งแต่รับเสียงถึงแสดงผล แยกการตรวจคุณภาพโมเดลออกจากการทดสอบ flow ของเว็บ โดยคงชุด test ไว้ประเมินหลังเลือกโมเดลและเกณฑ์แล้ว')

doc.add_page_break()
h('5 Stack ที่เสนอ')
table(['ส่วน','เทคโนโลยี','หน้าที่'],[
['Frontend','React + TypeScript + Vite','Dashboard และหน้าตรวจสอบเหตุการณ์'],
['รูปแบบหน้าตา','CSS Modules','จัดรูปแบบแต่ละ component'],
['ข้อมูลช่วงแรก','Mock data ผ่าน service','สาธิต flow ก่อนเชื่อม ML'],
['Backend','Python + FastAPI','รับเสียงหรือผลทำนายและจัดการ API'],
['ฐานข้อมูล','PostgreSQL','บันทึกผลทำนายและสถานะเหตุการณ์'],
['อัปเดตหน้าเว็บ','Polling ในต้นแบบ','ดึงเหตุการณ์ใหม่เป็นระยะ']],[3,6,7.6])
p('เริ่มจาก Frontend กับ mock data แล้วเพิ่ม Backend และฐานข้อมูลเมื่อทีมตกลง API ไม่จำเป็นต้องเพิ่มระบบคิวหรือแยกหลายบริการตั้งแต่ต้น แนวทางนี้เป็นข้อเสนอ stack และยังไม่มีการสร้างแอปหรือติดตั้ง dependency')
h('6 รูปแบบข้อมูลที่ควรตกลงร่วมกัน')
p('Prediction ควรมี prediction_id, recorded_at พร้อม timezone, source_id, model_version, predicted_label และ scores ซึ่งใช้ชื่อคลาสตรงกับโมเดล ค่าคะแนนใน API ใช้ช่วง 0 ถึง 1 และเว็บแปลงเป็นเปอร์เซ็นต์ source_id ต้องรองรับแหล่งเสียงสาธิตได้ก่อนมีอุปกรณ์จริง')
p('Alert ควรมี alert_id, prediction_id หรือรายการผลที่ใช้ประกอบการตัดสินใจ, created_at, reason, status และเวลารับทราบ การมี prediction แยกจาก alert ทำให้เก็บเสียงปกติได้และรองรับหลายคลิปที่รวมเป็นเหตุการณ์เดียว')
p('สถานะโมเดลไม่พร้อม การทำนายล้มเหลว และข้อมูลจำลองต้องแสดงชัดเจน ห้ามแสดงผลจำลองเสมือนผลจริง ตำแหน่งจุดตรวจและไฟล์เสียงประกอบเป็นข้อมูลเพิ่มเติมที่ขึ้นกับการเก็บข้อมูลของทีม')
h('7 ลำดับงานและประเด็นสำหรับประชุม')
p('ขั้น 1 ยืนยันผู้ใช้ จำนวนคลาส และวิธีสาธิตว่าจะอัปโหลดไฟล์หรือจำลองเสียงจากจุดตรวจ\nขั้น 2 ตกลง schema ผลทำนายและเหตุการณ์ แล้วออกแบบหน้าจอ\nขั้น 3 ทำเว็บด้วย mock data และทดสอบ flow รับทราบเหตุการณ์\nขั้น 4 ฝั่ง ML เทรนและประเมิน CNN พร้อมบันทึก preprocessing configuration\nขั้น 5 เชื่อม API และทดสอบเสียงเข้าสู่ผลทำนายจนถึงการแจ้งเตือนบนเว็บ')
p('สิ่งที่ทีมต้องตอบคือ ใช้ 10 คลาสหรือปรับชุดคลาส เลือก single label หรือ multi label ใครเป็นผู้รับแจ้งเตือน ใครดูแล Backend และจะวัดความสำเร็จของการสาธิตอย่างไร ยังไม่มีการกำหนดผู้รับผิดชอบหรือวันส่งงานแทนทีม')

doc.add_page_break()
h('8 ข้อจำกัดและสิ่งที่ต้องตรวจเพิ่มเติม')
p('ข้อมูลหลายแหล่งมีความเสี่ยง class imbalance, domain gap และ near duplicate แม้ตรวจ exact duplicate แล้ว การแบ่งข้อมูลต้องป้องกันคลิปจาก recording เดียวกันข้าม split ด้วย metadata เท่าที่หาได้ Notebook ยังไม่ยืนยันผลทดสอบเสียงภาคสนามจริง จึงควรแยกข้อสรุปจาก public dataset ออกจากผลการใช้งานในป่า')
p('ต้องตรวจ label mapping และสิทธิ์ใช้ข้อมูลแต่ละแหล่งเพิ่มเติม โดยเฉพาะข้อมูลเสริมจาก Drive ไฟล์ต้นทางมี credential ฝังอยู่ ควรยกเลิกและออก token ใหม่แล้วเก็บผ่าน Secrets หรือ environment variables เอกสารนี้ไม่คัดลอก credential เหล่านั้น')
h('9 แหล่งอ้างอิงและบันทึกการตัดสินใจ')
p('แหล่งข้อมูลโครงการ: สำเนาของ_rakforest_data_progress_v2.py ที่ทีมส่งมา และแนวทาง CNN ผ่าน Mel Spectrogram ที่หารือในวันที่ 12 ตุลาคม 2569')
p('เอกสารเทคโนโลยีสำหรับอ่านต่อ\nReact TypeScript: https://react.dev/learn/typescript\nVite: https://vite.dev/guide/\nFastAPI: https://fastapi.tiangolo.com/features/\nPostgreSQL: https://www.postgresql.org/docs/current/tutorial.html')
h('บันทึกผลประชุม')
for label in ['ชุดคลาสและวิธีจำแนกที่เลือก','วิธีรับเสียงและรูปแบบการสาธิต','ผู้ใช้และสถานะเหตุการณ์','ผู้รับผิดชอบ Frontend Backend และ ML','เกณฑ์ประเมินและสิ่งที่จะทำในรอบถัดไป']:
    p(label+'\n................................................................................................................')
doc.core_properties.title='แผนระบบ RakForest สำหรับหารือกับทีม'
doc.core_properties.author='RakForest'
doc.save(out/'RakForest_Team_Discussion.docx')
print(out/'RakForest_Team_Discussion.docx')
