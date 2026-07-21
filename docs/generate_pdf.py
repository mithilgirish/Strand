import os
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, Image as RLImage
)
from reportlab.pdfgen import canvas


# ─────────────────────────────────────────────────────────────
#  Two-pass canvas: draws header/footer AFTER page count known
# ─────────────────────────────────────────────────────────────
class MasterCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._decorate(total)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def _decorate(self, total):
        pg = self._pageNumber

        # Page 1: emerald top accent only (DESIGN.md secondary)
        if pg == 1:
            self.saveState()
            self.setFillColor(colors.HexColor("#006C49"))  # forest emerald
            self.rect(0, 786, 612, 6, fill=True, stroke=False)
            self.restoreState()
            return

        self.saveState()

        # ── Header ──────────────────────────────────────────
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0F172A"))      # deep slate
        self.drawString(36, 763, "STRAND")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#45464D"))      # on-surface-variant
        self.drawString(80, 763, "— Technical & Architecture Master Document")
        self.setStrokeColor(colors.HexColor("#C6C6CD"))    # outline-variant
        self.setLineWidth(0.5)
        self.line(36, 756, 576, 756)

        # ── Footer ──────────────────────────────────────────
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#76777D"))      # outline / neutral
        self.drawString(36, 26, "ET AI HACKATHON 2.0 SUBMISSION")
        self.drawRightString(576, 26, f"Page {pg} of {total}")
        self.setStrokeColor(colors.HexColor("#C6C6CD"))
        self.line(36, 37, 576, 37)

        self.restoreState()


# ─────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────
def fmt(txt):
    """Convert inline markdown to ReportLab XML."""
    txt = txt.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    txt = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', txt)
    txt = re.sub(r'\*(.*?)\*',     r'<i>\1</i>', txt)
    txt = re.sub(r'`(.*?)`',       r'<font face="Courier" color="#0D9488"><b>\1</b></font>', txt)
    return txt


def build_table(rows_raw, col_ratios, style_hdr, style_cell,
                PRIMARY, LIGHT_BORDER, BORDER_COLOR):
    """Build a styled ReportLab table from raw markdown rows."""
    total_w = 540
    col_widths = [total_w * r for r in col_ratios]
    rows = []
    for idx, raw in enumerate(rows_raw):
        if re.match(r'^[\s|:-]+$', raw.replace("|", "").strip()):
            continue  # skip separator rows
        cells = [c.strip() for c in raw.strip().strip("|").split("|")]
        s = style_hdr if idx == 0 else style_cell
        rows.append([Paragraph(fmt(c), s) for c in cells])

    if not rows:
        return None

    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1,  0), PRIMARY),
        ("TEXTCOLOR",     (0, 0), (-1,  0), colors.white),
        ("BACKGROUND",    (0, 1), (-1, -1), colors.white),
        ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("GRID",          (0, 0), (-1, -1), 0.4, LIGHT_BORDER),
        ("BOX",           (0, 0), (-1, -1), 0.75, BORDER_COLOR),
    ]))
    return t


# ─────────────────────────────────────────────────────────────
#  Main converter
# ─────────────────────────────────────────────────────────────
def markdown_to_pdf(md_path, pdf_path):
    docs_dir = os.path.dirname(md_path)

    with open(md_path, "r", encoding="utf-8") as f:
        raw = f.read()

    # Strip horizontal rules entirely — they produce garbage in PDF
    raw = re.sub(r'^\s*---+\s*$', '', raw, flags=re.MULTILINE)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=40, rightMargin=40,
        topMargin=46,  bottomMargin=46,
    )

    # ── Colour palette (DESIGN.md light theme) ─────────────────
    C_NAV   = colors.HexColor("#0F172A")  # Deep slate / primary
    C_EMRLD = colors.HexColor("#006C49")  # Forest emerald / secondary
    C_BODY  = colors.HexColor("#45464D")  # on-surface-variant
    C_BDR   = colors.HexColor("#C6C6CD")  # outline-variant border
    C_LBDR  = colors.HexColor("#E0E3E5")  # surface-container-highest
    C_CODE  = colors.HexColor("#F2F4F6")  # surface-container-low
    C_SURF  = colors.HexColor("#F7F9FB")  # clinical off-white canvas

    base = getSampleStyleSheet()["Normal"]

    def S(name, **kw):
        return ParagraphStyle(name, parent=base, **kw)

    # ── Styles ───────────────────────────────────────────────
    s_title  = S("title",  fontName="Helvetica-Bold", fontSize=21,   leading=26,   textColor=C_NAV,  spaceAfter=6)
    s_sub    = S("sub",    fontName="Helvetica",       fontSize=11.5, leading=14.5, textColor=C_EMRLD, spaceAfter=12)
    s_meta   = S("meta",   fontName="Helvetica",       fontSize=8.2,  leading=11,   textColor=C_BODY, alignment=TA_CENTER)
    s_metab  = S("metab",  fontName="Helvetica-Bold",  fontSize=8.2,  leading=11,   textColor=C_BODY, alignment=TA_CENTER)

    s_h1 = S("h1", fontName="Helvetica-Bold", fontSize=13.5, leading=17,
             textColor=C_NAV,   spaceBefore=14, spaceAfter=5,  keepWithNext=True)
    s_h2 = S("h2", fontName="Helvetica-Bold", fontSize=11,   leading=14,
             textColor=C_EMRLD, spaceBefore=10, spaceAfter=4,  keepWithNext=True)
    s_h3 = S("h3", fontName="Helvetica-Bold", fontSize=9.5,  leading=12.5,
             textColor=C_NAV,   spaceBefore=8,  spaceAfter=3,  keepWithNext=True)

    s_body = S("body", fontName="Helvetica", fontSize=9.2, leading=14,
               textColor=C_BODY, spaceAfter=5, alignment=TA_LEFT)

    s_li   = S("li",  fontName="Helvetica", fontSize=9.2, leading=14,
                textColor=C_BODY, leftIndent=14, firstLineIndent=0, spaceAfter=2.5)
    s_li2  = S("li2", fontName="Helvetica", fontSize=8.8, leading=13,
                textColor=C_BODY, leftIndent=28, firstLineIndent=0, spaceAfter=2)
    s_num  = S("num", fontName="Helvetica", fontSize=9.2, leading=14,
                textColor=C_BODY, leftIndent=16, spaceAfter=4)

    s_math = S("math", fontName="Helvetica-BoldOblique", fontSize=10, leading=14,
               textColor=C_EMRLD, alignment=TA_CENTER, spaceBefore=7, spaceAfter=7)

    s_thdr = S("thdr", fontName="Helvetica-Bold", fontSize=8,   leading=10.5, textColor=colors.white)
    s_tcell= S("tcell",fontName="Helvetica",      fontSize=8,   leading=11,   textColor=C_BODY)

    s_code = S("code", fontName="Courier",        fontSize=8,   leading=10.5, textColor=C_NAV)

    story = []

    # ── Cover banner ─────────────────────────────────────────
    story.append(Spacer(1, 6))

    project_root = os.path.abspath(os.path.join(docs_dir, ".."))
    LOGO_PATH = os.path.join(project_root, "frontend", "public", "strand_logo.png")
    logo_col_w = 64
    text_col_w = 540 - logo_col_w - 10

    title_block = [
        Paragraph("STRAND", S("cvt",
            fontName="Helvetica-Bold", fontSize=24, leading=27,
            textColor=C_NAV, spaceAfter=3)),
        Paragraph("Autonomous Supply Chain &amp; Quality Intelligence Platform", S("cvs",
            fontName="Helvetica-Bold", fontSize=11, leading=14.5,
            textColor=C_EMRLD, spaceAfter=4)),
        Paragraph("Comprehensive Technical &amp; Architecture Master Submission Document", S("cvsub",
            fontName="Helvetica", fontSize=8.8, leading=12,
            textColor=C_BODY)),
    ]

    if os.path.exists(LOGO_PATH):
        logo_img = RLImage(LOGO_PATH, width=logo_col_w, height=logo_col_w)
        cover_data = [[[logo_img], title_block]]
        cover_table = Table(cover_data, colWidths=[logo_col_w + 10, text_col_w])
        cover_table.setStyle(TableStyle([
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
            ("LEFTPADDING",   (0,0), (-1,-1), 0),
            ("RIGHTPADDING",  (0,0), (-1,-1), 0),
            ("TOPPADDING",    (0,0), (-1,-1), 0),
            ("BOTTOMPADDING", (0,0), (-1,-1), 0),
        ]))
        story.append(cover_table)
    else:
        story.extend(title_block)

    story.append(Spacer(1, 10))

    meta_rows = [[
        Paragraph("<b>Domain:</b> Hyperscale Infrastructure &amp; EPC", s_meta),
        Paragraph("<b>Live App:</b> strand-iota.vercel.app",            s_meta),
        Paragraph("<b>API:</b> strand-87qa.onrender.com",               s_meta),
    ]]
    mt = Table(meta_rows, colWidths=[180, 180, 180])
    mt.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), colors.white),
        ("BOX",           (0,0), (-1,-1), 0.75, C_BDR),
        ("INNERGRID",     (0,0), (-1,-1), 0.4,  C_LBDR),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
    ]))
    story.append(mt)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=C_EMRLD,
                             spaceBefore=2, spaceAfter=10))

    # ── Table column ratios per section ─────────────────────
    # Keyed by substring in the header row
    def get_col_ratios(header_cells):
        n = len(header_cells)
        if n == 4:
            h0 = header_cells[0].lower()
            if "enterprise" in h0:
                return [0.22, 0.20, 0.20, 0.38]
            if "metric" in h0:
                return [0.25, 0.25, 0.25, 0.25]
            return [0.25] * 4
        if n == 3:
            h0 = header_cells[0].lower()
            if "router" in h0:
                return [0.36, 0.10, 0.54]
            return [0.30, 0.15, 0.55]
        return [1/n] * n

    # ── Section page-break triggers ──────────────────────────────────────────
    # Each section group starts fresh — no orphaned list items
    BREAKS = {
        "## 3. High-Level System Architecture",  # p2:  sec 3 (arch + agents)
        "## 4. Mathematical Foundations",         # p3:  sec 4 (R0 formula + diagram)
        "## 5. Hybrid GraphRAG",                  # p4:  sec 5+6 (RRF + AST Cypher)
        "## 7. Human-in-the-Loop",                # p5:  sec 7+8 (HITL + Frontend)
        "## 9. Edge-Resilient Mobile",            # p6:  sec 9+10 (Mobile + Enterprise)
        "## 11. Neo4j Knowledge Graph",           # p7:  sec 11+12 (Schema + API)
        "## 13. Multi-Tenant Redis",              # p8:  sec 13+14 (Redis + Deploy)
        "## 15. Quantitative Business",           # p9+: conclusion
    }


    lines = raw.split("\n")
    i = 0
    in_code = False
    code_buf = []
    tbl_buf  = []
    in_tbl   = False

    # helper: flush a pending table buffer
    def flush_table():
        nonlocal tbl_buf, in_tbl
        if not tbl_buf:
            in_tbl = False
            return
        header = [c.strip() for c in tbl_buf[0].strip().strip("|").split("|")]
        ratios = get_col_ratios(header)
        t = build_table(tbl_buf, ratios, s_thdr, s_tcell, C_NAV, C_LBDR, C_BDR)
        if t:
            story.append(Spacer(1, 4))
            story.append(t)
            story.append(Spacer(1, 8))
        tbl_buf  = []
        in_tbl   = False

    while i < len(lines):
        raw_line = lines[i]
        stripped = raw_line.strip()
        i += 1

        # ── Skip blank lines ─────────────────────────────────
        if not stripped:
            if in_code:
                code_buf.append(raw_line)
            elif in_tbl:
                flush_table()
            continue

        # ── Page breaks ──────────────────────────────────────
        for brk in BREAKS:
            if stripped.startswith(brk):
                story.append(PageBreak())
                break

        # ── Images ───────────────────────────────────────────
        m = re.match(r'^!\[.*?\]\((.*?)\)', stripped)
        if m:
            if in_tbl: flush_table()
            img_file = m.group(1)
            img_path = os.path.join(docs_dir, img_file)
            if os.path.exists(img_path):
                # Tight image heights — avoids half-empty pages
                if "formula_" in img_file:
                    h = 82           # compact typeset equation box
                elif "architecture" in img_file:
                    h = 255
                else:
                    h = 175
                story.append(Spacer(1, 4))
                story.append(RLImage(img_path, width=532, height=h))
                story.append(Spacer(1, 5))
            continue

        # ── Code fences ──────────────────────────────────────
        if stripped.startswith("```"):
            if in_tbl: flush_table()
            if in_code:
                code_txt = "<br/>".join(
                    ln.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace(" ", "&nbsp;")
                    for ln in code_buf
                )
                ct = Table([[Paragraph(code_txt, s_code)]], colWidths=[532])
                ct.setStyle(TableStyle([
                    ("BACKGROUND",  (0,0), (-1,-1), C_CODE),
                    ("LINEBEFORE",  (0,0), (0,0),  2.5, C_EMRLD),
                    ("BOX",         (0,0), (-1,-1), 0.4, C_LBDR),
                    ("TOPPADDING",    (0,0), (-1,-1), 5),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
                    ("LEFTPADDING",   (0,0), (-1,-1), 8),
                ]))
                story.extend([Spacer(1, 3), ct, Spacer(1, 5)])
                code_buf = []
                in_code  = False
            else:
                in_code = True
            continue

        if in_code:
            code_buf.append(raw_line)
            continue

        # ── Markdown tables ───────────────────────────────────
        if stripped.startswith("|"):
            in_tbl = True
            tbl_buf.append(stripped)
            continue
        elif in_tbl:
            flush_table()

        # ── Skip document title / subtitle (rendered manually) ─
        if stripped.startswith("# STRAND:") or stripped.startswith("## Comprehensive Technical"):
            continue

        # ── Headings ─────────────────────────────────────────
        if stripped.startswith("## "):
            story.append(Paragraph(fmt(stripped[3:].strip()), s_h1))
            story.append(HRFlowable(width="100%", thickness=0.5, color=C_EMRLD,
                                    spaceBefore=2, spaceAfter=5))
            continue
        if stripped.startswith("### "):
            story.append(Paragraph(fmt(stripped[4:].strip()), s_h2))
            continue
        if stripped.startswith("#### "):
            story.append(Paragraph(fmt(stripped[5:].strip()), s_h3))
            continue

        # ── Math blocks ($$...$$) ────────────────────────────
        if stripped.startswith("$$") and stripped.endswith("$$"):
            math_txt = stripped[2:-2].strip()
            story.append(Paragraph(fmt(math_txt), s_math))
            continue

        # ── Bullet lists ──────────────────────────────────────
        if stripped.startswith("* ") or stripped.startswith("- "):
            story.append(Paragraph("• " + fmt(stripped[2:].strip()), s_li))
            continue

        # ── Sub-bullets (indented with spaces/tabs) ───────────
        if raw_line.startswith("  ") and (stripped.startswith("* ") or stripped.startswith("- ")):
            story.append(Paragraph("◦ " + fmt(stripped[2:].strip()), s_li2))
            continue

        # ── Numbered lists ────────────────────────────────────
        m_num = re.match(r'^(\d+)\.\s+(.+)', stripped)
        if m_num:
            story.append(Paragraph(f"{m_num.group(1)}.  {fmt(m_num.group(2))}", s_num))
            continue

        # ── Body paragraph ────────────────────────────────────
        story.append(Paragraph(fmt(stripped), s_body))

    # flush any trailing table
    if in_tbl:
        flush_table()

    doc.build(story, canvasmaker=MasterCanvas)
    print(f"OK Generated: {pdf_path}")


if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    md  = os.path.join(script_dir, "FINAL_SUBMISSION_DOCUMENT.md")
    pdf = os.path.join(script_dir, "FINAL_SUBMISSION_DOCUMENT.pdf")
    markdown_to_pdf(md, pdf)
