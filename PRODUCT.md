# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Couples and small groups of friends who travel together and want one shared place for what they remember. Each person signs up, then creates a book or joins one by invite. They add pages after a date, a weekend away or a long trip, often from a phone the same evening. Later, together, they read the pages back like a book.

## Product Purpose

NinRe is a subscription travel diary built as a book. One book holds every memory a couple or group shares: photos, the place pinned on a map, the date, the story of the day, and short notes from each member. Success means people keep adding pages over months and years, and the book is something they're glad to open and read together.

## Positioning

A book, not a feed. Pages fall into chapters by year. Every page carries a postmark and a pin on the book's own atlas. Everyone in the book writes in the same book, and each person can leave their own note on any page. The book's cover and paper can be designed: cloth, foil, type, paper style and photo style. Photo apps and social feeds don't offer that.

## Operating Context

- Accounts use email and password. One person creates a book and invites others with a link. Members can add and edit pages. The owner manages the book, its design and its members.
- Pages are added from phones and laptops. Photos are resized in the browser before upload. The map works without third-party map services or keys.
- Ways to read a book: Chapters (by year), Atlas (map with numbered pins and a route), Album (every photo), and an open two-page spread for each page.
- Billing goes through PayMongo hosted checkout (cards, GCash, Maya; PHP only). Checkout Sessions don't auto-renew, so paid plans are prepaid by the month and renewed by paying again. When a plan lapses, the book drops to Free limits. Nothing is deleted.

## Capabilities and Constraints

- Plans (confirmed by the user, 2026-10-17; photo allowances confirmed 2026-10-18):
  - **Free:** 1 book, 2 people per book, 300 photos.
  - **Plus:** ₱199/month, unlimited books, up to 6 people per book, 5,000 photos.
  - **Crew:** ₱449/month, up to 20 people per book, 25,000 photos.
- Photo allowances count every photo across the books a person owns. They live in server/src/plans.ts and may be shown on the website.
- Up to 12 photos per page. 83 built-in places pin themselves, and any other place can be pinned by tapping the map.
- Stack: React 19 + Vite + TypeScript client. Express 5 + node:sqlite + Multer server, run as TypeScript by Node 24 with no server build. Docker deploy. No external services are required to run locally; payments fall back to a clearly labelled test checkout when PayMongo keys are absent.
- Undecided: auto-renewing card subscriptions, printed books and PDF export. Don't present these as features.

## Brand Commitments

- Name: **NinRe** (product and website). Each book has its own title, defaulting to "Our Book of Travels".
- Marketing site direction (user, 2026-10-17): a travel desk. The book lies in the middle of the first viewport and opens to turn its pages. No framed window and no border. Everything sticks to a book, paper and travel theme. This replaces the earlier pinned "Creatie" reference (a sky photo in a rounded window frame, glass cards and doodles).

## Evidence on Hand

- No real customers, testimonials, reviews, usage numbers or press exist. Don't fabricate any. Demonstration books and notes must be labelled as samples.
- Real product facts that can be stated: the plan limits above, 12 photos per page, the three reading views, 83 built-in places, invite links, PayMongo payment methods.
- Existing illustrative SVG scenes used for sample pages: client/src/lib/samples.ts.

## Product Principles

1. The book is the interface. Every memory lives on a page, inside chapters, inside one book.
2. Everyone writes in it. Shared authorship and per-person notes are core, not an add-on.
3. Make it theirs. Designing the book is part of the pleasure, so the designer is live and immediate.
4. Never lose a memory. Downgrades and lapses limit adding, never reading or keeping.
5. Honest billing. Prepaid months with no surprise renewals, and prices shown in pesos.

## Accessibility & Inclusion

Keyboard-reachable everywhere, reduced-motion respected, light and dark palettes. No product-specific standard was set beyond that.
