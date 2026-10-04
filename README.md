# Skiron website

Source for the Skiron Technology site. Plain HTML, CSS and JavaScript. There is no build step and no package to install.

## Preview

```
python3 -m http.server 8000
```

Then open http://localhost:8000/. Any static file server works.

## What is here

| Path | What it is |
|---|---|
| `index.html` | The one-page site |
| `thanks.html` | Where the contact form lands when JavaScript is off |
| `privacy.html` | Plain-language privacy notice |
| `404.html` | Page shown for unknown addresses |
| `assets/css/site.css` | All styles and colour tokens |
| `assets/js/site.js` | Menu, hero animation, diagram and icon motion, contact form |
| `assets/img/` | Logo, favicon, share image, headshot, icons |
| `assets/fonts/` | Cabin and Inter (latin), with their SIL Open Font License texts |
| `assets/source/` | Original logo image, for reference only |

## Contact form

The form posts to [Web3Forms](https://web3forms.com/). Its access key is an alias for the destination address and is safe to publish.

To set it, replace `REPLACE_WITH_WEB3FORMS_KEY` in two places:

1. the hidden `access_key` input in `index.html`
2. the `WEB3FORMS_KEY` constant at the top of `assets/js/site.js`

To change where messages go, edit the destination in the Web3Forms dashboard. No code change is needed.

## Hosting

The site is served by GitHub Pages from the `main` branch, root folder. `.nojekyll` keeps GitHub from processing the files. All asset paths are relative, so the site works at `https://<user>.github.io/skiron-site/` and at a custom domain.

If the address changes, update these:

- `<link rel="canonical">` and the Open Graph and Twitter URLs in `index.html`
- the `url` and `logo` values in the structured data in `index.html`
- the `redirect` value in the contact form
- `sitemap.xml` and `robots.txt`

## Privacy

The site sets no cookies and loads nothing from other companies, so the only third party in play is Web3Forms, and only when someone sends a message. If anything is added that changes this (analytics, embeds, new fonts or scripts from another host), update `privacy.html`.

## Motion

The hero rotor, the diagram and the icons move. All of it stops when the visitor has asked their device for reduced motion, and the page reads the same without it.
