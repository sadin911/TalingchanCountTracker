# TalingchanCountTracker (`talingchan.tcgcount.com`)

> สมุดสะสมการ์ดและระบบจัดเด็ค สำหรับการ์ดเกม **Battle of Talingchan** (แบทเทิล ออฟ ตลิ่งชัน) สัญชาติไทย โดย PASULOL x Team YUK

---

## 🌟 ฟีเจอร์หลัก (Key Features)

1. **ระบบคลังการ์ดและสะสม (Card Database & Collection Tracker)**
   - ฐานข้อมูลการ์ดภาษาไทยครบทุกชุด (Starter Decks และ Booster Packs BT01-BT12)
   - ตัวกรองด่วนตาม ประเภทการ์ด, สี, เผ่า/สัญลักษณ์, ซอย, ค่าร่าย, ค่าพลัง และระดับความหายาก (Rarity)
   - นับจำนวนการ์ดที่ครอบครองแยกตามเวอร์ชัน Normal, Foil และ Secret Rare (SCR)
   - แสดงเปอร์เซ็นต์ความคืบหน้าในการสะสมแต่ละชุด (Set Completion Rate)

2. **ระบบจัดเด็คตามกติกาทางการ (BOTC Deck Builder)**
   - ตรวจสอบกติกาเด็คแบบ Real-time:
     - Main Deck 50 ใบพอดี (ใส่ชื่อซ้ำได้สูงสุด 4 ใบ)
     - LIFE Deck 5 ใบพอดี (**ห้ามมีชื่อซ้ำกันเด็ดขาด**)
     - การ์ด "Only 1" บังคับใส่ได้สูงสุดเพียง 1 ใบ
     - แจ้งเตือนการ์ดที่มีสัญลักษณ์ "ลำเอียง" (ห้ามใช้ในการแข่งขันทางการ)
   - กราฟวิเคราะห์เด็ค: สัดส่วนค่าร่าย (Cost Curve) และสัดส่วนสีของการ์ด
   - **ฟีเจอร์เด็ด: "Check Missing Cards"** เปรียบเทียบเด็คกับคลังการ์ดเพื่อดูว่าขาดใบไหนบ้าง
   - Export / Import เด็คในรูปแบบ Text List และ JSON

3. **Local-First & PWA**
   - ใช้งานได้ทันทีไม่ต้องต่อเน็ต บันทึกข้อมูลลง LocalStorage
   - รองรับการติดตั้งเป็น Progressive Web App (PWA) บนมือถือและเดสก์ท็อป

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite 8, TailwindCSS v4
- **State Management:** Zustand 5 (LocalStorage persist)
- **Testing:** Vitest (Unit / Rule Validator), Playwright (E2E Testing)
- **Code Quality:** Oxlint

---

## 🚀 เริ่มต้นใช้งาน (Getting Started)

```bash
# ติดตั้ง dependencies
npm install

# รัน Development Server
npm run dev

# รัน Unit Tests
npm test

# Build สำหรับ Production
npm run build
```

---

## 📜 Documentation

- [Design Specification](docs/superpowers/specs/2026-10-26-talingchan-count-tracker-design.md)
- [Implementation Plan](docs/superpowers/plans/2026-10-26-talingchan-count-tracker.md)
