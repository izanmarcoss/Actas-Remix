import { useState, useEffect, useMemo } from 'react';
import { ColumnMetadata, analyzeColumns } from './utils/columnsAnalyzer';
import { parseCSV, rowsToObjects } from './utils/csvParser';
import { FALLBACK_CSV_STRING } from './utils/fallbackData';
import { FilterConfig, ThemeMode } from './types';
import { KPISection } from './components/KPISection';
import { FiltersSection } from './components/FiltersSection';
import { TableTab } from './components/TableTab';
import { AnalysisTab } from './components/AnalysisTab';
import { SheetSettings } from './components/SheetSettings';

import {
  Sun,
  Moon,
  Database,
  Calendar,
  Grid,
  TrendingUp,
  Clock,
  Sparkles,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Y1mptmnYZqXvMQkXyWKyFRtxKowCDEMoy_IRoT5nHyw/edit?gid=0#gid=0';

// Clean numeric parses for ranges slider evaluations
const parseAsNumber = (val: string): number | null => {
  if (!val) return null;
  const cleaned = val.replace(/[\s$€£%]/g, '').replace(/,/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
};

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-preference');
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'table' | 'analysis'>('table');

  // Sheet URL state
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    const cached = localStorage.getItem('sheet-active-url');
    // Validate that the cached URL is present and matches a valid format before using it
    const isValid = cached && (/\/d\/([a-zA-Z0-9-_]+)/.test(cached) || /^[a-zA-Z0-9-_]{20,}$/.test(cached.trim()));
    if (isValid) {
      return cached;
    }
    return DEFAULT_SHEET_URL;
  });

  // Core Data States
  const [rawRecords, setRawRecords] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<ColumnMetadata[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Connection / Loading indicators
  const [isFetching, setIsFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeSheetId, setActiveSheetId] = useState<string>('Predefinida (Fallback)');

  // Selected KPI metric focus state
  const [selectedMetricCol, setSelectedMetricCol] = useState<string>('');

  // Primary complex Filters state
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    globalSearch: '',
    categorical: {},
    numeric: {},
  });

  // Effect: Bind dark theme class to high-level HTML node
  useEffect(() => {
    localStorage.setItem('theme-preference', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Effect: Cache the active Google Sheet URL
  useEffect(() => {
    localStorage.setItem('sheet-active-url', sheetUrl);
  }, [sheetUrl]);

  // Calibration helper: Initializes fresh filters when columns meta updates
  const calibrateFilters = (newColumns: ColumnMetadata[], dataSet: Record<string, string>[]) => {
    const defaultCategorical: Record<string, string[]> = {};
    const defaultNumeric: Record<string, { min: number; max: number; currentMin: number; currentMax: number }> = {};

    newColumns.forEach(col => {
      if (col.type === 'category') {
        defaultCategorical[col.name] = [];
      } else if (col.type === 'number' && col.minNumber !== undefined && col.maxNumber !== undefined) {
        defaultNumeric[col.name] = {
          min: col.minNumber,
          max: col.maxNumber,
          currentMin: col.minNumber,
          currentMax: col.maxNumber,
        };
      }
    });

    setFilterConfig({
      globalSearch: '',
      categorical: defaultCategorical,
      numeric: defaultNumeric,
    });

    // Auto-select first available numeric metric for the KPI cards
    const firstNum = newColumns.find(c => c.type === 'number');
    setSelectedMetricCol(firstNum ? firstNum.name : '');
  };

  // Main synchronous parser (handles loading raw data into memory and rebuilding columns)
  const loadDatabase = (dataObjects: Record<string, string>[], isDefaultFallback = false) => {
    const analyzedCols = analyzeColumns(dataObjects);
    setRawRecords(dataObjects);
    setColumns(analyzedCols);
    calibrateFilters(analyzedCols, dataObjects);
    
    if (isDefaultFallback) {
      setActiveSheetId('Base de Fallback (Ventas)');
    }
  };

  // Primary API Async Loader
  const fetchSheetData = async (urlToFetch: string) => {
    setIsFetching(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      console.log('Requesting proxy sheet-data from Express API for:', urlToFetch);
      // Call our server proxy api route
      const response = await fetch(`/api/sheet-data?url=${encodeURIComponent(urlToFetch)}`);
      
      const payload = await response.json();

      if (response.ok && payload.success && payload.data) {
        // Log details
        loadDatabase(payload.data);
        setActiveSheetId(payload.spreadsheetId || 'Google Sheet');
        setLastUpdated(payload.updatedAt ? new Date(payload.updatedAt).toLocaleString() : new Date().toLocaleString());
        setSuccessMsg('¡Hoja de cálculo importada con éxito desde Google!');
      } else {
        // Handled error from proxy endpoints
        const errorDetails = payload.message || 'Error Desconocido al conectar';
        throw new Error(errorDetails);
      }
    } catch (err: any) {
      console.error('Failed to retrieve google sheet from server proxy:', err);
      setErrorMsg(err.message || 'No se pudo obtener datos del enlace solicitado. Verifica que el enlace sea completamente público.');
      
      // Load gorgeous default local fallback dataset so the application remains robust
      const defaultRawValues = parseCSV(FALLBACK_CSV_STRING);
      const objects = rowsToObjects(defaultRawValues);
      loadDatabase(objects, true);
      setLastUpdated(new Date().toLocaleString() + ' (Local Fallback)');
    } finally {
      setIsFetching(false);
    }
  };

  // Fetch initial dataset on boot
  useEffect(() => {
    fetchSheetData(sheetUrl);
  }, []);

  // Handler for manual refresh
  const handleReload = () => {
    fetchSheetData(sheetUrl);
  };

  // Handler for setting a new URL
  const handleUrlChange = (newUrl: string) => {
    setSheetUrl(newUrl);
    fetchSheetData(newUrl);
  };

  // Handler for restoring filters to defaults
  const handleResetFilters = () => {
    const defaultCategorical: Record<string, string[]> = {};
    const defaultNumeric: Record<string, { min: number; max: number; currentMin: number; currentMax: number }> = {};

    columns.forEach(col => {
      if (col.type === 'category') {
        defaultCategorical[col.name] = [];
      } else if (col.type === 'number' && col.minNumber !== undefined && col.maxNumber !== undefined) {
        defaultNumeric[col.name] = {
          min: col.minNumber,
          max: col.maxNumber,
          currentMin: col.minNumber,
          currentMax: col.maxNumber,
        };
      }
    });

    setFilterConfig({
      globalSearch: '',
      categorical: defaultCategorical,
      numeric: defaultNumeric,
    });
  };

  // Filter Pipeline: computes the live visible list of records
  const filteredRecords = useMemo(() => {
    return rawRecords.filter(row => {
      // 1. Global query check
      if (filterConfig.globalSearch.trim() !== '') {
        const query = filterConfig.globalSearch.toLowerCase();
        const matchesQuery = Object.values(row).some(cellVal => 
          String(cellVal).toLowerCase().includes(query)
        );
        if (!matchesQuery) return false;
      }

      // 2. Categorical multi-select triggers check
      for (const [colName, selectionsVal] of Object.entries(filterConfig.categorical)) {
        const selections = selectionsVal as string[];
        if (selections.length > 0) {
          const valueInCell = row[colName] || '';
          if (!selections.includes(valueInCell)) {
            return false;
          }
        }
      }

      // 3. Numeric ranges limits check
      for (const [colName, boundsVal] of Object.entries(filterConfig.numeric)) {
        const bounds = boundsVal as { min: number; max: number; currentMin: number; currentMax: number };
        const valueInCell = row[colName] || '';
        const num = parseAsNumber(valueInCell);
        if (num !== null) {
          if (num < bounds.currentMin || num > bounds.currentMax) {
            return false;
          }
        }
      }

      return true;
    });
  }, [rawRecords, filterConfig]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* 1. Dashboard Site Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm" id="site-header">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm shrink-0 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                SheetInsight Pro
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-extrabold px-1.5 py-0.5 rounded-full tracking-wider uppercase">
                  v2.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Analizador Dinámico de Datos de Google Sheets • Professional Polish
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Last updated timestamp indicator */}
            {lastUpdated && (
              <div className="hidden md:flex flex-col text-right">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Última Sincronización</span>
                <span className="text-[11px] font-mono text-slate-605 dark:text-slate-350">{lastUpdated}</span>
              </div>
            )}

            {/* Manual refresh action */}
            <button
              onClick={handleReload}
              disabled={isFetching}
              className="p-2 bg-white hover:bg-slate-50 disabled:opacity-40 select-none dark:bg-slate-800 hover:dark:bg-slate-750 text-slate-500 dark:text-slate-350 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer shadow-sm"
              title="Recargar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>

            {/* Theme switcher */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 bg-white hover:bg-slate-50 dark:bg-slate-800 hover:dark:bg-slate-750 text-slate-500 dark:text-slate-350 border border-slate-200 dark:border-slate-700/80 rounded-lg transition-colors cursor-pointer shadow-sm"
              title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
              id="theme-toggle-btn"
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Page Content Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6" id="dashboard-content">
        
        {/* Connection Setup segment */}
        <SheetSettings
          currentUrl={sheetUrl}
          defaultUrl={DEFAULT_SHEET_URL}
          onUrlChange={handleUrlChange}
          isLoading={isFetching}
          errorMsg={errorMsg}
          successMsg={successMsg}
          activeSheetTitle={activeSheetId}
          rowCount={rawRecords.length}
        />

        {/* Dynamic KPI cards display */}
        <KPISection
          data={filteredRecords}
          columns={columns}
          selectedMetricCol={selectedMetricCol}
          onMetricColChange={setSelectedMetricCol}
        />

        {/* Primary Page Layout (Sidebar filters + main viewing tab panel) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start" id="main-interface-grid">
          
          {/* Column A: Filters menu */}
          <aside className="lg:sticky lg:top-20 z-10 lg:col-span-1">
            <FiltersSection
              columns={columns}
              filterConfig={filterConfig}
              onFilterConfigChange={setFilterConfig}
              onResetFilters={handleResetFilters}
            />
          </aside>

          {/* Column B: Primary tab display */}
          <section className="lg:col-span-3 space-y-5" id="tabs-pane-root">
            
            {/* Tab Navigation header */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-xl p-1 border shadow-xs">
              <button
                onClick={() => setActiveTab('table')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === 'table'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-550 dark:text-slate-400 hover:text-slate-750 hover:dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-755'
                }`}
                id="tab-btn-table"
              >
                <Grid className="w-4 h-4" />
                Tabla de Datos
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === 'analysis'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-550 dark:text-slate-400 hover:text-slate-750 hover:dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-755'
                }`}
                id="tab-btn-analysis"
              >
                <TrendingUp className="w-4 h-4" />
                Análisis Gráfico
              </button>
            </div>

            {/* Display active viewing Tab */}
            {activeTab === 'table' ? (
              <TableTab
                data={filteredRecords}
                columns={columns}
              />
            ) : (
              <AnalysisTab
                data={filteredRecords}
                columns={columns}
              />
            )}
          </section>
        </div>
      </main>

      {/* 3. Small Humble Site Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 mt-12" id="site-footer">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span>Spreadsheet Dynamics Engine • Desarrollado con React & Tailwind</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Última Sincronización: {lastUpdated ? lastUpdated : '—'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
