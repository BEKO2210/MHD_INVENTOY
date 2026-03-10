# CLAUDE.md — MHD-Inventar Projektkontext

## Projekt

MHD-Inventar — Professionelle Offline-first PWA zur B2B-Bestandsverwaltung mit Fokus auf Mindesthaltbarkeitsdaten.
"Fristen im Griff. Bestände im Blick."
React 18 + TypeScript, Vite 6, Tailwind CSS 3, Zustand, Dexie.js (IndexedDB).
Sprachen: Deutsch (de), Englisch (en), Portugiesisch (pt), Arabisch (ar). Lizenz: Apache 2.0. Version: 2.0.0.

## Befehle

```
npm run dev          # Dev-Server (localhost:5173)
npm run build        # Production Build (tsc + vite)
npm run test         # Vitest (113 Tests, src/lib/utils.test.ts)
npm run preview      # Build lokal testen
npx tsc --noEmit     # Type-Check ohne Build
```

## Architektur

Routing über Zustand Store (`useAppStore.currentPage`), NICHT React Router.
Pages: `dashboard | products | add | scanner | settings | stats`

```
src/
├── App.tsx                    # Router: rendert Page basierend auf currentPage
├── main.tsx                   # Entry, seedDefaults(), SW-Handler
├── sw-handler.ts              # Service Worker Update-Benachrichtigung
├── types/index.ts             # Alle Interfaces, Types, Konstanten
├── store/useAppStore.ts       # Zustand: Navigation, Filter, Editing, Scan
├── lib/
│   ├── db.ts                  # Dexie DB, CRUD, Export/Import, seedDefaults
│   ├── utils.ts               # MHD-Logik, Formatierung, compressImage, lookupBarcode
│   ├── utils.test.ts          # Unit Tests
│   └── notifications.ts       # Lokale Push-Benachrichtigungen
├── hooks/
│   ├── useDarkMode.ts         # Dark/Light Toggle (localStorage)
│   ├── useOnlineStatus.ts     # Online/Offline Detection
│   └── usePWAInstall.ts       # PWA Install Prompt + iOS Detection
└── components/
    ├── Dashboard.tsx           # StatRings, MHD-Balken, dringende Produkte
    ├── ProductList.tsx         # Liste mit Suche/Filter, Archiv, CRUD
    ├── ProductForm.tsx         # Add/Edit mit Draft-Persist (sessionStorage)
    ├── BarcodeScanner.tsx      # ZXing Scanner, Duplikat-Check (offline, keine API)
    ├── Statistics.tsx          # Verbrauchsstatistiken
    ├── Settings.tsx            # Theme, Notifications, Lagerorte, Kategorien, Export/Import
    ├── Navigation.tsx          # Bottom Nav (6 Items)
    ├── StatRing.tsx            # SVG Kreisdiagramm
    ├── OfflineBanner.tsx       # Offline-Indikator (Framer Motion)
    ├── PWAInstallPrompt.tsx    # Install-Hinweis
    └── ImageCaptureModal.tsx   # Kamera-Modal (aktuell nicht verwendet)
```

## Datenbank (Dexie.js / IndexedDB)

DB-Name: `MhdInventarDB`, aktuell Version 3.

```
products:               ++id, name, barcode, category, storageLocation, expiryDate, archived, createdAt
storageLocations:       ++id, name
consumptionLogs:        ++id, productId, consumedAt
notificationSchedules:  ++id, productId, notifyAt, sent, [productId+daysBefore]
customCategories:       ++id, name
```

Product-Felder: `id?, name, barcode?, category, storageLocation, quantity, unit, expiryDate, expiryPrecision, photo?, minStock?, notes?, archived, createdAt, updatedAt`
CustomCategory-Felder: `id?, name, defaultUnit, consumptionStep, createdAt`

`category` ist `string` (nicht mehr enum) — unterstützt 15 Built-in-Kategorien + benutzerdefinierte.
15 Built-in-Kategorien: lebensmittel, getranke, medizin, kosmetik, chemie, automotive, batterien, elektronik, reinigung, schmierstoffe, feuerschutz, erste_hilfe, arbeitsschutz, baustoffe, sonstiges
16 Einheiten: Stück, Liter, kg, g, ml, Packung, Dose, Flasche, Karton, Palette, Kanister, Tube, Satz, Paar, Rolle, Meter
10 Standard-Lagerorte: Lager, Kühlraum, Gefahrstofflager, Werkstatt, Büro, Außenlager, Regal A, Regal B, Hochregallager, Versand

## ISO/DIN Normhinweise

`CATEGORY_ISO_NORMS` ordnet jeder Kategorie relevante ISO/DIN-Normen zu und zeigt diese als Warnhinweise im Produktformular an (z. B. Gefahrstofflagerung nach TRGS, Medizinprodukte nach DIN EN ISO 13485). Dies unterstützt die normkonforme Bestandsführung im professionellen Umfeld.

## State Management

`useAppStore` (Zustand):
- `currentPage` / `setPage(page)` — Navigation
- `filters` / `setFilter(key, value)` — Produktliste-Filter
- `editingProductId` / `setEditingProductId(id)` — Bearbeitung (setzt Page auf 'add')
- `scannedData` / `navigateToAddWithScan(data)` — Scanner → Formular
- `notificationsEnabled` / `setNotificationsEnabled(enabled)` — localStorage-persistent

localStorage-Prefix: `mhd-inventar-` (z. B. `mhd-inventar-darkMode`, `mhd-inventar-notifications`).

Beim App-Start: `getInitialPage()` prüft sessionStorage auf Form-Draft (Kamera-Reload-Fix).

## Wichtige Patterns

- **Form-Draft-Persist**: ProductForm speichert State in sessionStorage bevor Kamera öffnet (Mobile-PWA wird aus RAM entladen). Store startet auf 'add' wenn Draft existiert.
- **Kamera-Button**: Aktuell per `className="hidden"` deaktiviert, Code bleibt erhalten.
- **Version**: Wird aus `package.json` importiert (`import { version } from '../../package.json'`), erscheint in Settings + JSON-Export.
- **Export**: JSON ohne Fotos (Platzhalter `[FOTO]`), inkl. customCategories. CSV mit BOM für Umlaute.
- **Import**: Duplikat-Erkennung (Name + MHD + Lagerort). `ImportResult` Klasse für Teil-Erfolg. Importiert auch customCategories.
- **BarcodeScanner**: Lazy-loaded (`React.lazy`). Nutzt `@zxing/browser`, sucht Rückkamera. Duplikat-Check in DB mit FIFO-Hinweis. Keine externe API — arbeitet vollständig offline.
- **Eigene Kategorien**: Über Settings verwaltbar (Add/Edit/Delete). `getCategoryLabel()` Helper für einheitliche Anzeige (built-in → CATEGORY_LABELS, custom → name direkt).
- **Lagerorte umbenennen**: `renameStorageLocation()` aktualisiert Ort + alle referenzierenden Produkte in einer Transaktion.
- **Notifications**: Lokal via `Notification` API. Checker läuft alle 6h. 30/14/7/3/1 Tage vor MHD.
- **Dark Mode**: CSS-Klasse auf `<html>`, localStorage-persistent, Default: dark.

## Build & Deploy

- Vite base: `./` lokal, `/MHD_INVENTOY/` für GitHub Pages (`GITHUB_PAGES` env var)
- PWA: `vite-plugin-pwa` mit autoUpdate, Workbox für Font Caching (keine externe API mehr)
- CI/CD: `.github/workflows/deploy.yml` — Push auf main → Build + Test + Deploy auf GitHub Pages
- Tailwind: Custom primary/olive/khaki Palette, Fonts: Inter, Bebas Neue, JetBrains Mono

## Stilregeln

- Alle UI-Texte auf Deutsch mit korrekten Umlauten (ä, ö, ü, ß)
- Tailwind-Klassen, keine separaten CSS-Dateien (außer globals in index.css)
- Lucide React Icons, keine anderen Icon-Libraries
- `noUnusedLocals: true` in tsconfig — unbenutzte Imports/Variablen = Build-Fehler
- Semikolon-frei bei Tailwind-Klassen, Standard TypeScript-Formatting

## Code-Review Änderungsprotokoll (Runde 2)

Vollständiger Code-Review aller Quelldateien. Folgende Fehler wurden gefunden und behoben:

### Behobene Fehler

| # | Datei | Problem | Fix | Warum |
|---|-------|---------|-----|-------|
| 1 | `db.ts:336` | Import-Fallback `'Keller'` — kein gültiger Standard-Lagerort | Geändert zu `'Lager'` | `'Keller'` existiert nicht in `DEFAULT_LOCATIONS`, importierte Produkte ohne Lagerort hätten einen nicht-existenten Ort bekommen |
| 2 | `db.ts` exportData | `customCategories` wurden nicht exportiert | `db.customCategories.toArray()` zum Export hinzugefügt | Backup wäre unvollständig — benutzerdefinierte Kategorien gehen bei Restore verloren |
| 3 | `db.ts` importData | `customCategories` wurden nicht importiert | Import-Logik für customCategories mit Duplikat-Check hinzugefügt, `db.customCategories` zur Transaktion hinzugefügt | Importierte Backups mit Custom-Kategorien würden diese ignorieren |
| 4 | `vite.config.ts` | Veraltete Workbox runtimeCaching-Regeln für `openfoodfacts.org` API + Images | Entfernt, nur noch Font-Caching | Scanner nutzt keine API mehr — totes Caching-Setup, bläht SW auf |
| 5 | `BarcodeScanner.tsx:50` | Variable-Shadowing: `(t) => t.stop()` shadowed `useTranslation()` `t` | Umbenannt zu `(track) => track.stop()` | Verwirrend und potenziell fehleranfällig bei Code-Änderungen |
| 6 | `notifications.ts:113` | Checker-Intervall 1h statt dokumentierter 6h | Geändert zu `1000 * 60 * 60 * 6` | Unnötig häufige Prüfungen, CLAUDE.md sagte 6h, Code war 1h |
| 7 | `ProductForm.tsx:192` | `minStock: parseFloat('0') \|\| undefined` → `0` wird zu `undefined` | Explizite Prüfung: `form.minStock !== '' && !isNaN(...)` | User gibt `0` ein als "kein Minimum" — wurde fälschlicherweise zu `undefined` |
| 8 | `Settings.tsx` | O(n×m) Produktzählung: `allProducts.filter()` in `.map()` für jede der 15+ Kategorien + Lagerorte | `useMemo` mit vorberechneten `categoryCounts` + `locationCounts` Maps | Bei 1000 Produkten und 25 Kategorien: 25.000 statt 1.000 Iterationen |

### Bestätigt fehlerfrei (kein Fix nötig)

- **Translation Keys**: Alle 4 Sprachen (de, en, pt, ar) haben identische Key-Sets — vollständig synchron
- **TypeScript**: `noUnusedLocals: true`, `strict: true` — kompiliert fehlerfrei
- **Dexie Schema**: Version 1→2→3 Migration korrekt, alle Indizes konsistent
- **Zustand Store**: getInitialPage() Form-Draft-Restore korrekt mit 10-Min-Timeout
- **StatRing.tsx**: SVG-Math korrekt, progress-Clamping vorhanden
- **ErrorBoundary**: getDerivedStateFromError + componentDidCatch korrekt implementiert
- **usePWAInstall**: BeforeInstallPromptEvent, iOS-Detection, globalDeferredPrompt korrekt
- **useDarkMode**: localStorage-persist + CSS-Klasse auf `<html>` korrekt
- **useOnlineStatus**: Event-Listener mit Cleanup korrekt
- **i18n.ts**: RTL-Support für Arabisch, LanguageDetector-Config korrekt
- **CSV-Export**: BOM für Excel, CSV-Injection-Schutz (escCsv), Semikolon-Trenner korrekt
- **Import**: Feld-Validierung, Duplikat-Erkennung, Photo-Placeholder-Handling korrekt
- **Navigation**: aria-label, aria-current für Accessibility vorhanden

### Teststatus

113 Tests bestanden (59 bestehend + 54 neue aus Runde 1):
- Types & Constants (BUILTIN_CATEGORIES, CATEGORY_LABELS, ICONS, ISO_NORMS, UNITS, LOCATIONS)
- getCategoryLabel (built-in + custom + leer)
- getLocale (alle 4 Sprachen + Fallback)
- Status-Funktionen (Color, BadgeColor, Label — Vollständigkeit + Distinktheit)
- computeStats (Stresstests: 1000 Produkte, alle archiviert, custom Kategorien, low stock edge cases)
- formatDaysUntil / formatDuration (Randfälle: -730, -60, 0.5, 395, 730)
- lookupBarcode (Whitespace, 13/14/15-stellig, Sonderzeichen)
- getExpiryStatus ↔ getDaysUntilExpiry Konsistenz
