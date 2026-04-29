<div align="center">

# AI Contract Review

**Contract review shouldn't end with "now open Word and fix it manually."**

A browser-based AI contract review workbench. Identify risks, edit inline, iterate with an AI assistant, and export a Word file that lawyers can hand to the other side — all without leaving the tab.

[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org/)
[![Flask](https://img.shields.io/badge/Flask-Python-000000.svg)](https://flask.palletsprojects.com/)
[![License: Private](https://img.shields.io/badge/license-private-lightgrey.svg)](#license)

[简体中文](README.zh-CN.md)

</div>

---

## TL;DR

Drop a `.docx` contract in. The platform does five things for you in one workspace:

1. **Risk identification** — flags high- and medium-risk clauses, explains why, and proposes specific edits.
2. **One-click fix** — apply any (or all) AI suggestions; the document updates in place.
3. **Inline annotations** — AI and manual annotations live alongside the text; click to jump.
4. **Contract chat** — ask the document anything ("what's the termination liability cap?") and get answers grounded in the contract.
5. **Word export with annotations preserved** — including each annotation's resolved/unresolved status, so the lawyer on the other side sees exactly what was changed and why.

No plugin to install. No Word license required for the reviewer. The result is a `.docx` file ready to hand off.

---

## The Insight

Most AI contract review tools today (Spellbook, Diligen, LawGeex) are **Microsoft Word plugins**. That choice tells you everything about who the product was designed for: senior lawyers who already live inside Word and aren't going to change.

But the real bottleneck in contract review isn't where the lawyer is — it's the workflow:

> **Reading risk → drafting fixes → applying fixes → exporting → handing off.**
> Today's tools do step 1. They make the lawyer do steps 2–5 by hand.

If the AI flags 12 risks but the lawyer still has to manually edit 12 paragraphs in Word, the AI saved them maybe 5 minutes. The other 90% of the work is unchanged.

AI Contract Review takes the opposite stance: **the AI's job isn't to flag, it's to finish.** The platform owns the entire loop from risk → edit → export, so the deliverable is a Word file the lawyer can immediately send to the counterparty.

---

## Real-World Scenarios

**1. Vendor MSA review at scale.**
Procurement gets 30 vendor MSAs a quarter, all subtly different. Lawyers spend 80% of their time on the same six high-risk clauses (liability, IP, termination, indemnity, jurisdiction, payment terms). The platform catches all six, proposes redlines, exports clean.

**2. NDA triage at a startup.**
The founder receives an NDA from a counterparty. They don't have a lawyer on retainer. The platform flags non-standard terms (mutual vs unilateral, perpetual confidentiality, IP assignment hidden in §7), explains in plain English, and lets them push back with a one-click edit.

**3. Term sheet redlines before legal review.**
Founders run the term sheet through the platform first to understand which clauses to push back on. The lawyer's billable hour starts at "let's negotiate" instead of "let me explain what this means."

---

## How It Works

```
Upload .docx
     │
     ▼
┌───────────────────────────────────────────────────────────┐
│  Browser-side workspace                                   │
│  ┌─────────────┐  ┌─────────────────┐  ┌──────────────┐   │
│  │ Sidebar     │  │ Editor (canvas) │  │ AI panel     │   │
│  │ • Risks     │◀─│ • Inline text   │─▶│ • Chat       │   │
│  │ • Annotations│  │ • Annotations  │  │ • Summary    │   │
│  │ • One-click │  │ • Edit / undo   │  │ • Severity   │   │
│  │   fix       │  │                 │  │   slider     │   │
│  └─────────────┘  └─────────────────┘  └──────────────┘   │
└───────────────────────────────────────────────────────────┘
     │
     ▼
Export → Python backend (python-docx) preserves all
         annotations, fix status, and original formatting
     │
     ▼
.docx ready to hand off
```

Frontend: React 19 + TypeScript + canvas-editor (Word-style WYSIWYG).
Backend: Flask + python-docx (Word format preservation + annotation injection).
LLM: prompt-engineered risk detection with three severity modes.

---

## Key Design Decisions

**1. Workbench, not Word plugin.**
Word plugins lock you to desktop, lock you to one OS, and lock the reviewer into Word's UX. A browser workbench works everywhere, supports future multi-user collaboration, and lets us own the full UX. The cost is having to rebuild a Word-style editor; the gain is owning the entire workflow loop.

**2. "One-click fix" is the actual product.**
Anyone can ship "AI flags risks." The hard part is making the AI's suggestions *executable* — applying them in place, preserving formatting, supporting undo, batching multiple fixes. Without one-click fix, the AI is a fancier Ctrl+F. With it, the lawyer's workflow collapses by an order of magnitude. **This decision is the difference between a demo and a product.**

**3. Three severity modes (Strict / Balanced / Lenient).**
Came from user research: a procurement lawyer reviewing 30 MSAs/quarter wants Strict, but a founder reading their first NDA finds Strict overwhelming. One-size-fits-all is bad UX. The slider takes 5 seconds to add and changes the product's accessibility for non-lawyers entirely.

**4. Custom annotation system, not the editor's native one.**
canvas-editor doesn't support native Word annotations. We could have switched editors (OnlyOffice was a candidate — but heavy, complex to embed). Instead: keep canvas-editor for the editing UX, build a separate Python annotation service that injects comments into the exported `.docx` via text-matching. Trade-off accepted: more backend complexity, but a much lighter frontend and full control over annotation behavior.

**5. Word export, not PDF.**
PDFs are dead documents. Lawyers will reject any tool that doesn't return a `.docx`, because the next step is *always* further negotiation in Word. Locking the output to `.docx` (with annotations preserved) is the only acceptable hand-off format for this audience.

**6. Contract chat grounded in the document, not generic.**
The chat panel injects the current contract text into every prompt. "What's the cap on liability?" returns an answer specific to *this* contract, with the relevant clause cited. A generic chatbot wouldn't be useful for a lawyer; a grounded one becomes a research tool.

---

## Get Started

```bash
# Frontend
npm install
npm run dev          # http://localhost:5173

# Backend (separate terminal)
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add your LLM API key
python app.py        # http://localhost:8000
```

Drop a `.docx` contract into the upload view, pick a severity mode, and start reviewing.

---

## Roadmap

The vision: a contract review workbench that understands *your* company's playbook — not just generic risks, but the specific positions your legal team always negotiates.

| Status | Feature |
|---|---|
| ✅ shipped | Risk identification + severity modes |
| ✅ shipped | One-click fix (single + batch) |
| ✅ shipped | Inline + AI annotations |
| ✅ shipped | Contract chat grounded in document |
| ✅ shipped | Contract summary (parties, terms, obligations) |
| ✅ shipped | Word export with annotations preserved |
| 🚧 next | Custom playbooks — your firm's standard positions |
| 🚧 next | Specialized legal LLM + retrieval over case law |
| 🚧 next | Multi-document workflow (compare across vendor contracts) |
| 🔭 future | Real-time multi-reviewer collaboration |
| 🔭 future | Negotiation suggestions ("the counterparty usually accepts X here") |

---

## Related Work

| | What it does | How AI Contract Review differs |
|---|---|---|
| **Spellbook / LawGeex / Diligen** | AI risk flagging inside MS Word as a plugin | Locks you to Word + desktop. Ours runs in browser + owns the full edit/export loop. |
| **Harvey AI** | LLM legal copilot, generic chat | No structured review workflow, no in-place edits. Ours is workflow-first. |
| **DocuSign Insight / Kira** | Enterprise contract analytics | Built for AML/M&A diligence at scale. Ours is built for *active review* of one contract. |
| **Asking ChatGPT directly** | Free-form Q&A | No annotations, no edits, no export, no risk flagging. Becomes a hassle past one paragraph. |

---

## Tech Stack

**Frontend:** React 19 · TypeScript · Vite · Tailwind CSS · canvas-editor · framer-motion
**Backend:** Python 3 · Flask · python-docx · Flask-CORS

## Project Structure

```
AI-contract/
├── components/          # React components (Editor, Upload, Sidebar, GlassUI)
├── utils/               # Annotation export utilities
├── backend/             # Flask service for Word format + annotation injection
├── types.ts             # TypeScript types
└── App.tsx              # Main app
```

## Browser Compatibility

Chrome/Edge ≥ 90 · Firefox ≥ 88 · Safari ≥ 14
Recommended: documents under 10 MB.

## License

Private.
