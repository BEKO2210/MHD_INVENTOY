export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'soon' | 'good';

export interface Product {
  id?: number;
  name: string;
  barcode?: string;
  category: ProductCategory;
  storageLocation: string;
  quantity: number;
  unit: string;
  expiryDate: string; // ISO date string
  expiryPrecision: 'day' | 'month' | 'year';
  photo?: string; // Base64 data URL
  minStock?: number;
  notes?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductCategory =
  | 'lebensmittel'
  | 'getranke'
  | 'medizin'
  | 'kosmetik'
  | 'chemie'
  | 'automotive'
  | 'batterien'
  | 'elektronik'
  | 'reinigung'
  | 'schmierstoffe'
  | 'feuerschutz'
  | 'erste_hilfe'
  | 'arbeitsschutz'
  | 'baustoffe'
  | 'sonstiges';

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  lebensmittel: 'Lebensmittel',
  getranke: 'Getränke',
  medizin: 'Medizin & Pharma',
  kosmetik: 'Kosmetik & Hygiene',
  chemie: 'Chemikalien & Gefahrstoffe',
  automotive: 'Kfz-Betriebsstoffe',
  batterien: 'Batterien & Akkus',
  elektronik: 'Elektronik & Technik',
  reinigung: 'Reinigungsmittel',
  schmierstoffe: 'Schmierstoffe & Öle',
  feuerschutz: 'Brandschutz & Löschmittel',
  erste_hilfe: 'Erste Hilfe & Verband',
  arbeitsschutz: 'PSA & Arbeitsschutz',
  baustoffe: 'Baustoffe & Klebstoffe',
  sonstiges: 'Sonstiges',
};

export const CATEGORY_ICONS: Record<ProductCategory, string> = {
  lebensmittel: 'Apple',
  getranke: 'GlassWater',
  medizin: 'Pill',
  kosmetik: 'SprayCan',
  chemie: 'FlaskConical',
  automotive: 'Car',
  batterien: 'Battery',
  elektronik: 'Cpu',
  reinigung: 'Sparkles',
  schmierstoffe: 'Droplets',
  feuerschutz: 'Flame',
  erste_hilfe: 'Heart',
  arbeitsschutz: 'HardHat',
  baustoffe: 'Hammer',
  sonstiges: 'Box',
};

/**
 * ISO/DIN-Normen und Warnhinweise pro Kategorie.
 * Werden im UI bei der Produkterfassung und -anzeige eingeblendet.
 */
export const CATEGORY_ISO_NORMS: Record<ProductCategory, { norms: string[]; warnings: string[] }> = {
  lebensmittel: {
    norms: ['ISO 22000 (Lebensmittelsicherheit)', 'HACCP', 'EU-VO 178/2002 (Lebensmittelrecht)', 'EU-VO 1169/2011 (Kennzeichnung)'],
    warnings: ['Nach Ablauf des MHD auf Aussehen, Geruch und Konsistenz prüfen', 'Kühlkette nicht unterbrechen', 'Verbrauchsdatum (VD) ist nicht gleich MHD — VD-Produkte nach Ablauf entsorgen'],
  },
  getranke: {
    norms: ['EU-VO 178/2002', 'TrinkwV (Trinkwasserverordnung)', 'EU-VO 1169/2011'],
    warnings: ['Kühl und lichtgeschützt lagern', 'Angebrochene Gebinde innerhalb von 3 Tagen verbrauchen', 'Kohlensäurehaltige Getränke nicht über 25°C lagern'],
  },
  medizin: {
    norms: ['ISO 15223-1 (Medizinprodukte-Symbole)', 'DIN EN ISO 11607 (Verpackung)', 'AMG (Arzneimittelgesetz)', 'EU-VO 2017/745 (MDR)'],
    warnings: ['Abgelaufene Medikamente NICHT verwenden — fachgerecht entsorgen', 'Lagertemperatur beachten (2–8°C oder 15–25°C)', 'Kindersicher aufbewahren', 'Restbestände an Apotheke zurückgeben'],
  },
  kosmetik: {
    norms: ['EU-VO 1223/2009 (Kosmetikverordnung)', 'ISO 22716 (GMP Kosmetik)', 'PAO-Symbol (Period After Opening)'],
    warnings: ['PAO-Symbol beachten: Haltbarkeit nach Anbruch begrenzt', 'Nicht bei Hautreizungen verwenden', 'Vor direkter Sonneneinstrahlung schützen'],
  },
  chemie: {
    norms: ['GHS/CLP-VO 1272/2008 (Einstufung & Kennzeichnung)', 'REACH-VO 1907/2006', 'ISO 11014 (Sicherheitsdatenblatt)', 'DIN EN ISO 3864 (Sicherheitskennzeichen)'],
    warnings: ['Sicherheitsdatenblatt (SDB) beachten!', 'Gefahrstoffverordnung (GefStoffV) einhalten', 'Persönliche Schutzausrüstung tragen', 'Getrennte Lagerung nach Gefahrstoffklassen', 'Nicht in Gewässer gelangen lassen'],
  },
  automotive: {
    norms: ['DOT 3/4/5.1 (Bremsflüssigkeit)', 'SAE J1703/J1704', 'DIN 51502 (Schmierstoff-Bezeichnung)', 'FMVSS 116 (Bremsflüssigkeit USA)'],
    warnings: ['Bremsflüssigkeit ist hygroskopisch — alle 2 Jahre wechseln!', 'Bremsflüssigkeit ist giftig und ätzend', 'Nicht mit Lack in Berührung bringen', 'DOT-Klasse darf NICHT gemischt werden (DOT 5 Silikonbasis)'],
  },
  batterien: {
    norms: ['IEC 60086 (Primärbatterien)', 'IEC 62133 (Lithium-Akkus)', 'EU-VO 2023/1542 (Batterien)', 'UN 3480/3481 (Lithium-Transport)', 'DIN EN 50342 (Starterbatterien)'],
    warnings: ['Kurzschluss und mechanische Beschädigung vermeiden!', 'Nicht ins Feuer werfen — Explosionsgefahr', 'Lithium-Batterien bei 10–25°C lagern', 'Auslaufende Batterien sofort entfernen', 'Alte Batterien getrennt sammeln (BattG)'],
  },
  elektronik: {
    norms: ['RoHS 2011/65/EU (Gefahrstoffbeschränkung)', 'WEEE 2012/19/EU (Elektroaltgeräte)', 'DIN EN 62368-1 (Gerätesicherheit)', 'CE-Kennzeichnung'],
    warnings: ['Elektronik vor Feuchtigkeit schützen', 'Kalibrierungsintervalle beachten', 'Firmware- und Sicherheitsupdates prüfen', 'Elektroschrott fachgerecht entsorgen (ElektroG)'],
  },
  reinigung: {
    norms: ['CLP-VO 1272/2008', 'Biozid-VO 528/2012', 'DIN EN ISO 862 (Tenside)', 'AISE-Richtlinien'],
    warnings: ['Reinigungsmittel NICHT mischen — Gasentwicklung möglich!', 'Säuren und Laugen getrennt lagern', 'Handschuhe und Augenschutz tragen', 'Kindersicher aufbewahren'],
  },
  schmierstoffe: {
    norms: ['DIN 51502 (Schmierstoff-Klassifikation)', 'ISO 6743 (Schmierstoff-Klassen)', 'ISO 2137 (Penetration)', 'API/ACEA (Motoröl-Spezifikationen)'],
    warnings: ['Vor direkter Sonneneinstrahlung und Hitze schützen', 'Nicht in Gewässer gelangen lassen', 'Altöl ist Sondermüll — fachgerecht entsorgen', 'Gebinde stets verschlossen halten'],
  },
  feuerschutz: {
    norms: ['DIN EN 3 (Tragbare Feuerlöscher)', 'ISO 7010 (Sicherheitszeichen)', 'DIN 14406 (Feuerlöscherprüfung)', 'DIN EN 671 (Wandhydranten)', 'BetrSichV'],
    warnings: ['Feuerlöscher alle 2 Jahre prüfen lassen (BetrSichV)!', 'Prüfplakette und Instandhaltungsnachweis beachten', 'Löschmittel nach Brandklasse wählen (A/B/C/D/F)', 'Rauchmelder: Batterie jährlich prüfen, Gerät nach 10 Jahren tauschen'],
  },
  erste_hilfe: {
    norms: ['DIN 13157 (Erste-Hilfe-Material Betrieb, klein)', 'DIN 13169 (Erste-Hilfe-Material Betrieb, groß)', 'DIN 13164 (Kfz-Verbandkasten)', 'DGUV Information 204-022'],
    warnings: ['Sterilverpackungen nach Ablaufdatum ersetzen!', 'Verbandmaterial trocken und staubfrei lagern', 'Inhalt regelmäßig auf Vollständigkeit prüfen', 'Verbandskasten nach Benutzung sofort auffüllen'],
  },
  arbeitsschutz: {
    norms: ['EU-VO 2016/425 (PSA-Verordnung)', 'DIN EN 166 (Augenschutz)', 'DIN EN 388 (Schutzhandschuhe)', 'DIN EN ISO 20345 (Sicherheitsschuhe)', 'DGUV Regel 112-189'],
    warnings: ['PSA nach Herstellerangaben regelmäßig prüfen und tauschen', 'UV-Schutzfilter haben begrenzte Lebensdauer', 'Schutzhelme nach 4–8 Jahren ersetzen (materialabhängig)', 'Beschädigte PSA sofort aus dem Verkehr ziehen'],
  },
  baustoffe: {
    norms: ['DIN EN 197-1 (Zement)', 'DIN EN 13888 (Fugenmörtel)', 'ISO 9001 (Qualitätsmanagement)', 'DIN EN 1504 (Betonschutz)', 'GISCODE (Gefahrstoff-Info)'],
    warnings: ['Zement und Mörtel: Verarbeitungszeit nach Anmischen beachten', 'Trockene, frostfreie Lagerung sicherstellen', 'Klebstoffe: Lösungsmitteldämpfe einatmen vermeiden', 'Chromatarmer Zement verwenden (Hautkontakt)'],
  },
  sonstiges: {
    norms: [],
    warnings: ['Herstellerangaben zur Haltbarkeit und Lagerung beachten'],
  },
};

export const DEFAULT_UNITS = [
  'Stück',
  'Liter',
  'kg',
  'g',
  'ml',
  'Packung',
  'Dose',
  'Flasche',
  'Karton',
  'Palette',
  'Kanister',
  'Tube',
  'Satz',
  'Paar',
  'Rolle',
  'Meter',
];

export interface StorageLocation {
  id?: number;
  name: string;
  icon?: string;
  createdAt: string;
}

export const DEFAULT_LOCATIONS = [
  'Lager',
  'Kühlraum',
  'Gefahrstofflager',
  'Werkstatt',
  'Büro',
  'Außenlager',
  'Regal A',
  'Regal B',
  'Hochregallager',
  'Versand',
];

export interface ConsumptionLog {
  id?: number;
  productId: number;
  productName: string;
  quantity: number;
  unit: string;
  consumedAt: string;
  reason: 'verbraucht' | 'abgelaufen' | 'beschadigt' | 'sonstiges';
}

export interface NotificationSchedule {
  id?: number;
  productId: number;
  productName: string;
  expiryDate: string;
  notifyAt: string;
  daysBefore: number;
  sent: boolean;
}

export interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_de?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  quantity?: string;
}

export interface DashboardStats {
  totalProducts: number;
  expiredCount: number;
  criticalCount: number;
  warningCount: number;
  soonCount: number;
  goodCount: number;
  lowStockCount: number;
  totalCategories: number;
  totalLocations: number;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  products: Product[];
  storageLocations: StorageLocation[];
  consumptionLogs: ConsumptionLog[];
}
