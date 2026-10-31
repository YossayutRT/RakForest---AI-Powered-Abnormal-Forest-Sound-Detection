> เอกสารประวัติ ณ วันที่ระบุ ความสามารถอาจต่างจากเว็บปัจจุบัน ดู [ผลตรวจล่าสุด](../VERIFICATION.md)

# ผลตรวจ RakForest ต้นแบบ

วันที่ 17 ตุลาคม 2569

## ผลตรวจ

- Production build ด้วย Next.js 16.4.2 / Webpack: ผ่าน
- TypeScript: ผ่าน
- Playwright บน Edge: 4 ชุดผ่าน ใช้เวลา23.6วินาทีในรอบสุดท้าย
- ตรวจภาพหน้าจอ Desktop1440px และ Mobile390px แล้ว ไม่มี horizontal overflow ในหน้าที่ทดสอบ

## เส้นทางที่ยืนยันด้วย browser test

1. อัปโหลดWAV → รีเฟรชระหว่างประมวลผล → ผลจำลอง → เล่นไฟล์ที่บันทึกไว้ → ส่งงานโดยยังไม่เชื่อมTelegramจำลอง → สลับภาคสนามเชื่อมจำลอง → ส่วนกลางลองส่งใหม่ → รับทราบ → จำลองส่งผลล้มเหลวแล้วข้อมูลฟอร์มยังอยู่ → ส่งผลพร้อมภาพ → รีเฟรชเห็นภาพ → ส่วนกลางปิดงาน
2. ปฏิเสธไฟล์TXT → จำลองวิเคราะห์ล้มเหลว → รีเฟรชแล้วยังเห็นงานล้มเหลว → retryสำเร็จ → ตัวกรองไม่พบข้อมูล → resetข้อมูลว่างและลบattachments
3. Mobileไม่ล้นจอ → ภาคสนามเปิดงานที่ไม่ได้รับไม่ได้ → routeguardเปลี่ยนไปหน้าบทบาทที่เลือก → เลือกเสาBบนหน้าจอแผนที่ → DesktopแสดงMapLibreและเสาครบ
4. ใช้Tab/Enterเลือกบทบาทได้ และดับเบิลคลิกส่งงานสร้างnotification attemptเพียงหนึ่งรายการ

## การแก้ไขระหว่างตรวจ

- Turbopack subprocessบนWindowsมีปัญหา จึงใช้Webpackสำหรับdev/build
- ผูกlabelช่องหมายเหตุให้ชัดเจน ปรับตัวเลือกในtestไม่ให้ชนNext.js route announcer
- fitBoundsแผนที่ให้เห็นเสาทั้ง3จุด และรอmap idleก่อนบันทึกภาพทดสอบ
- ไม่เขียนSnapshotพร้อมBlobซ้ำในการpollถ้าไม่มีงานวิเคราะห์เปลี่ยนสถานะ

## ขอบเขตของผลตรวจ

เป็นการตรวจ UI → mock service → IndexedDB → UI ในbrowserเดียว ไม่มีAPIจริง ไม่มีserver authorization ไม่มีการส่งTelegramหรือ inferenceจริง ไม่ใช่ผลตรวจsecurity/production readiness ไม่ใช่การตรวจaccessibilityครบWCAG

ชุดทดสอบอยู่ tests/demo.spec.ts; ภาพจากแอปจริงอยู่ docs/app-preview

## Thailand station management — 2026-10-17

Implemented and verified: office station form → Thailand GeoJSON validation → service validation → IndexedDB v2 → map/upload/dashboard; upload captures station snapshot → historical incident detail retains coordinates after station changes.

- Production Webpack build and TypeScript: passed. Build required host execution because sandbox denied creation of a .next subdirectory.
- Seven Playwright scenarios passed across focused runs (four existing flows, new station lifecycle, v1 migration/boundary outage, duplicate/storage failure/map picking/field controls).
- New lifecycle tested Koh Samui [100,9.5] accepted; Vientiane [102.6331,17.9757] rejected; new station audio uploaded; station moved to Bangkok and disabled; historical result retained island coordinates and radius; refresh preserved station; disabled station removed from new upload choices.
- Migration retained incident data and Blob attachments. Boundary HTTP 503 retained form; retry after recovery succeeded.
- Duplicate ID rejected. Injected IndexedDB put failure retained form. Map clicks populated coordinates only while editing; cancel did not persist changes. Field UI had no add/edit controls.
- Mobile 390px layout checked for horizontal overflow and screenshot inspected. Prior keyboard role entry and mobile role guard scenarios passed.
- Automated tests stub OSM tiles; they verify map rendering/controls and real local country geometry, not external tile availability. The application requests real HTTPS OSM tiles in normal use. No automatic tile scraping or offline prefetch.
- Boundary SHA256 matches upstream Git LFS object; source/version/license in public/data/README.md. Reserved-forest WMS remains unconnected.
- Initial failures were test locator mismatches (select label and error banner containing a retry button); locators corrected and affected tests passed on rerun.
