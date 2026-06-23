#!/usr/bin/env python3
"""Chuyển mln111_quizlet.docx → data/quizlet_questions.json cho web app."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCX = ROOT / "data" / "mln111_quizlet.docx"
OUTPUT = ROOT / "data" / "quizlet_questions.json"

OPTION_MARKER = re.compile(r"(?:^|\n)\s*([A-Da-d])\s*[\.\)]\s*", re.MULTILINE)
YES_NO = re.compile(r"^(đúng|sai)\.?$", re.I)
LETTER_ONLY = re.compile(r"^[A-Da-d](?:\s*[,;]\s*[A-Da-d])*$|^[A-Da-d]{2,4}$")


def slugify(text: str, max_len: int = 48) -> str:
    t = re.sub(r"\s+", "_", text.strip().lower())
    t = re.sub(r"[^\w\u00c0-\u1ef9-]", "", t, flags=re.I)
    return t[:max_len] or "q"


def split_options(term: str) -> tuple[str, list[dict[str, str]]]:
    markers = list(OPTION_MARKER.finditer(term))
    if not markers:
        return term.strip(), []

    question = term[: markers[0].start()].strip()
    options: list[dict[str, str]] = []
    for i, m in enumerate(markers):
        key = m.group(1).lower()
        start = m.end()
        end = markers[i + 1].start() if i + 1 < len(markers) else len(term)
        text = re.sub(r"\s+", " ", term[start:end]).strip()
        if text:
            options.append({"key": key, "text": text})
    return question or term.strip(), options


def parse_correct(definition: str, options: list[dict[str, str]]) -> list[str]:
    raw = (definition or "").strip()
    if not raw:
        return []

    first_line = raw.split("\n")[0].strip()
    first_line = re.sub(r"\s*\(.*$", "", first_line).strip()

    if YES_NO.match(first_line):
        return [first_line.lower().replace(".", "")]

    letters = re.findall(r"[A-Da-d]", first_line)
    if letters and LETTER_ONLY.match(first_line.replace(" ", "")):
        seen: list[str] = []
        for ch in letters:
            k = ch.lower()
            if k not in seen:
                seen.append(k)
        return seen

    low = first_line.lower()
    for opt in options:
        if low == opt["text"].lower() or low == opt["key"]:
            return [opt["key"]]
        if opt["text"].lower().startswith(low[:20]) or low.startswith(opt["text"].lower()[:20]):
            return [opt["key"]]

    if len(first_line) <= 3 and letters:
        return [letters[0].lower()]

    return [first_line.lower()]


def detect_type(options: list[dict[str, str]], correct: list[str]) -> str:
    if not options:
        return "open"
    if len(options) == 2 and all(
        YES_NO.match(o["text"]) for o in options
    ):
        return "yes_no"
    if correct and all(c in ("đúng", "sai") for c in correct):
        return "yes_no"
    return "multiple_choice"


def card_to_question(card: dict[str, str], index: int) -> dict:
    question, options = split_options(card["term"])
    correct = parse_correct(card["definition"], options)
    qtype = detect_type(options, correct)

    if qtype == "yes_no" and options:
        correct = [c for c in correct if c in ("đúng", "sai")]
        if not correct:
            for opt in options:
                if opt["key"] in card["definition"].lower() or opt["text"].lower() in card["definition"].lower():
                    correct = [opt["key"]]
                    break

    if not options and qtype == "multiple_choice":
        qtype = "open"

    qid = f"quizlet_{index}_{slugify(question)}"
    return {
        "id": qid,
        "chapter": "",
        "question": question,
        "type": qtype,
        "options": options,
        "correctAnswers": correct,
        "source": "mln111_quizlet",
    }


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    sys.path.insert(0, str(ROOT / "scripts"))
    from fetch_quizlet import parse_cards_from_docx

    if not DOCX.is_file():
        print(f"Không tìm thấy {DOCX}", file=sys.stderr)
        return 1

    cards, meta = parse_cards_from_docx(DOCX)
    questions = [card_to_question(c, i) for i, c in enumerate(cards)]

    mc = sum(1 for q in questions if q["type"] == "multiple_choice")
    yn = sum(1 for q in questions if q["type"] == "yes_no")
    open_q = sum(1 for q in questions if q["type"] == "open")

    payload = {
        "meta": {
            "title": meta.get("title", "MLN111 - CHUẨN"),
            "total": len(questions),
            "multiple_choice": mc,
            "yes_no": yn,
            "open": open_q,
            "source": str(DOCX.name),
        },
        "questions": questions,
    }

    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {len(questions)} câu → {OUTPUT}")
    print(f"  Trắc nghiệm: {mc} · Đúng/Sai: {yn} · Tự luận ngắn: {open_q}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
