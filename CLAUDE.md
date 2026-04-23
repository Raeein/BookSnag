# CLAUDE.md — BookSnag Web App

## Project Goal

BookSnag is a web app counterpart to the DownloadIT macOS app. It provides the same audiobook downloading UI (scrape, download chapters, merge) in a browser, hosted on Vercel.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Global CSS (design system via CSS custom properties) + Tailwind for layout utilities
- **Fonts**: Syne (display) + DM Sans (body) via `next/font/google`
- **Hosting**: Vercel (zero-config for Next.js)

## Architecture

- `src/app/layout.tsx` — Root layout: sets SEO metadata, loads fonts, injects CSS vars
- `src/app/page.tsx` — Server component shell; imports `<BookSnagApp />`
- `src/app/globals.css` — Full design system: CSS vars, keyframes, component classes
- `src/app/sitemap.ts` — Dynamic sitemap (Next.js route)
- `src/app/robots.ts` — Robots.txt (Next.js route)
- `src/components/BookSnagApp.tsx` — Single client component with all tab logic

## Coding Rules

- No speculative features. Minimum code that solves the problem.
- Touch only what the task requires. Match existing style.
- No comments unless the WHY is non-obvious.
- `BookSnagApp.tsx` is intentionally one large client component — don't split unless tabs become independently routable.

## SEO Setup

- Metadata API in `layout.tsx` (title, description, OG, Twitter cards)
- `sitemap.ts` and `robots.ts` as Next.js route handlers
- Update `siteUrl` constant in both files when the Vercel domain is confirmed

## Deployment

Push to GitHub → connect repo in Vercel dashboard → deploys automatically on push to `main`.
No `vercel.json` needed — Next.js is auto-detected.

## Supported Sites

| Site | Selector |
|------|----------|
| goldenaudiobook.com | `.wp-audio-shortcode` |
| dailyaudiobooks.com | `.wp-audio-shortcode` |
