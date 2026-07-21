"""
Render math equation cards as PNG using matplotlib mathtext.
Design: STRAND Industrial Glass — clinical off-white, deep-slate, emerald.
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import os

OUT = os.path.dirname(os.path.abspath(__file__))

PRIMARY = '#0F172A'
EMERALD = '#006C49'
CANVAS  = '#F7F9FB'
SURFACE = '#FFFFFF'
BORDER  = '#C6C6CD'
CAPTION = '#45464D'

EQUATIONS = [
    {
        "name":    "formula_r0.png",
        "label":   "R\u2080  CONTAGION RISK SCORE",
        "formula": r"$R_0\ =\ \dfrac{\mathrm{downstream} + 2\,\times\,\mathrm{critical\_downstream}}{\mathrm{normalizer}}$",
        "sub":     "Score range [0 \u2013 10].   R\u2080 < 3: low  |  3 \u2264 R\u2080 \u2264 5: moderate  |  R\u2080 > 5: critical \u2192 triggers Planner + HITL Gate",
        "w": 9.0,  "h": 1.70,
    },
    {
        "name":    "formula_rrf.png",
        "label":   "RECIPROCAL RANK FUSION  (RRF)",
        "formula": r"$\mathrm{RRF\_Score}(d)\ =\ \sum_{r}\,\dfrac{1}{k + \mathrm{rank}_{r}(d)},\quad k = 60$",
        "sub":     "Fuses ChromaDB dense-vector ranks + BM25 sparse-keyword ranks into a single unified relevance ranking.",
        "w": 9.0,  "h": 1.60,
    },
]


def render(eq):
    fig, ax = plt.subplots(figsize=(eq["w"], eq["h"]))
    fig.patch.set_facecolor(CANVAS)
    ax.set_facecolor(SURFACE)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')

    # Outer border
    for spine in ax.spines.values():
        spine.set_visible(True)
        spine.set_edgecolor(BORDER)
        spine.set_linewidth(0.8)

    # Emerald left accent bar
    bar_w = 0.012
    ax.add_patch(mpatches.Rectangle(
        (0, 0), bar_w, 1,
        transform=ax.transAxes,
        facecolor=EMERALD, edgecolor='none',
        zorder=3, clip_on=False,
    ))

    # Label (top-left, emerald, monospace caps)
    ax.text(
        bar_w + 0.018, 0.88,
        eq["label"],
        transform=ax.transAxes,
        ha='left', va='top',
        fontsize=7.8, fontweight='bold',
        color=EMERALD, fontfamily='monospace',
    )

    # Thin separator line under label
    ax.axhline(y=0.72, xmin=bar_w + 0.018, xmax=0.99,
               color=BORDER, linewidth=0.6, zorder=2)

    # Formula — centred
    ax.text(
        0.52, 0.44,
        eq["formula"],
        transform=ax.transAxes,
        ha='center', va='center',
        fontsize=15, color=PRIMARY,
    )

    # Caption (bottom-left, slate, monospace small)
    ax.text(
        bar_w + 0.018, 0.07,
        eq["sub"],
        transform=ax.transAxes,
        ha='left', va='bottom',
        fontsize=7.0, color=CAPTION,
        fontfamily='monospace',
    )

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(
        os.path.join(OUT, eq["name"]),
        dpi=180, bbox_inches='tight',
        facecolor=CANVAS,
    )
    plt.close()
    print(f"Saved {eq['name']}")


for eq in EQUATIONS:
    render(eq)
