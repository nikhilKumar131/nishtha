# Nishtha — Artificial Jewellery Studio

A static, art-directed marketing site for a fictional Jaipur **artificial (imitation)
jewellery** studio. No build step, no framework, no runtime dependencies — open
`index.html` and it runs.

```
index.html
assets/
  css/styles.css   design tokens, layout, components, motion
  css/lqip.css     generated blur-up placeholders (inline base64, ~5 KB)
  js/main.js       reveals, parallax, drawer, lightbox, forms (~15 KB, no libs)
  img/             85 responsive WebP + JPEG fallbacks
```

## Running it

Any static server works; `file://` also works:

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

## Before this goes live

1. **The enquiry form does not send anything.** It validates in the browser and
   shows a confirmation, but there is no backend. Point the `<form id="appoint-form">`
   at a real endpoint (Formspree, Netlify Forms, your own handler) and remove its
   `data-demo` attribute. Same for `#news-form` in the footer.
2. **Replace the photography.** Every image is a placeholder from
   [Unsplash](https://unsplash.com) (free under the Unsplash License). Several show
   *real* gold and gemstone jewellery, which is exactly what this brand does not
   sell — swap in photographs of your actual pieces before publishing, or the
   imagery will contradict the copy.
3. **Check the material claims against your product.** The copy commits to
   specific, falsifiable things: 3-micron plating, nickel-free alloys, a 12-month
   anti-tarnish promise, ₹1,890 for the Meera necklace. These are honest
   *positioning* for imitation jewellery, but they are invented numbers — make them
   true or change them. Consumer-protection rules on jewellery description are
   strict, and "gold-plated brass" must never drift into "gold".
4. **Placeholder details.** The address, phone, `hello@nishtha.example`, founding
   story and social links are invented. The three testimonials are attributed to
   fictional people — replace or remove them rather than shipping invented reviews.
5. **Enable compression.** HTML and CSS are ~90 KB raw but ~26 KB gzipped;
   make sure gzip/brotli is on at the server.

## Regenerating images

Derivatives were produced from ~2400px originals: intentional per-image crops,
WebP at three or four widths plus a JPEG fallback, and a 20px blurred LQIP inlined
into `lqip.css`. To add an image, generate the same variants and add a matching
`.lq-<name>` rule.

## Notes on the implementation

- **Motion** is all CSS transitions driven by `IntersectionObserver`, with a
  single shared `requestAnimationFrame` loop for parallax. Everything is disabled
  under `prefers-reduced-motion: reduce`.
- **Images** never shift layout: each wrapper is ratio-locked and the LQIP fills
  it until the real bytes arrive. Measured CLS is 0.002 (desktop) / 0.018 (mobile).
- **Dialogs** (mobile drawer, lightbox) set `inert` on the rest of the page rather
  than hand-rolling a focus trap, and restore focus to the trigger on close.
- **Only the hero image loads eagerly.** Everything below the fold is lazy,
  including the decorative texture behind the materials section, which JS attaches
  on approach because CSS backgrounds are never lazy-loaded.
