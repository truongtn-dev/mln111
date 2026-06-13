#!/usr/bin/env python3
"""Parse MLN111 questions from docx (bold = correct) or extracted.txt fallback."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXTRACTED = ROOT / "extracted.txt"
OUTPUT = ROOT / "data" / "questions.json"

QUESTION_START = re.compile(
    r"^(?:Câu\s*(?:mở đầu|[0-9]+(?:\.[0-9]+)?)|C[0-9]+(?:\.[0-9]+)?)\s*[:：\.]\s*(.+)",
    re.IGNORECASE,
)
OPTION_START = re.compile(r"^([a-eA-E])[\.\)]\s*(.*)$")
OPTION_MARKER = re.compile(r"(?:^|\s)([a-eA-E])[\.\)]\s+")
EMBEDDED_QUESTION = re.compile(r"\s+(?:Câu|C)\s*\d", re.IGNORECASE)
CHAPTER = re.compile(r"^(?:CHƯƠNG|Chương)\s+\d+", re.IGNORECASE)
SECTION = re.compile(r"^={3,}$")
OPTION_LETTERS = "abcde"

ANSWER_PATTERNS = [
    re.compile(r"ba\s+nh[aậ]n\s+đ[ịi]nh\s+tr[eê]n\s+đ[uú]ng", re.I),
    re.compile(r"t[aấ]t\s+c[aả]\s+nh[aậ]n\s+đ[ịi]nh\s+tr[eê]n\s+đ[uú]ng", re.I),
    re.compile(r"ba\s+tr[eê]n\s+đ[uú]ng", re.I),
    re.compile(r"c[aả]\s+[a-e,\s]+đ[uú]ng", re.I),
    re.compile(r"ph[ưu][oơ]ng\s+[aá]n\s+[a-e].*đ[uú]ng", re.I),
    re.compile(r"^đ[uú]ng\.?$", re.I),
]

YES_NO_OPTION = re.compile(r"^(đ[uú]ng|sai)\.?", re.I)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip())


def trim_embedded_question(text: str) -> str:
    m = EMBEDDED_QUESTION.search(text)
    if m:
        return normalize(text[: m.start()])
    return normalize(text)


def question_looks_complete(text: str) -> bool:
    t = normalize(text)
    return bool(re.search(r"[:?？]\s*$", t))


def is_labeled_option_line(text: str) -> bool:
    t = text.strip()
    if not t:
        return False
    if OPTION_START.match(t):
        return True
    return bool(split_option_line(t))


def split_option_line(line: str) -> list[tuple[str, str]]:
    """Tách dòng kiểu 'b. nô lệ. c. phong kiến.' thành nhiều phương án."""
    line = line.strip()
    if not line:
        return []

    markers = list(OPTION_MARKER.finditer(line))
    if not markers:
        om = OPTION_START.match(line)
        if om:
            return [(om.group(1).lower(), normalize(om.group(2)))]
        return []

    out: list[tuple[str, str]] = []
    for i, m in enumerate(markers):
        key = m.group(1).lower()
        start = m.end()
        end = markers[i + 1].start() if i + 1 < len(markers) else len(line)
        text = normalize(line[start:end])
        if text:
            out.append((key, trim_embedded_question(text)))
    return out


def bold_map_from_paragraph(para) -> dict[str, bool]:
    """Đọc bold theo từng run — đúng cả khi 1 dòng gộp b/c/d chỉ in đậm 1 đáp án."""
    text = para.text
    if not text.strip():
        return {}

    char_bold: list[bool] = []
    for run in para.runs:
        is_b = run.bold is True
        char_bold.extend([is_b] * len(run.text))
    if len(char_bold) < len(text):
        char_bold.extend([False] * (len(text) - len(char_bold)))
    char_bold = char_bold[: len(text)]

    result: dict[str, bool] = {}
    markers = list(OPTION_MARKER.finditer(text))
    if not markers:
        om = OPTION_START.match(text.strip())
        if om:
            key = om.group(1).lower()
            seg = char_bold[om.end() :]
            if seg:
                result[key] = sum(seg) / len(seg) >= 0.35
        elif char_bold:
            result["__all__"] = sum(char_bold) / len(char_bold) >= 0.35
        return result

    for i, m in enumerate(markers):
        key = m.group(1).lower()
        start = m.end()
        end = markers[i + 1].start() if i + 1 < len(markers) else len(text)
        seg = char_bold[start:end]
        if seg:
            result[key] = sum(seg) / len(seg) >= 0.35
    return result


def append_options_from_line(
    options: list[dict],
    bold_map: dict[str, bool] | None,
    line: str,
    marked: bool = False,
    para=None,
) -> None:
    parts = split_option_line(line)
    if not parts:
        return
    run_map = bold_map_from_paragraph(para) if para is not None else {}
    for idx, (key, text) in enumerate(parts):
        options.append({"key": key, "text": trim_embedded_question(text)})
        if bold_map is not None:
            if key in run_map:
                bold_map[key] = run_map[key]
            else:
                bold_map[key] = marked and idx == 0


def question_signature(text: str) -> str:
    t = normalize(text).lower()
    t = re.sub(r"[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]", " ", t)
    return re.sub(r"\s+", " ", t).strip()[:160]


def detect_type(question: str, options: list[dict]) -> str:
    q = question.lower()
    if "đúng hay sai" in q or "dung hay sai" in q:
        return "yes_no"
    texts = [normalize(o["text"]).lower() for o in options]
    if len(options) == 2:
        has_dung = any(t.startswith("đúng") or t == "đúng" for t in texts)
        has_sai = any(t.startswith("sai") or t == "sai" for t in texts)
        if has_dung and has_sai:
            return "yes_no"
        if all(YES_NO_OPTION.match(t) for t in texts):
            return "yes_no"
    return "multiple_choice"


def is_composite_answer(text: str) -> bool:
    t = normalize(text)
    return any(p.search(t) for p in ANSWER_PATTERNS)


def is_wrong_question(question: str) -> bool:
    q = question.lower()
    return any(
        k in q
        for k in (
            "phương án sai",
            "phuong an sai",
            "chọn sai",
            "chon sai",
            "đáp án sai",
            "mệnh đề sai",
            "nhận định sai",
            "nào sai",
            "quan niệm nào sai",
            "không đúng",
            "không thuộc",
            "không phải",
        )
    )


def score_option_capitalization(text: str) -> int:
    t = text.lstrip()
    if not t:
        return 0
    if t[0].isupper() or t[0] in "Đ":
        return 2
    return 0


def pick_answer(question: str, options: list[dict], bold_map: dict | None) -> list[str]:
    if not options:
        return []

    keys = [o["key"] for o in options]

    if bold_map:
        bold_keys = [k for k in keys if bold_map.get(k)]
        if bold_keys:
            return list(dict.fromkeys(bold_keys))

    qtype = detect_type(question, options)

    if qtype == "yes_no":
        for o in options:
            t = normalize(o["text"]).lower()
            if t.startswith("đúng") or t == "đúng":
                return [o["key"]]
        for o in options:
            t = normalize(o["text"]).lower()
            if t.startswith("sai"):
                return [o["key"]]
        return [options[0]["key"]]

    composite = [o for o in options if is_composite_answer(o["text"])]
    if composite:
        return [composite[-1]["key"]]

    if is_wrong_question(question):
        caps = [(o["key"], score_option_capitalization(o["text"])) for o in options]
        wrong = [k for k, s in caps if s >= 2]
        if wrong:
            return wrong
        return [options[-1]["key"]]

    caps = [(o["key"], score_option_capitalization(o["text"])) for o in options]
    best = max(caps, key=lambda x: x[1])
    if best[1] >= 2:
        winners = [k for k, s in caps if s >= 2]
        if len(winners) == 1:
            return winners

    return [options[0]["key"]] if options else []


def option_looks_like_question_fragment(option_text: str, question_text: str) -> bool:
    """Phát hiện phần câu hỏi bị tách nhầm thành phương án a."""
    t = normalize(option_text)
    if not t.endswith("?"):
        return False
    if question_looks_complete(question_text):
        return False
    if is_labeled_option_line(t):
        return False
    if re.match(r"^(đúng|sai)\.?", t, re.I):
        return False
    return True


def fix_question_fragment_options(q: dict) -> None:
    """Gộp phương án a dạng '...?' còn sót của câu hỏi trở lại question."""
    while q["options"]:
        first = q["options"][0]
        if not option_looks_like_question_fragment(first["text"], q["question"]):
            break
        q["question"] = normalize(q["question"] + " " + first["text"])
        remaining = q["options"][1:]
        rekey = {o["key"]: OPTION_LETTERS[idx] for idx, o in enumerate(remaining)}
        for o in remaining:
            o["key"] = rekey[o["key"]]
        q["options"] = remaining
        q["correctAnswers"] = [
            rekey[a] for a in q.get("correctAnswers") or [] if a in rekey
        ]


def next_nonempty_para(paras, idx: int) -> int:
    while idx < len(paras) and not paras[idx].text.strip():
        idx += 1
    return idx


def collect_short_answer_options(
    paras, i: int, question_text: str, options: list[dict], bold_map: dict[str, bool], opt_idx: int
) -> tuple[int, int]:
    """Câu hỏi ngắn: các dòng liên tiếp không có a/b/c → gán a,b,c,d; in đậm = đúng."""
    while i < len(paras) and opt_idx < len(OPTION_LETTERS):
        nxt = paras[i].text.strip()
        if not nxt:
            i += 1
            continue
        if is_question_line(nxt) or CHAPTER.match(nxt):
            break
        if is_labeled_option_line(nxt):
            break
        run_map = bold_map_from_paragraph(paras[i])
        marked = run_map.get("__all__", False) or para_is_marked(paras[i])
        if not should_assign_unlabeled_option(nxt, marked, question_text):
            break
        key = OPTION_LETTERS[opt_idx]
        options.append({"key": key, "text": trim_embedded_question(normalize(nxt))})
        bold_map[key] = marked
        opt_idx += 1
        i += 1
        i = append_option_continuations(paras, i, options)
    return i, opt_idx


def para_is_marked(para) -> bool:
    try:
        from docx.enum.text import WD_COLOR_INDEX
    except ImportError:
        WD_COLOR_INDEX = None

    runs = [r for r in para.runs if r.text.strip()]
    if not runs:
        return False

    bold_chars = sum(len(r.text) for r in runs if r.bold)
    total = sum(len(r.text) for r in runs)
    if total and bold_chars / total >= 0.4:
        return True

    if WD_COLOR_INDEX:
        for r in runs:
            if r.font.highlight_color not in (None, WD_COLOR_INDEX.AUTO):
                return True
    return False


def is_question_line(text: str) -> bool:
    return bool(QUESTION_START.match(text))


def option_needs_continuation(text: str) -> bool:
    t = normalize(text)
    if not t:
        return True
    if t.endswith((".", "?", "!", ")", "”", '"', ";")):
        return False
    tails = (
        " và", " và", " phản", " phản", " các", " các", " Anh và",
        " Đức;", " khoa học", " triết", " triết", " xã hội", " xã hội",
    )
    return any(t.endswith(x) for x in tails) or len(t) > 80 and not t.endswith(".")


def append_option_continuations(paras, i: int, options: list[dict]) -> int:
    while i < len(paras):
        nxt = paras[i].text.strip()
        if not nxt:
            i += 1
            continue
        if is_question_line(nxt) or CHAPTER.match(nxt):
            break
        if OPTION_START.match(nxt):
            break
        if split_option_line(nxt):
            break
        if not options:
            break
        t = nxt.strip()
        prev = options[-1]["text"]
        if (t[0].islower() or t[0] == "đ") or option_needs_continuation(prev):
            options[-1]["text"] = normalize(options[-1]["text"] + " " + t)
            i += 1
        else:
            break
    return i


def extract_inline_options(question_text: str) -> tuple[str, list[tuple[str, str]]]:
    """Tách A. B. C. D. nằm chung dòng câu hỏi (CHƯƠNG 1 file [1])."""
    m = re.search(r"\s([A-Ea-e])[\.\)]\s+", question_text)
    if not m:
        return question_text, []
    q_part = normalize(question_text[: m.start()])
    opts = split_option_line(question_text[m.start() :].strip())
    return q_part, opts


def should_assign_unlabeled_option(text: str, marked: bool, question_text: str = "") -> bool:
    """Dòng không có a/b/c — chỉ coi là đáp án khi câu hỏi đã hoàn chỉnh."""
    if marked:
        pass
    elif not marked:
        # Dòng phương án nhiễu thường vẫn có chữ hoa đầu; dòng nối câu hỏi thì thường thường
        pass
    t = text.strip()
    if not t or is_question_line(t):
        return False
    if is_labeled_option_line(t):
        return False
    if question_text and not question_looks_complete(question_text):
        return False
    if t[0].islower() or t[0] == "đ":
        return False
    if len(t) < 4:
        return False
    return marked or t[0].isupper() or t[0] in "Đ"


def parse_text_block(text: str, chapter: str, source: str) -> list[dict]:
    lines = text.splitlines()
    questions: list[dict] = []
    i = 0
    current_chapter = chapter

    while i < len(lines):
        line = lines[i].strip()
        if not line or SECTION.match(line):
            i += 1
            continue
        if CHAPTER.match(line):
            current_chapter = line
            i += 1
            continue

        m = QUESTION_START.match(line)
        if not m:
            i += 1
            continue

        q_num_match = re.search(
            r"(?:Câu\s*(?:mở đầu|[0-9]+(?:\.[0-9]+)?)|C([0-9]+))", line, re.I
        )
        q_id = (
            q_num_match.group(0).replace(" ", "_").lower()
            if q_num_match
            else f"q_{len(questions)}"
        )
        question_text = m.group(1).strip()
        i += 1

        options: list[dict] = []
        while i < len(lines):
            raw = lines[i].strip()
            if not raw:
                i += 1
                if options:
                    break
                continue
            if CHAPTER.match(raw) or SECTION.match(raw):
                break
            qm = QUESTION_START.match(raw)
            if qm and options:
                break
            if qm and not options:
                question_text += " " + qm.group(1).strip()
                i += 1
                continue

            om = OPTION_START.match(raw)
            if om:
                parts = split_option_line(raw)
                if not parts:
                    i += 1
                    continue
                for key, opt_text in parts:
                    options.append({"key": key, "text": opt_text})
                i += 1
                while i < len(lines):
                    cont = lines[i].strip()
                    if not cont or QUESTION_START.match(cont) or CHAPTER.match(cont):
                        break
                    if OPTION_START.match(cont) or split_option_line(cont):
                        break
                    if cont[0].islower() or cont[0] == "đ":
                        options[-1]["text"] = normalize(options[-1]["text"] + " " + cont)
                        i += 1
                    else:
                        break
                continue

            if options:
                break
            question_text += " " + raw
            i += 1

        if len(options) < 2:
            continue

        answers = pick_answer(question_text, options, None)
        questions.append(
            {
                "id": f"{source}_{q_id}_{len(questions)}",
                "chapter": current_chapter,
                "question": normalize(question_text),
                "type": detect_type(question_text, options),
                "options": options,
                "correctAnswers": answers,
                "source": source,
            }
        )

    return questions


def parse_docx(path: Path) -> list[dict]:
    try:
        from docx import Document
    except ImportError:
        print("python-docx not installed, skipping docx parse")
        return []

    doc = Document(path)
    source_slug = re.sub(r"\W+", "_", path.stem.lower())[:40]
    questions: list[dict] = []
    current_chapter = ""
    paras = doc.paragraphs
    i = 0

    while i < len(paras):
        text = paras[i].text.strip()
        if not text or SECTION.match(text) or text == "=========":
            i += 1
            continue

        if CHAPTER.match(text):
            current_chapter = text
            i += 1
            continue

        qm = QUESTION_START.match(text)
        if not qm:
            i += 1
            continue

        question_text = qm.group(1).strip()
        if para_is_marked(paras[i]) and not question_text:
            i += 1
            continue

        q_num = re.search(
            r"(?:Câu\s*(?:mở đầu|[0-9]+(?:\.[0-9]+)?)|C[0-9]+(?:\.[0-9]+)?)",
            text,
            re.I,
        )
        q_id = q_num.group(0).replace(" ", "_").lower() if q_num else f"q_{len(questions)}"
        i += 1

        while i < len(paras):
            nxt = paras[i].text.strip()
            if not nxt:
                i += 1
                continue
            if is_question_line(nxt) or CHAPTER.match(nxt):
                break
            if is_labeled_option_line(nxt):
                break
            # Câu hỏi chưa xong: gộp cả dòng in đậm (nhấn mạnh trong đề)
            if not question_looks_complete(question_text):
                question_text += " " + nxt
                i += 1
                continue
            # Câu hỏi đã đủ — dừng trước khối đáp án
            break

        question_text, inline_opts = extract_inline_options(question_text)
        options: list[dict] = []
        bold_map: dict[str, bool] = {}
        for key, text in inline_opts:
            options.append({"key": key, "text": text})
            bold_map[key] = False
        opt_idx = len(options)

        peek = next_nonempty_para(paras, i)
        short_answer_mode = (
            peek >= len(paras) or not is_labeled_option_line(paras[peek].text.strip())
        )

        if short_answer_mode and question_looks_complete(question_text):
            i, opt_idx = collect_short_answer_options(
                paras, i, question_text, options, bold_map, opt_idx
            )
        else:
            while i < len(paras):
                nxt = paras[i].text.strip()
                if not nxt:
                    i += 1
                    continue
                if is_question_line(nxt) or CHAPTER.match(nxt):
                    break

                om = OPTION_START.match(nxt)
                if om:
                    append_options_from_line(
                        options, bold_map, nxt, para_is_marked(paras[i]), paras[i]
                    )
                    i += 1
                    if options:
                        opt_idx = max(
                            opt_idx,
                            OPTION_LETTERS.index(options[-1]["key"]) + 1,
                        )
                    i = append_option_continuations(paras, i, options)
                    continue

                if opt_idx >= len(OPTION_LETTERS):
                    break

                inline = split_option_line(nxt)
                if inline:
                    append_options_from_line(
                        options, bold_map, nxt, para_is_marked(paras[i]), paras[i]
                    )
                    i += 1
                    if options:
                        opt_idx = max(
                            opt_idx,
                            OPTION_LETTERS.index(options[-1]["key"]) + 1,
                        )
                    i = append_option_continuations(paras, i, options)
                    continue

                break

        if len(options) < 2:
            continue

        answers = pick_answer(question_text, options, bold_map)
        if not answers and options and not any(bold_map.values()):
            answers = pick_answer(question_text, options, None)
        questions.append(
            {
                "id": f"{source_slug}_{q_id}_{len(questions)}",
                "chapter": current_chapter,
                "question": normalize(question_text),
                "type": detect_type(question_text, options),
                "options": options,
                "correctAnswers": answers,
                "source": source_slug,
            }
        )

    return questions


def merge_dedupe(existing: list[dict], new_items: list[dict]) -> tuple[list[dict], int]:
    seen = {question_signature(q["question"]) for q in existing}
    added = 0
    merged = list(existing)
    for q in new_items:
        sig = question_signature(q["question"])
        if sig in seen:
            continue
        seen.add(sig)
        merged.append(q)
        added += 1
    return merged, added


def dedupe_options(options: list[dict]) -> list[dict]:
    """Giữ phương án đầu tiên nếu trùng key (lỗi nguồn)."""
    seen: set[str] = set()
    out: list[dict] = []
    for o in options:
        if o["key"] in seen:
            continue
        seen.add(o["key"])
        out.append(o)
    return out


def post_process_options(questions: list[dict]) -> None:
    for q in questions:
        fix_question_fragment_options(q)
        fixed: list[dict] = []
        for opt in q["options"]:
            parts = split_option_line(f"{opt['key']}. {opt['text']}")
            if len(parts) <= 1:
                fixed.append({
                    "key": opt["key"],
                    "text": trim_embedded_question(opt["text"]),
                })
            else:
                for key, text in parts:
                    fixed.append({"key": key, "text": text})
        q["options"] = dedupe_options(fixed)
        q["correctAnswers"] = list(dict.fromkeys(q.get("correctAnswers") or []))
        if not q["correctAnswers"] and q["options"]:
            q["correctAnswers"] = pick_answer(q["question"], q["options"], None)


def post_process_yes_no(questions: list[dict]) -> None:
    for q in questions:
        opts = q["options"]
        if len(opts) == 2:
            dung = [o for o in opts if re.match(r"^đ[uú]ng", normalize(o["text"]), re.I)]
            sai = [o for o in opts if re.match(r"^sai", normalize(o["text"]), re.I)]
            if dung and sai:
                q["type"] = "yes_no"
                if not any(
                    o["key"] in q["correctAnswers"]
                    for o in dung
                ):
                    q["correctAnswers"] = [dung[0]["key"]]


def main():
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    all_q: list[dict] = []
    stats: list[str] = []

    docx_files = sorted(p for p in ROOT.glob("*.docx") if not p.name.startswith("~$"))
    for docx_path in docx_files:
        print(f"Parsing docx: {docx_path.name.encode('ascii', 'replace').decode()}")
        parsed = parse_docx(docx_path)
        before = len(all_q)
        all_q, added = merge_dedupe(all_q, parsed)
        stats.append(f"  {docx_path.name}: {len(parsed)} parsed, +{added} new (dup skipped: {len(parsed) - added})")

    if not docx_files and EXTRACTED.exists():
        text = EXTRACTED.read_text(encoding="utf-8")
        parts = re.split(r"={3,}", text)
        txt_questions: list[dict] = []
        for idx, part in enumerate(parts):
            label = "de_cuong_txt" if idx == 0 else f"chuong_txt_{idx}"
            txt_questions.extend(parse_text_block(part, "", label))
        before = len(all_q)
        all_q, added = merge_dedupe(all_q, txt_questions)
        stats.append(f"  extracted.txt: {len(txt_questions)} parsed, +{added} new")

    post_process_options(all_q)
    post_process_yes_no(all_q)

    # Báo cáo chất lượng
    issues = sum(
        1
        for q in all_q
        if any(
            len(parts) > 1
            for opt in q["options"]
            for parts in [split_option_line(f"{opt['key']}. {opt['text']}")]
        )
    )
    if issues:
        print(f"  ⚠ Còn {issues} phương án chưa tách hết (kiểm tra thủ công)")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(all_q, ensure_ascii=False, indent=2), encoding="utf-8")

    yes_no = sum(1 for q in all_q if q["type"] == "yes_no")
    mc = len(all_q) - yes_no
    print(f"\nSaved {len(all_q)} questions -> {OUTPUT}")
    print(f"  Multiple choice: {mc}, Yes/No: {yes_no}")
    for line in stats:
        print(line)


if __name__ == "__main__":
    main()
