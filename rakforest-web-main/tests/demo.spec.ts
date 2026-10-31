import { test, expect, type Page } from "@playwright/test";
test.beforeEach(async ({page})=>{
  await page.route("https://tile.openstreetmap.org/**", route=>route.fulfill({contentType:"image/png",body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=","base64")}));
});
function wav() {
  const data=Buffer.alloc(8044);data.write("RIFF");data.writeUInt32LE(8036,4);data.write("WAVEfmt ",8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(8000,24);data.writeUInt32LE(16000,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write("data",36);data.writeUInt32LE(8000,40);return data;
}
async function login(page:Page,role:"office"|"field") {
  await page.goto("/login");
  await page.getByRole("button",{name:role==="office"?"เจ้าหน้าที่ส่วนกลาง":"เจ้าหน้าที่ภาคสนาม"}).click();
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
}
async function snapshot(page:Page) {
  return page.evaluate(()=>new Promise<any>((resolve,reject)=>{
    const open=indexedDB.open("rakforest-demo-v1");open.onsuccess=()=>{const db=open.result;const req=db.transaction("state").objectStore("state").get("main");req.onsuccess=()=>{resolve(req.result);db.close();};req.onerror=()=>reject(req.error);};
  }));
}
test("upload → dispatch failure → Telegram mock retry → field result → close; files survive reload",async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await login(page,"office");
  await page.goto("/office/upload");
  await page.getByLabel("ไฟล์เสียง",{exact:true}).setInputFiles({name:"forest.wav",mimeType:"audio/wav",buffer:wav()});
  await page.getByRole("button",{name:"ส่งวิเคราะห์จำลอง",exact:true}).click();
  await expect(page.getByRole("link",{name:/เปิดผล RF-004/})).toBeVisible();
  await page.reload();
  await page.getByRole("link",{name:/เปิดผล RF-004/}).click();
  await expect(page.locator("audio")).toHaveAttribute("src",/^blob:/);
  await page.getByRole("button",{name:"ส่งงานและแจ้ง Telegram จำลอง"}).click();
  await expect(page.getByText("ส่งข้อความจำลองไม่สำเร็จ",{exact:true})).toBeVisible();
  expect((await snapshot(page)).incidents.filter((i:any)=>i.id==="RF-004")).toHaveLength(1);
  await login(page,"field");
  await page.getByRole("button",{name:"เชื่อม Telegram จำลอง",exact:true}).click();
  await page.getByRole("button",{name:"จำลองกด Start"}).click();
  await expect(page.getByRole("heading",{name:"เชื่อม Telegram จำลองแล้ว"})).toBeVisible();
  await login(page,"office");await page.goto("/office/incidents/RF-004");
  await page.getByRole("button",{name:"ลองส่งข้อความใหม่"}).click();
  await expect(page.getByText("ส่งข้อความจำลองสำเร็จ",{exact:true})).toBeVisible();
  await login(page,"field");await page.goto("/field/tasks/RF-004");
  await page.getByRole("button",{name:"รับทราบงาน",exact:true}).click();
  await page.getByRole("link",{name:"ส่งผลตรวจสอบ",exact:true}).click();
  await page.getByLabel("ไม่พบเหตุ",{exact:true}).check();
  await page.getByLabel("หมายเหตุ",{exact:true}).fill("ตรวจพื้นที่แล้วไม่พบแหล่งเสียง");
  await page.getByLabel("ภาพประกอบ",{exact:true}).setInputFiles({name:"proof.png",mimeType:"image/png",buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJZkAAAAASUVORK5CYII=","base64")});
  await page.getByLabel("จำลองบันทึกล้มเหลว").check();
  await page.getByRole("button",{name:"ส่งผลตรวจสอบ",exact:true}).click();
  await expect(page.locator(".error-banner")).toContainText("จำลองการบันทึกล้มเหลว");
  await expect(page.getByRole("textbox",{name:"หมายเหตุ",exact:true})).toHaveValue("ตรวจพื้นที่แล้วไม่พบแหล่งเสียง");
  await page.getByLabel("จำลองบันทึกล้มเหลว").uncheck();
  await page.getByRole("button",{name:"ส่งผลตรวจสอบ",exact:true}).click();
  await expect(page.getByRole("heading",{name:"ผลตรวจภาคสนาม"})).toBeVisible();
  await page.reload();await expect(page.getByRole("img",{name:"ภาพประกอบผลตรวจสอบ"})).toBeVisible();
  await login(page,"office");await page.goto("/office/incidents/RF-004");
  await page.getByLabel("เหตุผลปิดงาน").fill("ตรวจผลภาคสนามแล้ว");
  await page.getByRole("button",{name:"ตรวจผลและปิดงาน"}).click();
  await expect(page.getByText("ปิดงาน",{exact:true})).toBeVisible();
  expect((await snapshot(page)).incidents.find((i:any)=>i.id==="RF-004").status).toBe("closed");
  expect(errors).toEqual([]);
});
test("invalid audio, analysis failure/retry, filters and reset empty",async({page})=>{
  await login(page,"office");await page.goto("/office/upload");
  await page.getByLabel("ไฟล์เสียง",{exact:true}).setInputFiles({name:"bad.txt",mimeType:"text/plain",buffer:Buffer.from("not audio")});
  await page.getByRole("button",{name:"ส่งวิเคราะห์จำลอง",exact:true}).click();
  await expect(page.locator("#audio-error")).toContainText("โปรดเลือกไฟล์เสียง");
  await page.getByLabel("ไฟล์เสียง",{exact:true}).setInputFiles({name:"test.wav",mimeType:"audio/wav",buffer:wav()});
  await page.getByLabel("จำลองการวิเคราะห์ล้มเหลว").check();
  await page.getByRole("button",{name:"ส่งวิเคราะห์จำลอง",exact:true}).click();
  await expect(page.getByText("จำลองบริการวิเคราะห์ไม่พร้อม กรุณาลองใหม่")).toBeVisible();
  await page.reload();
  await expect(page.getByText("จำลองบริการวิเคราะห์ไม่พร้อม กรุณาลองใหม่")).toBeVisible();
  await page.getByRole("button",{name:"ลองวิเคราะห์ใหม่"}).click();
  await page.getByRole("link",{name:/เปิดผล RF-004/}).click();
  await page.goto("/office/incidents");
  await page.getByLabel("ค้นหา",{exact:true}).fill("no-such-id");
  await expect(page.getByText("ไม่พบรายการตามตัวกรอง")).toBeVisible();
  await page.getByRole("button",{name:"รีเซ็ตข้อมูลสาธิต"}).click();
  await page.getByRole("button",{name:"เริ่มแบบว่าง"}).click();
  await expect(page.getByText("ไม่มีงานรอตรวจ",{exact:true})).toBeVisible();
  const data=await snapshot(page);expect(data.attachments).toHaveLength(0);expect(data.incidents).toHaveLength(0);
});
test("mobile role guard, map and responsive layouts",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await login(page,"field");
  await page.screenshot({path:"test-results/field-mobile.png",fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.goto("/field/tasks/RF-001");
  await expect(page.getByText("ไม่พบงานหรือไม่มีสิทธิ์เข้าถึง",{exact:false})).toBeVisible();
  await page.goto("/office/dashboard");
  await expect(page).toHaveURL(/field\/tasks/);
  await login(page,"office");await page.goto("/office/map");
  await page.getByRole("button",{name:"เสา B · ST-02",exact:true}).click();
  await expect(page.getByRole("heading",{name:"เสา B",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.setViewportSize({width:1440,height:1000});await page.goto("/office/dashboard");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await page.screenshot({path:"test-results/dashboard-desktop.png",fullPage:true});
});
test("double click dispatch makes one message attempt; keyboard can enter a role",async({page})=>{
  await page.goto("/login");await page.keyboard.press("Tab");await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/office\/dashboard/);
  await page.goto("/office/incidents/RF-001");
  await page.getByRole("button",{name:"ส่งงานและแจ้ง Telegram จำลอง"}).dblclick();
  const data=await snapshot(page);expect(data.notifications.filter((n:any)=>n.incidentId==="RF-001")).toHaveLength(1);
  expect(data.incidents.find((i:any)=>i.id==="RF-001").status).toBe("dispatched");
});

test("Thailand stations: islands, foreign coordinates, history, disabled upload and persistence",async({page})=>{
  await login(page,"office");await page.goto("/office/map");
  await page.getByRole("button",{name:"เพิ่มเสาไมค์",exact:true}).click();
  await page.getByLabel("รหัสเสา",{exact:true}).fill("ISLAND");
  await page.getByLabel("ชื่อเสา",{exact:true}).fill("เสาเกาะสมุย");
  await page.getByLabel("ละติจูด (Latitude)",{exact:true}).fill("17.9757");
  await page.getByLabel("ลองจิจูด (Longitude)",{exact:true}).fill("102.6331");
  await page.getByRole("button",{name:"บันทึกเสา",exact:true}).click();
  await expect(page.getByText("รอบนี้รองรับการติดตั้งเสาเฉพาะประเทศไทย",{exact:true})).toBeVisible();
  await page.getByLabel("ละติจูด (Latitude)",{exact:true}).fill("9.5");
  await page.getByLabel("ลองจิจูด (Longitude)",{exact:true}).fill("100");
  await page.getByLabel("รัศมีรับเสียงโดยประมาณ (เมตร)",{exact:true}).fill("450");
  await page.getByRole("button",{name:"บันทึกเสา",exact:true}).dblclick();
  await expect(page.getByRole("heading",{name:"เสาเกาะสมุย",exact:true})).toBeVisible();
  let data=await snapshot(page);expect(data.stations.filter((s:any)=>s.id==="ISLAND")).toHaveLength(1);
  await page.reload();await expect(page.getByRole("button",{name:"เสาเกาะสมุย · ISLAND",exact:true})).toBeVisible();
  await page.goto("/office/upload");await page.getByRole("combobox",{name:"เสาจำลอง",exact:true}).selectOption("ISLAND");
  await page.getByLabel("ไฟล์เสียง",{exact:true}).setInputFiles({name:"island.wav",mimeType:"audio/wav",buffer:wav()});
  await page.getByRole("button",{name:"ส่งวิเคราะห์จำลอง",exact:true}).click();
  await expect(page.getByRole("link",{name:/เปิดผล RF-004/})).toBeVisible();
  await page.goto("/office/map");await page.getByRole("button",{name:"เสาเกาะสมุย · ISLAND",exact:true}).click();
  await page.getByRole("button",{name:"แก้ไขเสา",exact:true}).click();
  await expect(page.getByLabel("รหัสเสา",{exact:true})).toBeDisabled();
  await page.getByLabel("ละติจูด (Latitude)",{exact:true}).fill("13.7563");
  await page.getByLabel("ลองจิจูด (Longitude)",{exact:true}).fill("100.5018");
  await page.getByLabel("เปิดใช้งานเสา",{exact:true}).uncheck();
  await page.getByRole("button",{name:"บันทึกเสา",exact:true}).click();
  await expect(page.getByText("บันทึกเสาแล้ว",{exact:true})).toBeVisible();
  await page.goto("/office/upload");await expect(page.getByRole("combobox",{name:"เสาจำลอง",exact:true}).locator('option[value="ISLAND"]')).toHaveCount(0);
  await page.getByRole("link",{name:/เปิดผล RF-004/}).click();
  await expect(page.getByText(/พิกัดขณะส่งเสียง 9.5, 100/)).toBeVisible();
  data=await snapshot(page);expect(data.jobs[0].stationSnapshot.radius).toBe(450);expect(data.incidents[0].prediction.stationSnapshot.coordinates).toEqual([100,9.5]);
  await page.setViewportSize({width:390,height:844});await page.goto("/office/map");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  await page.screenshot({path:"test-results/stations-mobile.png",fullPage:true});
});

test("v1 migration preserves attachments and snapshots; boundary unavailable retains form",async({page})=>{
  await login(page,"office");
  await page.evaluate(()=>new Promise<void>(resolve=>{const r=indexedDB.open("rakforest-demo-v1");r.onsuccess=()=>{const db=r.result;const tx=db.transaction("state","readwrite"),store=tx.objectStore("state"),get=store.get("main");get.onsuccess=()=>{const s=get.result;s.version=1;delete s.stations;s.incidents.forEach((i:any)=>delete i.prediction.stationSnapshot);s.attachments.push({id:"preserve",name:"keep.txt",blob:new Blob(["keep"])});store.put(s,"main");};tx.oncomplete=()=>{db.close();resolve();};};}));
  await page.reload();await expect.poll(async()=>(await snapshot(page)).version).toBe(2);
  const data=await snapshot(page);expect(data.stations).toHaveLength(3);expect(data.attachments[0].blob).toBeDefined();expect(data.incidents[0].prediction.stationSnapshot.id).toBe("ST-01");
  await page.route("**/data/thailand.geojson",r=>r.fulfill({status:503,body:"unavailable"}));
  await page.goto("/office/map");await page.getByRole("button",{name:"เพิ่มเสาไมค์",exact:true}).click();
  await page.getByLabel("รหัสเสา",{exact:true}).fill("RETRY");await page.getByLabel("ชื่อเสา",{exact:true}).fill("เก็บฟอร์ม");await page.getByLabel("ละติจูด (Latitude)",{exact:true}).fill("13.7563");await page.getByLabel("ลองจิจูด (Longitude)",{exact:true}).fill("100.5018");
  await page.getByRole("button",{name:"บันทึกเสา",exact:true}).click();await expect(page.locator("form").getByRole("alert")).toContainText("โหลดขอบเขตประเทศไทยไม่ได้");
  await expect(page.getByLabel("ชื่อเสา",{exact:true})).toHaveValue("เก็บฟอร์ม");
  await page.unroute("**/data/thailand.geojson");await page.getByRole("button",{name:"บันทึกเสา",exact:true}).click();await expect(page.getByRole("heading",{name:"เก็บฟอร์ม",exact:true})).toBeVisible();
});

test("station form rejects duplicates, preserves draft on storage failure, and map picking is opt-in",async({page})=>{
  await login(page,"office");await page.goto("/office/map");
  await page.getByRole("button",{name:"เพิ่มเสาไมค์",exact:true}).click();
  await page.getByLabel("รหัสเสา",{exact:true}).fill("ST-01");await page.getByLabel("ชื่อเสา",{exact:true}).fill("เสาซ้ำ");
  await page.getByLabel("ละติจูด (Latitude)",{exact:true}).fill("13.7563");await page.getByLabel("ลองจิจูด (Longitude)",{exact:true}).fill("100.5018");
  await page.getByRole("button",{name:"บันทึกเสา",exact:true}).click();await expect(page.locator(".error-banner")).toContainText("รหัสเสานี้มีอยู่แล้ว");
  await page.getByLabel("รหัสเสา",{exact:true}).fill("ST-FAIL");
  await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;(window as any).restorePut=()=>{IDBObjectStore.prototype.put=original;};IDBObjectStore.prototype.put=function(){throw new DOMException("จำลองพื้นที่จัดเก็บเต็ม","QuotaExceededError");};});
  await page.getByRole("button",{name:"บันทึกเสา",exact:true}).click();await expect(page.getByText("จำลองพื้นที่จัดเก็บเต็ม",{exact:false})).toBeVisible();
  await expect(page.getByLabel("ชื่อเสา",{exact:true})).toHaveValue("เสาซ้ำ");await page.evaluate(()=>(window as any).restorePut());
  await expect(page.locator('[data-map-ready=true]')).toBeVisible();
  const before=await page.getByLabel("ละติจูด (Latitude)",{exact:true}).inputValue();
  await page.locator('.maplibregl-canvas').click({position:{x:180,y:130}});
  await expect(page.getByLabel("ละติจูด (Latitude)",{exact:true})).not.toHaveValue(before);
  await page.getByRole("button",{name:"ยกเลิก",exact:true}).click();
  expect((await snapshot(page)).stations).toHaveLength(3);
  await login(page,"field");await page.goto("/field/map");await expect(page.getByRole("button",{name:"เพิ่มเสาไมค์",exact:true})).toHaveCount(0);await expect(page.getByRole("button",{name:"แก้ไขเสา",exact:true})).toHaveCount(0);
});
