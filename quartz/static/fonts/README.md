# Reading font

`novel-wenkai.woff2` is a web-only subset of the author's installed LXGW WenKai
Regular 1.530. Its family and PostScript names are changed to Novel Reading WenKai
to respect the upstream reserved font names. The outlines are unchanged.

Original project: https://github.com/lxgw/LxgwWenKai

License: SIL Open Font License 1.1; see `OFL.txt`. Original copyright and licensing
metadata are also preserved in the WOFF2.

The CSS first tries the locally installed LXGW WenKai, then downloads this small
self-hosted file. Browsers may synthesize bold for Markdown emphasis.

After publishing new text, regenerate the subset before building:

```powershell
python scripts/prepare-reading-font.py "PATH/TO/LXGWWenKai-Regular.ttf"
node quartz/bootstrap-cli.mjs build
```

The generator needs the Python packages `fonttools` and `brotli`. These are only
needed when refreshing the font; GitHub Pages builds use the committed WOFF2.
