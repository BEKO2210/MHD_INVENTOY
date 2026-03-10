import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { version as appVersion } from '../../package.json';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addStorageLocation, deleteStorageLocation, renameStorageLocation, exportData, exportCSV, importData, ImportResult, addCustomCategory, updateCustomCategory, deleteCustomCategory } from '../lib/db';
import { requestNotificationPermission, getNotificationPermissionStatus } from '../lib/notifications';
import { useDarkMode } from '../hooks/useDarkMode';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useAppStore } from '../store/useAppStore';
import { downloadFile } from '../lib/utils';
import { DEFAULT_UNITS, BUILTIN_CATEGORIES, CATEGORY_LABELS } from '../types';
import {
  Bell,
  BellOff,
  Moon,
  Sun,
  MapPin,
  Plus,
  Trash2,
  Download,
  Upload,
  FileJson,
  Shield,
  Heart,
  Smartphone,
  Share,
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  Globe,
  Pencil,
  Check,
  X,
  Tag,
} from 'lucide-react';

const LANGUAGES = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export function Settings() {
  const [isDark, toggleDark] = useDarkMode();
  const { notificationsEnabled, setNotificationsEnabled } = useAppStore();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const locations = useLiveQuery(() => db.storageLocations.toArray()) ?? [];
  const allProducts = useLiveQuery(() => db.products.toArray()) ?? [];
  const customCategories = useLiveQuery(() => db.customCategories.toArray()) ?? [];
  const [newLocation, setNewLocation] = useState('');
  const [editingLocId, setEditingLocId] = useState<number | null>(null);
  const [editingLocName, setEditingLocName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatUnit, setNewCatUnit] = useState('Stück');
  const [newCatStep, setNewCatStep] = useState('1');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatUnit, setEditingCatUnit] = useState('');
  const [editingCatStep, setEditingCatStep] = useState('');
  const [importStatus, setImportStatus] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [showImpressum, setShowImpressum] = useState(false);
  const [showDatenschutz, setShowDatenschutz] = useState(false);
  const [showAGB, setShowAGB] = useState(false);
  const { t, i18n } = useTranslation();

  // Pre-compute product counts for O(n) instead of O(n*m) per rendered item
  const { categoryCounts, locationCounts } = useMemo(() => {
    const catCounts: Record<string, number> = {};
    const locCounts: Record<string, number> = {};
    for (const p of allProducts) {
      catCounts[p.category] = (catCounts[p.category] || 0) + 1;
      locCounts[p.storageLocation] = (locCounts[p.storageLocation] || 0) + 1;
    }
    return { categoryCounts: catCounts, locationCounts: locCounts };
  }, [allProducts]);

  async function handleToggleNotifications() {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
    } else {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
    }
  }

  async function handleAddLocation() {
    const name = newLocation.trim();
    if (!name) return;
    const exists = locations.some((l) => l.name.toLowerCase() === name.toLowerCase());
    if (exists) return;
    await addStorageLocation(name);
    setNewLocation('');
  }

  function startEditLocation(id: number, currentName: string) {
    setEditingLocId(id);
    setEditingLocName(currentName);
  }

  async function handleSaveLocationRename() {
    if (!editingLocId || !editingLocName.trim()) return;
    const newName = editingLocName.trim();
    const exists = locations.some((l) => l.id !== editingLocId && l.name.toLowerCase() === newName.toLowerCase());
    if (exists) return;
    await renameStorageLocation(editingLocId, newName);
    setEditingLocId(null);
    setEditingLocName('');
  }

  async function handleAddCategory() {
    const name = newCatName.trim();
    if (!name) return;
    const exists = customCategories.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) return;
    await addCustomCategory({
      name,
      defaultUnit: newCatUnit,
      consumptionStep: parseFloat(newCatStep) || 1,
      createdAt: new Date().toISOString(),
    });
    setNewCatName('');
    setNewCatUnit('Stück');
    setNewCatStep('1');
  }

  function startEditCategory(cat: { id?: number; name: string; defaultUnit: string; consumptionStep: number }) {
    setEditingCatId(cat.id!);
    setEditingCatName(cat.name);
    setEditingCatUnit(cat.defaultUnit);
    setEditingCatStep(String(cat.consumptionStep));
  }

  async function handleSaveCategoryEdit() {
    if (!editingCatId || !editingCatName.trim()) return;
    await updateCustomCategory(editingCatId, {
      name: editingCatName.trim(),
      defaultUnit: editingCatUnit,
      consumptionStep: parseFloat(editingCatStep) || 1,
    });
    setEditingCatId(null);
  }

  async function handleExportJSON() {
    const data = await exportData();
    downloadFile(data, `mhd-inventar-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  }

  async function handleExportCSV() {
    const data = await exportCSV();
    downloadFile(data, `mhd-inventar-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8');
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const count = await importData(text);
      setImportStatus({ message: t('import.success', { count }), type: 'success' });
    } catch (err) {
      if (err instanceof ImportResult) {
        setImportStatus({ message: err.message, type: 'warning' });
      } else {
        setImportStatus({ message: t('import.error', { message: err instanceof Error ? err.message : t('import.importFailed') }), type: 'error' });
      }
    }

    e.target.value = '';
  }

  async function handleInstall() {
    const success = await install();
    if (!success) {
      alert(t('settings.installError'));
    }
  }

  function handleLanguageChange(langCode: string) {
    i18n.changeLanguage(langCode);
  }

  const notifStatus = getNotificationPermissionStatus();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-100">{t('settings.title')}</h2>
      </div>

      {/* Language */}
      <section className="rounded-xl border border-primary-700 bg-primary-800/60 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-200">
          <Globe size={18} className="text-blue-400" />
          {t('settings.language')}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                i18n.language.startsWith(lang.code)
                  ? 'border-green-500 bg-green-500/10 text-green-400'
                  : 'border-primary-600 text-gray-300 hover:bg-primary-700'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="truncate">{lang.label}</span>
              <span className="ml-auto text-xs uppercase text-gray-400">{lang.code}</span>
            </button>
          ))}
        </div>
      </section>

      {/* PWA Install */}
      {!isInstalled && (
        <section className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-200">
            <Smartphone size={18} className="text-green-400" />
            {t('settings.installApp')}
          </h3>
          {isIOS ? (
            <div className="space-y-2 text-sm text-gray-400">
              <p>
                {t('settings.iosInstallHint')}{' '}
                <Share size={14} className="inline text-blue-400" />{' '}
                <strong className="text-gray-300">{t('settings.iosShare')}</strong>{' '}
                <strong className="text-gray-300">&quot;{t('settings.iosHomeScreen')}&quot;</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                {t('settings.installDescription')}
              </p>
              <button
                onClick={handleInstall}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-500 active:scale-[0.98] transition-transform"
              >
                <Download size={18} />
                {isInstallable ? t('settings.installNow') : t('settings.installApp2')}
              </button>
              {!isInstallable && (
                <p className="text-xs text-gray-400">
                  {t('settings.installTip')}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {isInstalled && (
        <section className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-green-400" />
            <span className="text-sm font-medium text-green-400">{t('settings.appInstalled')}</span>
          </div>
        </section>
      )}

      {/* Appearance */}
      <section className="rounded-xl border border-primary-700 bg-primary-800/60 p-4">
        <h3 className="mb-3 font-semibold text-gray-200">{t('settings.appearance')}</h3>
        <button
          onClick={toggleDark}
          className="flex w-full items-center justify-between rounded-lg bg-primary-700/50 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            {isDark ? (
              <Moon size={20} className="text-blue-400" />
            ) : (
              <Sun size={20} className="text-yellow-400" />
            )}
            <span className="text-gray-200">
              {isDark ? t('settings.darkTheme') : t('settings.lightTheme')}
            </span>
          </div>
          <div
            className={`relative h-6 w-11 rounded-full transition-colors ${
              isDark ? 'bg-green-600' : 'bg-gray-500'
            }`}
          >
            <div
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                isDark ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </div>
        </button>
      </section>

      {/* Notifications */}
      <section className="rounded-xl border border-primary-700 bg-primary-800/60 p-4">
        <h3 className="mb-3 font-semibold text-gray-200">{t('settings.notifications')}</h3>
        <button
          onClick={handleToggleNotifications}
          disabled={notifStatus === 'denied' || notifStatus === 'unsupported'}
          className="flex w-full items-center justify-between rounded-lg bg-primary-700/50 px-4 py-3 disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            {notificationsEnabled ? (
              <Bell size={20} className="text-green-400" />
            ) : (
              <BellOff size={20} className="text-gray-400" />
            )}
            <div className="text-left">
              <span className="text-gray-200">{t('settings.expiryReminders')}</span>
              {notifStatus === 'denied' && (
                <p className="text-xs text-red-400">
                  {t('settings.notifBlocked')}
                </p>
              )}
              {notifStatus === 'unsupported' && (
                <p className="text-xs text-gray-400">
                  {t('settings.notifUnsupported')}
                </p>
              )}
            </div>
          </div>
          <div
            className={`relative h-6 w-11 rounded-full transition-colors ${
              notificationsEnabled ? 'bg-green-600' : 'bg-gray-500'
            }`}
          >
            <div
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </div>
        </button>
        {notificationsEnabled && (
          <p className="mt-2 text-xs text-gray-400">
            {t('settings.notifSchedule')}
          </p>
        )}
      </section>

      {/* Storage Locations */}
      <section className="rounded-xl border border-primary-700 bg-primary-800/60 p-4">
        <h3 className="mb-3 font-semibold text-gray-200">{t('settings.manageLocations')}</h3>
        <div className="mb-3 flex gap-2">
          <div className="relative flex-1">
            <MapPin
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
              placeholder={t('settings.newLocationPlaceholder')}
              className="w-full rounded-lg border border-primary-600 bg-primary-900 py-2 pl-9 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:border-green-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleAddLocation}
            disabled={!newLocation.trim()}
            className="rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-500 disabled:opacity-50"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="space-y-1">
          {locations.map((loc) => {
            const usedCount = locationCounts[loc.name] || 0;
            const isEditing = editingLocId === loc.id;

            return (
              <div
                key={loc.id}
                className="flex items-center justify-between rounded-lg bg-primary-700/30 px-3 py-2"
              >
                {isEditing ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editingLocName}
                      onChange={(e) => setEditingLocName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveLocationRename(); if (e.key === 'Escape') setEditingLocId(null); }}
                      className="flex-1 rounded border border-primary-500 bg-primary-900 px-2 py-1 text-sm text-gray-200 focus:border-green-500 focus:outline-none"
                      autoFocus
                    />
                    <button onClick={handleSaveLocationRename} className="rounded p-1 text-green-400 hover:bg-primary-600">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingLocId(null)} className="rounded p-1 text-gray-400 hover:bg-primary-600">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">{loc.name}</span>
                      {usedCount > 0 && (
                        <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] text-gray-400">
                          {usedCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditLocation(loc.id!, loc.name)}
                        className="rounded p-1 text-gray-400 hover:bg-primary-600 hover:text-blue-400"
                        title={t('settings.renameLocation')}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (usedCount > 0) {
                            alert(t('settings.locationInUse', { name: loc.name, count: usedCount }));
                            return;
                          }
                          deleteStorageLocation(loc.id!);
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-primary-600 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Custom Categories */}
      <section className="rounded-xl border border-primary-700 bg-primary-800/60 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-200">
          <Tag size={18} className="text-purple-400" />
          {t('settings.manageCategories')}
        </h3>
        <p className="mb-3 text-xs text-gray-400">{t('settings.manageCategoriesDesc')}</p>

        {/* Built-in categories */}
        <div className="mb-3 space-y-1">
          <p className="mb-1 text-xs font-medium text-gray-400">{t('settings.builtinCategories')}</p>
          {BUILTIN_CATEGORIES.map((key) => {
            const usedCount = categoryCounts[key] || 0;
            return (
              <div key={key} className="flex items-center justify-between rounded-lg bg-primary-700/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">{CATEGORY_LABELS[key]}</span>
                  {usedCount > 0 && (
                    <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] text-gray-400">
                      {usedCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500">{key}</span>
              </div>
            );
          })}
        </div>

        {/* Add new category */}
        <div className="mb-3 space-y-2 rounded-lg border border-primary-600 bg-primary-900/50 p-3">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder={t('settings.newCategoryPlaceholder')}
            className="w-full rounded-lg border border-primary-600 bg-primary-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-green-500 focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">{t('settings.defaultUnit')}</label>
              <select
                value={newCatUnit}
                onChange={(e) => setNewCatUnit(e.target.value)}
                className="w-full rounded-lg border border-primary-600 bg-primary-900 px-2 py-1.5 text-sm text-gray-200 focus:border-green-500 focus:outline-none"
              >
                {DEFAULT_UNITS.map((u) => <option key={u} value={u}>{t(`units.${u}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">{t('settings.consumptionStep')}</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={newCatStep}
                onChange={(e) => setNewCatStep(e.target.value)}
                className="w-full rounded-lg border border-primary-600 bg-primary-900 px-2 py-1.5 text-sm text-gray-200 focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleAddCategory}
            disabled={!newCatName.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
          >
            <Plus size={16} />
            {t('settings.addCategory')}
          </button>
        </div>

        {/* Existing custom categories */}
        <div className="space-y-1">
          {customCategories.map((cat) => {
            const isEditing = editingCatId === cat.id;
            const usedCount = categoryCounts[cat.name] || 0;

            return (
              <div key={cat.id} className="rounded-lg bg-primary-700/30 px-3 py-2">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      className="w-full rounded border border-primary-500 bg-primary-900 px-2 py-1 text-sm text-gray-200 focus:border-green-500 focus:outline-none"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={editingCatUnit}
                        onChange={(e) => setEditingCatUnit(e.target.value)}
                        className="rounded border border-primary-500 bg-primary-900 px-2 py-1 text-sm text-gray-200"
                      >
                        {DEFAULT_UNITS.map((u) => <option key={u} value={u}>{t(`units.${u}`)}</option>)}
                      </select>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editingCatStep}
                        onChange={(e) => setEditingCatStep(e.target.value)}
                        className="rounded border border-primary-500 bg-primary-900 px-2 py-1 text-sm text-gray-200"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveCategoryEdit} className="flex-1 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-500">
                        <Check size={14} className="mx-auto" />
                      </button>
                      <button onClick={() => setEditingCatId(null)} className="flex-1 rounded bg-primary-600 px-2 py-1 text-xs text-gray-300 hover:bg-primary-500">
                        <X size={14} className="mx-auto" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-300">{cat.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {cat.consumptionStep} {t(`units.${cat.defaultUnit}`)}
                      </span>
                      {usedCount > 0 && (
                        <span className="ml-2 rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] text-gray-400">
                          {usedCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditCategory(cat)}
                        className="rounded p-1 text-gray-400 hover:bg-primary-600 hover:text-blue-400"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (usedCount > 0) {
                            alert(t('settings.categoryInUse', { name: cat.name, count: usedCount }));
                            return;
                          }
                          deleteCustomCategory(cat.id!);
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-primary-600 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {customCategories.length === 0 && (
            <p className="text-center text-xs text-gray-500 py-2">{t('settings.noCategoriesYet')}</p>
          )}
        </div>
      </section>

      {/* Data Management */}
      <section className="rounded-xl border border-primary-700 bg-primary-800/60 p-4">
        <h3 className="mb-3 font-semibold text-gray-200">{t('settings.dataManagement')}</h3>
        <div className="space-y-2">
          <button
            onClick={handleExportJSON}
            className="flex w-full items-center gap-3 rounded-lg bg-primary-700/50 px-4 py-3 text-gray-200 hover:bg-primary-700"
          >
            <FileJson size={20} className="text-blue-400" />
            <div className="text-left">
              <span>{t('settings.jsonBackup')}</span>
              <p className="text-xs text-gray-400">{t('settings.jsonBackupDesc')}</p>
            </div>
            <Download size={16} className="ml-auto text-gray-400" />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex w-full items-center gap-3 rounded-lg bg-primary-700/50 px-4 py-3 text-gray-200 hover:bg-primary-700"
          >
            <FileText size={20} className="text-gray-400" />
            <div className="text-left">
              <span>{t('settings.csvExport')}</span>
              <p className="text-xs text-gray-400">{t('settings.csvExportDesc')}</p>
            </div>
            <Download size={16} className="ml-auto text-gray-400" />
          </button>

          <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg bg-primary-700/50 px-4 py-3 text-gray-200 hover:bg-primary-700">
            <Upload size={20} className="text-orange-400" />
            <div className="text-left">
              <span>{t('settings.jsonImport')}</span>
              <p className="text-xs text-gray-400">{t('settings.jsonImportDesc')}</p>
            </div>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          {importStatus && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                importStatus.type === 'error'
                  ? 'bg-red-500/10 text-red-400'
                  : importStatus.type === 'warning'
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'bg-green-500/10 text-green-400'
              }`}
            >
              {importStatus.message}
            </p>
          )}
        </div>
      </section>

      {/* Support */}
      <section className="rounded-xl border border-primary-700 bg-primary-800/60 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-200">
          <Heart size={18} className="text-pink-400" />
          {t('settings.support')}
        </h3>
        <p className="mb-3 text-sm text-gray-400">
          Support kontaktieren
        </p>
      </section>

      {/* Impressum */}
      <section className="rounded-xl border border-primary-700 bg-primary-800/60 p-4">
        <button
          onClick={() => setShowImpressum(!showImpressum)}
          className="flex w-full items-center justify-between"
        >
          <h3 className="flex items-center gap-2 font-semibold text-gray-200">
            <Info size={18} className="text-blue-400" />
            {t('settings.impressum')}
          </h3>
          {showImpressum ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>
        {showImpressum && (
          <div className="mt-3 space-y-3 text-sm text-gray-400">
            <p className="font-medium text-gray-300">{t('settings.impressumTMG')}</p>
            <p>
              Belkis Aslani<br />
              Vogelsangstr. 32<br />
              71691 Freiberg am Neckar
            </p>

            <p className="font-medium text-gray-300">{t('settings.impressumContact')}</p>
            <p>E-Mail: belkis.aslani@gmail.com</p>

            <p className="font-medium text-gray-300">{t('settings.impressumResponsible')}</p>
            <p>
              Belkis Aslani<br />
              Vogelsangstr. 32<br />
              71691 Freiberg am Neckar
            </p>

            <p className="font-medium text-gray-300">{t('settings.impressumDisclaimer')}</p>
            <p>{t('settings.impressumDisclaimerText')}</p>
          </div>
        )}
      </section>

      {/* Datenschutz */}
      <section className="rounded-xl border border-primary-700 bg-primary-800/60 p-4">
        <button
          onClick={() => setShowDatenschutz(!showDatenschutz)}
          className="flex w-full items-center justify-between"
        >
          <h3 className="flex items-center gap-2 font-semibold text-gray-200">
            <Shield size={18} className="text-green-400" />
            {t('settings.privacy')}
          </h3>
          {showDatenschutz ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>
        {showDatenschutz && (
          <div className="mt-3 space-y-3 text-sm text-gray-400">
            <p className="font-medium text-gray-300">{t('settings.privacyResponsible')}</p>
            <p>
              Belkis Aslani<br />
              Vogelsangstr. 32<br />
              71691 Freiberg am Neckar<br />
              E-Mail: belkis.aslani@gmail.com
            </p>

            <p className="font-medium text-gray-300">{t('settings.privacyDataProcessing')}</p>
            <p>{t('settings.privacyDataProcessingText')}</p>

            <p className="font-medium text-gray-300">{t('settings.privacyExternalServices')}</p>
            <p>{t('settings.privacyNoExternalServices')}</p>

            <p className="font-medium text-gray-300">{t('settings.privacyNotifications')}</p>
            <p>{t('settings.privacyNotificationsText')}</p>

            <p className="font-medium text-gray-300">{t('settings.privacyCookies')}</p>
            <p>{t('settings.privacyCookiesText')}</p>

            <p className="font-medium text-gray-300">{t('settings.privacyRights')}</p>
            <p>{t('settings.privacyRightsText')}</p>
          </div>
        )}
      </section>

      {/* AGB */}
      <section className="rounded-xl border border-primary-700 bg-primary-800/60 p-4">
        <button
          onClick={() => setShowAGB(!showAGB)}
          className="flex w-full items-center justify-between"
        >
          <h3 className="flex items-center gap-2 font-semibold text-gray-200">
            <FileText size={18} className="text-blue-400" />
            {t('settings.terms')}
          </h3>
          {showAGB ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>
        {showAGB && (
          <div className="mt-3 space-y-3 text-sm text-gray-400">
            <p className="font-medium text-gray-300">{t('settings.termsProvider')}</p>
            <p>
              Belkis Aslani<br />
              Vogelsangstr. 32<br />
              71691 Freiberg am Neckar<br />
              E-Mail: belkis.aslani@gmail.com
            </p>

            <p className="font-medium text-gray-300">{t('settings.termsScope')}</p>
            <p>{t('settings.termsScopeText')}</p>

            <p className="font-medium text-gray-300">{t('settings.termsService')}</p>
            <p>{t('settings.termsServiceText')}</p>

            <p className="font-medium text-gray-300">{t('settings.termsAvailability')}</p>
            <p>{t('settings.termsAvailabilityText')}</p>

            <p className="font-medium text-gray-300">{t('settings.termsLiability')}</p>
            <p>{t('settings.termsLiabilityText')}</p>

            <p className="font-medium text-gray-300">{t('settings.termsIP')}</p>
            <p>{t('settings.termsIPText')}</p>

            <p className="font-medium text-gray-300">{t('settings.termsDonations')}</p>
            <p>{t('settings.termsDonationsText')}</p>
          </div>
        )}
      </section>

      {/* App Info */}
      <section className="space-y-1 text-center text-xs text-gray-400">
        <p>MHD-Inventar v{appVersion}</p>
        <p>{t('settings.appSlogan')}</p>
        <p>&copy; {new Date().getFullYear()} Belkis Aslani</p>
      </section>
    </div>
  );
}
