# Themes, the settings layout and right-to-left

The agreed design for three pieces of work, in both hosts: a Themes window
with a catalog of drawn backgrounds, a more compact settings page, and Arabic
reading right to left everywhere the plugin draws. Decided with the owner on
23 November 2026. Nothing here is implemented yet; the handoffs at the end say
in which order it is.

Prototype (private to the owner, who can share it):
https://claude.ai/artifact/GQj2Yo7tgqUihGH2n53SUi. Its controls along the top
switch the open windows, the plugin's language (Russian, English, Arabic),
Discord's light or dark mode, and the circle or reduced motion. What it shows
is what this document describes; where the two differ, this document wins.
Its source is `design/prototype/`; `node design/prototype/build.mjs > themes.html`
puts it together. The drawings in `art.js` and the search in `app.js` are the
starting point for `themes/draw.mjs` and `core/themes.ts`.

## Decisions

| Question | Decision |
|---|---|
| Name | **Themes**, opened from the Appearance section and a palette icon in the settings header. Not Marketplace: nothing is sold or uploaded by others |
| Art | **Vector now, pictures later.** Every theme is a drawing in SVG. The format leaves room for a raster picture, which no theme uses yet |
| Where the catalog lives | **On builds.zolatau.com, cached on the device.** Not bundled into the plugin. Downloaded in the background soon after start, kept on disk, used from there offline. New themes reach everyone as soon as they are pushed to `main`, without a plugin release |
| Search | **Local**, over words in 16 languages that come with the catalog, tolerant of typos and word forms. No AI requests |
| What a theme changes | **The plugin's windows only**: the chat panel, settings, Themes, Support and feedback, Logs, Corrections and the delete confirmation. Not the line under a message, not the chat bar button, not cards in the chat |
| Light and dark | **Two palettes per theme**, chosen by the client's own mode. One choice, "Drawn forest", looks right in both |
| Settings page | **One scrolling page of section cards** with a sticky bar of section names; name and description on the left, the control on the right |
| Themes window | **Categories on the left** with Recent first, search and tiles on the right |
| A note that themes affect only the plugin | **None**, neither in the window nor in the README |

## Windows and sizes

| Window | Width | Notes |
|---|---|---|
| Chat panel | 480px | Unchanged size |
| Settings | 680px | Vencord's `lg`; the plugin cannot change it in Discord, and Telegram matches it |
| Themes | 1156px | 1.7 times the settings window. Height `min(680px, 100vh - 96px)` |
| Support and feedback | 560px | Was 480px |
| Delete from Recent? | 440px | Discord's small modal |

Every window keeps `max-width: calc(100vw - 32px)`. Below 760px of window
width the Themes sidebar becomes a row of categories above the grid, and a
settings row stacks its control under its name.

## The settings page

### Structure

The page reads top to bottom in this order. Section titles are the names in
the sticky bar; the bar scrolls to a section and marks the one in view.

1. **Providers** (`section.providers`, new). The first slot: provider
   (select), key (`keyHeading`, "API key — Groq", with the eye), model (select
   with the refresh button). Each backup slot is one collapsed row,
   "Backup provider" on the left and "Google Gemini · gemini-3.8-flash" on the
   right with a chevron; opened, it shows the same three rows and Remove. Then
   "+ Add a backup provider" and, last in the card, `fallback.desc` as a quiet
   note. Every existing rule of the slots stays: `keyVerdict`, the red line
   only for a key the provider called wrong, `checkKey` on leaving the field.
2. **Behaviour** (`section.behaviour`): mode (select), onError (select),
   explain (switch), aiLearn (switch). While AI Learn is on, its row carries
   a "Corrections (n)" link under the description, which opens the
   Corrections window; the separate wide button goes.
3. **Translation** (`section.translation`): gender, renamed **My gender**
   (select), formality (select), useContext (switch), glossary and extra
   instructions (both stacked: name and description, then the field full
   width).
4. **Appearance** (`section.look`): **Theme** (new row: a small preview of the
   current theme, its name, and a Choose button that opens Themes), interface
   language (select), showOriginal (switch).
5. **Help** (`keep.name`): `help.button` and `help.menu` (new), then the
   sub-heading `help.keepTitle` (new) over the three existing lines
   `keep.pair`, `keep.line`, `keep.code`.
6. **Foot**, with no title: Check for updates and Logs (n) side by side, the
   update's own lines under them, and "AI Translate · version" centred below.

### Rows

A row is a grid: name and description in a flexible column, the control in a
264px column, centred vertically, 12px above and below, a hairline between
rows. Names are 14px medium, descriptions 12.5px in the muted colour. Each
section is a card: a translucent surface (dark: `rgba(17,18,21,.52)`, light:
`rgba(255,255,255,.74)`) with a 10px radius, which reads as a plain secondary
surface with no theme and lets a theme show between the cards.

### How Discord draws it

Vencord draws one setting per row in the order of `settings.ts`, with a
full-width select under the name and no way to put the control beside it. So
the page becomes **one component**, `ui/SettingsPage.tsx`, registered as a
single `OptionType.COMPONENT` setting, and every visible setting that it now
draws becomes `hidden: true`. **The keys and their defaults do not change**,
so nothing saved is lost and `migrateSettings` needs nothing new;
`test/defaults.mjs` keeps comparing the defaults. Vencord still draws the
window's title, the plugin's description, Authors and the Settings heading;
`ModalHeadings.ts` keeps translating the last two. The header row
(`SettingsHeader` in `ui/Feedback.tsx`) gains the palette button first, before
Support and Source code.

Two new hidden settings:

| Key | Type | Default | Holds |
|---|---|---|---|
| `theme` | string | `""` | The chosen theme's id; empty is No theme |
| `recentThemes` | string | `""` | Ids chosen before, newest first, as JSON, at most 12 |

Telegram's `src/settings.ts` draws the same structure in its own DOM, and its
defaults for both keys are the same (`test/defaults.mjs` there).

## The Themes window

- **Header**: palette icon, "Themes", ×.
- **Sidebar** (216px): Recent with its count, a hairline, All themes, then
  Abstract, Nature, Sky, Seasons, Minimal. The open one has a surface and a
  3px accent edge on the side the text starts from.
- **Search** across the top of the right side, with a magnifier, the
  placeholder `themes.search`, and a clear button once something is typed.
  While there is a query, the results replace the grid, titled "Found: n",
  and no category is marked. Escape clears a query before it closes the
  window.
- **Grid**: tiles of at least 196px, 14px apart. A tile is the theme's own
  background at 16:10 with a 10px radius, its name under it. The current
  theme has a 2px accent ring and an "In use" badge in the lower corner where
  text starts. Hover lifts the picture 2px.
- **No theme** is always the first tile in All themes and in Minimal. It is
  built into the plugin, not the catalog, so it works with no catalog at all.
- **Recent**: the same tiles, newest first. Choosing a theme puts it first;
  No theme is never listed. Hovering a tile shows a trash button in the top
  corner opposite the text's start (top right in left-to-right, top left in
  Arabic): white on a dark translucent square, red (`--danger`) under the
  pointer. It is always visible on a touch screen and reachable by Tab.
  Clicking it opens **Delete from Recent?** with the theme's name in the body,
  a Cancel button and a red Delete. Focus starts on Cancel. Delete removes the
  tile with a short fade and shrink (none with reduced motion). A deleted
  theme stays in the catalog, and a theme in use stays in use after it is
  deleted from Recent.
- **Empty states**: Recent with nothing in it says `themes.recentEmpty`;
  a search with no result says `themes.nothing`.
- **Before the catalog has arrived**: tiles drawn as quiet placeholders.
  With no cached catalog and no network, the grid says `themes.offline` with a
  Try again button; No theme is still offered.

## The catalog

### Where it lives

The source is a `themes/` folder in this repository:

| Path | Holds |
|---|---|
| `themes/catalog.json` | Every theme: id, category, hidden or not, its concept words, the light and dark palettes, its name in 16 languages, and which drawing it uses |
| `themes/words.json` | Search concepts, each with synonyms in all 16 languages |
| `themes/draw.mjs` | The drawing functions, which turn a palette into SVG |
| `themes/build.mjs` | Draws every theme in both modes, checks everything below, and writes the published folder |

The build robot runs `node themes/build.mjs` on **`main`** in every run and
publishes the result at `https://builds.zolatau.com/themes/`, whichever
channel it is building: themes are data, not a version, and they reach
released and testing copies alike as soon as `main` moves. The deploy
replaces the whole site, so the folder is rebuilt every run like everything
else. A failing check fails the robot's run, and nothing is published.

Published:

- `themes/index.json`: `{ "format": 1, "themes": [...], "words": {...} }`.
  Each theme: `id`, `category`, `hidden`, `concepts`, `names` (16 languages),
  `light` and `dark`, each `{ "surface", "accent", "art" }`, where `art` is
  the file name of that mode's drawing. `format` grows only when an older
  plugin could not read the file; a plugin ignores a format it does not know
  and keeps its cache.
- `themes/art/<sha256-prefix>.svg`: one file per drawing, named by the hash
  of its content, so a file never changes once published and can be cached
  forever.

A later raster theme would carry `"art": "<hash>.webp"` and a `"raster": true`;
nothing reads it until a theme needs it.

### Checks in `themes/build.mjs` (and `test/themes.mjs` in CI)

- Every theme has a name in all 16 languages, a category from the fixed five,
  and both palettes.
- Every concept a theme names exists in `words.json`, which has all 16
  languages for each; the example in each language's `themes.search`
  placeholder finds a forest theme in that language.
- Each SVG is under 40KB and contains no `<script`, `<foreignObject`, `on*=`
  attribute, `<image`, `href` other than a local `#id`, `url(` other than a
  local `url(#id)`, `filter`, `feGaussianBlur` or `@import`. Shown as a CSS
  background, an SVG cannot run code or load anything; the check is a second
  wall, and it also keeps out what is slow to draw.
- Text stays readable: every fill in a drawing, under that mode's veil
  (below), keeps the client's text colour at 4.5:1 or more (dark mode against
  `#dbdee1`, light mode against `#313338`), and the accent with its own text
  colour at 4.5:1 or more.

### On the device

The core asks the host for two things it cannot do itself: a `Net` (the same
one the updater uses: `native.ts` on the desktop, `GM_xmlhttpRequest` in a
userscript) and a small key-value store (`themeStore`, a new optional host
member). Discord's store is Vencord's `DataStore` (IndexedDB), under
`AI Translate: themes`, never the settings, which sync and would carry a
quarter of a megabyte. Telegram's is the userscript manager's storage, under
`ai-translate-themes`.

- 20 seconds after start, and then at most every six hours while the client
  stays open, the core fetches `index.json` and every art file not cached yet,
  in the background, and replaces the cached index only once all of it has
  arrived and parsed. A failure keeps the cache and is logged once, quietly.
- Opening Themes with a cache shows it at once and refreshes behind it.
- The art of the theme in use, and of every theme in Recent, stays cached
  even when the catalog drops it, so the window still looks the same offline.
  A theme the catalog no longer has is left out of Recent and the grid, and
  stays in use until the person chooses another.

### Content

No sexual or 18+ content, nothing violent, hateful, political or religious,
no drugs or gambling. A theme about something adults may want and others may
not, alcohol for example, carries `"hidden": true`: it never appears in All
themes or a category, and search offers it only when a query word names one
of its own concepts exactly or by its stem, never through a typo. Once chosen
it is in Recent like any other. The prototype's "Wine evening" is such a
sample; keeping it in the first catalog is the owner's call.

### The first catalog

Fifteen themes, drawn in the prototype and ready to move into `draw.mjs`:
Abstract: Drawn forest, Dunes, Paper waves, Pebbles. Nature: Soft hills,
Mountain mist, Lake reeds. Sky: Aurora, Starry night, Clouds. Seasons: Autumn
leaves, First snow, Spring blossom (and the hidden Wine evening). Minimal:
Terrazzo, Linen, plus No theme from the plugin. Their names in 16 languages
are at the end of this document.

## Search

In `core/themes.ts`, over the cached index:

1. Normalise the query and every word: lower case, accents and Arabic
   diacritics removed, `ё` as `е`, Arabic alef forms as one, `ة` as `ه`, `ى`
   as `ي`, and a leading `ال` dropped from Arabic words longer than four
   letters. Split on anything that is not a letter or a digit. Chinese,
   Japanese and Thai have no spaces: their synonyms are matched as substrings
   of the query instead of as words.
2. Score each query word against each theme's names (in every language) and
   its concepts' synonyms (in every language): 3 for the same word, 2 for a
   prefix of three letters or more or the same stem (the synonym less its
   last one or two letters, the query word at most four letters longer), 1
   for one typo in a word of four to seven letters or two in a longer one
   (Damerau-Levenshtein). A name match counts one more than a concept match.
3. A query word that matches nothing in the whole catalog ("something",
   "please") is left out. A theme must match every remaining word; when no
   theme does, any theme that matches one is shown.
4. Order by words matched, then by total score. Hidden themes take part only
   as described under Content.

The prototype's search is this algorithm; "зимний лес", "calm blue",
"forset" and "غابة" are worth trying in it.

## Showing a theme

### Layers

Each plugin window gets an art layer behind its content, filling it to its
rounded corners: in Discord a `div.vc-aitrans-art` inserted as the first child
of the window's `[role="dialog"]` element (the same careful kind of DOM work
`ModalHeadings.ts` does, with a `MutationObserver` that puts it back if React
ever drops it), in Telegram the first child of `.panel` in the shadow root.
CSS scoped with `:has(> .vc-aitrans-art)` makes that window's own surfaces
transparent so the layer shows, and only there.

The layer is the theme's surface colour, its art at `center / cover`, and a
veil of the surface colour over the art: 10% in dark mode, 30% in light. With
No theme it is the client's own window colour. Text keeps the client's colours;
cards and fields are the translucent neutrals above, so nothing but the layer
and the accent changes with a theme.

The accent (`--vc-aitrans-accent`, registered with `CSS.registerProperty` as a
`<color>` so it can transition) colours primary buttons, switches that are on,
focus rings, the marked category and the "In use" badge. Its text colour is
whichever of white or near-black reads better on it. It eases over 0.5s
starting 0.25s after a choice, so it changes about when the circle passes.

### The circle

- Choosing a theme adds a new layer on top of every open plugin window's
  stack, clipped to `circle(0 at x y)`, and animates all of them with the Web
  Animations API to the same radius over **820ms**,
  `cubic-bezier(.32, 0, .18, 1)`.
- `x, y` is the pointer on screen, converted into each window's own
  coordinates; the radius is the distance from it to the farthest corner of
  any open plugin window. One centre and one radius make the windows look cut
  from one picture. A choice made from the keyboard starts from the middle of
  the tile.
- When a layer's animation finishes, it is the whole background: every layer
  under it is removed, the animation cancelled and the clip dropped.
- **Fast switching**: each choice only adds a layer; nothing in flight is
  interrupted, so there is never a jump. Above five layers in a window, the
  oldest one still animating finishes at once. A window opened during a reveal
  starts with the newest theme and no animation; a window closed during one
  takes its layers with it, and the finishing code checks `isConnected`.
- **Reduced motion** (the system's, Discord's own setting, or Telegram's
  animation setting, as `windows.motion()` reports it): the new layer fades
  in over 200ms instead, and with Telegram's animations off it appears at
  once.
- The client switching between light and dark rebuilds every window's layer
  at once, without a circle.

### Keeping Discord fast

- Each drawing becomes a `url()` once per theme and mode and is reused by every
  window and tile. If Discord's CSP refuses `data:` images, use a `blob:` URL
  made once from the same text.
- No SVG filters, no blur and no `backdrop-filter` anywhere: they repaint
  large areas on every frame. The checks above refuse filters in the art.
- The layers carry `will-change: clip-path` only while they animate.
- Measure a reveal across the settings window and Themes at 1440p in
  DevTools' Performance panel before release: no frame over 16ms in the
  renderer. If clip-path paints too much there, animate a circular element
  scaled by `transform` that masks the layer instead.

## Right to left

### Where it fails

The plugin's own windows set `dir="rtl"` on a `div` inside Discord's `Modal`
(`ui/modal.tsx`, `ui/Logs.tsx`, `ui/LearnPanel.tsx`, `ui/Feedback.tsx`), so
their content mirrors but their title bar does not: the title stays on the
left and × on the right.

The settings page fails completely. Vencord draws it in
`src/components/settings/tabs/plugins/PluginModal.tsx`, which sets no `dir`,
and each row in `components/Common.tsx` (`SettingsSection`), which sets none
either. Discord itself has no right-to-left language, so everything inherits
`ltr` from the page. Nor do the plugin's own pieces on that page
(`Providers.tsx`, `KeepHelp.tsx`, `SectionTitle.tsx`, `UpdatePanel.tsx`, the
Logs and Corrections rows): Arabic text starts at the left edge, a sentence's
closing full stop shows on the wrong side, and every switch sits on the right.

Telegram already sets `dir` on its root and on every `.panel`
(`src/ui.ts`, `src/sheet.ts`); its new windows only have to keep doing so.

### The fix

- One helper, `useWindowDirection(ref)` in a new `ui/direction.ts`, finds the
  window's `[role="dialog"]` from an element inside it and sets `dir` there
  (`rtl` or `ltr`) on every draw, so a change of language while the window is
  open turns it at once. All plugin windows call it from their root, and the
  inner `dir` divs go.
- The settings page calls it from `SettingsPage`, so Vencord's title,
  description, Authors and Settings heading mirror with it, in this plugin's
  window only.
- Everything new is written with logical properties (`margin-inline-start`,
  `inset-inline-end`, `padding-inline`), so it mirrors with no rules of its
  own. The sidebar's accent edge, the trash button's corner, the badge's
  corner and the switch's knob all follow from that.
- Discord's select menus open in a layer outside the window and stay `ltr`.
  Check them in Arabic; if their text sits on the wrong side, give the popout
  `dir` through its class, and otherwise leave it as a known limit.
- Code, keys and examples keep `dir="auto"` or `dir="ltr"` as they do now.

## Strings

All in `core/locales.ts`, all 16 languages, reviewed word by word by the
owner before they are committed. No em dashes. Theme names come with the
catalog instead, and are listed after the strings for the same review.

### Renamed

`gender.name`

- en: My gender
- ru: Мой пол
- uk: Моя стать
- ro: Genul meu
- de: Mein Geschlecht
- es: Mi género
- fr: Mon genre
- pt: Meu gênero
- ja: 自分の性別
- zh: 我的性别
- th: เพศของฉัน
- vi: Giới tính của tôi
- tr: Cinsiyetim
- id: Jenis kelamin saya
- ar: الجنس
- ko: 내 성별

Arabic "جنسي" alone also reads as "sexual"; "الجنس" is the word forms use
for this field.

### New

`section.providers`

- en: Providers
- ru: Провайдеры
- uk: Провайдери
- ro: Furnizori
- de: Anbieter
- es: Proveedores
- fr: Fournisseurs
- pt: Provedores
- ja: プロバイダー
- zh: 服务商
- th: ผู้ให้บริการ
- vi: Nhà cung cấp
- tr: Sağlayıcılar
- id: Penyedia
- ar: المزوّدون
- ko: 제공자

`theme.name`

- en: Theme
- ru: Тема
- uk: Тема
- ro: Temă
- de: Thema
- es: Tema
- fr: Thème
- pt: Tema
- ja: テーマ
- zh: 主题
- th: ธีม
- vi: Chủ đề
- tr: Tema
- id: Tema
- ar: السمة
- ko: 테마

`theme.desc`

- en: A drawing behind the plugin's windows, like a wallpaper
- ru: Рисунок на фоне окон плагина, как обои
- uk: Малюнок на тлі вікон плагіна, як шпалери
- ro: Un desen în fundalul ferestrelor pluginului, ca un tapet
- de: Ein Bild im Hintergrund der Fenster des Plugins, wie ein Hintergrundbild
- es: Un dibujo de fondo en las ventanas del plugin, como un fondo de pantalla
- fr: Un dessin en fond des fenêtres du plugin, comme un fond d'écran
- pt: Um desenho no fundo das janelas do plugin, como um papel de parede
- ja: プラグインのウィンドウの背景に表示するイラスト。壁紙のようなものです
- zh: 插件窗口背景里的图画，就像壁纸一样
- th: ภาพวาดเบื้องหลังหน้าต่างของปลั๊กอิน เหมือนวอลเปเปอร์
- vi: Một hình vẽ làm nền cho các cửa sổ của tiện ích, như hình nền
- tr: Eklentinin pencerelerinin arkasında, duvar kâğıdı gibi bir çizim
- id: Gambar di latar jendela plugin, seperti wallpaper
- ar: رسم خلف نوافذ الإضافة، مثل خلفية الشاشة
- ko: 플러그인 창 뒤에 깔리는 그림으로, 배경화면 같은 것입니다

`theme.choose`

- en: Choose
- ru: Выбрать
- uk: Вибрати
- ro: Alege
- de: Auswählen
- es: Elegir
- fr: Choisir
- pt: Escolher
- ja: 選ぶ
- zh: 选择
- th: เลือก
- vi: Chọn
- tr: Seç
- id: Pilih
- ar: اختيار
- ko: 선택

`themes.title`

- en: Themes
- ru: Темы
- uk: Теми
- ro: Teme
- de: Themen
- es: Temas
- fr: Thèmes
- pt: Temas
- ja: テーマ
- zh: 主题
- th: ธีม
- vi: Chủ đề
- tr: Temalar
- id: Tema
- ar: السمات
- ko: 테마

`themes.search` (the placeholder; each example must find a forest theme)

- en: Search, for example: calm forest
- ru: Поиск, например: спокойный лес
- uk: Пошук, наприклад: спокійний ліс
- ro: Caută, de exemplu: pădure liniștită
- de: Suchen, zum Beispiel: ruhiger Wald
- es: Buscar, por ejemplo: bosque tranquilo
- fr: Rechercher, par exemple : forêt calme
- pt: Pesquisar, por exemplo: floresta calma
- ja: 検索（例：静かな森）
- zh: 搜索，例如：宁静的森林
- th: ค้นหา เช่น ป่าสงบ
- vi: Tìm, ví dụ: rừng yên tĩnh
- tr: Ara, örneğin: sakin orman
- id: Cari, misalnya: hutan tenang
- ar: ابحث، مثلًا: غابة هادئة
- ko: 검색 (예: 고요한 숲)

`themes.searchClear` (the clear button's label for screen readers)

- en: Clear the search
- ru: Очистить поиск
- uk: Очистити пошук
- ro: Șterge căutarea
- de: Suche leeren
- es: Borrar la búsqueda
- fr: Effacer la recherche
- pt: Limpar a pesquisa
- ja: 検索をクリア
- zh: 清除搜索
- th: ล้างการค้นหา
- vi: Xoá tìm kiếm
- tr: Aramayı temizle
- id: Hapus pencarian
- ar: مسح البحث
- ko: 검색 지우기

`themes.recent`

- en: Recent
- ru: Недавние
- uk: Нещодавні
- ro: Recente
- de: Zuletzt verwendet
- es: Recientes
- fr: Récents
- pt: Recentes
- ja: 最近使ったもの
- zh: 最近使用
- th: ล่าสุด
- vi: Gần đây
- tr: Son kullanılanlar
- id: Terbaru
- ar: الأخيرة
- ko: 최근 사용

`themes.all`

- en: All themes
- ru: Все темы
- uk: Усі теми
- ro: Toate temele
- de: Alle Themen
- es: Todos los temas
- fr: Tous les thèmes
- pt: Todos os temas
- ja: すべてのテーマ
- zh: 全部主题
- th: ธีมทั้งหมด
- vi: Tất cả chủ đề
- tr: Tüm temalar
- id: Semua tema
- ar: كل السمات
- ko: 모든 테마

`themes.cat.abstract`, `themes.cat.nature`, `themes.cat.sky`, `themes.cat.seasons`, `themes.cat.minimal`

- en: Abstract · Nature · Sky · Seasons · Minimal
- ru: Абстракция · Природа · Небо · Времена года · Минимализм
- uk: Абстракція · Природа · Небо · Пори року · Мінімалізм
- ro: Abstract · Natură · Cer · Anotimpuri · Minimalist
- de: Abstrakt · Natur · Himmel · Jahreszeiten · Minimalistisch
- es: Abstracto · Naturaleza · Cielo · Estaciones · Minimalista
- fr: Abstrait · Nature · Ciel · Saisons · Minimaliste
- pt: Abstrato · Natureza · Céu · Estações · Minimalista
- ja: 抽象 · 自然 · 空 · 季節 · ミニマル
- zh: 抽象 · 自然 · 天空 · 四季 · 极简
- th: นามธรรม · ธรรมชาติ · ท้องฟ้า · ฤดูกาล · มินิมอล
- vi: Trừu tượng · Thiên nhiên · Bầu trời · Các mùa · Tối giản
- tr: Soyut · Doğa · Gökyüzü · Mevsimler · Minimal
- id: Abstrak · Alam · Langit · Musim · Minimalis
- ar: تجريدي · طبيعة · سماء · فصول السنة · بسيط
- ko: 추상 · 자연 · 하늘 · 계절 · 미니멀

`themes.none`

- en: No theme
- ru: Без темы
- uk: Без теми
- ro: Fără temă
- de: Kein Thema
- es: Sin tema
- fr: Aucun thème
- pt: Sem tema
- ja: テーマなし
- zh: 无主题
- th: ไม่มีธีม
- vi: Không dùng chủ đề
- tr: Tema yok
- id: Tanpa tema
- ar: بلا سمة
- ko: 테마 없음

`themes.current` (the badge on the theme in use)

- en: In use
- ru: Выбрана
- uk: Вибрано
- ro: În uz
- de: Aktiv
- es: En uso
- fr: Utilisé
- pt: Em uso
- ja: 使用中
- zh: 使用中
- th: ใช้อยู่
- vi: Đang dùng
- tr: Kullanımda
- id: Dipakai
- ar: مستخدمة
- ko: 사용 중

`themes.found`

- en: Found: {count}
- ru: Найдено: {count}
- uk: Знайдено: {count}
- ro: Găsite: {count}
- de: Gefunden: {count}
- es: Encontrados: {count}
- fr: Trouvés : {count}
- pt: Encontrados: {count}
- ja: 見つかったテーマ：{count}
- zh: 找到 {count} 个
- th: พบ {count} รายการ
- vi: Tìm thấy: {count}
- tr: Bulunan: {count}
- id: Ditemukan: {count}
- ar: النتائج: {count}
- ko: 찾은 테마: {count}

`themes.nothing`

- en: No theme matches. Try another word, such as forest or night.
- ru: Ничего не нашлось. Попробуйте другое слово, например «лес» или «ночь».
- uk: Нічого не знайшлося. Спробуйте інше слово, наприклад «ліс» або «ніч».
- ro: Nicio temă nu se potrivește. Încearcă alt cuvânt, de exemplu „pădure” sau „noapte”.
- de: Kein Thema passt. Versuch ein anderes Wort, etwa „Wald“ oder „Nacht“.
- es: Ningún tema coincide. Prueba con otra palabra, como «bosque» o «noche».
- fr: Aucun thème ne correspond. Essayez un autre mot, comme « forêt » ou « nuit ».
- pt: Nenhum tema corresponde. Tente outra palavra, como «floresta» ou «noite».
- ja: 一致するテーマがありません。「森」や「夜」など、別の言葉で試してください。
- zh: 没有匹配的主题。换个词试试，比如「森林」或「夜晚」。
- th: ไม่พบธีมที่ตรงกัน ลองคำอื่น เช่น «ป่า» หรือ «กลางคืน»
- vi: Không có chủ đề nào phù hợp. Hãy thử từ khác, như «rừng» hoặc «đêm».
- tr: Eşleşen tema yok. «orman» ya da «gece» gibi başka bir kelime deneyin.
- id: Tidak ada tema yang cocok. Coba kata lain, misalnya «hutan» atau «malam».
- ar: لا توجد سمة مطابقة. جرّب كلمة أخرى، مثل «غابة» أو «ليل».
- ko: 일치하는 테마가 없습니다. '숲'이나 '밤' 같은 다른 단어로 검색해 보세요.

`themes.recentEmpty`

- en: Themes you choose will appear here.
- ru: Здесь появятся темы, которые вы выбирали.
- uk: Тут з'являться теми, які ви обирали.
- ro: Aici vor apărea temele pe care le alegi.
- de: Hier erscheinen die Themen, die du auswählst.
- es: Aquí aparecerán los temas que elijas.
- fr: Les thèmes que vous choisissez apparaîtront ici.
- pt: Os temas que você escolher aparecerão aqui.
- ja: 選んだテーマがここに表示されます。
- zh: 你选择过的主题会显示在这里。
- th: ธีมที่คุณเลือกจะแสดงที่นี่
- vi: Các chủ đề bạn chọn sẽ hiện ở đây.
- tr: Seçtiğiniz temalar burada görünür.
- id: Tema yang Anda pilih akan muncul di sini.
- ar: ستظهر هنا السمات التي تختارها.
- ko: 선택한 테마가 여기에 표시됩니다.

`themes.deleteFrom` (the trash button's tooltip and label)

- en: Delete from Recent
- ru: Удалить из недавних
- uk: Видалити з нещодавніх
- ro: Șterge din recente
- de: Aus „Zuletzt verwendet“ löschen
- es: Eliminar de recientes
- fr: Supprimer des récents
- pt: Excluir dos recentes
- ja: 最近使ったものから削除
- zh: 从最近使用中删除
- th: ลบออกจากล่าสุด
- vi: Xoá khỏi mục gần đây
- tr: Son kullanılanlardan sil
- id: Hapus dari terbaru
- ar: حذف من الأخيرة
- ko: 최근 사용에서 삭제

`themes.deleteTitle`

- en: Delete from Recent?
- ru: Удалить из недавних?
- uk: Видалити з нещодавніх?
- ro: Ștergi din recente?
- de: Aus „Zuletzt verwendet“ löschen?
- es: ¿Eliminar de recientes?
- fr: Supprimer des récents ?
- pt: Excluir dos recentes?
- ja: 最近使ったものから削除しますか？
- zh: 从最近使用中删除？
- th: ลบออกจากล่าสุดไหม
- vi: Xoá khỏi mục gần đây?
- tr: Son kullanılanlardan silinsin mi?
- id: Hapus dari terbaru?
- ar: حذف من الأخيرة؟
- ko: 최근 사용에서 삭제할까요?

`themes.deleteBody`

- en: {name} will no longer be listed under Recent. It stays in the catalog, and you can choose it again at any time.
- ru: «{name}» больше не будет в недавних. Тема останется в каталоге, и её можно выбрать снова в любой момент.
- uk: «{name}» більше не буде в нещодавніх. Тема залишиться в каталозі, і її можна вибрати знову будь-коли.
- ro: „{name}” nu va mai apărea în recente. Rămâne în catalog și o poți alege din nou oricând.
- de: „{name}“ steht dann nicht mehr unter „Zuletzt verwendet“. Das Thema bleibt im Katalog und lässt sich jederzeit wieder auswählen.
- es: «{name}» dejará de aparecer en recientes. Seguirá en el catálogo y podrás elegirlo de nuevo cuando quieras.
- fr: « {name} » n'apparaîtra plus dans les récents. Le thème reste dans le catalogue, et vous pouvez le choisir à nouveau à tout moment.
- pt: «{name}» deixará de aparecer nos recentes. O tema continua no catálogo, e você pode escolhê-lo de novo a qualquer momento.
- ja: 「{name}」は最近使ったものに表示されなくなります。テーマはカタログに残り、いつでもまた選べます。
- zh: 「{name}」将不再显示在最近使用中。它仍在主题目录里，随时可以再次选择。
- th: «{name}» จะไม่แสดงในล่าสุดอีก ธีมนี้ยังอยู่ในแคตตาล็อก และเลือกใหม่ได้ทุกเมื่อ
- vi: «{name}» sẽ không còn hiện trong mục gần đây. Chủ đề vẫn có trong danh mục, và bạn có thể chọn lại bất cứ lúc nào.
- tr: «{name}» artık son kullanılanlarda görünmeyecek. Tema katalogda kalır ve istediğiniz zaman yeniden seçebilirsiniz.
- id: «{name}» tidak akan muncul lagi di terbaru. Tema ini tetap ada di katalog dan bisa dipilih lagi kapan saja.
- ar: لن تظهر «{name}» في الأخيرة بعد الآن. ستبقى في القائمة، ويمكنك اختيارها مجددًا في أي وقت.
- ko: '{name}' 테마가 최근 사용에서 사라집니다. 카탈로그에는 그대로 있으니 언제든 다시 선택할 수 있습니다.

`themes.delete`

- en: Delete
- ru: Удалить
- uk: Видалити
- ro: Șterge
- de: Löschen
- es: Eliminar
- fr: Supprimer
- pt: Excluir
- ja: 削除
- zh: 删除
- th: ลบ
- vi: Xoá
- tr: Sil
- id: Hapus
- ar: حذف
- ko: 삭제

`themes.cancel`

- en: Cancel
- ru: Отмена
- uk: Скасувати
- ro: Anulează
- de: Abbrechen
- es: Cancelar
- fr: Annuler
- pt: Cancelar
- ja: キャンセル
- zh: 取消
- th: ยกเลิก
- vi: Huỷ
- tr: İptal
- id: Batal
- ar: إلغاء
- ko: 취소

`themes.offline`

- en: Themes could not be loaded. Check your connection and try again.
- ru: Не удалось загрузить темы. Проверьте подключение и попробуйте снова.
- uk: Не вдалося завантажити теми. Перевірте з'єднання і спробуйте знову.
- ro: Temele nu s-au putut încărca. Verifică conexiunea și încearcă din nou.
- de: Die Themen konnten nicht geladen werden. Prüfe die Verbindung und versuch es noch einmal.
- es: No se pudieron cargar los temas. Revisa la conexión e inténtalo de nuevo.
- fr: Impossible de charger les thèmes. Vérifiez la connexion et réessayez.
- pt: Não foi possível carregar os temas. Verifique a conexão e tente de novo.
- ja: テーマを読み込めませんでした。接続を確認してもう一度お試しください。
- zh: 无法加载主题。请检查网络后重试。
- th: โหลดธีมไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง
- vi: Không tải được chủ đề. Hãy kiểm tra kết nối rồi thử lại.
- tr: Temalar yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.
- id: Tema tidak dapat dimuat. Periksa koneksi Anda dan coba lagi.
- ar: تعذّر تحميل السمات. تحقّق من الاتصال ثم حاول مجددًا.
- ko: 테마를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.

`themes.retry`

- en: Try again
- ru: Попробовать снова
- uk: Спробувати знову
- ro: Încearcă din nou
- de: Noch einmal versuchen
- es: Reintentar
- fr: Réessayer
- pt: Tentar de novo
- ja: もう一度試す
- zh: 重试
- th: ลองอีกครั้ง
- vi: Thử lại
- tr: Tekrar dene
- id: Coba lagi
- ar: حاول مجددًا
- ko: 다시 시도

`help.button`

- en: Left-click the translate button in the chat bar to choose the languages. Right-click it to switch the current chat on or off.
- ru: Левый клик по кнопке переводчика в строке чата открывает выбор языков. Правый клик включает или выключает перевод в текущем чате.
- uk: Лівий клік на кнопці перекладача в рядку чату відкриває вибір мов. Правий клік вмикає або вимикає переклад у поточному чаті.
- ro: Clic stânga pe butonul de traducere din bara de chat deschide alegerea limbilor. Clic dreapta pornește sau oprește traducerea în conversația curentă.
- de: Ein Linksklick auf die Übersetzen-Schaltfläche in der Chatleiste öffnet die Sprachauswahl. Ein Rechtsklick schaltet den aktuellen Chat ein oder aus.
- es: Un clic izquierdo en el botón de traducción de la barra del chat abre la elección de idiomas. Un clic derecho activa o desactiva la conversación actual.
- fr: Un clic gauche sur le bouton de traduction de la barre de discussion ouvre le choix des langues. Un clic droit active ou désactive la conversation en cours.
- pt: Um clique esquerdo no botão de tradução da barra do chat abre a escolha de idiomas. Um clique direito liga ou desliga a conversa atual.
- ja: チャット欄の翻訳ボタンを左クリックすると言語を選べます。右クリックで現在のチャットのオン・オフを切り替えます。
- zh: 左键点击输入框旁的翻译按钮可以选择语言，右键开关当前聊天。
- th: คลิกซ้ายที่ปุ่มแปลข้างช่องพิมพ์เพื่อเลือกภาษา คลิกขวาเพื่อเปิดหรือปิดแชทนี้
- vi: Nhấp chuột trái vào nút dịch để chọn ngôn ngữ. Nhấp chuột phải để bật hoặc tắt cho cuộc trò chuyện hiện tại.
- tr: Yazı alanındaki çeviri düğmesine sol tıklayınca diller seçilir. Sağ tıklayınca o sohbet açılır veya kapanır.
- id: Klik kiri tombol terjemah di bilah obrolan untuk memilih bahasa. Klik kanan untuk menyalakan atau mematikannya di obrolan saat ini.
- ar: انقر بالزر الأيسر على زر الترجمة في شريط المحادثة لاختيار اللغات، وبالزر الأيمن لتشغيلها أو إيقافها في المحادثة الحالية.
- ko: 채팅 입력줄의 번역 버튼을 왼쪽 클릭하면 언어를 고를 수 있고, 오른쪽 클릭하면 현재 채팅에서 켜고 끌 수 있습니다.

`help.menu` ({translate} and {explain} are filled from `message.translate` and `message.explain`, so the names always match the menu)

- en: The right-click menu of any message has {translate}, and also {explain} when it is switched on.
- ru: В меню по правому клику на любом сообщении есть «{translate}», а когда это включено, ещё и «{explain}».
- uk: У меню за правим кліком на будь-якому повідомленні є «{translate}», а коли це ввімкнено, ще й «{explain}».
- ro: Meniul de clic dreapta al oricărui mesaj are „{translate}”, iar când este pornit, și „{explain}”.
- de: Das Rechtsklick-Menü jeder Nachricht enthält „{translate}“ und, wenn eingeschaltet, auch „{explain}“.
- es: El menú del clic derecho de cualquier mensaje tiene «{translate}» y, si está activado, también «{explain}».
- fr: Le menu du clic droit de chaque message propose « {translate} », et aussi « {explain} » quand il est activé.
- pt: O menu do botão direito de qualquer mensagem tem «{translate}» e, quando ativado, também «{explain}».
- ja: どのメッセージでも右クリックメニューに「{translate}」があり、オンにしていれば「{explain}」もあります。
- zh: 任意消息的右键菜单里都有「{translate}」，开启后还有「{explain}」。
- th: เมนูคลิกขวาของทุกข้อความมี «{translate}» และมี «{explain}» ด้วยเมื่อเปิดใช้งาน
- vi: Menu chuột phải của mọi tin nhắn có «{translate}», và cả «{explain}» khi đã bật.
- tr: Her mesajın sağ tık menüsünde «{translate}» bulunur, açıksa «{explain}» da bulunur.
- id: Menu klik kanan setiap pesan berisi “{translate}”, dan juga “{explain}” bila dinyalakan.
- ar: تحتوي قائمة النقر بالزر الأيمن لأي رسالة على «{translate}»، وكذلك «{explain}» عند تفعيله.
- ko: 모든 메시지의 오른쪽 클릭 메뉴에서 {translate}를 쓸 수 있고, 켜 두면 {explain}도 쓸 수 있습니다.

`help.keepTitle`

- en: Keeping text as typed
- ru: Как оставить текст без перевода
- uk: Як залишити текст без перекладу
- ro: Cum păstrezi textul așa cum l-ai scris
- de: Text unverändert lassen
- es: Dejar texto sin traducir
- fr: Garder un texte tel quel
- pt: Manter o texto como foi escrito
- ja: 翻訳せずに残すには
- zh: 保留原文不翻译
- th: เก็บข้อความไว้ตามที่พิมพ์
- vi: Giữ nguyên văn bản như đã gõ
- tr: Metni yazıldığı gibi bırakmak
- id: Membiarkan teks seperti diketik
- ar: إبقاء النص كما كُتب
- ko: 입력한 그대로 두기

### Theme names (in `themes/catalog.json`)

| id | en | ru | uk | ro | de | es | fr | pt |
|---|---|---|---|---|---|---|---|---|
| forest | Drawn forest | Нарисованный лес | Намальований ліс | Pădure desenată | Gezeichneter Wald | Bosque dibujado | Forêt dessinée | Floresta desenhada |
| dunes | Dunes | Дюны | Дюни | Dune | Dünen | Dunas | Dunes | Dunas |
| waves | Paper waves | Бумажные волны | Паперові хвилі | Valuri de hârtie | Papierwellen | Olas de papel | Vagues de papier | Ondas de papel |
| pebbles | Pebbles | Галька | Галька | Pietricele | Kieselsteine | Guijarros | Galets | Seixos |
| hills | Soft hills | Мягкие холмы | М'які пагорби | Dealuri line | Sanfte Hügel | Colinas suaves | Collines douces | Colinas suaves |
| mountains | Mountain mist | Горный туман | Гірський туман | Ceață pe munte | Bergnebel | Niebla en la montaña | Brume des montagnes | Névoa da montanha |
| reeds | Lake reeds | Камыши у озера | Очерет біля озера | Stuf pe lac | Schilf am See | Juncos del lago | Roseaux du lac | Juncos do lago |
| aurora | Aurora | Северное сияние | Північне сяйво | Aurora boreală | Polarlicht | Aurora boreal | Aurore boréale | Aurora boreal |
| night | Starry night | Звёздная ночь | Зоряна ніч | Noapte înstelată | Sternennacht | Noche estrellada | Nuit étoilée | Noite estrelada |
| clouds | Clouds | Облака | Хмари | Nori | Wolken | Nubes | Nuages | Nuvens |
| autumn | Autumn leaves | Осенние листья | Осіннє листя | Frunze de toamnă | Herbstlaub | Hojas de otoño | Feuilles d'automne | Folhas de outono |
| snow | First snow | Первый снег | Перший сніг | Prima zăpadă | Erster Schnee | Primera nieve | Première neige | Primeira neve |
| blossom | Spring blossom | Весеннее цветение | Весняне цвітіння | Flori de primăvară | Frühlingsblüte | Flores de primavera | Floraison printanière | Flores da primavera |
| terrazzo | Terrazzo | Терраццо | Тераццо | Terrazzo | Terrazzo | Terrazo | Terrazzo | Granilite |
| linen | Linen | Лён | Льон | In | Leinen | Lino | Lin | Linho |
| wine (hidden) | Wine evening | Винный вечер | Винний вечір | Seară cu vin | Weinabend | Tarde de vino | Soirée vin | Noite de vinho |

| id | ja | zh | th | vi | tr | id | ar | ko |
|---|---|---|---|---|---|---|---|---|
| forest | 描かれた森 | 手绘森林 | ป่าวาดมือ | Khu rừng vẽ tay | Çizilmiş orman | Hutan lukisan | غابة مرسومة | 그림 속 숲 |
| dunes | 砂丘 | 沙丘 | เนินทราย | Đồi cát | Kum tepeleri | Bukit pasir | كثبان | 모래 언덕 |
| waves | 紙の波 | 纸浪 | คลื่นกระดาษ | Sóng giấy | Kâğıt dalgalar | Ombak kertas | أمواج ورقية | 종이 파도 |
| pebbles | 小石 | 鹅卵石 | ก้อนกรวด | Sỏi | Çakıl taşları | Kerikil | حصى | 조약돌 |
| hills | なだらかな丘 | 柔和山丘 | เนินเขานุ่มนวล | Đồi thoai thoải | Yumuşak tepeler | Bukit landai | تلال ناعمة | 완만한 언덕 |
| mountains | 山の霧 | 山间薄雾 | หมอกภูเขา | Sương núi | Dağ sisi | Kabut gunung | ضباب الجبال | 산 안개 |
| reeds | 湖のアシ | 湖畔芦苇 | ต้นกกริมทะเลสาบ | Lau sậy bên hồ | Göl sazlığı | Ilalang danau | قصب البحيرة | 호숫가 갈대 |
| aurora | オーロラ | 极光 | แสงเหนือ | Cực quang | Kuzey ışıkları | Aurora | الشفق القطبي | 오로라 |
| night | 星降る夜 | 星夜 | คืนดาวพราว | Đêm đầy sao | Yıldızlı gece | Malam berbintang | ليلة مرصّعة بالنجوم | 별이 빛나는 밤 |
| clouds | 雲 | 云朵 | ก้อนเมฆ | Mây | Bulutlar | Awan | غيوم | 구름 |
| autumn | 秋の葉 | 秋叶 | ใบไม้ร่วง | Lá mùa thu | Sonbahar yaprakları | Daun musim gugur | أوراق الخريف | 가을 낙엽 |
| snow | 初雪 | 初雪 | หิมะแรก | Tuyết đầu mùa | İlk kar | Salju pertama | الثلج الأول | 첫눈 |
| blossom | 春の花 | 春日繁花 | ดอกไม้ผลิ | Hoa xuân | Bahar çiçekleri | Bunga musim semi | أزهار الربيع | 봄꽃 |
| terrazzo | テラゾー | 水磨石 | หินขัด | Đá mài | Terrazzo | Terazo | تيرازو | 테라조 |
| linen | リネン | 亚麻 | ผ้าลินิน | Vải lanh | Keten | Linen | كتان | 리넨 |
| wine (hidden) | ワインの夜 | 葡萄酒之夜 | ค่ำคืนกับไวน์ | Buổi tối với rượu vang | Şarap akşamı | Malam anggur | أمسية النبيذ | 와인 한잔의 저녁 |

## README

All 16 READMEs gain one line in their list of features, the same in each:
themes for the plugin's windows, chosen from a catalog. Nothing about what a
theme leaves untouched. The line in each language uses the strings above, so
it is reviewed with them.

## Implementation, in order

1. **Core and the catalog** (this repository): `core/themes.ts` (reading,
   caching and refreshing the index through the host's `Net` and
   `themeStore`, search, Recent), the host member, the strings in all 16
   languages, `themes/` with the fifteen drawings moved from the prototype,
   `themes/build.mjs`, `test/themes.mjs` in `checks.yml`, and the robot
   publishing `themes/`. Nothing visible yet.
2. **Discord**: `ui/SettingsPage.tsx` and `settings.ts`, `ui/Themes.tsx`, the
   theme layers and the circle (`ui/themeLayers.ts`), `ui/direction.ts` and
   every window moved onto it, the wider Support window, the palette button,
   the README line.
3. **Telegram** (after the submodule pin moves past step 1): the same
   settings structure in `src/settings.ts`, the Themes window in the shadow
   root with `src/sheet.ts`'s windows, layers on `.panel`, the store through
   the userscript manager, the README line.
