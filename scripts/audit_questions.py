#!/usr/bin/env python3
"""Audit questions.json vs source docx — báo cáo lỗi trích xuất."""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from parse_questions import parse_docx, split_option_line, normalize, QUESTION_START, option_looks_like_question_fragment

OUTPUT = ROOT / "data" / "questions.json"

MERGED_RE = re.compile(r"\s[b-e]\.\s", re.I)
SHORT_FRAGMENT = re.compile(
    r"^(đáp |và |hay |hoặc |trong |theo |với |để |khi |nếu |mà |là )",
    re.I,
)


def audit_question(q: dict) -> list[str]:
    issues = []
    opts = q["options"]
    keys = [o["key"] for o in opts]

    if len(keys) != len(set(keys)):
        issues.append("duplicate_option_keys")

    for o in opts:
        t = o["text"]
        if MERGED_RE.search(f" {t} "):
            issues.append(f"merged_in_{o['key']}: {t[:60]}")
        if len(t) < 25 and SHORT_FRAGMENT.match(t):
            issues.append(f"fragment_{o['key']}: {t}")
        parts = split_option_line(f"{o['key']}. {t}")
        if len(parts) > 1:
            issues.append(f"unsplit_{o['key']}")

    ans = q.get("correctAnswers") or []
    if len(ans) != len(set(ans)):
        issues.append("duplicate_answers")
    for a in ans:
        if a not in keys:
            issues.append(f"answer_{a}_missing")

    if q["type"] == "multiple_choice" and len(opts) < 4:
        issues.append(f"only_{len(opts)}_options")

    if not q.get("correctAnswers"):
        issues.append("missing_answer")

    if q["options"] and option_looks_like_question_fragment(q["options"][0]["text"], q["question"]):
        issues.append("question_fragment_in_option_a")

    if q["type"] == "multiple_choice" and len(opts) > 5:
        issues.append(f"too_many_{len(opts)}_options")

    return issues


def count_questions_in_docx(path: Path) -> int:
    from docx import Document
    doc = Document(path)
    n = 0
    for p in doc.paragraphs:
        t = p.text.strip()
        if QUESTION_START.match(t):
            n += 1
    return n


def main():
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    docx_files = sorted(p for p in ROOT.glob("*.docx") if not p.name.startswith("~$"))
    all_parsed: list[dict] = []
    print("=== Nguồn docx ===")
    for fp in docx_files:
        qs = parse_docx(fp)
        raw_count = count_questions_in_docx(fp)
        all_parsed.extend(qs)
        print(f"  {fp.name}")
        print(f"    Dòng 'Câu...' trong docx: {raw_count}")
        print(f"    Parse được: {len(qs)}")
        if raw_count != len(qs):
            print(f"    ⚠ Lệch {raw_count - len(qs)} câu")

    if OUTPUT.exists():
        saved = json.loads(OUTPUT.read_text(encoding="utf-8"))
    else:
        saved = []

    print(f"\n=== questions.json: {len(saved)} câu ===")

    bad = []
    for q in saved:
        issues = audit_question(q)
        if issues:
            bad.append((q, issues))

    print(f"Câu có vấn đề: {len(bad)}")
    for q, issues in bad[:40]:
        print(f"\n--- {q['id'][:50]} ---")
        print(f"Q: {q['question'][:90]}...")
        for o in q["options"]:
            print(f"  {o['key']}: {o['text'][:70]}")
        print(f"  ans={q['correctAnswers']} | {', '.join(issues[:4])}")

    if len(bad) > 40:
        print(f"\n... và {len(bad) - 40} câu nữa")

    # Summary by issue type
    from collections import Counter
    c = Counter()
    for _, issues in bad:
        for i in issues:
            c[i.split(":")[0]] += 1
    print("\n=== Tổng hợp lỗi ===")
    for k, v in c.most_common():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
