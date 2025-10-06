# VibriNova — The Digital Multiplex (GitHub Pages)

A static, GitHub Pages–ready OTT-style site that mimics popular platforms (Netflix/Prime/Hotstar) and includes:
- Pages: Stream, Tickets, Food (EatSure-inspired), Playzone (1–4 player games placeholder), Chat (WhatsApp-inspired), Profiles, Notifications, Settings
- Per-page search bars (the separate Search page is removed)
- Animated navigation: active icon enlarges and shows a gradient underline
- Chat with @movie tagging and Friends’ Recommendations tab (stored locally; backend optional)
- Profiles grid with avatars; Settings with parental control toggle, 8‑char device activation codes, histories (search/watch) and clear option, optional per-profile password, help/feedback/bug links
- 100% static (works on GitHub Pages). No server required.

Live deployment
- This repo includes a GitHub Action that deploys the site/ folder to GitHub Pages on pushes to main.
- After the first push, check the Pages URL in the Actions run summary or in Repo Settings → Pages.

Local preview (optional)
- No build system required. Just open site/index.html in a browser, or use a static server.

Notes about “Java” vs GitHub Pages
- GitHub Pages cannot run Java/Spring or any server-side code. This project is implemented in HTML/CSS/JavaScript so everything works on Pages.
- If you need a real-time backend (multi-user chat, auth), deploy a small service elsewhere (Render/Railway/Fly.io/Cloudflare Workers) and connect to it from this static site.

Legal naming note (India & International)
- “VibriNova” is an invented/coinage intended to reduce trademark conflicts. This is not legal advice. Before commercial use:
  - Search IP India and WIPO Global Brand DB for identical/similar marks in relevant classes.
  - Check domain/app-store availability.
  - Avoid confusing similarity with famous OTT brands (Netflix, Prime Video, Hotstar, BookMyShow, WhatsApp, EatSure, Zomato District).
- The referenced brands are inspiration only; no third-party logos/assets are used.

Roadmap ideas
- Real playback/watchlists, EatSure-like ordering flows, BookMyShow seat maps
- Multiplayer mini-games
- Rich parental controls (content ratings, PIN for playback)
- Optional backend for real-time multi-user chat and accounts

License
- MIT (demo).
