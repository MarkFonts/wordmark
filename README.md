# Wordmark — landing page

Static site. Deploy to GitHub Pages in 3 steps.

## Deploy

```bash
# 1. Create a new repo on github.com, then:
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main

# 2. In repo Settings → Pages → Source: Deploy from branch → main / root
# 3. Your site is live at https://YOUR_USERNAME.github.io/YOUR_REPO/
```

## Folder structure

```
wordmark-site/
├── index.html
├── embleton-logo.png        ← swap with real client logos
├── fonts/
│   ├── CalSans-Bold.woff2
│   └── CalSansUI-VariableFont_...woff2
└── README.md
```

## Swapping in real content

- **Letterbox header**: edit the `ROWS` array in the script (`['W','O','R','D'], ['M','A','R','K']`)
- **Work images**: replace the `<div class="work-img">` contents with `<img src="..." />` — the `position: sticky` is already wired
- **Carousel logos**: add more `.logo-slide` divs (with their duplicates) in `#track`
- **Footer links**: edit the `<a href>` tags in `<footer>`
- **Font variation settings**: search `font-variation-settings` to tune `wght`, `GEOM`, `YTAS`, `SHRP` axes
