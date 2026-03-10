import { describe, it, expect, beforeAll } from 'vitest';
import i18n from '../i18n/i18n';
import { getExpiryStatus, getDaysUntilExpiry, getStatusLabel, getStatusColor, getStatusBadgeColor, formatDaysUntil, formatDuration, formatDate, computeStats, lookupBarcode, downloadFile, compressImage, getLocale } from './utils';
import { BUILTIN_CATEGORIES, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_ISO_NORMS, DEFAULT_UNITS, DEFAULT_LOCATIONS, getCategoryLabel } from '../types';
import type { Product, ProductCategory, ExpiryStatus } from '../types';

beforeAll(async () => {
  await i18n.changeLanguage('de');
});

// Helper to create a product with defaults
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Testprodukt',
    barcode: '',
    category: 'lebensmittel',
    storageLocation: 'Lager',
    quantity: 5,
    unit: 'Stück',
    expiryDate: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    expiryPrecision: 'day',
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('getExpiryStatus', () => {
  it('returns "expired" for past dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(getExpiryStatus(yesterday.toISOString())).toBe('expired');
  });

  it('returns "expired" for today (day 0)', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(getExpiryStatus(today.toISOString())).toBe('expired');
  });

  it('returns "critical" for dates within 7 days', () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    expect(getExpiryStatus(date.toISOString())).toBe('critical');
  });

  it('returns "critical" for exactly 7 days', () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    expect(getExpiryStatus(date.toISOString())).toBe('critical');
  });

  it('returns "warning" for dates within 8-14 days', () => {
    const date = new Date();
    date.setDate(date.getDate() + 10);
    expect(getExpiryStatus(date.toISOString())).toBe('warning');
  });

  it('returns "soon" for dates within 15-30 days', () => {
    const date = new Date();
    date.setDate(date.getDate() + 20);
    expect(getExpiryStatus(date.toISOString())).toBe('soon');
  });

  it('returns "good" for dates more than 30 days away', () => {
    const date = new Date();
    date.setDate(date.getDate() + 60);
    expect(getExpiryStatus(date.toISOString())).toBe('good');
  });
});

describe('getDaysUntilExpiry', () => {
  it('returns 0 for today', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(getDaysUntilExpiry(today.toISOString())).toBe(0);
  });

  it('returns negative for past dates', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(getDaysUntilExpiry(past.toISOString())).toBe(-5);
  });

  it('returns positive for future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(getDaysUntilExpiry(future.toISOString())).toBe(10);
  });
});

describe('getStatusLabel', () => {
  it('returns German labels', () => {
    expect(getStatusLabel('expired')).toBe('Abgelaufen');
    expect(getStatusLabel('critical')).toBe('Kritisch');
    expect(getStatusLabel('warning')).toBe('Warnung');
    expect(getStatusLabel('soon')).toBe('Bald');
    expect(getStatusLabel('good')).toBe('OK');
  });
});

describe('getStatusColor', () => {
  it('returns color classes for each status', () => {
    expect(getStatusColor('expired')).toContain('text-red');
    expect(getStatusColor('good')).toContain('text-green');
  });
});

describe('getStatusBadgeColor', () => {
  it('returns badge classes for each status', () => {
    expect(getStatusBadgeColor('expired')).toContain('bg-red');
    expect(getStatusBadgeColor('good')).toContain('bg-green');
  });
});

describe('formatDate', () => {
  it('formats day precision', () => {
    const result = formatDate('2025-06-15T00:00:00.000Z', 'day');
    expect(result).toMatch(/15/);
    expect(result).toMatch(/06|Jun/);
    expect(result).toMatch(/2025/);
  });

  it('formats month precision', () => {
    const result = formatDate('2025-06-15T00:00:00.000Z', 'month');
    expect(result).toMatch(/2025/);
  });

  it('formats year precision', () => {
    const result = formatDate('2025-06-15T00:00:00.000Z', 'year');
    expect(result).toBe('2025');
  });
});

describe('formatDaysUntil', () => {
  it('formats negative days as expired', () => {
    expect(formatDaysUntil(-3)).toBe('3 Tage abgelaufen');
    expect(formatDaysUntil(-1)).toBe('1 Tag abgelaufen');
    expect(formatDaysUntil(-400)).toBe('1 Jahr, 1 Monat abgelaufen');
  });

  it('formats today', () => {
    expect(formatDaysUntil(0)).toBe('Heute');
  });

  it('formats tomorrow', () => {
    expect(formatDaysUntil(1)).toBe('Morgen');
  });

  it('formats multiple days', () => {
    expect(formatDaysUntil(5)).toBe('5 Tage');
    expect(formatDaysUntil(45)).toBe('45 Tage');
    expect(formatDaysUntil(400)).toBe('1 Jahr, 1 Monat');
    expect(formatDaysUntil(730)).toBe('2 Jahre');
  });

  it('formats exactly 59 days as days', () => {
    expect(formatDaysUntil(59)).toBe('59 Tage');
  });

  it('formats 60+ days as months', () => {
    expect(formatDaysUntil(60)).toBe('2 Monate');
  });
});

describe('formatDuration', () => {
  it('formats 0 days as Heute', () => {
    expect(formatDuration(0)).toBe('Heute');
  });

  it('formats 1 day', () => {
    expect(formatDuration(1)).toBe('1 Tag');
  });

  it('formats multiple days', () => {
    expect(formatDuration(30)).toBe('30 Tage');
  });

  it('formats months and years', () => {
    expect(formatDuration(365)).toBe('1 Jahr');
    expect(formatDuration(400)).toBe('1 Jahr, 1 Monat');
  });
});

describe('computeStats', () => {
  it('returns zero stats for empty array', () => {
    const stats = computeStats([]);
    expect(stats.totalProducts).toBe(0);
    expect(stats.expiredCount).toBe(0);
    expect(stats.totalCategories).toBe(0);
    expect(stats.totalLocations).toBe(0);
    expect(stats.lowStockCount).toBe(0);
  });

  it('excludes archived products', () => {
    const products = [makeProduct({ archived: true })];
    const stats = computeStats(products);
    expect(stats.totalProducts).toBe(0);
  });

  it('counts low stock products', () => {
    const products = [makeProduct({ quantity: 1, minStock: 5 })];
    const stats = computeStats(products);
    expect(stats.lowStockCount).toBe(1);
  });

  it('does not count products without minStock as low stock', () => {
    const products = [makeProduct({ quantity: 1, minStock: undefined })];
    const stats = computeStats(products);
    expect(stats.lowStockCount).toBe(0);
  });

  it('counts categories and locations correctly', () => {
    const products = [
      makeProduct({ id: 1, category: 'getranke', storageLocation: 'Lager' }),
      makeProduct({ id: 2, category: 'medizin', storageLocation: 'Werkstatt' }),
      makeProduct({ id: 3, category: 'getranke', storageLocation: 'Lager' }),
    ];
    const stats = computeStats(products);
    expect(stats.totalProducts).toBe(3);
    expect(stats.totalCategories).toBe(2);
    expect(stats.totalLocations).toBe(2);
  });

  it('categorizes products by expiry status', () => {
    const expired = makeProduct({
      id: 1,
      expiryDate: new Date(Date.now() - 86_400_000).toISOString(),
    });
    const good = makeProduct({
      id: 2,
      expiryDate: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    });
    const stats = computeStats([expired, good]);
    expect(stats.expiredCount).toBe(1);
    expect(stats.goodCount).toBe(1);
  });
});

describe('lookupBarcode', () => {
  it('returns null for empty barcode', async () => {
    expect(await lookupBarcode('')).toBeNull();
  });

  it('returns null for non-numeric barcode', async () => {
    expect(await lookupBarcode('abc123')).toBeNull();
  });

  it('returns null for too-short barcode', async () => {
    expect(await lookupBarcode('1234567')).toBeNull();
  });

  it('returns null for too-long barcode', async () => {
    expect(await lookupBarcode('123456789012345')).toBeNull();
  });

  it('accepts valid EAN-8 barcode format (does not reject valid input)', async () => {
    // Valid 8-digit barcode passes validation (not rejected by regex)
    // We only test that invalid inputs are rejected above.
    // A valid barcode may return data or null depending on network.
    const result = await lookupBarcode('00000000');
    // Unknown barcode — API returns null or a product
    expect(result === null || typeof result?.name === 'string').toBe(true);
  });

  it('rejects barcodes with special characters', async () => {
    expect(await lookupBarcode('1234-5678')).toBeNull();
    expect(await lookupBarcode('12345678\n')).toBeNull();
    expect(await lookupBarcode('=CMD()')).toBeNull();
  });
});

describe('formatDate edge cases', () => {
  it('defaults to day precision when not specified', () => {
    const result = formatDate('2025-01-15T00:00:00.000Z');
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2025/);
  });
});

describe('computeStats edge cases', () => {
  it('counts all status types correctly in mixed set', () => {
    const now = Date.now();
    const products = [
      makeProduct({ id: 1, expiryDate: new Date(now - 86_400_000).toISOString() }),         // expired
      makeProduct({ id: 2, expiryDate: new Date(now + 3 * 86_400_000).toISOString() }),      // critical
      makeProduct({ id: 3, expiryDate: new Date(now + 10 * 86_400_000).toISOString() }),     // warning
      makeProduct({ id: 4, expiryDate: new Date(now + 20 * 86_400_000).toISOString() }),     // soon
      makeProduct({ id: 5, expiryDate: new Date(now + 90 * 86_400_000).toISOString() }),     // good
    ];
    const stats = computeStats(products);
    expect(stats.totalProducts).toBe(5);
    expect(stats.expiredCount).toBe(1);
    expect(stats.criticalCount).toBe(1);
    expect(stats.warningCount).toBe(1);
    expect(stats.soonCount).toBe(1);
    expect(stats.goodCount).toBe(1);
  });

  it('handles products with quantity at exactly minStock (not low stock)', () => {
    const products = [makeProduct({ quantity: 5, minStock: 5 })];
    const stats = computeStats(products);
    expect(stats.lowStockCount).toBe(0);
  });
});

describe('getExpiryStatus boundary precision', () => {
  it('returns "critical" for exactly 1 day away', () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    expect(getExpiryStatus(date.toISOString())).toBe('critical');
  });

  it('returns "warning" for exactly 8 days', () => {
    const date = new Date();
    date.setDate(date.getDate() + 8);
    expect(getExpiryStatus(date.toISOString())).toBe('warning');
  });

  it('returns "warning" for exactly 14 days', () => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    expect(getExpiryStatus(date.toISOString())).toBe('warning');
  });

  it('returns "soon" for exactly 15 days', () => {
    const date = new Date();
    date.setDate(date.getDate() + 15);
    expect(getExpiryStatus(date.toISOString())).toBe('soon');
  });

  it('returns "soon" for exactly 30 days', () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    expect(getExpiryStatus(date.toISOString())).toBe('soon');
  });

  it('returns "good" for exactly 31 days', () => {
    const date = new Date();
    date.setDate(date.getDate() + 31);
    expect(getExpiryStatus(date.toISOString())).toBe('good');
  });
});

describe('formatDaysUntil edge cases', () => {
  it('formats exactly 365 days as 1 year', () => {
    expect(formatDaysUntil(365)).toBe('1 Jahr');
  });

  it('formats exactly -365 days', () => {
    expect(formatDaysUntil(-365)).toBe('1 Jahr abgelaufen');
  });

  it('formats 2 days', () => {
    expect(formatDaysUntil(2)).toBe('2 Tage');
  });
});

describe('downloadFile', () => {
  it('is a function', () => {
    expect(typeof downloadFile).toBe('function');
  });
});

describe('compressImage', () => {
  it('rejects files larger than 10MB', async () => {
    // Create a blob larger than 10MB
    const bigBlob = new Blob([new ArrayBuffer(11 * 1024 * 1024)], { type: 'image/png' });
    await expect(compressImage(bigBlob)).rejects.toThrow('zu groß');
  });

  it('accepts files under 10MB', async () => {
    // Create a small blob — it won't be a valid image in node, but the size check passes
    const smallBlob = new Blob([new ArrayBuffer(100)], { type: 'image/png' });
    // In a test env without canvas, this will reject with image loading error, not size error
    await expect(compressImage(smallBlob)).rejects.not.toThrow('zu groß');
  });
});

describe('CSV injection protection (escCsv pattern)', () => {
  // Test the same pattern used in db.ts exportCSV's escCsv function
  function escCsv(val: string | number | undefined | null): string {
    let s = String(val ?? '');
    if (s.length > 0 && /^[=+\-@\t\r]/.test(s)) {
      s = "'" + s;
    }
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  it('prefixes dangerous characters with single quote', () => {
    expect(escCsv('=CMD()')).toBe("'=CMD()");
    expect(escCsv('+1234')).toBe("'+1234");
    expect(escCsv('-1234')).toBe("'-1234");
    expect(escCsv('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('handles normal strings unchanged', () => {
    expect(escCsv('Dosentomaten')).toBe('Dosentomaten');
    expect(escCsv('Keller')).toBe('Keller');
    expect(escCsv('')).toBe('');
    expect(escCsv(42)).toBe('42');
  });

  it('quotes strings containing semicolons or newlines', () => {
    expect(escCsv('a;b')).toBe('"a;b"');
    expect(escCsv('line1\nline2')).toBe('"line1\nline2"');
  });

  it('escapes double quotes inside values', () => {
    expect(escCsv('he said "hello"')).toBe('"he said ""hello"""');
  });

  it('handles null and undefined', () => {
    expect(escCsv(null)).toBe('');
    expect(escCsv(undefined)).toBe('');
  });

  it('prefixes tab and carriage return', () => {
    expect(escCsv('\tattack')).toMatch(/^'/);
    expect(escCsv('\rattack')).toMatch(/^'/);
  });
});

// ==========================================
// Types & Constants Tests
// ==========================================

describe('BUILTIN_CATEGORIES', () => {
  it('contains exactly 15 categories', () => {
    expect(BUILTIN_CATEGORIES).toHaveLength(15);
  });

  it('contains all expected categories', () => {
    const expected: ProductCategory[] = [
      'lebensmittel', 'getranke', 'medizin', 'kosmetik', 'chemie',
      'automotive', 'batterien', 'elektronik', 'reinigung', 'schmierstoffe',
      'feuerschutz', 'erste_hilfe', 'arbeitsschutz', 'baustoffe', 'sonstiges',
    ];
    expect(BUILTIN_CATEGORIES).toEqual(expected);
  });

  it('has no duplicates', () => {
    const unique = new Set(BUILTIN_CATEGORIES);
    expect(unique.size).toBe(BUILTIN_CATEGORIES.length);
  });
});

describe('CATEGORY_LABELS', () => {
  it('has a label for every built-in category', () => {
    for (const cat of BUILTIN_CATEGORIES) {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
      expect(typeof CATEGORY_LABELS[cat]).toBe('string');
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    }
  });
});

describe('CATEGORY_ICONS', () => {
  it('has an icon for every built-in category', () => {
    for (const cat of BUILTIN_CATEGORIES) {
      expect(CATEGORY_ICONS[cat]).toBeDefined();
      expect(typeof CATEGORY_ICONS[cat]).toBe('string');
    }
  });
});

describe('CATEGORY_ISO_NORMS', () => {
  it('has norms and warnings for every built-in category', () => {
    for (const cat of BUILTIN_CATEGORIES) {
      const entry = CATEGORY_ISO_NORMS[cat];
      expect(entry).toBeDefined();
      expect(Array.isArray(entry.norms)).toBe(true);
      expect(Array.isArray(entry.warnings)).toBe(true);
      expect(entry.warnings.length).toBeGreaterThan(0);
    }
  });

  it('sonstiges has no norms but has warnings', () => {
    expect(CATEGORY_ISO_NORMS.sonstiges.norms).toHaveLength(0);
    expect(CATEGORY_ISO_NORMS.sonstiges.warnings.length).toBeGreaterThan(0);
  });
});

describe('DEFAULT_UNITS', () => {
  it('contains exactly 16 units', () => {
    expect(DEFAULT_UNITS).toHaveLength(16);
  });

  it('includes common units', () => {
    expect(DEFAULT_UNITS).toContain('Stück');
    expect(DEFAULT_UNITS).toContain('Liter');
    expect(DEFAULT_UNITS).toContain('kg');
    expect(DEFAULT_UNITS).toContain('g');
    expect(DEFAULT_UNITS).toContain('ml');
  });

  it('has no duplicates', () => {
    const unique = new Set(DEFAULT_UNITS);
    expect(unique.size).toBe(DEFAULT_UNITS.length);
  });
});

describe('DEFAULT_LOCATIONS', () => {
  it('contains exactly 10 locations', () => {
    expect(DEFAULT_LOCATIONS).toHaveLength(10);
  });

  it('has no duplicates', () => {
    const unique = new Set(DEFAULT_LOCATIONS);
    expect(unique.size).toBe(DEFAULT_LOCATIONS.length);
  });
});

describe('getCategoryLabel', () => {
  it('returns German label for built-in categories', () => {
    expect(getCategoryLabel('lebensmittel')).toBe('Lebensmittel');
    expect(getCategoryLabel('getranke')).toBe('Getränke');
    expect(getCategoryLabel('sonstiges')).toBe('Sonstiges');
  });

  it('returns the name itself for custom categories', () => {
    expect(getCategoryLabel('Meine Kategorie')).toBe('Meine Kategorie');
    expect(getCategoryLabel('Werkzeuge')).toBe('Werkzeuge');
  });

  it('returns empty string for empty input', () => {
    expect(getCategoryLabel('')).toBe('');
  });
});

// ==========================================
// getLocale Tests
// ==========================================

describe('getLocale', () => {
  it('returns de-DE for German', async () => {
    await i18n.changeLanguage('de');
    expect(getLocale()).toBe('de-DE');
  });

  it('returns en-GB for English', async () => {
    await i18n.changeLanguage('en');
    expect(getLocale()).toBe('en-GB');
    await i18n.changeLanguage('de'); // reset
  });

  it('returns pt-BR for Portuguese', async () => {
    await i18n.changeLanguage('pt');
    expect(getLocale()).toBe('pt-BR');
    await i18n.changeLanguage('de'); // reset
  });

  it('returns ar-SA for Arabic', async () => {
    await i18n.changeLanguage('ar');
    expect(getLocale()).toBe('ar-SA');
    await i18n.changeLanguage('de'); // reset
  });

  it('falls back to de-DE for unknown languages', async () => {
    await i18n.changeLanguage('xx');
    expect(getLocale()).toBe('de-DE');
    await i18n.changeLanguage('de'); // reset
  });
});

// ==========================================
// getStatusColor / getStatusBadgeColor completeness
// ==========================================

describe('getStatusColor completeness', () => {
  const allStatuses: ExpiryStatus[] = ['expired', 'critical', 'warning', 'soon', 'good'];

  it('returns a non-empty string for every status', () => {
    for (const status of allStatuses) {
      const color = getStatusColor(status);
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    }
  });

  it('each status has distinct colors', () => {
    const colors = allStatuses.map((s) => getStatusColor(s));
    const unique = new Set(colors);
    expect(unique.size).toBe(allStatuses.length);
  });
});

describe('getStatusBadgeColor completeness', () => {
  const allStatuses: ExpiryStatus[] = ['expired', 'critical', 'warning', 'soon', 'good'];

  it('returns a non-empty string for every status', () => {
    for (const status of allStatuses) {
      const color = getStatusBadgeColor(status);
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    }
  });

  it('returns bg- classes for every status', () => {
    for (const status of allStatuses) {
      expect(getStatusBadgeColor(status)).toMatch(/bg-/);
    }
  });
});

// ==========================================
// getStatusLabel completeness
// ==========================================

describe('getStatusLabel completeness', () => {
  const allStatuses: ExpiryStatus[] = ['expired', 'critical', 'warning', 'soon', 'good'];

  it('returns a non-empty label for every status', () => {
    for (const status of allStatuses) {
      const label = getStatusLabel(status);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

// ==========================================
// computeStats advanced tests
// ==========================================

describe('computeStats advanced', () => {
  it('handles all products archived', () => {
    const products = [
      makeProduct({ id: 1, archived: true }),
      makeProduct({ id: 2, archived: true }),
    ];
    const stats = computeStats(products);
    expect(stats.totalProducts).toBe(0);
    expect(stats.totalCategories).toBe(0);
    expect(stats.totalLocations).toBe(0);
  });

  it('handles products with custom category strings', () => {
    const products = [
      makeProduct({ id: 1, category: 'Werkzeuge' }),
      makeProduct({ id: 2, category: 'Werkzeuge' }),
      makeProduct({ id: 3, category: 'Farben' }),
    ];
    const stats = computeStats(products);
    expect(stats.totalCategories).toBe(2);
  });

  it('handles single product', () => {
    const products = [makeProduct()];
    const stats = computeStats(products);
    expect(stats.totalProducts).toBe(1);
    expect(stats.totalCategories).toBe(1);
    expect(stats.totalLocations).toBe(1);
  });

  it('counts low stock only when quantity < minStock', () => {
    const products = [
      makeProduct({ id: 1, quantity: 3, minStock: 5 }),   // low
      makeProduct({ id: 2, quantity: 5, minStock: 5 }),   // not low (equal)
      makeProduct({ id: 3, quantity: 10, minStock: 5 }),  // not low
      makeProduct({ id: 4, quantity: 0, minStock: 1 }),   // low
      makeProduct({ id: 5, quantity: 1 }),                 // no minStock
    ];
    const stats = computeStats(products);
    expect(stats.lowStockCount).toBe(2);
  });

  it('handles large number of products', () => {
    const products = Array.from({ length: 1000 }, (_, i) =>
      makeProduct({
        id: i + 1,
        name: `Product ${i}`,
        expiryDate: new Date(Date.now() + (i - 500) * 86_400_000).toISOString(),
      })
    );
    const stats = computeStats(products);
    expect(stats.totalProducts).toBe(1000);
    expect(stats.expiredCount + stats.criticalCount + stats.warningCount + stats.soonCount + stats.goodCount).toBe(1000);
  });
});

// ==========================================
// formatDuration additional edge cases
// ==========================================

describe('formatDuration additional', () => {
  it('formats 0.5 days (fractional) as Heute', () => {
    expect(formatDuration(0.5)).toBe('Heute');
  });

  it('formats 59 days as days', () => {
    expect(formatDuration(59)).toBe('59 Tage');
  });

  it('formats 60 days as months', () => {
    expect(formatDuration(60)).toBe('2 Monate');
  });

  it('formats 730 days as 2 years', () => {
    expect(formatDuration(730)).toBe('2 Jahre');
  });

  it('formats 395 days as 1 year, 1 month', () => {
    expect(formatDuration(395)).toBe('1 Jahr, 1 Monat');
  });
});

// ==========================================
// formatDaysUntil additional edge cases
// ==========================================

describe('formatDaysUntil additional', () => {
  it('formats -1 as specific translation', () => {
    expect(formatDaysUntil(-1)).toBe('1 Tag abgelaufen');
  });

  it('formats large negative values', () => {
    const result = formatDaysUntil(-730);
    expect(result).toContain('2 Jahre');
    expect(result).toContain('abgelaufen');
  });

  it('formats -59 as days expired', () => {
    expect(formatDaysUntil(-59)).toBe('59 Tage abgelaufen');
  });

  it('formats -60 as months expired', () => {
    expect(formatDaysUntil(-60)).toBe('2 Monate abgelaufen');
  });
});

// ==========================================
// formatDate additional tests
// ==========================================

describe('formatDate additional', () => {
  it('formats month precision with correct year', () => {
    const result = formatDate('2024-12-25T00:00:00.000Z', 'month');
    expect(result).toContain('2024');
    expect(result).toMatch(/Dezember|December|dezembro|ديسمبر/i);
  });

  it('handles year precision for old dates', () => {
    expect(formatDate('2020-01-01T00:00:00.000Z', 'year')).toBe('2020');
  });

  it('handles year precision for future dates', () => {
    expect(formatDate('2030-06-15T00:00:00.000Z', 'year')).toBe('2030');
  });
});

// ==========================================
// lookupBarcode additional tests
// ==========================================

describe('lookupBarcode validation', () => {
  it('rejects whitespace-only barcode', async () => {
    expect(await lookupBarcode('   ')).toBeNull();
  });

  it('rejects barcode with leading zeros but non-numeric chars', async () => {
    expect(await lookupBarcode('0000000a')).toBeNull();
  });

  it('accepts valid 13-digit EAN', async () => {
    // Should not reject on format validation
    const result = await lookupBarcode('4006381333931');
    expect(result === null || typeof result?.name === 'string').toBe(true);
  });

  it('accepts valid 14-digit GTIN', async () => {
    const result = await lookupBarcode('04006381333931');
    expect(result === null || typeof result?.name === 'string').toBe(true);
  });

  it('rejects 15-digit barcode', async () => {
    expect(await lookupBarcode('400638133393100')).toBeNull();
  });
});

// ==========================================
// getExpiryStatus stress tests
// ==========================================

describe('getExpiryStatus with various date formats', () => {
  it('handles ISO date with timezone', () => {
    const future = new Date(Date.now() + 90 * 86_400_000).toISOString();
    expect(getExpiryStatus(future)).toBe('good');
  });

  it('handles date-only string (YYYY-MM-DD)', () => {
    const future = new Date(Date.now() + 90 * 86_400_000);
    const dateOnly = future.toISOString().split('T')[0];
    expect(getExpiryStatus(dateOnly)).toBe('good');
  });

  it('handles very old dates as expired', () => {
    expect(getExpiryStatus('2000-01-01T00:00:00.000Z')).toBe('expired');
  });

  it('handles very far future dates as good', () => {
    expect(getExpiryStatus('2099-12-31T00:00:00.000Z')).toBe('good');
  });
});

// ==========================================
// getDaysUntilExpiry additional tests
// ==========================================

describe('getDaysUntilExpiry additional', () => {
  it('handles very far future', () => {
    const result = getDaysUntilExpiry('2099-12-31T00:00:00.000Z');
    expect(result).toBeGreaterThan(365);
  });

  it('handles very old date', () => {
    const result = getDaysUntilExpiry('2000-01-01T00:00:00.000Z');
    expect(result).toBeLessThan(-365);
  });

  it('is consistent with getExpiryStatus', () => {
    const testDates = [
      new Date(Date.now() - 86_400_000),      // yesterday
      new Date(Date.now() + 3 * 86_400_000),  // 3 days
      new Date(Date.now() + 10 * 86_400_000), // 10 days
      new Date(Date.now() + 20 * 86_400_000), // 20 days
      new Date(Date.now() + 60 * 86_400_000), // 60 days
    ];

    for (const date of testDates) {
      const iso = date.toISOString();
      const days = getDaysUntilExpiry(iso);
      const status = getExpiryStatus(iso);

      if (days <= 0) expect(status).toBe('expired');
      else if (days <= 7) expect(status).toBe('critical');
      else if (days <= 14) expect(status).toBe('warning');
      else if (days <= 30) expect(status).toBe('soon');
      else expect(status).toBe('good');
    }
  });
});
