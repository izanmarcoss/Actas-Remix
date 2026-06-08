import React, { useState } from 'react';
import { Link2, FileSpreadsheet, RefreshCw, Layers, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SheetSettingsProps {
  currentUrl: string;
  defaultUrl: string;
  onUrlChange: (newUrl: string) => void;
  isLoading: boolean;
  errorMsg: string | null;
  successMsg: string | null;
  activeSheetTitle: string;
  rowCount: number;
}

export const SheetSettings: React.FC<SheetSettingsProps> = ({
  currentUrl,
  defaultUrl,
  onUrlChange,
  isLoading,
  errorMsg,
  successMsg,
  activeSheetTitle,
  rowCount,
}) => {
  const [inputUrl, setInputUrl] = useState(currentUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onUrlChange(inputUrl.trim());
    }
  };

  const handleLoadDefault = () => {
    setInputUrl(defaultUrl);
    onUrlChange(defaultUrl);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden" id="sheet-settings-container">
      {/* Settings Header banner */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Conexión de Google Sheets
          </h3>
        </div>
        
        {currentUrl !== defaultUrl && (
          <button
            onClick={handleLoadDefault}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Reestablecer Hoja Inicial
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Dynamic status messages */}
        {errorMsg && (
          <div className="p-3 bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-lg flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-450 text-left" id="sheet-settings-error">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Detalle de Conexión:</span>
              <p className="leading-relaxed">{errorMsg}</p>
              <p className="text-[11px] text-rose-500 font-medium">Nota: Para este demo, hemos activado un conjunto de datos alternativo robusto y funcional.</p>
            </div>
          </div>
        )}

        {successMsg && !isLoading && (
          <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400" id="sheet-settings-success">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* Input Address Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5" id="sheet-url-form">
          <div className="relative flex-1">
            <label htmlFor="sheet-url-input" className="sr-only">URL de Google Sheets</label>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileSpreadsheet className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="sheet-url-input"
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Pega el enlace de compartir de Google Sheets..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputUrl.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:dark:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shrink-0 flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
            id="sheet-submit-btn"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Actualizar Datos
          </button>
        </form>

        {/* Diagnostic Metadata card */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-wrap gap-y-2.5 gap-x-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 min-w-[130px]">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>ID Archivo:</span>
            <span className="font-mono font-medium text-slate-750 dark:text-slate-350 truncate max-w-[110px]" title={activeSheetTitle}>
              {activeSheetTitle}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Líneas de datos:</span>
            <span className="font-semibold text-slate-850 dark:text-slate-200">
              {rowCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
