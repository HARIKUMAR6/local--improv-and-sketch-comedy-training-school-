# The Bit Lab — Improv & Sketch Comedy School

Static website built with HTML5, Tailwind CSS v4, and vanilla JavaScript. There is no frontend framework and no backend.

## Requirements

- Node.js 18 or newer (developed with Node 24)

## Setup and running locally

```bash
npm install        # installs the Tailwind CLI (the only dependency)
npm run dev        # builds, watches src/, and serves the site at http://localhost:3000
```

If port 3000 is busy, `npm run dev` uses the next free port and prints the URL. To pick a port yourself, set the `PORT` environment variable.

| Command         | What it does                                                                  |
| --------------- | ----------------------------------------------------------------------------- |
| `npm run build` | Production build into `dist/` (minified CSS, no dev-only pages)               |
| `npm run check` | Verifies `dist/`: pages, links, assets, page structure, header/footer, wording |
| `npm run serve` | Serves an existing `dist/` without watching                                   |

Typical release check: `npm run build && npm run check`.

The built pages use relative paths, so `dist/index.html` can also be opened directly from the file system.

## Project structure

```
src/
  pages/            One file per page → dist/<name>.html
    _styleguide.html  Component reference (built by `npm run dev` only)
  partials/         Shared markup: head.html, header.html, footer.html, scroll-top.html
  css/main.css      Tailwind entry: design tokens, themes, base styles, components
  js/main.js        Theme toggle, text direction, mobile menu, footer year, contact
                     details (site.json → contact, used by the footer and Contact
                     page), scroll-to-top button
  assets/icons/     SVG icons (inlined with @include)
  assets/images/    Images (copied to dist/assets/images)
  site.json         Brand name, descriptions, social links
scripts/            build.mjs, serve.mjs, check.mjs
dist/               Generated output; do not edit (git-ignored)
```

## Site settings (`src/site.json`)

| Key                 | Used for                                                             |
| ------------------- | -------------------------------------------------------------------- |
| `name`              | Brand name in the header, footer, page titles, and copyright         |
| `tagline`           | Home page `<title>`                                                  |
| `description`       | Default meta description                                             |
| `footerDescription` | Short description in the footer                                      |
| `social.*`          | Footer social links (Instagram, Facebook, YouTube, LinkedIn)         |
| `contact.email`     | Email row on the Contact page and in the footer (`mailto:` link). Hidden while empty |
| `contact.phone`     | Phone row on the Contact page and in the footer (`tel:` link). Hidden while empty |
| `contact.address`   | Address, shown on the Contact page and in the footer. Hidden while empty |
| `contact.mapEmbedUrl` | Contact page map: a Google Maps embed URL (`https://www.google.com/maps/embed?...`) or OpenStreetMap embed URL. Currently a general city-centre area, captioned as such; point it at the school once the address is confirmed. No map is shown while empty |

**Brand name:** "The Bit Lab" is a provisional name. Changing `name` updates it everywhere.

**Social links:** they currently point to each platform's homepage. Replace them with the school's profile URLs once the accounts exist.

## Pages

The site has exactly eight destinations. In the header, Home 1 and Home 2 sit in a single **Home** dropdown, and Login Portal is the **Login** button:

| Label        | File             | `nav` key   |
| ------------ | ---------------- | ----------- |
| Home 1       | `index.html`     | `home`      |
| Home 2       | `home-2.html`    | `home-2`    |
| Classes      | `classes.html`   | `classes`   |
| Shows        | `shows.html`     | `shows`     |
| About        | `about.html`     | `about`     |
| Contact      | `contact.html`   | `contact`   |
| Dashboard    | `dashboard.html` | `dashboard` |
| Login Portal | `login.html`     | `login`     |

(The header shows it as a button labelled "Login"; the footer and page title keep "Login Portal".)

Each page currently contains the shared header and footer plus a page intro (`<header class="page-intro">`). Add page content as sections inside `<main>`:

```html
<section class="section">
  <div class="container-site">…</div>
</section>
```

### Page syntax

```html
<!-- @page title="Classes" nav="classes" description="Short meta description." -->
<!doctype html>
<html lang="en" dir="ltr" class="no-js">
<head>
  <!-- @include partials/head.html -->
</head>
<body>
  <!-- @include partials/header.html -->
  <main id="main" tabindex="-1">…</main>
  <!-- @include partials/footer.html -->
</body>
</html>
```

`@page` attributes:

- `title`: rendered as "Title | The Bit Lab". If omitted, the home page format is used.
- `nav`: adds `aria-current="page"` to matching `data-nav` links in both the desktop and mobile navigation.
- `description`: defaults to `site.json`.
- `robots`: defaults to `index, follow`.

`<!-- @include path -->` paths are relative to `src/`, and includes can be nested. `{{site.name}}`, `{{page.title}}`, and `{{build.year}}` insert values. An unknown `{{token}}` or a missing include fails the build.

## Design system

Tokens live in `src/css/main.css` and are available as Tailwind utilities.

- **Brand palette:** `cream` `#F7F3EB`, `orange` `#E96B3A`, `ink` `#1C1B19`, `white` `#FFFFFF`.
- **Theme-aware colors:** prefer these in components, because they switch with dark mode:
  - `page`, `page-alt`, `surface`
  - `fg`, `fg-soft`, `fg-muted`
  - `line`, `line-strong`
  - `accent`, `accent-hover`, `on-accent`, `accent-text`, `accent-soft`
  - `danger`, `success`

  For example, `bg-page`, `text-fg-muted`, `border-line`. Use `accent-text` for orange text, not `orange`. All text pairings meet WCAG AA in both themes.
- **Fonts:** `font-heading` (Space Grotesk), `font-sans` (Inter, the default), both with system fallbacks.
- **Type sizes (fluid):** `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-lead`.
- **Spacing:** `px-gutter`, `py-section`, `h-header`, `size-control` (44px).
- **Widths:** `max-w-site`, `max-w-prose`.
- **Radius:** `rounded-xs`, `rounded-sm` (controls), `rounded-md` (cards and panels), `rounded-lg`.
- **Motion:** `ease-out` with a 160ms default duration. Transitions are disabled under `prefers-reduced-motion`.

Component classes:

- **Layout:** `container-site`, `section`, `section-alt`, `page-intro`
- **Text:** `kicker`, `page-title`, `section-title`, `section-heading`, `lead`, `link`
- **Buttons:** `btn` + `btn-primary | btn-secondary | btn-outline | btn-ghost`, sizes `btn-sm` (40px), the default (48px), and `btn-lg` (56px), plus `btn-block`. `icon-btn` is a square icon-only button; always give it an `aria-label`.
- **Card:** `card`
- **Forms:** `form-field`, `form-label`, `form-control` (input, select, textarea), `form-hint`, `form-error`, `form-check`. Use `aria-invalid="true"` for the error state.

Run `npm run dev` and open `/_styleguide.html` to see all of these components.

### Right-to-left support

Components use logical properties (`margin-inline`, `inset-inline-start`, `padding-block`, and so on). In markup, prefer the Tailwind logical utilities `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, and `text-end` over left/right versions.

## Image credits

Photos across the site come from Wikimedia Commons under Creative Commons licenses. The licenses require credit, but not that it appear on the page, so it is kept here instead of in a caption under every photo. Keep a file's row if it is reused or cropped elsewhere. If you replace a photo with the school's own photography, remove its row.

| File (`src/assets/images/`)            | Author             | License      | Source |
| -------------------------------------- | ------------------ | ------------ | ------ |
| `home1-hero-two-person-scene.jpg`      | Frankie Fouganthin | CC BY-SA 3.0 | [Teatersport -2](https://commons.wikimedia.org/wiki/File:Teatersport_-2.jpg) |
| `home1-approach-class-exercise.jpg`    | Nnikkhoui          | CC0          | [Improvisors in class at Improvolution](https://commons.wikimedia.org/wiki/File:Improvisors_in_class_at_Improvolution.jpg) |
| `home1-alumni-umbrella-scene.jpg`      | Frankie Fouganthin | CC BY-SA 3.0 | [Teatersport -3](https://commons.wikimedia.org/wiki/File:Teatersport_-3.jpg) |
| `home1-alumni-scene-partners.jpg`      | Linda Marie        | CC BY 2.0    | [Game of Laugh – Comedy improv at "Yo Mama’s", New Orleans 03](https://commons.wikimedia.org/wiki/File:Game_of_Laugh_-_Comedy_improv_at_%22Yo_Mama%27s%22,_New_Orleans_03.jpg) |
| `home1-alumni-kneeling-scene.jpg`      | Frankie Fouganthin | CC BY-SA 3.0 | [Teatersport -5](https://commons.wikimedia.org/wiki/File:Teatersport_-5.jpg) |
| `home1-shows-theatresports.jpg`        | Anitagaribaldi     | CC BY-SA 4.0 | [Theatresports Teatro a Molla 08032025](https://commons.wikimedia.org/wiki/File:Theatresports_Teatro_a_Molla_08032025.jpg) |
| `home1-community-cast.jpg`             | Sendbutton         | CC BY-SA 4.0 | [SickPuppies40](https://commons.wikimedia.org/wiki/File:SickPuppies40.jpg) |
| `home1-community-imaginary-ball.jpg`   | Jenn Turner        | CC BY 2.0    | [Theatre games, imaginary ball](https://commons.wikimedia.org/wiki/File:Theatre_games,_imaginary_ball.jpg) |
| `home1-community-pile-up.jpg`          | Sdkb               | CC BY-SA 4.0 | [Duck! improv show at Harvey Mudd College](https://commons.wikimedia.org/wiki/File:Duck!_improv_show_at_Harvey_Mudd_College.jpg) |
| `classes-hero-workshop-circle.jpg` | Vancouver Film School | CC BY 2.0 | [Matthew Lillard Acting Workshop at VFS (8243054226)](https://commons.wikimedia.org/wiki/File:Matthew_Lillard_Acting_Workshop_at_VFS_(8243054226).jpg) |
| `classes-improv-beginner.jpg` | Darkhorseva | CC BY-SA 4.0 | [The Calamity IMprov Group Rehearsal](https://commons.wikimedia.org/wiki/File:The_Calamity_IMprov_Group_Rehearsal.jpg) |
| `classes-improv-experienced.jpg` | Frankie Fouganthin | CC BY-SA 3.0 | [Teatersport -4](https://commons.wikimedia.org/wiki/File:Teatersport_-4.jpg) |
| `classes-sketch-rehearsal.jpg` | Harrison Keely | CC BY 4.0 | [Two actors rehearse a scene from "Almost, Maine"](https://commons.wikimedia.org/wiki/File:Two_actors_rehearse_a_scene_from_%22Almost,_Maine%22.jpg) |
| `classes-group-workshop.jpg` | Thehero | CC BY-SA 3.0 | [Theatre of the Oppressed1](https://commons.wikimedia.org/wiki/File:Theatre_of_the_Oppressed1.jpg) |
| `classes-skill-listening.jpg` | Gerarus | CC BY-SA 4.0 | [Kolyada-Theatre, rehearsal, March 2014.04](https://commons.wikimedia.org/wiki/File:Kolyada-Theatre,_rehearsal,_March_2014.04.jpg) |
| `classes-skill-scene-work.jpg` | Isabeau Blanche | CC BY-SA 4.0 | [Rehearsal of the play "Les amoureux"](https://commons.wikimedia.org/wiki/File:Rehearsal_of_the_play_%22Les_amoureux%22_at_the_Denise-Pelletier_Theatre.jpg) |
| `classes-skill-character.jpg` | Mojmír Churavý | CC0 | [Pacient Doktora Freuda C](https://commons.wikimedia.org/wiki/File:Pacient_Doktora_Freuda_C.jpg) |
| `classes-skill-collaboration.jpg` | Koyaanisqatsi12 | CC BY-SA 4.0 | [Contact Improvisation Trio Dojo Florence](https://commons.wikimedia.org/wiki/File:Contact_Improvisation_Trio_Dojo_Florence.jpg) |
| `classes-start-audience.jpg` | cyberuly | CC BY 3.0 | [Theatresports in Florence 003](https://commons.wikimedia.org/wiki/File:Theatresports_in_Florence_003.jpg) |
| `classes-experience-rehearsal.jpg` | Gerarus | CC BY-SA 4.0 | [Kolyada-Theatre, rehearsal, March 2014.03](https://commons.wikimedia.org/wiki/File:Kolyada-Theatre,_rehearsal,_March_2014.03.jpg) |
| `classes-experience-ensemble.jpg` | JackDoesBusiness | CC0 | [Lazzi Improv at Mizzou](https://commons.wikimedia.org/wiki/File:Lazzi_Improv_at_Mizzou.jpg) |
| `classes-experience-performance.jpg` | DanielPenfield | CC BY-SA 4.0 | [RITBrainwreckImprov](https://commons.wikimedia.org/wiki/File:RITBrainwreckImprov.jpg) |
| `about-hero-workshop.jpg` | Mostafameraji | CC0 | [Improvisational theatre in Iran-Qom City-2018-Canon 5d Mark4](https://commons.wikimedia.org/wiki/File:Improvisational_theatre_in_Iran-Qom_City-2018-Canon_5d_Mark4.jpg) |
| `about-story-scene.jpg` | La Llama Store | CC BY 2.0 | [ImproBarcelona en el festival de comedia alternativa La Llama Fest 2022](https://commons.wikimedia.org/wiki/File:ImproBarcelona_en_el_festival_de_comedia_alternativa_La_Llama_Fest_2022.jpg) |
| `about-beliefs-exercise.jpg` | Mostafameraji | CC0 | [Improvisational theatre in Iran-Qom City-2018-Canon 5d Mark13](https://commons.wikimedia.org/wiki/File:Improvisational_theatre_in_Iran-Qom_City-2018-Canon_5d_Mark13.jpg) |
| `about-community-festival.jpg` | Migbeander | CC BY-SA 4.0 | [SIF 2018 Group Photo](https://commons.wikimedia.org/wiki/File:SIF_2018_Group_Photo.jpg) |
| `about-community-street.jpg` | Jakub Hałun | CC BY-SA 4.0 | [35. Ulica – Agro the Clown – ImproLocura 8253](https://commons.wikimedia.org/wiki/File:35._Ulica_-_Agro_the_Clown_-_ImproLocura_-_20220710_1512_8253.jpg) |
| `about-community-troupe.jpg` | Hilda Lobinger | CC BY-SA 3.0 | [Fastfood-Theater Mai 2007](https://commons.wikimedia.org/wiki/File:Fastfood-Theater_Mai_2007.JPG) |
| `about-community-match.jpg` | cyberuly | CC BY 3.0 | [Theatresports in Florence 004](https://commons.wikimedia.org/wiki/File:Theatresports_in_Florence_004.jpg) |
| `about-cta-jump.jpg` | Happenstancewiki | CC BY-SA 4.0 | [Happenstance Theater company group jump](https://commons.wikimedia.org/wiki/File:Happenstance_Theater_company_group_jump_.jpg) |
| `home2-hero-stage-duo.jpg` | DNVaudit | CC BY 4.0 | [Improv Comedy Performance at Mettlesome Theater](https://commons.wikimedia.org/wiki/File:Improv_Comedy_Performance_at_Mettlesome_Theater.jpg) |
| `home2-approach-writers-room.jpg` | Andy Kusama | CC BY-SA 4.0 | [Artists rehearsal](https://commons.wikimedia.org/wiki/File:Artists_rehearsal.jpg) |
| `home2-journey-discover.jpg` | Mostafameraji | CC0 | [Improvisational theatre in Iran-Qom City-2018-Canon 5d Mark16](https://commons.wikimedia.org/wiki/File:Improvisational_theatre_in_Iran-Qom_City-2018-Canon_5d_Mark16.jpg) |
| `home2-journey-practise.jpg` | j.e.mcgowan | CC BY 2.0 | [Rehearsal Scenes (24360549943)](https://commons.wikimedia.org/wiki/File:Rehearsal_Scenes_(24360549943).jpg) |
| `home2-journey-perform.jpg` | DNVaudit | CC BY 4.0 | [Comedy Improv Performance at Mettlesome Theater](https://commons.wikimedia.org/wiki/File:Comedy_Improv_Performance_at_Mettlesome_Theater.jpg) |
| `home2-community-ensemble.jpg` | Saltymommy69 | CC BY-SA 4.0 | [Comedy Corner Fall 2016](https://commons.wikimedia.org/wiki/File:Comedy_Corner_Fall_2016.jpg) |
| `home2-community-rehearsal.jpg` | Gerarus | CC BY-SA 4.0 | [Kolyada-Theatre, rehearsal, March 2014.01](https://commons.wikimedia.org/wiki/File:Kolyada-Theatre,_rehearsal,_March_2014.01.jpg) |
| `home2-stage-audience.jpg` | Reed.jacob | CC BY-SA 3.0 | [SecondNatureImprov 8664](https://commons.wikimedia.org/wiki/File:SecondNatureImprov_8664.jpg) |
| `home2-stage-lineup.jpg` | Saltymommy69 | CC BY-SA 4.0 | [Comedy Corner Performing September 2016](https://commons.wikimedia.org/wiki/File:Comedy_Corner_Performing_September_2016.jpg) |
| `home2-cta-cabaret.jpg` | FST15 | CC BY-SA 3.0 | [Florida Studio Theatre, Court Cabaret](https://commons.wikimedia.org/wiki/File:Florida_Studio_Theatre,_Court_Cabaret.JPG) |
| `shows-hero-sketch.jpg` | DNVaudit | CC BY 4.0 | [A Sketch Comedy Performance at Mettlesome Theater](https://commons.wikimedia.org/wiki/File:A_Sketch_Comedy_Performance_at_Mettlesome_Theater.jpg) |
| `shows-upcoming-improv-night.jpg` | Krzysztof Popławski | CC BY-SA 4.0 | [Festiwal Słowa … Teatr Klancyk, KsP 8228](<https://commons.wikimedia.org/wiki/File:Festiwal_S%C5%82owa_im._Jerzego_Pilcha_Granatowe_G%C3%B3ry_2025,_Wis%C5%82a,_Scenna_Biblio,_Teatr_Klancyk_i_Zbigniew_Rokita,_KsP_8228.jpg>) |
| `shows-type-improv.jpg` | Krzysztof Popławski | CC BY-SA 4.0 | [Festiwal Słowa … Teatr Klancyk, KsP 8217](<https://commons.wikimedia.org/wiki/File:Festiwal_S%C5%82owa_im._Jerzego_Pilcha_Granatowe_G%C3%B3ry_2025,_Wis%C5%82a,_Scenna_Biblio,_Teatr_Klancyk_i_Zbigniew_Rokita,_KsP_8217.jpg>) |
| `shows-type-sketch.jpg` | Philip Terry Graham | CC BY 2.0 | [Isaac Dela Torre at UNSW Law Revue 2017](https://commons.wikimedia.org/wiki/File:Isaac_Dela_Torre_at_UNSW_Law_Revue_2017.jpg) |
| `shows-type-showcase.jpg` | Saltymommy69 | CC BY-SA 4.0 | [Comedy Corner Performing May 2016](https://commons.wikimedia.org/wiki/File:Comedy_Corner_Performing_May_2016.jpg) |
| `shows-live-outdoor-crowd.jpg` | Wellington City Council | CC BY 2.5 | [SS84 Botans 01](https://commons.wikimedia.org/wiki/File:SS84_Botans_01.jpg) |
| `shows-live-seated-scene.jpg` | Krzysztof Popławski | CC BY-SA 4.0 | [Festiwal Słowa … Teatr Klancyk, KsP 8225](<https://commons.wikimedia.org/wiki/File:Festiwal_S%C5%82owa_im._Jerzego_Pilcha_Granatowe_G%C3%B3ry_2025,_Wis%C5%82a,_Scenna_Biblio,_Teatr_Klancyk_i_Zbigniew_Rokita,_KsP_8225.jpg>) |
| `shows-live-close-up.jpg` | Jakub Hałun | CC BY-SA 4.0 | [35. Ulica – Agro the Clown – ImproLocura 8251](https://commons.wikimedia.org/wiki/File:35._Ulica_-_Agro_the_Clown_-_ImproLocura_-_20220710_1512_8251.jpg) |
| `shows-spotlight-floor-work.jpg` | Mostafameraji | CC0 | [Improvisational theatre in Iran-Qom City-2018-Canon 5d Mark14](https://commons.wikimedia.org/wiki/File:Improvisational_theatre_in_Iran-Qom_City-2018-Canon_5d_Mark14.jpg) |
| `shows-spotlight-rehearsal.jpg` | Mostafameraji | CC0 | [Improvisational theatre in Iran-Qom City-2018-Canon 5d Mark9](https://commons.wikimedia.org/wiki/File:Improvisational_theatre_in_Iran-Qom_City-2018-Canon_5d_Mark9.jpg) |
| `shows-spotlight-ensemble.jpg` | Saltymommy69 | CC BY-SA 4.0 | [Comedy Corner Spring 2016](https://commons.wikimedia.org/wiki/File:Comedy_Corner_Spring_2016.jpg) |
| `contact-hero-workshop.jpg` | Ian Spence | CC BY 3.0 | [Theatre Workshop (21745645)](https://commons.wikimedia.org/wiki/File:Theatre_Workshop_(21745645).jpeg) |

`classes-improv-beginner.jpg` and `shows-type-showcase.jpg` are reused as-is on the Dashboard; see their rows above.

## Header behavior

- **Layout (≥1280px):** a three-column grid: brand at the start, navigation centered in the header itself, and the theme toggle, direction control and Login button at the end. Below 1280px, a menu button opens a full-height panel instead.
- **Home dropdown (desktop):** opens on hover (mouse), click, tap, Enter/Space, or ArrowDown/ArrowUp. Arrow keys, Home and End move between items. It closes with Escape (focus returns to the trigger), a click outside, tabbing away, selecting an item, or resizing below 1280px. The current Home page is marked on both the trigger and its item.
- **Mobile menu:** Home is an accordion inside the menu (it starts expanded on a Home page), and Login is a full-width button below the links. The panel closes with the close button, Escape, a click outside, following a link, or resizing to desktop.
- **Theme:** the icon button switches between light and dark (a moon in light mode, a sun in dark mode).
  - The first visit follows the operating system setting.
  - The choice is saved in `localStorage` and applied in `<head>` before paint, so there is no flash.
  - If storage is blocked, the toggle still works for the current page.
- **Direction:** the `LTR | RTL` control sets `<html dir>` and is saved the same way. On screens narrower than 640px it moves into the menu panel.

## Footer and scroll-to-top

- **Footer** (`partials/footer.html`): brand and description, then three link groups — **Explore** (Home 1, Home 2, About, Classes), **Performances & Info** (Shows, Contact, Dashboard, Login Portal) and **Get in Touch** (email, phone, address from `site.json → contact`). Get in Touch collapses entirely, heading included, while none of those three are set. A ruled bottom bar carries the copyright line and the four social icons. On every public page except the Dashboard, which uses its own sidebar instead.
- **Scroll to top** (`partials/scroll-top.html`, behavior in `js/main.js`): a fixed icon button, bottom-end corner (right in LTR, left in RTL). Appears once the page is scrolled past roughly one screen, and hides again near the top or whenever the footer is in view. Scrolling follows the same `prefers-reduced-motion` handling as in-page anchors (smooth normally, instant when reduced motion is requested). Public pages only; omitted from the Dashboard.
