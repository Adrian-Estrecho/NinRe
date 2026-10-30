---
name: NinRe website
description: The prints come home. Travel photographs dissolve into the website's white page, and the signed-in app is the same white desk, without the photographs, where the books are kept.
colors:
  page: "#ffffff"
  page-shade: "#f5f3ee"
  night-page: "#10161c"
  night-card: "#19222b"
  sun: "#ffd23f"
  ink: "#14202b"
  ink-soft: "#46535e"
  ink-faint: "#5f6b75"
  hand-ink: "#1d2a55"
  bond: "#fffdf8"
  page-cream: "#f6f1e4"
  polaroid: "#fbfaf6"
  stamp-blue: "#2257b8"
  stamp-red: "#b3352b"
  stamp-green: "#2f7a4b"
  stamp-plum: "#7a3a78"
  grease-pencil: "#d6392b"
  film-base: "#191613"
  film-print: "#e9ad45"
  airmail-red: "#cf3a3a"
  ticket-mint: "#e2f2e5"
  ticket-sun: "#ffe066"
  ticket-blush: "#ffd8de"
  manila: "#dcbc7d"
  table: "#2a56b9"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.95rem, min(5vw, 7.1vh), 4.2rem)"
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
    fontSize: "clamp(1.5rem, 2.4vw, 2.25rem)"
    fontWeight: 400
    lineHeight: 1
rounded:
  frame: "2px"
  paper: "3px"
  envelope: "4px"
  form: "6px"
  ticket: "14px"
  pill: "999px"
spacing:
  gutter: "16px"
  section-top: "clamp(84px, 10vw, 140px)"
  object-gap: "clamp(40px, 5vw, 64px)"
  hero-fade: "clamp(110px, 18vh, 190px)"
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
  start-pill:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px"
    width: "min(100%, 460px)"
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

Scope: the public website (`src/marketing`) and the signed-in app (`src/app`, `src/views`, `src/dialogs`, with its tokens in `src/styles/tokens.css`). On 2026-10-20 the user asked for the app to take the website's style without its photographs, and to keep a night version. The sign-in, sign-up, invite and test-checkout pages (`src/auth`, `src/app/TestCheckout.tsx`) keep the earlier airmail-blue table (`.daylight`) by the user's choice the same day.

## Overview

**Creative North Star: "The Prints Come Home"**

The website is a white page that a trip's photographs develop onto. Each section opens on a real travel photograph that runs edge to edge and dissolves into the white, the way a print fades into the album it's mounted in. The book lies in the middle of the first screen, and everything after it is the life of a trip's pictures: a couple and a group of friends making their own, a camera roll with one frame ringed for the page, the pages pinned on a map over a cove seen from the air, the parts of one page, the cover designer, plans held up against a window-seat view, and a sunset beach to close on.

The paper objects stay, but fewer of them and only where they earn it: taped polaroids, a boarding stub and a luggage tag at the edges of the hero, a folded map, boarding-pass plans, an airmail envelope, and a 35mm film strip. Colour is committed through photography rather than through tinted grounds. Sun yellow marks every primary action. Depth is soft daylight: shadows fall down and to the right in a neutral ink tint.

The page doesn't follow the device's dark mode: a print is a print, so it stays in daylight. On 2026-10-20 the user replaced the airmail-blue table with this white page and photographs, centred the navigation links, and removed the icon dock from the website.

**Key Characteristics:**
- A white page, edge to edge, with no frame.
- Full-bleed travel photographs that dissolve into the page through eased masks, never boxed.
- Heavy, wide, uppercase Archivo for anything set in type. Gochi Hand for anything a person wrote.
- One yellow for every primary action.
- Mono only where something is literally printed: ticket fields, postmarks, coordinates, film edge print.

## Colors

A white ground, one action colour, and the inks and stocks of a trip's paper. Every other colour on the page comes from a photograph.

### Primary
- **Gallery White** (page): the ground of the whole website and of every signed-in screen, and the field every photograph fades into. No section switches to a tinted band. **Page Shade** (page-shade) is the only step below it, for wells inside paper (meters, the designer stage, the checkout summary).
- **Night Page** (night-page) and **Night Card** (night-card): the app's night version, which follows the device or the theme toggle. Book pages, maps and polaroids take their own night papers inside a book scope. The website itself never goes dark.

### Secondary
- **Sunny Day Yellow** (sun): every primary action (Start free, Start a book, the start form's button and stub) and the text-selection highlight. It is never decoration.

### Tertiary
- **Stamp inks** (stamp-blue, stamp-red, stamp-green, stamp-plum): the book's accent inks, used for postmarks, map pins and numbered markers. Red is the default for pins. Stamp blue is also the focus ring on white and the FAQ hover.
- **Grease Pencil** (grease-pencil): only the ring drawn round the chosen frame of the camera roll, and its note (set a shade deeper, #c2332a, for 5:1 on white).
- **Film** (film-base with film-print): the 35mm strip and its amber edge printing.
- **Airmail chevrons** (airmail-red with stamp-blue): only on envelope borders.
- **Paper stocks** (ticket-mint, ticket-sun, ticket-blush, manila): each belongs to one object. Mint, sun and blush are the Free, Plus and Crew passes (and the app's plan chip, printed on the same stock); manila is the luggage tag.

### Neutral
- **Ink** (ink), **Soft Ink** (ink-soft), **Faint Ink** (ink-faint): headings, body and secondary text on white and on paper. Hairline rules are ink at 14%.
- **Hand Ink** (hand-ink): handwriting on captions, tags and polaroids.
- **Bond White** (bond), **Page Cream** (page-cream), **Polaroid White** (polaroid): sheets, envelopes, book pages and photo borders. They read as paper against the pure white page because they're warmer and cast a shadow.
- **Airmail Table Blue** (table): sign-in pages only, until they move onto the white page. Not used on the website.

### Named Rules
**The White Page Rule.** The ground is white and nothing else is. A section that wants colour brings a photograph; it never gets a tinted band.

**The Yellow Means Go Rule.** Sun yellow appears only on the primary action and the selection highlight. If something yellow can't be clicked, it's a yellow paper stock with its own meaning (the Plus pass), not a highlight.

## Typography

**Display Font:** Archivo Variable at width 112 (with system-ui)
**Body Font:** Archivo Variable (with system-ui)
**Label/Mono Font:** DM Mono (with ui-monospace)
**Hand:** Gochi Hand (with Segoe Print)

**Character:** Heavy, wide uppercase has the voice of a luggage tag or a departure board, loud and plain. Handwriting is for the people in the photographs and the book. Inside the book, the visitor's cover type (Bodoni Moda italic by default) sets page titles, and Spectral sets the story.

### Hierarchy
- **Display** (870, clamp(1.95rem, min(5vw, 7.1vh), 4.2rem), 0.92): the one hero headline, white over the photograph's darkened sky. It shrinks with viewport height so the book always fits under it.
- **Headline** (870, clamp(2.05rem, 4.8vw, 4rem), 0.92, balanced): section titles in ink on white. Plan names and the closing envelope use the same voice at their own sizes.
- **Title** (750, 1.06rem, 1.3): rows in the "what goes on a page" key and FAQ questions.
- **Body** (500, clamp(1.02rem, 1.3vw, 1.15rem), 1.55): ledes, max 56ch, in Soft Ink.
- **Label** (DM Mono 400, 0.6–0.66rem, 0.14–0.16em, uppercase): printed field names on passes, stubs and tags, and film edge print.
- **Hand** (Gochi Hand 400): photo captions (clamp(1.5rem, 2.4vw, 2.25rem) on the large photographs), notes, names on tags, the grease-pencil note.

### Named Rules
**The Who Wrote This Rule.** If a person would have written it by hand (a caption, a note, a name on a tag), it's set in Gochi Hand. If a machine printed it (a seat number, a postmark date, coordinates, a film frame number), it's DM Mono. Everything else is Archivo.

**The Heading Speaks Alone Rule.** Nothing sits above a heading: no kicker and no eyebrow. Kinds, dates and plan bands go beside or below the title.

**The Ink on White Rule.** Type is ink on the page and white only where it sits on a photograph, over a darkened sky or hillside. Never set ink type over an unfaded photograph.

## Layout

The page is one column of centred sections on a full-bleed white page. A section opens with clamp(84px, 10vw, 140px) of white above a centred heading block (max 1000px), then its photograph or object, up to 1180px wide (the passes 1040px).

The first viewport is a column on the Batanes photograph: nav, headline, two lines of subcopy, the book, its page control, then the start pill and one line of fine print. The hero is 100svh plus a fade band (clamp(110px, 18vh, 190px)), so the photograph fills the first screen and dissolves into white just below the fold. The book's page width is `clamp(140px, min((61svh - 190px) / 1.32, (100vw - 36px) / 2), 360px)`. Two polaroids, a boarding stub and a luggage tag sit at the edges and never cross the headline or the book.

Photographs follow one grammar in several placements: full-bleed behind the hero, the plans and the close; a pair that runs off opposite edges and crossfades in the middle; a band under the map; and frames on the film strip, which runs wider than the page and is centred on its ringed frame.

The signed-in app is a working screen: a sticky 64px bar on the page (wordmark left, Home · Plan & account centred, plan chip, theme toggle and account menu right) over a 1160px column (1320px for the designer). The home opens with the greeting title and the actions, then On this day beside So far (1.3fr / 0.9fr), then the map of everywhere, then the shelves. Sections open with clamp(44px, 6vw, 76px) above their heading.

Breakpoints:
- 1240: the luggage tag goes.
- 1100: edge objects push further off the page.
- 900: edge objects hide, the open-page key and the FAQ stack, and the passes stack.
- 760: the nav drops its links, the closed book zooms 1.22× and shrinks as it opens, the photo pair stacks and crossfades top to bottom, the aerial band under the map hides, and the atlas polaroids form a 2-column grid.
- 460: Log in leaves the nav.
- In the app: at 860 the home's two columns stack and So far becomes three across; at 720 the plan chip goes and the actions fill the width; at 520 the shelf shows two books a row; at 440 the nav keeps only Home.

## Elevation & Depth

Depth is soft daylight on a white page: every object casts a shadow down and to the right in a neutral ink tint, and nothing glows. Photographs carry no shadow; they're printed into the page, not lying on it.

### Shadow Vocabulary
- **Lift** (`0 1px 1px rgba(20, 32, 43, .1), 6px 14px 26px -12px rgba(20, 32, 43, .34)`): small paper: polaroids, the stub, the envelope, page buttons.
- **Lift Large** (`0 1px 2px rgba(20, 32, 43, .1), 14px 30px 52px -24px rgba(20, 32, 43, .38)`): big objects: the map, the designer sheet, the film strip, the book's boards.
- **Masked paper** (`filter: drop-shadow(...)` on the parent): passes and the luggage tag, whose notches and cut corners come from masks or clip-paths, so the shadow follows the cut.

### Named Rules
**The Window Rule.** Shadows always offset positively on both axes. A shadow with zero offset, or one falling up or to the left, contradicts the light.

**The Dissolve Rule.** A photograph on the page never ends in a hard edge or a box. It fades into white through an eased mask (stops at roughly 90, 70, 45, 22 and 7% opacity), or an elliptical vignette round its people where a saturated sky would show a straight ramp. Two photographs meet by crossfading. Photographs inside objects (polaroids, film frames, book pages) keep hard edges, because the object is their frame.

## Shapes

Paper has near-square corners (3–4px), film frames 2px, passes 14px with semicircular notches at the perforation, and buttons and the start form are full pills. Loose paper is rotated slightly (±0.4–1.5°, the film strip −2.2°, polaroids up to ±9°). Text-heavy sheets (the designer) are never rotated. Cuts are real geometry: the tag uses a 6-point clip-path, notches use radial masks, perforations use dashed rules, and the film strip's sprocket holes are a tiled rounded rectangle that shows the white page through. Tape strips have torn ends.

## Components

### Buttons
- **Shape:** full pill (999px), min-height 42px, or 34px small.
- **Primary:** sun yellow with ink text and a soft lift. Every "Start" action.
- **Ink:** ink with bond text. On the Plus pass, where yellow-on-yellow would vanish.
- **Paper:** bond white with an ink hairline (rgba(20, 32, 43, .3)). Secondary choices on paper.
- **On a photograph:** the nav's Start free is a white pill with ink text.
- **Hover / Focus:** lift 1px on hover, press to 0.98. The focus ring is 3px: stamp blue on white and paper, sun yellow over the hero photograph.

### Start pill (hero)
- **Style:** a solid white pill on the hills (6px inset) holding an ink input and the yellow Start free. Shadow is a deep green-black lift so it sits on the grass, not on glass.
- **Focus:** a 3px sun-yellow ring round the whole pill.

### Start form (closing ticket strip)
- **Style:** a bond paper strip (6px corners) with an input and a sun-yellow stub, separated by a dashed perforation with punched notches. The notches show whatever the form lies on (`--under`).

### Fading photograph (signature)
- A full-bleed photograph masked into the page per the Dissolve Rule, with an optional handwritten caption in Hand Ink placed where the photo has already faded. Used in pairs that run off opposite edges and crossfade, and as bands behind the plans, the map and the close.
- **Motion:** photographs develop as they scroll into view: they arrive pale and warm (saturate .3, sepia .22) and come up to full colour over 1.8s, staggered 160ms. Reduced motion shows them in full colour.

### Camera roll
- A 35mm strip in film base with tiled sprocket holes, amber DM Mono edge print (frame numbers), and 3:2 frames of real photographs. It runs wider than the page, centred on one frame ringed in grease pencil with a handwritten note under it. The frames develop outward from the ringed one.

### Paper objects
- **Folded map:** the atlas on cream paper, with fold creases at thirds and half and a cartouche with the book's title. Taped polaroids with red pin numbers match the pins. On wide screens it lies on an aerial photograph of a cove.
- **Passes:** Free, Plus and Crew on their own stocks, each with an ink or ink-coloured band, printed fields, and a perforated stub with price, action and barcode. They sit on a window-seat photograph above the clouds.
- **Airmail envelope:** a chevron border, a PAR AVION box, a perforated postage stamp, and a postmark whose cancellation lines cross the stamp. The closing headline starts below the stamp so the cancellation never runs through type.
- **Edge objects:** polaroids with washi tape, a boarding stub, and a manila luggage tag on a string.

### Navigation
- **Style:** white Archivo 650 over the hero photograph. The wordmark is on the left (870, width 112), the section links are centred on the page, and Log in and a white Start free pill sit on the right. Links underline at 2px on hover.
- **Mobile:** the links drop and the wordmark and actions stay; Log in drops at 460px.

### FAQ
- Questions as full-width rows with ink hairlines, a plus that turns to a cross when open, and answers in Soft Ink. The title holds the left column on wide screens.

### The book (signature component)
The sample book lies in the middle of the first viewport.
- It opens on its spine, and its leaves turn in 3D. Each leaf has a front and a back.
- Pages turn by drag, a tap on either side, arrow, PageUp and PageDown, Home and End, or the white round buttons under it.
- A page in the air shades as it stands on edge, and the top leaf lifts when the pointer nears an outer edge.
- The cover, cloth, foil, paper and ink follow the visitor's designer choices and typed title.
- Only the visible spread is reachable by keyboard; the rest are `inert`.

### The signed-in frame
- **Bar:** the website's nav in ink on the page: wordmark (870, width 112) left, Home and Plan & account centred and underlined at 2px when current, then the plan chip, the theme toggle and the account avatar. No blur; a hairline under it.
- **Plan chip:** the plan name in 800 uppercase on its pass stock (mint, sun, blush), 3px corners. It links to Plan & account.
- **Titles:** every screen title and section head is the website's heavy, wide uppercase (Headline at a smaller size for sections), with nothing above it.
- **Paper:** account cards, dialogs and the page form are bond paper with 4px corners and the Lift shadow (Lift Large for dialogs). Inputs have 6px corners and a stamp-blue focus.

### Home (signed in)
- **On this day:** each page from today's date in earlier years shows its first photo as a polaroid (tilted ±3.5°, Gochi Hand caption), then the page title, then "N years ago today" in stamp red caps, then place and book. With nothing on the day it falls back to the same week, and with nothing at all it shows a dashed empty polaroid and says the page added today comes back next year.
- **So far:** totals set like a book's ledger (pages, photos, places, books, people writing with you, first page), heavy numbers over small labels, hairline-ruled, two across beside the memories.
- **Everywhere you've been (signature):** every pinned place from every book on the folded map, numbered in the order first visited, beside the route list. It is a book scope, so it takes cream paper by day and the night paper after dark. A pin or a row opens that place's latest page in its book.
- **Shelf:** the books as 3D covers; a dashed new-book tile with a sun-yellow plus, or a locked tile that leads to Plus when Free's book is used.

### Icon dock (mobile app only)
`src/components/IconDock.tsx` keeps the app-icon tiles (map, page, cover, plans) for the future mobile app, with its own stylesheet that loads only when a dock renders. The website doesn't show it.

## Do's and Don'ts

### Do:
- **Do** bring colour in with a real travel photograph, faded into the page per the Dissolve Rule.
- **Do** embed each photograph's origin in the file and credit Unsplash in the footer.
- **Do** keep shadows falling down and to the right (the Lift and Lift Large values).
- **Do** use sun yellow for the one primary action in view.
- **Do** label sample content as sample (Sample book, Sample page) wherever a visitor could take it for real.
- **Do** keep stamp inks to the four book accents.

### Don't:
- **Don't** set a section on a tinted or coloured band. The user moved the site from the blue table to white on 2026-10-20.
- **Don't** put a photograph on the page in a box or let a fade end in a straight line against a saturated sky.
- **Don't** frame the page in a window, bezel or border. The user removed it on 2026-10-17.
- **Don't** use glass, blur cards or floating doodles on the website.
- **Don't** present stock photographs of people as customers, reviews or testimonials.
- **Don't** set a kicker or eyebrow above a heading.
- **Don't** use mono as a costume. Only printed data gets DM Mono.
- **Don't** follow the device's dark mode on the website. The signed-in app does follow it, with its night page.
- **Don't** decorate signed-in screens with stock photographs. The app's photographs are the people's own, shown as the polaroids they are in the book.
- **Don't** dress app controls as tickets, ledgers or stamps. Buttons, tabs, inputs and menus stay standard; the world lends type, palette and the map.
