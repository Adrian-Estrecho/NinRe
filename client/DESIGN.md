---
name: NinRe website
description: A sunlit travel desk. The book lies open in the middle, and every section is another piece of travel paper on the same blue table.
colors:
  table: "#2a56b9"
  table-shadow: "#1d418f"
  table-soft: "#d3def6"
  sun: "#ffd23f"
  ink: "#14202b"
  ink-soft: "#46535e"
  ink-faint: "#5f6b75"
  bond: "#fffdf8"
  page-cream: "#f6f1e4"
  polaroid: "#fbfaf6"
  stamp-blue: "#2257b8"
  stamp-red: "#b3352b"
  stamp-green: "#2f7a4b"
  stamp-plum: "#7a3a78"
  airmail-red: "#cf3a3a"
  passport-page: "#edf3ea"
  passport-cover: "#6b2233"
  ticket-mint: "#e2f2e5"
  ticket-sun: "#ffe066"
  ticket-blush: "#ffd8de"
  legal-pad: "#fff3a6"
  manila: "#dcbc7d"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.95rem, min(5.2vw, 7.6vh), 4.4rem)"
    fontWeight: 870
    lineHeight: 0.92
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 112"
  headline:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.05rem, 4.8vw, 4rem)"
    fontWeight: 870
    lineHeight: 0.92
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 112"
  title:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "1.06rem"
    fontWeight: 750
    lineHeight: 1.3
  body:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.02rem, 1.3vw, 1.15rem)"
    fontWeight: 500
    lineHeight: 1.55
  label:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "0.62rem"
    fontWeight: 400
    letterSpacing: "0.14em"
  hand:
    fontFamily: "Gochi Hand, Segoe Print, cursive"
    fontSize: "1.28rem"
    fontWeight: 400
    lineHeight: 1.05
rounded:
  paper: "3px"
  envelope: "4px"
  form: "6px"
  ticket: "10px"
  passport: "16px"
  pill: "999px"
spacing:
  gutter: "16px"
  section-top: "clamp(84px, 10vw, 140px)"
  object-gap: "clamp(40px, 5vw, 64px)"
components:
  button-primary:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
    height: "42px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bond}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
    height: "42px"
  button-paper:
    backgroundColor: "{colors.bond}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
    height: "42px"
  ticket-form:
    backgroundColor: "{colors.bond}"
    textColor: "{colors.ink}"
    rounded: "{rounded.form}"
    width: "min(100%, 460px)"
  ticket-form-stub:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.ink}"
    padding: "0 22px"
  pin-number:
    backgroundColor: "{colors.stamp-red}"
    textColor: "{colors.bond}"
    rounded: "{rounded.pill}"
    size: "28px"
  paper-sheet:
    backgroundColor: "{colors.bond}"
    textColor: "{colors.ink}"
    rounded: "{rounded.paper}"
    padding: "clamp(16px, 2.6vw, 36px)"
---

# Design System: NinRe website

Scope: the public website (`src/marketing`) and the sign-in, invite and test-checkout pages that share it (`src/auth`, `src/app/TestCheckout.tsx`). The app's working screens (library, reader, designer page) keep their own grid-paper ground and light/dark tokens in `src/styles/tokens.css`. This file doesn't govern them.

## Overview

**Creative North Star: "The Morning After the Trip"**

The website is a table by a window the morning after a trip. It's painted airmail blue and lit from the top left. The trip's paper is tipped out across it, and the book lies in the middle. Everything a visitor reads or touches is a real object from that table: the book itself (it opens and its pages turn), a passport page of ink stamps, a folded map with snapshots taped round it, tickets, a legal pad, and an airmail envelope. There's no frame or window around any of it. The table runs edge to edge.

Density is relaxed and object-led. Each section is one heading set straight onto the table in white, then one piece of paper large enough to read in place. Shadows fall down and to the right, as daylight from a window would cast them. The palette is committed: blue owns the page, sun yellow marks every primary action, and colour otherwise comes from paper stocks and stamp inks, never from decoration.

The page doesn't follow the device's dark mode: paper is paper, so it stays in daylight.

**Key Characteristics:**
- An airmail-blue table, edge to edge, with fine grain and window light falling from the top left.
- Every content surface is a named paper object, held by tape, a clip or nothing.
- Heavy, wide, uppercase Archivo for anything set in type. Gochi Hand for anything a person wrote.
- One yellow for every primary action.
- Mono only where paper literally prints data: ticket fields, postmarks, coordinates, barcodes.

## Colors

One saturated ground, one action colour, and a stationery cupboard of paper stocks and stamp inks.

### Primary
- **Airmail Table Blue** (table): the ground of the whole website, and the only colour that ever covers a full viewport. Headings and nav sit on it in white.
- **Window-Shade Blue** (table-shadow): the darker blue that shows through holes punched in paper, such as the luggage tag's eyelet.

### Secondary
- **Sunny Day Yellow** (sun): every primary action (Start free, Start a book, the start form's ticket stub) and the text-selection highlight. It is never used as decoration.

### Tertiary
- **Stamp inks** (stamp-blue, stamp-red, stamp-green, stamp-plum): the book's own accent inks, used for ink stamps, postmarks, map pins and the numbered markers. Red is the default for pins and numbers.
- **Airmail chevrons** (airmail-red with stamp-blue): only on envelope borders, as a printed stripe.
- **Paper stocks** (passport-page with passport-cover, ticket-mint, ticket-sun, ticket-blush, legal-pad, manila): each belongs to one object: Free, Plus and Crew tickets, the FAQ pad, the luggage tag. A stock isn't reused on a different kind of object.

### Neutral
- **Bond White** (bond): sheets, envelopes, the start form and paper buttons.
- **Page Cream** (page-cream) and **Polaroid White** (polaroid): book pages by default, and photo borders. Pages follow the visitor's chosen paper inside the book.
- **Table Mist** (table-soft): secondary text on the table, at 4.8:1 against the blue.
- **Ink** (ink), **Soft Ink** (ink-soft), **Faint Ink** (ink-faint): text on paper.

### Named Rules
**The One Table Rule.** Blue is the ground and nothing else is. No section switches to a different full-bleed ground. A new section is a new piece of paper on the same table.

**The Yellow Means Go Rule.** Sun yellow appears only on the primary action and the selection highlight. If something yellow can't be clicked, it should be a yellow paper stock with its own meaning (the Plus ticket, the legal pad), not a highlight.

## Typography

**Display Font:** Archivo Variable at width 112 (with system-ui)
**Body Font:** Archivo Variable (with system-ui)
**Label/Mono Font:** DM Mono (with ui-monospace)
**Hand:** Gochi Hand (with Segoe Print)

**Character:** Heavy, wide uppercase has the voice of a luggage tag or a departure board, loud and plain. Handwriting is for the people in the book. Inside the book, the visitor's cover type (Bodoni Moda italic by default) sets page titles, and Spectral sets the story.

### Hierarchy
- **Display** (870, clamp(1.95rem, min(5.2vw, 7.6vh), 4.4rem), 0.92): the one hero headline, white on the table. It shrinks with viewport height so the book always fits under it.
- **Headline** (870, clamp(2.05rem, 4.8vw, 4rem), 0.92): section titles on the table. Plan names on tickets and the FAQ pad title use the same voice at their own sizes.
- **Title** (750, 1.06rem, 1.3): row titles in the "what goes on a page" key and FAQ questions.
- **Body** (500, clamp(1.02rem, 1.3vw, 1.15rem), 1.55): ledes, max 56ch, in Table Mist on blue or Soft Ink on paper.
- **Label** (DM Mono 400, 0.62rem, 0.14em, uppercase): printed field names on tickets, stubs and tags only.
- **Hand** (Gochi Hand 400): captions, notes, names on tags and envelopes, the bookplate.

### Named Rules
**The Who Wrote This Rule.** If a person would have written it by hand (a caption, a note, a name on a tag), it's set in Gochi Hand. If a machine printed it (a seat number, a postmark date, coordinates), it's DM Mono. Everything else is Archivo.

**The Heading Speaks Alone Rule.** Nothing sits above a heading: no kicker and no eyebrow. Kinds, dates and plan bands go beside or below the title.

## Layout

The page is one column of centred sections on a full-bleed table. A section opens with clamp(84px, 10vw, 140px) of table above a centred heading block (max 1000px), then one paper object, up to 1180px wide (the passport 1060px, the tickets 900px, the pad 780px).

The first viewport is a column: nav, headline, two lines of subcopy, the book, the page control, then the start form. The book's page width is `clamp(140px, min((61svh - 150px) / 1.32, (100vw - 36px) / 2), 360px)`, so it grows with the height the type leaves over. Desk objects sit absolutely at the left and right edges, partly off the table, and never cross the headline or the book.

Breakpoints:
- 1240: the second snapshot goes.
- 1100: desk objects push further off the edges.
- 900: desk objects hide, the passport stacks its pages, and the open-page key stacks.
- 760: the nav drops its links, the closed book zooms 1.22× and shrinks as it opens, the atlas snapshots form a 2-column grid under the map, and tickets turn vertical with the stub below.
- 460: ticket fields go to one column.

## Elevation & Depth

Depth is physical: every object casts a shadow down and to the right from a window at the top left, and nothing glows.

### Shadow Vocabulary
- **Lift** (`0 1px 1px rgba(9, 22, 58, .22), 6px 14px 24px -12px rgba(9, 22, 58, .62)`): small paper: snapshots, the envelope, the stub, the start form, the page buttons.
- **Lift Large** (`0 1px 2px rgba(9, 22, 58, .24), 14px 30px 48px -24px rgba(9, 22, 58, .7)`): big sheets: the passport, the map, the designer sheet, the legal pad, the book's boards.
- **Masked paper** (`filter: drop-shadow(...)` on the parent): tickets and the luggage tag, whose notches and cut corners come from masks or clip-paths, take their shadow from a filter on the parent so it follows the cut shape.

### Named Rules
**The Window Rule.** Shadows always offset positively on both axes. A shadow with zero offset, or one falling up or to the left, contradicts the light.

## Shapes

Paper has near-square corners (3–4px). Ticket corners are 10px, with semicircular notches at the perforation. Buttons are full pills. Paper is rotated slightly (±0.4–1.5°) when it is a loose object on the table. Text-heavy sheets (the designer) are never rotated. Cuts are real geometry: tag corners use a 6-point clip-path, notches use radial masks, and perforations use dashed rules. Tape strips have torn ends.

## Components

### Buttons
- **Shape:** full pill (999px), min-height 42px, or 34px small.
- **Primary:** sun yellow with ink text, plus a soft lift. Used for every "Start" action.
- **Ink:** ink with bond text. Used on yellow paper (the Plus ticket) where yellow-on-yellow would vanish.
- **Paper:** bond white with an ink hairline (rgba(20,32,43,.3)). Used for secondary choices on paper.
- **Hover / Focus:** lift 1px on hover, press to 0.98. The focus ring is 3px sun yellow on the table and airmail blue on paper.

### Start form (the ticket strip)
- **Style:** a bond paper strip (6px corners) with an input and a sun-yellow stub, separated by a dashed perforation with punched notches. The notches show whatever the form lies on (`--under`).
- **Focus:** a sun-yellow ring around the whole strip.

### Paper objects
- **Passport page:** a maroon cover around two mint guilloche pages, holding ink stamps in four frames (round, rectangle, octagon, oval) in the four stamp inks.
- **Folded map:** the atlas on cream paper, with fold creases at thirds and half and a cartouche with the book's title. Taped snapshots with red pin numbers match the pins.
- **Tickets:** Free, Plus and Crew on their own stocks. A vertical mono band carries the plan's name, then the facts as printed fields, and the price and action sit on a perforated stub with a barcode.
- **Legal pad:** yellow with blue rules every 32px, a red margin and a binding strip. Questions sit two rules tall.
- **Airmail envelope:** a chevron border, a PAR AVION box, a perforated postage stamp, and a postmark whose cancellation lines cross the stamp.

### Navigation
- **Style:** white Archivo 650 on the table. The wordmark is on the left (870, width 112), the section links are centred, and Log in and a yellow Start free sit on the right. Links underline at 2px on hover.
- **Mobile:** the links drop and the wordmark and actions stay.

### The book (signature component)
The sample book lies in the middle of the first viewport.
- It opens on its spine, and its leaves turn in 3D. Each leaf has a front and a back.
- Pages turn by drag, a tap on either side, arrow, PageUp and PageDown, Home and End, or the buttons under it.
- A page in the air shades as it stands on edge, and the top leaf lifts when the pointer nears an outer edge.
- The cover, cloth, foil, paper and ink follow the visitor's designer choices and typed title.
- Spreads, in order: the endpaper with a bookplate and the title page with contents, one spread per sample page, then a blank page and "Your turn".
- Only the visible spread is reachable by keyboard; the rest are `inert`.

## Do's and Don'ts

### Do:
- **Do** put every new block of content on a named paper object with a real reason to be on a travel desk.
- **Do** keep shadows falling down and to the right (the Lift and Lift Large values).
- **Do** use sun yellow for the one primary action in view.
- **Do** label sample content as sample (Sample book, Sample page) wherever a visitor could take it for real.
- **Do** keep stamp inks to the four book accents.

### Don't:
- **Don't** frame the page in a window, bezel or border. The user removed it on 2026-10-17.
- **Don't** use glass, blur cards or floating doodles. The user replaced that direction with paper.
- **Don't** set a kicker or eyebrow above a heading.
- **Don't** use mono as a costume. Only printed data gets DM Mono.
- **Don't** follow the device's dark mode on the website.
