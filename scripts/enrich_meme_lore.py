#!/usr/bin/env python3
"""
Enrich all 1,851 Battle of Talingchan cards in src/data/talingchanCards.json with:
- memeLore: คำอธิบายที่มามีม / ล้อเลียนอะไร / ตอนในการ์ตูน PASULOL / เกร็ดความรู้จาก Wiki
- flavorText: คำโปรยสุดกวนจากการ์ดทางการ (เช่น คำคมบนการ์ด Life Card)
"""

import json
import os
import re
import urllib.parse
import urllib.request

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_JSON_PATH = os.path.join(ROOT_DIR, "src/data/talingchanCards.json")
WIKI_DUMP_PATH = "/Users/sadin/.gemini/antigravity/brain/85d8f6fa-7692-4122-a9c5-c239bfbbc74d/scratch/wiki_dump.json"
OFFICIAL_CARDS_URL = "https://cdn.bottcg.com/data/cards.2a2b9f7e.json"
FANDOM_API_URL = "https://battle-of-talingchan.fandom.com/th/api.php"


def load_or_fetch_wiki_dump() -> dict[str, str]:
    if os.path.exists(WIKI_DUMP_PATH):
        with open(WIKI_DUMP_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    wiki_data: dict[str, str] = {}
    gapcontinue = None
    while True:
        params = {
            "action": "query",
            "generator": "allpages",
            "gaplimit": "50",
            "prop": "revisions",
            "rvprop": "content",
            "format": "json",
        }
        if gapcontinue:
            params["gapcontinue"] = gapcontinue
        url = f"{FANDOM_API_URL}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        data = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
        for pinfo in data.get("query", {}).get("pages", {}).values():
            title = pinfo.get("title", "")
            revs = pinfo.get("revisions", [])
            wiki_data[title] = revs[0].get("*", "") if revs else ""
        if "continue" in data and "gapcontinue" in data["continue"]:
            gapcontinue = data["continue"]["gapcontinue"]
        else:
            break
    return wiki_data


def strip_templates(text: str, template_names: tuple[str, ...]) -> str:
    """Remove MediaWiki templates like {{InfoDeck...}} or {{Quote...}} handling nested {{...}}."""
    for tname in template_names:
        while True:
            m = re.search(r"\{\{\s*" + tname + r"\b", text, flags=re.IGNORECASE)
            if not m:
                break
            start = m.start()
            depth = 0
            i = start
            end = len(text)
            while i < len(text) - 1:
                if text[i:i+2] == "{{":
                    depth += 1
                    i += 2
                elif text[i:i+2] == "}}":
                    depth -= 1
                    i += 2
                    if depth == 0:
                        end = i
                        break
                else:
                    i += 1
            text = text[:start] + text[end:]
    return text


def extract_quote_from_wikitext(raw: str) -> str:
    m = re.search(r"\{\{\s*Quote\b", raw, flags=re.IGNORECASE)
    if not m:
        return ""
    start = m.end()
    depth = 1
    i = start
    end = len(raw)
    while i < len(raw) - 1:
        if raw[i:i+2] == "{{":
            depth += 1
            i += 2
        elif raw[i:i+2] == "}}":
            depth -= 1
            if depth == 0:
                end = i
                break
            i += 2
        else:
            i += 1
    body = raw[start:end]
    # First resolve [[link|label]] inside body so pipes inside links don't split args
    body = re.sub(r"\[\[(?::?หมวดหมู่:|:?Category:)?[^\]|]+\|([^\]]+)\]\]", r"\1", body)
    body = re.sub(r"\[\[(?::?หมวดหมู่:|:?Category:)?([^\]]+)\]\]", r"\1", body)
    body = re.sub(r"\{\{[^}]+\}\}", "", body)
    parts = [p.strip() for p in body.split("|") if p.strip()]
    q_text = ""
    q_speaker = ""
    pos_args = []
    for p in parts:
        if "=" in p:
            k, v = p.split("=", 1)
            k = k.strip().lower()
            v = clean_wikitext(v)
            if k in ("quote", "1", "text") and v:
                q_text = v
            elif k in ("speaker", "2", "author") and v:
                q_speaker = v
        else:
            pos_args.append(clean_wikitext(p))
    if not q_text and pos_args:
        q_text = pos_args[0]
    if not q_speaker and len(pos_args) > 1:
        q_speaker = pos_args[1]
    if not q_text:
        return ""
    return f'"{q_text}"' + (f" — {q_speaker}" if q_speaker else "")


def clean_wikitext(text: str) -> str:
    text = strip_templates(text, ("InfoDeck", "InfoCard", "Quote", "Navbox", "Documentation"))
    text = text.replace("__TOC__", "")
    text = re.sub(r"\[\[(?:ไฟล์|File):[^\]]+\]\]", "", text)
    text = re.sub(r"\{\{[Ss]ymbol\|([^|}]+)[^}]*\}\}", r"\1", text)
    text = re.sub(r"\{\{[Kk]eyword\|([^|}]+)[^}]*\}\}", r"\1", text)
    text = re.sub(r"\{\{[Ee]x\|([^|}]+)[^}]*\}\}", r"\1", text)
    text = re.sub(r"\{\{[Cc]olor\|[^}]*\}\}", "", text)
    text = re.sub(r"\{\{[Rr]arity\|([^|}]+)[^}]*\}\}", r"\1", text)
    text = re.sub(r"\{\{[Cc]ardset\|([^|}]+)[^}]*\}\}", r"\1", text)
    text = re.sub(r"\{\{[Ss]ymbolMagic\|([^|}]+)[^}]*\}\}", r"\1", text)
    text = re.sub(r"\[https?://[^\s\]]+\s+([^\]]+)\]", r"\1", text)
    text = re.sub(r"\[\[(?::?หมวดหมู่:|:?Category:)?[^\]|]+\|([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[\[(?::?หมวดหมู่:|:?Category:)?([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[[^\]]*ต้องการแหล่ง[^\]]*\]", "", text)
    text = re.sub(r"<ref[^>]*>.*?</ref>", "", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("'''", "").replace("''", "").replace("[[", "").replace("]]", "").replace("{{", "").replace("}}", "")
    lines = []
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith("{|") or s.startswith("|") or s.startswith("!") or s.startswith("{{"):
            continue
        s = re.sub(r"^\*+\s*", "• ", s)
        lines.append(s)
    return " ".join(lines).strip()


# Specific card & character parody dictionary (substring or exact match)
SPECIFIC_PARODY_RULES = [
    # Anime / Game / Movie Parodies
    (
        lambda name, c: "ไมเกรน" in name or "แอร์ซิด รีฟลักซ์" in name or "ไบโพล่า" in name or "อีโบล่า ซอร์ด" in name or "เก๊าท์" in name or "Dเพรส" in name or "โฟเบีย" in name or "หุ่นนักรบผู้กล้า" in name or "ซีทันยาน" in name or "ไดบาเรีย" in name or "ด็อกเตอร์ เพน" in name or "THE END" in name,
        "ล้อเลียนอนิเมะหุ่นรบตระกูลผู้กล้ายุค 90s 'ไมท์ไกน์ หุ่นสายฟ้าประจัญบาน' (The Brave Express Might Gaine) ที่ทีมงานชอบอ่านเพี้ยนเป็น 'ไมเกรน' ผสมกับการนำชื่อโรคประจำตัววัยทำงานและอาการป่วย (ไมเกรน, กรดไหลย้อน Acid Reflux, โรคเก๊าท์, ไบโพลาร์, โรคซึมเศร้า Depress, โฟเบีย, อีโบลา) มาตั้งเป็นชื่อหุ่นและอาวุธสุดเบียว"
    ),
    (
        lambda name, c: "Overdose" in name,
        "ล้อเลียนชื่อยารักษาโรคและสารเสพติดในชีวิตจริง (เช่น พาราเซตามอล -> เซตาม่อน, ยาลดกรดยูริก Purinol -> พูรินอล, ผงถ่านแก้ท้องเสีย Charcoal -> ชาโค่ล, มอร์ฟีน) นำมาดีไซน์เป็นหุ่นรบจักรกลสายดาร์ก"
    ),
    (
        lambda name, c: "I.S." in name,
        "ล้อเลียนหุ่นรบโมบิลสูท Gundam ผสมกับชื่อ 'เม็ดเลือดขาว' ในระบบภูมิคุ้มกันร่างกาย (Immune System = I.S. เช่น นิวโทรฟิล) ที่ทำหน้าที่เป็นตำรวจอวกาศแห่งดาวคอร์ปัส"
    ),
    (
        lambda name, c: "R18" in name,
        "ล้อเลียนเอเลี่ยนยุคไซไฟเรโทรและรหัสเรตติ้งผู้ใหญ่ 18+ โดยชื่อและใบหน้าของมนุษย์ดาว R18 แต่ละตนตั้งตามดาราสาวฮอลลีวูดสุดฮอต (เช่น Sydney Sweeney -> สวีนนีย์, Anya Taylor-Joy -> จอย, Gal Gadot -> กัล, Ana de Armas -> อามัส)"
    ),
    (
        lambda name, c: "พี่หน่วง" in name or "เถียงทันหน่วง" in name or name in ("ขอจบรายการแต่เพียงเท่านี้", "ทนายกิ๊บ", "ทนายเตะปาก"),
        "ล้อเลียนพิธีกรข่าวฝีปากกล้า 'หนุ่ม กรรชัย' (ฉายาในโซเชียล 'พี่หน่วง') และรายการทอล์กโชว์ทวงความยุติธรรมระดับประเทศ 'โหนกระแส' รวมถึงบรรดาทนายดังประจำรายการ"
    ),
    (
        lambda name, c: "สว นาโนแมชชีน" in name,
        "ล้อเลียนมีมระดับโลก 'Nanomachines, son!' ของวุฒิสมาชิก Senator Armstrong จากเกม Metal Gear Rising: Revengeance ผสมกับการเสียดสี สว. (สมาชิกวุฒิสภา) ในการเมืองไทย"
    ),
    (
        lambda name, c: "จ่างู" in name,
        "ล้อเลียนตัวละครสายลับระดับตำนาน 'Solid Snake' จากเกมซีรีส์ Metal Gear Solid ในเวอร์ชันจ่าทหารไทย"
    ),
    (
        lambda name, c: "ตำรวจไซบอร์ค" in name,
        "ล้อเลียนภาพยนตร์แอ็กชันไซไฟยุค 80s เรื่อง 'RoboCop (โรโบคอป ตำรวจเหล็กพันธุ์ใหม่)' ผสมกับตำรวจไทย"
    ),
    (
        lambda name, c: "MEGA ROR.DOR" in name or "ไอ้หนุ่มรด." in name or "ราชา รด." in name or "เขาชนไก่" in name,
        "ล้อเลียนหุ่นรบประกอบร่างขบวนการเรนเจอร์ (Megazord) ผสมกับประสบการณ์เรียนวิชาทหาร รด. (นักศึกษาวิชาทหาร) และการเข้าค่ายฝึกเขาชนไก่ของชายไทย"
    ),
    (
        lambda name, c: "ไอ นีด เมดิก" in name,
        "ล้อเลียนวลีมีมยอดฮิต 'I need a medic!' จากเกมยิงแนว FPS ชื่อดังอย่าง Team Fortress 2 และ Overwatch"
    ),
    (
        lambda name, c: "ฮิมไลน์" in name or "ฟรีแลนซ์ นักเวทย์แห่งปาร์ตี้ผู้กล้า" in name,
        "ล้อเลียนอนิเมะแฟนตาซีชื่อดัง 'Frieren: Beyond Journey's End (คำอธิษฐานในวันที่จากลา FRIEREN)' โดยแปลงชื่อผู้กล้า Himmel (ฮิมเมล) เป็น 'ฮิมไลน์' และจอมเวทย์เอลฟ์ Frieren (ฟรีเรน) เป็น 'ฟรีแลนซ์ (Freelance)'"
    ),
    (
        lambda name, c: "ไสยเวท ย้อนกลับ" in name or "เหนือฟ้าใต้หล้า ข้าคือมหาจอมเวทย์" in name,
        "ล้อเลียนอนิเมะ 'Jujutsu Kaisen (มหาเวทย์ผนึกมาร)' ของตัวละครสุดเท่ โกโจ ซาโตรุ ทั้งวิชา 'ไสยเวทย้อนกลับ' และวลีดัง 'เหนือฟ้าใต้หล้า ข้าประเสริฐที่สุด'"
    ),
    (
        lambda name, c: "มังกรฟ้าตาขาว" in name or "จอมมังการ์ด" in name,
        "ล้อเลียนการ์ดมอนสเตอร์ระดับตำนาน 'Blue-Eyes White Dragon (มังกรขาวตาฟ้า)' จากเรื่อง Yu-Gi-Oh! เกมกลคนอัจฉริยะ โดยสลับคำเป็น 'มังกรฟ้าตาขาว'"
    ),
    (
        lambda name, c: "รัททาทุย" in name or "รัทาทุย" in name or "รัททาท่วม" in name,
        "ล้อเลียนชื่อไทยของแอนิเมชัน Pixar เรื่อง 'Ratatouille (พ่อครัวตัวจี๊ด หัวใจคับโลก)' เปลี่ยนจากหนูเชฟทำอาหารสุดน่ารักให้กลายเป็นกองทัพหนูท่อกลายพันธุ์สุดสยองจากแอนิเมชัน PASULOL (บางใบล้อท่า 1 แสนโวลต์ของพิคาชู และ Facehugger จากหนัง Alien)"
    ),
    (
        lambda name, c: "นครทิเนนทอล" in name or "มือปืนนคร" in name or "อาวุธนคร" in name,
        "ล้อเลียนจักรวาลภาพยนตร์นักฆ่า 'John Wick (จอน วิค)' ทั้งโรงแรมนักฆ่า The Continental (-> นครทิเนนทอล) และตำนานการสังหารด้วยดินสอ (-> อาวุธนคร ดินสอ 5H) ผสมกับมีมซุ้มมือปืนเมืองนครศรีธรรมราช"
    ),
    (
        lambda name, c: "Killer" in name or "โทเท็มเรืองแสง" in name or "ยายสปีด" in name,
        "ล้อเลียนเกมแนวเอาชีวิตรอด 'Dead by Daylight' (ระบบฆาตกรไล่ล่าและการล้างโทเท็มไฟ Hex Totem -> โทเท็มเรืองแสง), หนังเชือด Friday the 13th (-> พุธ 13), ราชาเพลงป๊อป Michael Jackson และตำนานผีไทยความเร็วสูง 'ยายสปีด'"
    ),
    (
        lambda name, c: "โอเดนย่า" in name or "ทาโกะซัง" in name or "ทาโกะจัง" in name or "ดาว O.D.Y" in name or "เอาแค่การ์ด" in name or c.get("setCode") == "ODY1",
        "คอลแลบส์และล้อเลียนตำนานขนมข้าวโพดอบกรอบ 'โอเดนย่า (Odenya)' ยุค 90s ที่เด็กไทยยุคหนวดแห่เหมาซื้อเพื่อลุ้นการ์ดสะสม (เช่น การ์ดดราก้อนบอล) จนเกิดมีมในตำนาน 'เอาแค่การ์ด ไม่กินขนม!'"
    ),
    (
        lambda name, c: "คาถา " in name or "โรงเรียนเวทย์มนต์" in name or "ไม้กายสิทธิ์" in name or "ไม้กวาดปีกปักษา" in name,
        "ล้อเลียนจักรวาลพ่อมดน้อย 'Harry Potter (แฮร์รี่ พอตเตอร์)' โดยนำชื่อคาถาภาษาละตินมาแปลงเป็นคำพ้องเสียงสุดฮาแบบไทยๆ (เช่น Protego -> โปเตกโต้, Expelliarmus -> ปลดอาวุสสิวะ, Stop -> สตอปปุ) ผสมมุกไสยศาสตร์ไทย 'เสกควายเข้าท้อง'"
    ),
    (
        lambda name, c: "อัศวินโต๊ะกลม" in name or name in ("อาเธอร์ ราชาแห่งอัศวินโต๊ะกลม", "ดาบศักดิ์สิทธิ์ เอกซ์คาลิเบอร์", "ดาบศักดิ์สิทธิ์ อาลอนไดร์ท", "ดาบศักดิ์สิทธิ์ แกลลาติน", "ดาบศักดิ์สิทธิ์ คาเรนต์", "เดออง อัศวินเฟมบอย"),
        "ล้อเลียนตำนานกษัตริย์อาเธอร์และอัศวินโต๊ะกลม ผสมกับคาแรกเตอร์จากเกม/อนิเมะตระกูล Fate/Grand Order (เช่น อัศวินเฟมบอย เชอวาลิเยร์ เดออง) และมุกตลกหน้าตายอย่าง 'คนเช็ดโต๊ะประจำอัศวินโต๊ะกลม'"
    ),
    (
        lambda name, c: "แอสการ์ด" in name or "วัลฮัลลา" in name or "โอดิน" in name or "ธอร์" in name or "โลกิ" in name or "เฟรย่า" in name or "เฮล่า" in name or "ค้อนโยเนียร์" in name or "บิฟร็อสต์" in name,
        "ล้อเลียนตำนานเทพนอร์ส, ภาพยนตร์ Marvel's Thor: Ragnarok (กลับคำคม 'Asgard is not a place, it is a people' เป็น 'แอสการ์ดคือสถานที่ไม่ใช่ผู้คน') และอนิเมะมหาศึกคนชนเทพ (Record of Ragnarok)"
    ),
    (
        lambda name, c: "ไดโนกาฬสินธุ์" in name or "กาฬสินธุ์" in name or "ง่อวซอรัส" in name or "คนอีสาน ยุคครีเตเชียส" in name or "กะปอม" in name,
        "ล้อเลียนการขุดพบฟอสซิลไดโนเสาร์สายพันธุ์ไทยในภาคอีสาน (จ.กาฬสินธุ์ และขอนแก่น เช่น สยามโมไทรันนัส, อิสานโนซอรัส, กินรีมิมัส) ผสมกับมุก 'กะปอม (กิ้งก่าอีสาน)' ที่ถูกยกชั้นให้เป็นไดโนเสาร์ครองโลก"
    ),
    (
        lambda name, c: "ตั๊กแตน" in name or "ศิลาหยินหยาง" in name or "หยินหยางทอร์นาโด" in name,
        "ล้อเลียนฮีโร่แปลงร่างตระกูล 'Kamen Rider (คาเมนไรเดอร์ / มดแดง)' โดยเฉพาะคาเมนไรเดอร์แบล็ค (ราชันย์แห่งศตวรรษ) ที่แปลงร่างจากตั๊กแตนไซบอร์ก"
    ),
    (
        lambda name, c: "บางระจัน" in name or "จัน หนวดเขี้ยว" in name or "ทองเหม็น" in name or "พันเรือง" in name or "พ่อแท่น" in name or "อาจารย์ธรรมโชติ" in name or "บุญช่วย ควายรักชาติ" in name or "ดาบใบข้าว" in name or "พม่าข้าศึก" in name or "อิน สไนเปอร์" in name or "ลูก เมีย" in name,
        "ล้อเลียนประวัติศาสตร์และภาพยนตร์ไทยระดับตำนาน 'บางระจัน' ในสไตล์ PASULOL ที่เปลี่ยนนายอินเป็นสไนเปอร์ซุ่มยิง, ดาบใบข้าวติดตัว X สุดเบียว และควายบุญช่วยผู้รักชาติยิ่งชีพ"
    ),
    (
        lambda name, c: any(k in name for k in ["จ๊กก๊ก", "วุยก๊ก", "ง่อก๊ก", "เล่าปี่", "กวนอู", "เตียวหุย", "ขงเบ้ง", "จูล่ง", "ม้าเฉียว", "โจโฉ", "แฮหัวตุ้น", "แฮหัวเอี๋ยน", "เตียวเลี้ยว", "สุมาอี้", "เตียวคับ", "ซุนกวน", "ซุนเซ็ก", "ซุนเกี๋ยน", "จิวยี่", "จิวท่าย", "ซุนฮูหยิน", "ลิโป้", "ตั๋งโต๊ะ", "เตียวเสียน", "อ้วนเสี้ยว", "สวนท้อ", "เฮาโลก๋วน", "ลกเอี๋ยง", "ง้าวมังกรเขียว", "หนีคือยอดกลยุทธ์"]),
        "ล้อเลียนวรรณคดีจีนอิงประวัติศาสตร์ 'สามก๊ก (Romance of the Three Kingdoms)' นำเหล่ายอดขุนพลและกลยุทธ์พิชัยสงครามมาตีความใหม่ในลายเส้นและมุกตลกสุดปั่นของสมรภูมิตลิ่งชัน"
    ),
    (
        lambda name, c: any(k in name for k in ["ซุนหงอคง", "พระถังซัมจั๋ง", "ตือโป๊ยก่าย", "ซัวเจ๋ง", "พระไตรปิฎก"]),
        "ล้อเลียนวรรณคดีจีนชื่อดัง 'ไซอิ๋ว (Journey to the West)' และมุกตลกจากแอนิเมชัน PASULOL ที่นักเรียนเล่นเกมใบ้คำแล้วโดนตบเพราะห้ามพูดคำต้องห้าม"
    ),
    (
        lambda name, c: "ไวรัสแห่ง" in name or "มัลแวร์โซน" in name or "อินสตอล บึ้มทั้งไดรฟ์" in name or "Cross Vaccine" in name,
        "ล้อเลียนไวรัสคอมพิวเตอร์ในตำนานยุค Windows 98/XP (Creeper, Trojan, Blaster Worm) และมุกเด็กไทยโหลดเกมเถื่อนมาลงเครื่องแล้วแถมไวรัสบึ้มยกไดรฟ์"
    ),
    (
        lambda name, c: "ภาคีมะม่วง" in name or "ต้นมะม่วง" in name or "มะม่วงดราชิลด์" in name or "ไปคุยกับรากมะม่วง" in name,
        "ล้อเลียนมีม 'ต้นมะม่วงข้างบ้าน' และสำนวนไทยสุดคลาสสิก 'ไปคุยกับรากมะม่วง (ตายซะเถอะ)' รวมถึงการนำต้นไม้โลก Yggdrasil ในตำนานนอร์สมารวมกับต้นมะม่วงเป็น 'มะม่วงดราชิลด์'"
    ),
    (
        lambda name, c: "หมาแพนดี้" in name or "หมาชาไทย" in name or "หมานมเย็น" in name or "แมวมัทฉะ" in name or "แมว-น้ำมะลิ" in name or "แมวเก็นไมฉะ" in name or "คาเฟ่หมาแมว" in name,
        "ล้อเลียนข่าวดังในตำนานของไทย 'หมาแพนดี้' (สุนัขพันธุ์เชาเชาที่ถูกย้อมสีเลียนแบบหมีแพนด้าช่วงหลินปิงฟีเวอร์) และวัฒนธรรมคาเฟ่หมาแมวตั้งชื่อตามเมนูเครื่องดื่ม"
    ),
    (
        lambda name, c: "40ดีกรีแมน" in name,
        "การ์ด 'โดนใจ' ใบแรกของเกม คอลแลบส์กับเพจการ์ตูนไทยสุดกวน 'สมิง ลูกลิงกังwry' ล้อเลียนยอดมนุษย์ผู้ได้พลังจากเหล้าขาว 40 ดีกรี"
    ),
    (
        lambda name, c: "พี่วัฒน์ BGN" in name,
        "การ์ด 'โดนใจ' คอลแลบส์กับ 'พี่วัฒน์' แห่งช่อง BGN (Board Game Night) ช่องยูทูบบอร์ดเกมอันดับต้นๆ ของเมืองไทย"
    ),
    (
        lambda name, c: "ลุงไนท์" in name,
        "การ์ด 'โดนใจ' คอลแลบส์กับ 'ลุงไนท์ (NRsportsRadio)' สตรีมเมอร์และยูทูบเบอร์สายพากย์เกม/ก้านกล้วยระดับตำนานของไทย"
    ),
    (
        lambda name, c: "รีวิวแมน" in name,
        "การ์ด 'โดนใจ' คอลแลบส์กับเพจ 'ReviewMan (รีวิวแมน)' เพจการ์ตูนและรีวิวเสียดสีสังคมไทยสุดแสบ"
    ),
    (
        lambda name, c: "Untitled Case" in name or "Myth Universe" in name,
        "การ์ด 'โดนใจ' คอลแลบส์กับรายการพอดแคสต์เล่าเรื่องลึกลับ คดีฆาตกรรม และตำนานเทพปกรณัมชื่อดังของไทย (Untitled Case และ Myth Universe Podcast)"
    ),
    (
        lambda name, c: "โพลีกอน" in name,
        "การ์ด 'โดนใจ' คอลแลบส์กับค่าย VTuber ไทยชื่อดัง 'Polygon Project' (ลาพิเน่, ลูเซีย, ลูเซเน่, โซน่า, โฮคุ)"
    ),
    (
        lambda name, c: "Super Air" in name,
        "ล้อเลียนประสบการณ์ขึ้นสายการบินโลว์คอสต์สุดป่วนในแอนิเมชัน PASULOL ที่ตั้งแต่กัปตัน แอร์โฮสเตส ไปจนถึงหมาบนเครื่องบินล้วนไม่ปกติ"
    ),
    (
        lambda name, c: "บึงทมิฬ" in name or "วอเตอร์แมน" in name or "ไตรตัน" in name or "มาวิน" in name,
        "มาจากแอนิเมชัน PASULOL ตอน 'บึงทมิฬ' ล้อเลียนฮีโร่เจ้าสมุทร Aquaman (-> วอเตอร์แมน) และชาวเมืองใต้น้ำสุดเพี้ยน (รวมถึงมีมกุ้งน้ำเงิน Blue Lobster Jump Scare ในการ์ดคุณบลูลอบสเตอร์)"
    ),
    (
        lambda name, c: "ปื๊ด" in name or "เปรต" in name or "บุญลือ" in name or "วันชัย" in name or "กัญญา" in name or "ตีพ่อ" in name or "ตีแม่" in name,
        "มาจากแอนิเมชันสร้างชื่อของ PASULOL ชุด 'ปื๊ด เด็กเปรต' และครอบครัวบุญลือ ล้อเลียนคำสอนผู้ใหญ่ไทยเรื่อง 'ตีพ่อตีแม่แล้วจะกลายเป็นเปรตปากเท่ารูเข็ม มือเท่าใบลาน' ในรูปแบบดราม่าครอบครัวสุดกาว"
    ),
    (
        lambda name, c: "ริกกี้" in name or "แมลงสาบ" in name or "ลูกเขยบิ๊ก" in name,
        "มาจากแอนิเมชันฮิตของ PASULOL เรื่อง 'ริกกี้ แมลงสาบเพื่อนรัก' ล้อเลียนความหลอนของแมลงสาบตัวเท่าคนที่ใส่เสื้อผ้าปลอมตัวเข้ามาตีเนียนเป็นสมาชิกในครอบครัวโดยที่บางคนดูไม่ออก"
    ),
    (
        lambda name, c: any(k in name for k in ["นนทก", "พระอิศวร", "พระนารายณ์", "พระอินทร์", "พระพรหม", "พระลักษมี", "พระแม่อุมา", "เจ้าแม่กาลี", "พระพิฆเนศ", "พระเวสสุกรรม", "ทศกัณฐ์", "ทศกัณฑ์", "มณโฑ", "มณโท", "หนุมาน", "พาลี", "สุครีพ", "นิลพัท", "กุมภกรรณ", "พิเภก", "ไมยราพ", "วิรุฬหก", "เขาไกรลาส", "กรุงลงกา", "เมืองขีดขิน", "ช่างแอร์ดวงซวย", "น้ำแดง"]),
        "มาจากแอนิเมชันซีรีส์เรือธงของ PASULOL เรื่อง 'รามเกียรติ์ มินิแอนิเมชัน' ที่นำวรรณคดีไทยและเหล่าเทพแห่งเขาไกรลาสมาตีความใหม่เป็นระบบออฟฟิศราชการไทยสุดปั่น (พร้อมมุก 'ช่างแอร์ในตำนาน' และถวายน้ำแดง)"
    ),
    (
        lambda name, c: any(k in name for k in ["นายนิรยบาล", "พญายม", "สุวาน", "สุวรรณ", "กระทะทองแดง", "หอกแหลมแทงทุกวัน", "สิมพลีนรก", "ประตูนรก", "บัญชีหนังหมา", "แม่นีโม่", "นีโม่"]),
        "มาจากแอนิเมชัน PASULOL ตอน 'นรก' ล้อเลียนภาพจำนรกภูมิแบบไทยๆ (กระทะทองแดง ต้นงิ้ว หอกดาบ) เปลี่ยนให้พญายมถือปืนลูกซอง (ล้อ Hobo with a Shotgun) และนายนิรยบาลทำงานเหมือนพนักงานออฟฟิศ"
    ),
    (
        lambda name, c: any(k in name for k in ["กุ่ย", "ฮอล", "นักเรียน แบงค์", "ครูภาษาไทย", "ครูวีรชัย", "ครูสงบ", "ครูแกง", "ฟ้องครู"]),
        "มาจากแอนิเมชัน PASULOL จักรวาลแก๊งเด็กนักเรียน 'กุ่ย นาย ฮอล แบงค์' (เช่น ตอนความลับของกุ่ย และวิชาภาษาไทย) ล้อเลียนชีวิตวัยเรียนและครูไทยสายโหดสุดกวน"
    ),
    (
        lambda name, c: "ผู้รู้ความจริง" in name or "ความจริงงงงงงง" in name or "เอเลี่ยน" in name or "ดาวอังคาร" in name or "ดาวพฤหัส" in name,
        "มาจากแอนิเมชัน PASULOL จักรวาล 'สมาคมผู้รู้ความจริง' ล้อเลียนกลุ่มคลั่งทฤษฎีสมคบคิด มนุษย์ต่างดาวบุกโลก และองค์กรลับอิลลูมินาติ"
    ),
    (
        lambda name, c: "เสามงคล" in name or "ซินแส" in name or "สิริมงคล" in name or "อัปมงคล" in name,
        "ล้อเลียนความเชื่อเรื่องการจัดฮวงจุ้ยบ้านของซินแสในแอนิเมชัน PASULOL ที่แนะนำให้ตั้ง 'เสามงคล' สารพัดรูปทรง (จีน โรมัน ญี่ปุ่น) เพื่อแก้เคล็ดจนบ้านพัง"
    ),
    (
        lambda name, c: "อาณาจักรของแพง" in name or "พระเจ้านิโคไล" in name or "เลือกมันสำหรับพวก จน" in name or "คนรวย" in name,
        "มาจากแอนิเมชันเสียดสีสังคมของ PASULOL ตอน 'อาณาจักรของแพง' และ 'คนรวยกลัวอะไร' ล้อเลียนภาวะค่าครองชีพแพงหูฉี่และช่องว่างระหว่างชนชั้น"
    ),
    (
        lambda name, c: "อีสานสลิงเกอร์" in name or "โคกอีสานนูน" in name,
        "ล้อเลียนภาพยนตร์คาวบอยดวลปืนตะวันตก (Gunslinger) ผสมกับกลิ่นอายลูกทุ่งแดนอีสาน กลายเป็นแก๊งคาวบอย 'อีสานสลิงเกอร์' (โดยตัวละครได้ต้นแบบจากทีมผู้พัฒนา Team YUK)"
    ),
    (
        lambda name, c: "เครื่องใช้ไฟฟ้า" in name or "เบเซอร์" in name or "ฟรีซเซอร์" in name or "เฟเธอร์" in name or "แป้นสกุล" in name or "ตู้เย็น" in name,
        "ล้อเลียนขบวนการฮีโร่แปลงร่างและหุ่นรบที่รวมร่างกับเครื่องใช้ไฟฟ้าภายในบ้าน (ตู้เย็น พัดลม เตารีด) โดยมีร้าน 'แป้นสกุล อิเล็กทรอนิกส์' (ตั้งตามนามสกุลจริงของ KIBO Story ทีมพัฒนา) เป็นฐานทัพ"
    ),
    (
        lambda name, c: "เพมมุ" in name or "สไปรท์ ยอดสุนัข" in name or "ดินแดนยุติธรรม" in name,
        "ล้อเลียนคอมิกส์ซูเปอร์ฮีโร่คู่หู (แบบ Batman & Ace the Bat-Hound / Superman & Krypto) โดยตัวละคร 'เพมมุ ยอดมนุษย์' และ 'สไปรท์ ยอดสุนัข' มีต้นแบบมาจาก Rikkiha และ SleepyBoi นักพัฒนาหลักของเกม"
    ),
    (
        lambda name, c: "มีมมิ" in name or "ไอดอล" in name or "โอตะ" in name or "งานจับมือ" in name or "เปลี่ยนเมน" in name or "ของขวัญจากโอตะ" in name or "ทัตดนัยซัง" in name,
        "ล้อเลียนวัฒนธรรมวงการไอดอลญี่ปุ่น/ไทยและเหล่าแฟนคลับ 'โอตะ' (งานจับมือ, ตู้โชว์ไอดอล, โอตะท็อปโดเนท, ดราม่าเปลี่ยนเมน) ซึ่งเป็นจุดเริ่มต้นของเส้นเรื่อง Nut Saga ในเกม"
    ),
    (
        lambda name, c: "ไอ้นัท" in name or "เซอร์นัท" in name or "อัศวินตลิ่งชัน" in name or "นัทคาลิเบอร์" in name or "อีช่า" in name,
        "มาจากเนื้อเรื่องออริจินัล 'Nut Saga' ของเกม Battle of Talingchan ล้อเลียนแนวอนิเมะต่างโลก (Isekai) ที่ชายหนุ่มธรรมดา (ไอ้นัท) หลุดเข้าไปเป็นผู้กล้าและผู้นำอัศวินตลิ่งชัน"
    ),
    (
        lambda name, c: "นักท่องเรื่องราว" in name or "เรื่องราว " in name or "ขวัญตา" in name or "มายา" in name,
        "ธีม 'นักท่องเรื่องราว' ที่ตัวละครสามารถเดินทางข้ามมิติเข้าไปสวมบทบาทในตำนานและวรรณคดีต่างๆ ของจักรวาลตลิ่งชัน (ล้อเลียนพล็อตทะลุมิติเข้าสู่โลกนิยาย/เกม)"
    ),
    (
        lambda name, c: "ไม่นะ " in name or "เฮ้ย " in name,
        "การ์ดชีวิต (Life Card) ซิกเนเจอร์ของเกม Battle of Talingchan ล้อเลียนฉากตัวละครร้องอุทานสุดดราม่าเวลาโดนโจมตีหรือตกอยู่ในวิกฤต พร้อมคำโปรยทำลายกำแพงที่ 4 (Fourth Wall) กวนประสาทผู้เล่นโดยตรง"
    ),
    (
        lambda name, c: "ความเจริญ" in name or "ผู้เจริญ" in name,
        "การ์ดสามัญระดับมีมประจำเกม ล้อเลียนความเจริญก้าวหน้าแบบก้าวกระโดด (และบางทีก็เจริญลง) ในจักรวาล PASULOL จนถูกนำมาพิมพ์ซ้ำและทำเป็นเวอร์ชัน April Fools' Day"
    ),
    (
        lambda name, c: "แบงค์" in name or "สตางค์น้องชายแบงค์" in name,
        "ล้อเลียนมุกตัวละคร 'แบงค์' จากแอนิเมชัน PASULOL ที่ไม่ว่าจะไปโผล่ในยุคสมัยไหน โลกคู่ขนานใด หรือเป็นเผ่าพันธุ์อะไร (นักเรียน, เทวดา, นายนิรยบาล, ปลา, ควาย, รถถัง, อัศวิน, เอเลี่ยน) ก็จะมีหน้าตาเหมือนเดิมเป๊ะทุกใบ (คล้ายมุกพยาบาลจอย/คุณตำรวจจุนซ่าใน Pokémon)"
    ),
    (
        lambda name, c: "Micro Plaza" in name or "SD Plaza" in name,
        "ล้อเลียนห้างสรรพสินค้าขวัญใจสายสะสมของเล่น การ์ดเกม และกันพลาในกรุงเทพฯ อย่าง 'Mega Plaza สะพานเหล็ก' (-> Micro Plaza สะพานพลาสติก) และ 'SC Plaza สายใต้ใหม่' (-> SD Plaza สายเหนือเก่า)"
    ),
    (
        lambda name, c: "น้ำชูกำลัง" in name,
        "ล้อเลียนโฆษณาเครื่องดื่มชูกำลังขวัญใจผู้ใช้แรงงานไทย (M-150) ที่ดื่มแล้วมีพลังฮึดสู้เกินขีดจำกัด"
    ),
    (
        lambda name, c: "ผมขอค้าน" in name,
        "ล้อเลียนวลีเด็ดและท่าชี้นิ้ว 'Objection! (ขอค้าน!)' จากเกมทนายความระดับตำนาน Ace Attorney (ฟีนิกซ์ ไรท์ ทนายหัวเม่น)"
    ),
    (
        lambda name, c: "กัปตัน 7 สี" in name or "ขวาน 7 สี" in name,
        "ล้อเลียนละครพื้นบ้านจักรๆ วงศ์ๆ เช้าวันหยุดทางช่อง 7 สี (เช่น ขวานฟ้าหน้าดำ) ผสมกับซูเปอร์ฮีโร่กัปตันอเมริกา"
    ),
    (
        lambda name, c: "เทพารักษ์งมขวาน" in name or "ขวานเงิน" in name or "ขวานทอง" in name,
        "ล้อเลียนนิทานอีสปสุดคลาสสิกเรื่อง 'เทพารักษ์กับคนตัดไม้' ในเวอร์ชันสุดกวนของ PASULOL"
    ),
    (
        lambda name, c: "สวนกล้วยหนีภาษี" in name,
        "ล้อเลียนข่าวดังและปรากฏการณ์ในประเทศไทยที่เจ้าของที่ดินรกร้างกลางกรุงแห่ปลูกต้นกล้วยเพื่อเปลี่ยนเป็นที่ดินเกษตรกรรมสำหรับเลี่ยงภาษีที่ดิน"
    ),
    (
        lambda name, c: "ราชาใบก้อน" in name,
        "ล้อเลียนสเปรย์กำจัดแมลงยี่ห้อดัง 'ไบค้อน (Baygon)' อาวุธมหาประลัยที่เป็นศัตรูธรรมชาติของแมลงสาบ"
    ),
    (
        lambda name, c: "ฯลฯ กระบือชาวร๊อค" in name or "เวทีเพื่อชีวิต" in name or "นักดาบตะวันแดง" in name,
        "ล้อเลียนวงดนตรีเพื่อชีวิตระดับตำนานของไทย 'คาราบาว (กระบือ)' สัญลักษณ์หัวควาย และวัฒนธรรมโรงเบียร์ตะวันแดง"
    ),
    (
        lambda name, c: "ไอ้ชิด อโยธยา Express" in name,
        "ล้อเลียนม้าเร็วส่งสารแห่งกรุงศรีอยุธยา ผสมกับบริการขนส่งพัสดุด่วนยุคปัจจุบัน (Kerry / Flash Express)"
    ),
    (
        lambda name, c: any(k in name for k in ["รถถัง", "จ่ามะนาว", "จ่าแดงเดือด", "จ่ายุทธ", "พลเอก", "พลทหาร", "คนจับใบดำ", "คนจับใบแดง", "ใบดำใบแดง", "ถาดหลุม", "ทหารฝูงบินต่ำ", "สห ไล่จับเด็ก", "อรุณีย์ ข้าวมันไก่เมียจ่า", "รั้วของชาติ", "ซ่อมบำรุงประจำปี", "อ๋อ...ปุ้มปุ้ยตาย"]),
        "มาจากแอนิเมชัน PASULOL ตอน 'ปฏิบัติการ รั้วของชาติ' ล้อเลียนการเกณฑ์ทหารไทย (จับใบดำใบแดง), ชีวิตพลทหารในค่าย (กินข้าวถาดหลุม, ร้านข้าวมันไก่เมียจ่า), รถถัง Tank Ranger และการเมืองเรื่องกองทัพ"
    ),
    (
        lambda name, c: any(k in name for k in ["หมอมาแล้ว", "หมอเลิฟ", "หมอเสริมศักดิ์", "พยาบาล เอ๋", "โรงบาล", "ตู้วารีบำบัด", "ยาแก้ไอน้ำดำ"]),
        "มาจากแอนิเมชัน PASULOL ตอน 'โรงพยาบาล' ล้อเลียนบรรยากาศโรงพยาบาลและบุคลากรทางการแพทย์สุดเพี้ยน"
    ),
    (
        lambda name, c: "ตัวอะไรสักอย่าง" in name,
        "ล้อเลียนดีไซน์สิ่งมีชีวิตปริศนาหน้าตาประหลาดในจักรวาลตลิ่งชันที่ระบุสายพันธุ์ไม่ได้ จนทีมงานตั้งชื่อตรงตัวแบบกวนๆ ว่า 'ตัวอะไรสักอย่าง'"
    ),
    (
        lambda name, c: "ผู้เล่น" in name or "กฎร้าน" in name,
        "การ์ดล้อเลียนพฤติกรรมและประเภทของผู้เล่นการ์ดเกมในชีวิตจริงตามร้านการ์ด (เช่น สายถามกฎจำไม, สายเหลี่ยมจัด, สายจัดเด็คมั่ว, สายขิงในโซเชียล)"
    ),
    (
        lambda name, c: any(k in name for k in ["คุณโดม ผู้จัดการทีมการ์ด", "แรงงานทาสออฟฟิศ", "เซนเซไฮ", "แก๊ง Super Card", "ยอดมนุษย์หัวยางลบ"]),
        "การ์ด Easter Egg ที่นำทีมผู้พัฒนาเบื้องหลัง (Team YUK / Lanzalot / BUNBUN / คุณโดม) และครีเอเตอร์สายการ์ดเกม (Say Hai / Super Card) มาวาดเป็นตัวละครในการ์ด"
    ),
    (
        lambda name, c: any(k in name for k in ["อ่อ กระต่ายตาย", "ไม่นะฟุจัง", "ไม่นะโอคุง"]),
        "การ์ดชีวิต (Life Card) พิเศษที่ล้อเลียนฉากจบชีวิตสุดกาว และการ์ดโปรโมมาสคอตประจำงานคอมิกโดจิน Comic Avenue (โอคุง & ฟุจัง)"
    ),
]


def build_card_lore():
    with open(CARDS_JSON_PATH, "r", encoding="utf-8") as f:
        cards = json.load(f)

    wiki = load_or_fetch_wiki_dump()

    # Fetch official cards JSON for favorText & hashtagText
    req = urllib.request.Request(OFFICIAL_CARDS_URL, headers={"User-Agent": "Mozilla/5.0"})
    official_data = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    official_list = official_data if isinstance(official_data, list) else official_data.get("cards", [])
    official_by_code = {c["print"]: c for c in official_list}

    # Index wiki pages by normalized title and by card ID
    norm_wiki = {re.sub(r"\s+", " ", k).strip(): (k, v) for k, v in wiki.items()}
    id_to_wiki = {}
    NON_CARD_TITLES = {"LIFE Card", "Avatar", "Magic", "Construct", "โดนใจ", "Only1", "ลำเอียง", "PASULOL", "TENNOME", "Lanzalot", "Rikkiha", "BUNBUN", "KIBO Story"}
    for title, raw in wiki.items():
        if title in NON_CARD_TITLES or "(Deck)" in title or "(Theme)" in title or title.startswith(("BT", "SD", "CC", "KD", "ODY", "RM", "SL")):
            continue
        for cid in re.findall(r"\b[A-Z0-9]{3,4}-\d{3}[A-Z]?\b", raw):
            id_to_wiki.setdefault(cid, (title, raw))

    # Extract deck lore summaries from Deck pages
    deck_lore_map = {}
    for title, raw in wiki.items():
        if "(Deck)" in title or "(Theme)" in title:
            m_triv = re.search(r"==\s*เกร็ดความรู้\s*==(.*?)(?:==|\[\[หมวดหมู่:|$)", raw, flags=re.DOTALL)
            triv_str = clean_wikitext(m_triv.group(1)) if m_triv else ""
            intro_part = raw.split("== ลักษณะพิเศษ ==")[0].split("== การ์ด")[0].split("==")[0]
            intro_str = clean_wikitext(intro_part)
            combined = " ".join(x for x in [intro_str, triv_str] if x).strip()
            if combined:
                deck_lore_map[title] = combined

    enriched_count = 0
    flavor_count = 0

    for c in cards:
        c.pop("flavorText", None)
        cid = c["id"]
        base_id = re.sub(r"-(SCR|CBR|PR)$", "", cid)
        name = c["name"].strip()
        norm_name = re.sub(r"\s+", " ", name).strip()

        # 1. Official favorText & hashtagText
        off = official_by_code.get(cid) or official_by_code.get(base_id) or {}
        favor_text = (off.get("favorText") or "").strip()
        hashtag_text = (off.get("hashtagText") or "").strip()

        if favor_text:
            c["flavorText"] = favor_text
            flavor_count += 1

        if hashtag_text and hashtag_text not in (c.get("effect") or ""):
            c["effect"] = ((c.get("effect") or "").strip() + "\n" + hashtag_text).strip()

        # 2. Match Wiki page
        wiki_entry = norm_wiki.get(norm_name) or id_to_wiki.get(cid) or id_to_wiki.get(base_id)
        wiki_cats = []
        card_trivia = ""
        card_quote = ""

        if wiki_entry:
            w_title, w_raw = wiki_entry
            wiki_cats = [cat.strip() for cat in re.findall(r"\[\[หมวดหมู่:([^\]|]+)", w_raw)]
            m_triv = re.search(r"==\s*เกร็ดความรู้\s*==(.*?)(?:==|\[\[หมวดหมู่:|$)", w_raw, flags=re.DOTALL)
            if m_triv:
                card_trivia = clean_wikitext(m_triv.group(1))
            card_quote = extract_quote_from_wikitext(w_raw)

        # 3. Determine Episode / Deck tags from Wiki categories
        episodes = [
            cat for cat in wiki_cats
            if any(ep in cat for ep in ["รามเกียรติ์ ตอนที่", "PASULOL", "ปฏิบัติการ รั้วของชาติ", "คนเ-ย", "Nut Saga"])
            and cat not in ("ภาพประกอบโดย PASULOL", "วาดโดย PASULOL", "PASULOL (Deck)", "PASULOL")
        ]
        decks = [cat.replace(" (Deck)", "").replace("_(Deck)", "") for cat in wiki_cats if "(Deck)" in cat and cat not in ("PASULOL (Deck)", "ประวัติศาสตร์ (Deck)", "วรรณคดีไทย (Deck)")]

        # 4. Match Specific Parody Rule
        parody_parts = []
        for matcher, explanation in SPECIFIC_PARODY_RULES:
            if matcher(norm_name, c):
                parody_parts.append(explanation)
                break

        # 5. Add Deck Lore if no specific rule matched or as supplementary context
        for cat in wiki_cats:
            if cat in deck_lore_map and not parody_parts:
                parody_parts.append(deck_lore_map[cat])
                break

        # 6. Add Episode & Deck origin badge text
        origin_meta = []
        if episodes:
            origin_meta.append(f"ปรากฏในตอน: {', '.join(episodes)}")
        if decks:
            origin_meta.append(f"ธีมเด็ค: {', '.join(decks[:3])}")
        if c.get("isCollab"):
            origin_meta.append("การ์ดพิเศษสัญลักษณ์ 'โดนใจ' (Collaboration / Creator Parody)")

        # 7. Fallback based on Set / Symbol if still empty
        if not parody_parts:
            symbol = c.get("symbol") or ""
            set_name = c.get("setName") or c.get("setCode")
            if "ครุฑ" in norm_name or "นาค" in norm_name or "ถ้ำนาคา" in norm_name or "ลูกแก้วนาคา" in norm_name:
                parody_parts.append("ล้อเลียนตำนานพญานาค-พญาครุฑ และความเชื่อเรื่องถ้ำนาคา/ลูกแก้วพญานาคในสังคมไทย นำมาปะทะกันในจักรวาลตลิ่งชัน")
            elif "หิมะ" in norm_name or "บิง" in norm_name or "ชีหลิน" in norm_name:
                parody_parts.append("มาจากธีม 'ดินแดนหิมะสีเทา' โดยชื่อราชาหิมะ 'บิง' และราชินีหิมะ 'ชีหลิน' เมื่อนำมาต่อกันจะพ้องเสียงคำว่า 'ปิงฉีหลิน (ไอศกรีม)' ในภาษาจีน")
            elif "ตั๊กแตน" in norm_name:
                parody_parts.append("ล้อเลียนฮีโร่แปลงร่างตระกูลคาเมนไรเดอร์ (มดแดง/ตั๊กแตนไซบอร์ก)")
            elif "ชาบู" in norm_name or "หม่าล่า" in norm_name:
                parody_parts.append("ล้อเลียนวัฒนธรรมร้านชาบูบุฟเฟต์และร้านหม่าล่าสายพานยอดฮิตของคนไทยในจักรวาล PASULOL")
            elif "ตำรวจ" in norm_name or "ด่านลอย" in norm_name or "สถานีตำรวจ" in norm_name:
                parody_parts.append("ล้อเลียนวงการตำรวจไทยและการตั้งด่านลอย โดยหน้าตาและชื่อของการ์ดตำรวจหลายใบนำต้นแบบมาจากการผวนชื่อทีม Judge ของการแข่งขันจริง")
            elif "ฤๅษี" in norm_name or "ฤษี" in norm_name or "สำนักภฤคุ" in norm_name:
                parody_parts.append("ล้อเลียนเหล่าฤๅษีผู้ทรงศีลในวรรณคดีไทยและสำนักฤๅษี/ร่างทรงในยุคปัจจุบันจากแอนิเมชัน PASULOL")
            elif "หมา" in norm_name or "แมว" in norm_name or "อาบน้ำสัตว์" in norm_name:
                parody_parts.append("มาจากแอนิเมชัน PASULOL และแก๊งสัตว์เลี้ยงสุดป่วนในร้านอาบน้ำสัตว์และคาเฟ่สัตว์เลี้ยง")
            elif "แมลงปอ" in norm_name:
                parody_parts.append("ล้อเลียนฝูงแมลงปอกลายพันธุ์และมุกแมลงปอทอดกรอบในจักรวาลตลิ่งชัน")
            elif "กบ" in norm_name or "อ๊บ" in norm_name or "อึ่งอ่าง" in norm_name:
                parody_parts.append("มาจากแก๊งกบและสัตว์ครึ่งบกครึ่งน้ำสุดกวนในแอนิเมชัน PASULOL")
            elif "แดรกคูลา" in norm_name or "แวมไพร์" in norm_name or "ผี" in norm_name or "กระสือ" in norm_name or "แม่นาค" in norm_name or "ศาลพระภูมิ" in norm_name or "เจ้าที่" in norm_name:
                parody_parts.append("ล้อเลียนตำนานผีไทย (แม่นาค, ผีกระสือไฟ RGB, เจ้าที่ศาลพระภูมิ) และผีสากล (แดรกคูลา) ในสไตล์ตลกหน้าตายของตลิ่งชัน")
            else:
                parody_parts.append(f"การ์ดมุกตลกเสียดสีสังคมและป๊อปคัลเจอร์ไทยจากจักรวาล PASULOL ชุด {set_name}" + (f" (เผ่า {symbol})" if symbol else ""))

        # Assemble final memeLore text
        final_pieces = []
        if parody_parts:
            final_pieces.append(parody_parts[0])
        if card_trivia and card_trivia not in final_pieces[0]:
            final_pieces.append(f"เกร็ดการ์ด: {card_trivia}")
        if card_quote and not favor_text:
            c["flavorText"] = card_quote
            flavor_count += 1
        if origin_meta:
            final_pieces.append(" | ".join(origin_meta))

        c["memeLore"] = "\n".join(final_pieces).strip()
        if c["memeLore"]:
            enriched_count += 1

    with open(CARDS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)

    print(f"Successfully enriched {enriched_count}/{len(cards)} cards with memeLore ({flavor_count} with flavorText).")


if __name__ == "__main__":
    build_card_lore()
