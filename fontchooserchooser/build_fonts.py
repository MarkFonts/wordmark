#!/usr/bin/env python3
"""
Re-subset the page's embedded display faces from the page's own text.

These are display faces — Rubik Pixels is 267KB for bare Latin, Doodle Triangles
238KB — so a full charset costs ~2.7MB across 32 faces and takes the page to 4.6MB.
Tight subsets are the right call. What is NOT right is maintaining the glyph list by
hand: add a card, forget to re-subset the face assigned to it, and its title renders
.notdef (FontColle lost its F and C exactly this way).

So the glyph set is DERIVED. Every face gets the headline (all 32 are in the
rotation) plus the card title it is assigned to, read out of the page itself. Adding
a tool means re-running this, and it cannot be wrong.

    python3 build_fonts.py fontchooserchooser.html
"""
import base64, re, sys, urllib.parse, urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}

# Google's css2 endpoint needs the family's own weight query for the faces that
# ship more than one; everything else resolves from the family name alone.
WEIGHTS = {"Fraunces": ":wght@800"}


def fetch(url: str) -> bytes:
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25).read()


def subset(family: str, text: str) -> bytes:
    fam = family.replace(" ", "+") + WEIGHTS.get(family, "")
    q = urllib.parse.quote("".join(sorted(set(text))))
    css = fetch(f"https://fonts.googleapis.com/css2?family={fam}&text={q}").decode()
    return fetch(re.search(r"url\((https://[^)]+)\)", css).group(1))


def main(path: str) -> None:
    html = open(path).read()

    # Headline: every face renders it, so it is in every subset.
    headline = "".join(re.findall(r'<span class="fit">([^<]*)', html))
    headline += "".join(re.findall(r'<span class="grad"[^>]*>([^<]*)</span>', html))
    headline += "…— "

    # Card titles, paired to the face each card hovers into.
    titles = {}
    for n, spec in re.findall(r'n:"([^"]+)".*?spec:\'"GF ([^"]+)"', html):
        titles.setdefault(spec, set()).update(n)

    faces = re.findall(r'@font-face\{font-family:"GF ([^"]+)";src:url\(data:font/woff2;base64,([^)]+)\)', html)
    total_before = total_after = 0

    for family, old_b64 in faces:
        text = headline + "".join(sorted(titles.get(family, set())))
        data = subset(family, text)
        old_len = len(base64.b64decode(old_b64))
        total_before += old_len
        total_after += len(data)
        new_b64 = base64.b64encode(data).decode()
        html = re.sub(
            r'@font-face\{font-family:"GF %s";src:url\(data:font/woff2;base64,[^)]+\)' % re.escape(family),
            lambda _: '@font-face{font-family:"GF %s";src:url(data:font/woff2;base64,%s)' % (family, new_b64),
            html, count=1)
        flag = "  ← card: " + "".join(sorted(titles.get(family, set()))) if family in titles else ""
        print(f"{family:24s} {old_len//1024:4d}KB → {len(data)//1024:4d}KB{flag}")

    open(path, "w").write(html)
    print(f"\nfonts {total_before/1e6:.2f}MB → {total_after/1e6:.2f}MB  |  page {len(html)/1e6:.2f}MB")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "fontchooserchooser.html")
