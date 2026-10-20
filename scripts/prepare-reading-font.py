"""Create the site's WOFF2 from an installed LXGW WenKai TTF (fonttools + brotli)."""

import argparse
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("font", type=Path, help="Path to the original LXGWWenKai-Regular.ttf")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    text = "".join(path.read_text(encoding="utf-8") for path in (root / "content").rglob("*.md"))
    text += (root / "quartz/components/NovelNavigation.tsx").read_text(encoding="utf-8")
    text += "搜索隐藏导航显示导航下一章上一章上一页下一页返回目录首页声明人物介绍没有找到结果加载中"
    unicodes = set(map(ord, text)) | set(range(0x20, 0x7F)) | set(range(0x3000, 0x3040))
    font = TTFont(args.font)
    original_cmap = font.getBestCmap()
    required = {ord(c) for c in text if "\u4e00" <= c <= "\u9fff"}
    missing = required - original_cmap.keys()
    if missing:
        raise ValueError("Font is missing Chinese characters: " + "".join(map(chr, sorted(missing))))
    options = subset.Options()
    options.flavor = "woff2"
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17]
    options.name_languages = ["*"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    # A renamed web-only derivative respects the original font's reserved names.
    names = {1: "Novel Reading WenKai", 2: "Regular", 3: "NovelReadingWenKai-Regular",
             4: "Novel Reading WenKai Regular", 6: "NovelReadingWenKai-Regular",
             16: "Novel Reading WenKai", 17: "Regular"}
    for record in font["name"].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    for name_id, value in names.items():
        font["name"].setName(value, name_id, 3, 1, 0x409)
    font.flavor = "woff2"
    output = root / "quartz/static/fonts/novel-wenkai.woff2"
    output.parent.mkdir(parents=True, exist_ok=True)
    font.save(output)
    print(f"Generated {output.name}: {output.stat().st_size:,} bytes; {len(required)} Chinese characters")


if __name__ == "__main__":
    main()
