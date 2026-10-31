# เตรียมนำ RakForest ขึ้น GitHub

**Repository สำหรับส่วนเว็บ:** [RelaxTimee/rakforest-web](https://github.com/RelaxTimee/rakforest-web) — กำหนดให้เป็น Private และใช้ branch `main` โฟลเดอร์โครงการเชื่อม remote `origin` ไปยัง repo นี้แล้ว คำสั่งสร้าง Git และเพิ่ม remote ด้านล่างเก็บไว้เป็นข้อมูลอ้างอิงสำหรับโครงการใหม่ ไม่ต้องรันซ้ำในโครงการนี้ (`private: true` ใน package.json ป้องกันการ publish แพ็กเกจ npm ไม่ได้กำหนด visibility ของ GitHub)

## ไฟล์ที่จะเก็บร่วมกัน

เก็บ source, tests, `pnpm-lock.yaml`, `package.json`, `.env.example`, config, `AGENTS.md`, `start-rakforest.cmd`, เอกสารกลุ่ม ภาพต้นแบบ ภาพหน้าจอที่ส่งมอบ และข้อมูลขอบเขตประเทศไทยพร้อมเครดิต

[.gitignore](../.gitignore) ยกเว้น `node_modules/`, `.next/`, ผลทดสอบ/cache/log, env ที่ใช้จริง และไฟล์ key/น้ำหนักโมเดลที่กำหนดไว้ ไฟล์ที่ถูก ignore ยังอยู่ในเครื่อง ไม่ได้ถูกลบ และข้อมูลใน IndexedDB ไม่ใช่ไฟล์ของ repository

ห้ามใส่ค่าลับจริงใน `.env.example` ใช้ `.env.local` สำหรับเครื่องตนเอง ภาพ/เสียงที่มีข้อมูลจริงต้องตรวจแยกก่อนเพิ่ม อย่าใช้ `git add -f` เพื่อข้ามข้อยกเว้น โมเดลและข้อมูลฝึกให้กลุ่มเลือกที่เก็บต่างหากตามขนาดและสิทธิ์ ไม่ใส่ลง frontend นี้เพียงเพื่อให้โมเดลทำงาน

[ภาพต้นแบบและเอกสารเก่า](README.md#เอกสารอ้างอิงเก่า) ยังเก็บไว้ ไม่มีการลบอัตโนมัติ `start-rakforest.cmd` มี fallback ค้นหา runtime ภายใต้ `%USERPROFILE%` แต่ไม่มีพาธชื่อผู้ใช้ตายตัว และรันด้วย Node.js ที่ติดตั้งปกติได้ ไม่ต้องติดตั้ง Codex

## ก่อนเริ่ม Git

1. อ่าน [README](../README.md) และทดลองรันเว็บ
2. ตรวจ [ผลตรวจล่าสุด](VERIFICATION.md) และไฟล์ในโฟลเดอร์ที่กำลังจะอัปโหลด
3. ให้กลุ่มตกลงชื่อ repo, เจ้าของ, Public/Private และการเข้าถึงเอกสารกลุ่ม
4. โครงการยังไม่ได้กำหนด LICENSE สำหรับโค้ด อย่าเพิ่มใบอนุญาตเองแทนกลุ่ม ดูสิทธิ์ข้อมูลแผนที่แยกที่ [public/data/README.md](../public/data/README.md)

## เมื่อกลุ่มพร้อมสร้าง repository และอัปโหลด

สร้าง repository **ว่าง** ใน GitHub ตามชื่อ/visibility ที่กลุ่มตกลง โดยไม่สร้าง README, .gitignore หรือ LICENSE เริ่มต้นซ้ำ แล้วคัดลอก URL ของ repo

เปิด Terminal ในโฟลเดอร์โครงการ ตรวจว่าเป็นโฟลเดอร์ถูกต้อง ถ้าเป็น Git repo อยู่แล้วอย่ารัน `git init` ซ้ำ ให้ตรวจ remote/branch เดิมก่อน

```sh
git init -b main
git status --short
```

ถ้า Git แจ้งว่ายังไม่มีชื่อผู้เขียน commit ให้ตั้งค่าเฉพาะ repo นี้ โดยแทนค่าตัวอย่างด้วยชื่อและอีเมลที่ต้องการให้ปรากฏในประวัติ:

```sh
git config user.name "YOUR_NAME"
git config user.email "YOUR_COMMIT_EMAIL"
```

ตรวจว่า ignore ทำงาน แล้วจัดไฟล์เข้ารายการที่จะ commit:

```sh
git check-ignore node_modules/ .next/ .env.local test-results/
git add .
git diff --cached --stat
git diff --cached --name-only
git diff --cached
```

ตรวจรายการจริงอีกครั้ง: ต้องไม่มี `.env.local`, token/key จริง, `node_modules`, build, ผลทดสอบ หรือไฟล์ข้อมูลผู้ใช้ที่กลุ่มไม่ตั้งใจเผยแพร่ `.env.example` ต้องมีแต่ค่าตัวอย่าง Git ignore ไม่เอาไฟล์ที่เคย commit แล้วออกจากประวัติให้เอง

หากเผลอ stage ไฟล์ผิดก่อน commit ครั้งแรก ใช้ `git rm --cached -- "path/to/file"` เพื่อนำออกจากรายการโดยเก็บไฟล์ในเครื่องไว้ แล้วตรวจ `git diff --cached` ใหม่

```sh
git commit -m "Initial RakForest prototype"
```

แทน `<REPOSITORY_URL>` ด้วย URL ของ repository จริงก่อนรัน **อย่าคัดลอก placeholder ไปใช้ตรง ๆ**:

```sh
git remote add origin <REPOSITORY_URL>
git remote -v
git push -u origin main
```

หาก `origin` มีอยู่แล้ว ให้ตรวจ URL ก่อน ไม่เปลี่ยน remote หรือ force push โดยไม่ตรวจประวัติ ถ้า repo ปลายทางไม่ว่าง ให้กลุ่มตกลงวิธีรวมประวัติก่อน หากการเข้าสู่ระบบล้มเหลว ให้ใช้การยืนยันตัวตนของ Git/GitHub ที่เครื่องตั้งไว้ อย่าใส่ token ลงใน URL หรือไฟล์ของโครงการ

## ให้เพื่อนเริ่มจาก repo

หลังอัปโหลดจริงแล้ว เพื่อนสามารถใช้คำสั่งต่อไปนี้ โดยแทน URL และชื่อโฟลเดอร์จาก repo จริง:

```sh
git clone <REPOSITORY_URL>
```

เข้าโฟลเดอร์ที่ clone มา แล้วทำตาม [ขั้นตอนเริ่มรันเว็บ](../README.md#1-เริ่มรันเว็บ) ค่าเริ่มต้น mock ใช้ได้ทันที และข้อมูลสาธิตในเบราว์เซอร์ของแต่ละคนเป็นคนละชุด

## ผลตรวจไฟล์ก่อนอัปโหลด

ผลตรวจในรอบเตรียมไฟล์จะสรุปไว้ที่ [ผลตรวจล่าสุด](VERIFICATION.md) การตรวจนี้ช่วยเตรียมโครงการ ไม่แทนการตรวจ `git diff --cached` จริงในวันที่กลุ่มเลือกอัปโหลด
