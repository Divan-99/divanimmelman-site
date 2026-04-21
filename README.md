<div align="center">

  <img src="https://raw.githubusercontent.com/Divan-99/divanimmelman-site/main/favicon-32x32.png" width="64" />

  <h1>divanimmelman-site</h1>

  <p><strong>Personal engineering portfolio — networks, automation, and systems that actually work.</strong></p>

  <p>
    A fast, lightweight static site built to showcase real production projects,<br/>
    technical depth, and hands-on infrastructure work. No frameworks. No fluff.
  </p>

  <p>
    <img src="https://img.shields.io/badge/Status-Active-success" />
    <img src="https://img.shields.io/badge/Stack-HTML%20%2F%20CSS%20%2F%20JS-blue" />
    <img src="https://img.shields.io/badge/Hosted-Cloudflare%20Pages-orange" />
    <img src="https://img.shields.io/badge/Focus-Network%20%26%20Security-lightgrey" />
  </p>

  <p>
    <a href="https://divanimmelman.com"><strong>→ divanimmelman.com</strong></a>
  </p>

</div>

---

## Overview

Source code for my personal portfolio website. Built to present engineering work clearly — real tools, real deployments, real stack decisions. The site is intentionally dependency-free: plain HTML, CSS, and vanilla JS served over Cloudflare Pages with a Cloudflare Worker handling the contact form.

---

## Tech Stack

<p>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" width="40" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" width="40" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" width="40" />
</p>

| Layer | Detail |
|---|---|
| Markup | HTML5 — semantic, accessible |
| Styling | CSS3 — custom properties, grid, responsive layout |
| Interactivity | Vanilla JS — typing effect, scroll reveal, particle canvas, counters |
| Fonts | Bebas Neue · DM Sans · JetBrains Mono (Google Fonts) |
| Contact | Cloudflare Worker + Resend API → Gmail |
| Hosting | Cloudflare Pages — auto-deploy from `main` |

No build step. No bundler. No framework. Push to GitHub → live in 30 seconds.

---

## Features

- Particle network canvas animation in the hero
- Typing effect cycling through engineering roles
- Scroll-triggered fade-up reveals on every section
- Animated stat counters (20+ users, 4 projects, etc.)
- Bento-grid skills layout with per-card colour accents
- Project rows with GitHub links and hover transitions
- Contact form wired to a Cloudflare Worker → Resend → Gmail
- Light / dark mode with `localStorage` persistence
- Fully responsive — mobile hamburger menu included

---

## Project Structure

```
divanimmelman-site/
├── index.html               # Single-page layout — all sections
├── style.css                # Global styles, tokens, responsive rules
├── favicon.ico              # Multi-size favicon (16–256px)
├── favicon-32x32.png        # PNG favicon for modern browsers
├── apple-touch-icon.png     # iOS home screen icon (180×180)
├── Divan_Immelman_CV.pdf    # CV — linked from nav and footer
└── assets/
    ├── sun.svg              # Theme toggle icons
    └── moon.svg
```

---

## Projects Showcased

| # | Project | Repo | Stack |
|---|---|---|---|
| 001 | Modular OCR System | [OCR_System](https://github.com/Divan-99/OCR_System) | Python · EasyOCR · Tesseract · watchdog |
| 002 | Iscar Label Printing App | [Label-printing-app](https://github.com/Divan-99/Label-printing-app) | Django · ZPL · TCP/IP · Pandas |
| 003 | Iscar Document Portal | [Document-portal](https://github.com/Divan-99/Document-portal) | Django · Nginx · Waitress · Linux |
| 004 | Process Control Dashboard | [process-dashboard](https://github.com/Divan-99/process-dashboard) | Django · REST API · JS · Home Assistant |

---

## Deployment

Hosted on **Cloudflare Pages**, connected directly to this repository.

- Every push to `main` triggers an automatic deploy
- Contact form runs on a separate **Cloudflare Worker** (`contact-worker.divanimm123.workers.dev`)
- Worker uses the **Resend API** to forward messages to Gmail
- No server. No database. No maintenance overhead.

**Live:** [https://divanimmelman.com](https://divanimmelman.com)

---

## Local Development

No build step required — open directly in a browser or use any static server:

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

---

## Roadmap

- [ ] Project case study pages with deeper technical write-ups
- [ ] Blog / notes section for engineering learnings
- [ ] SEO metadata and Open Graph tags
- [ ] Performance and accessibility audit
- [ ] Dark mode system-preference detection on first load

---

<div align="center">
  <sub>Built and maintained by <a href="https://divanimmelman.com">Divan Immelman</a> · Johannesburg, South Africa</sub>
</div>
