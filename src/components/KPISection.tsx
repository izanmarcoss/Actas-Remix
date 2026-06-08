import React, { useMemo } from 'react';
import { ColumnMetadata, parseAsNumber, cleanNumericValue } from '../utils/columnsAnalyzer';
import { Hash, Calculator, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

interface KPISectionProps {
  data: Record<string, string>[];
  columns: ColumnMetadata[];
  selectedMetricCol: string;
  onMetricColChange: (colName: string) => void;
}

export const KPISection: React.FC<KPISectionProps> = ({
  data,
  columns,
  selectedMetricCol,
  onMetricColChange,
}) => {
  const numericColumns = useMemo(() => {
    return columns.filter(col => col.type === 'number');
  }, [columns]);

  // Dynamic calculations for the chosen numeric column
  const stats = useMemo(() => {
    if (!selectedMetricCol || data.length === 0) {
      return { sum: 0, avg: 0, max: 0, min: 0, validRows: 0 };
    }

    let sum = 0;
    let max = -Infinity;
    let min = Infinity;
    let validRows = 0;

    data.forEach(row => {
      const valStr = row[selectedMetricCol];
      const num = parseAsNumber(valStr);
      if (num !== null) {
        sum += num;
        if (num > max) max = num;
        if (num < min) min = num;
        validRows++;
      }
    });

    return {
      sum: validRows > 0 ? sum : 0,
      avg: validRows > 0 ? sum / validRows : 0,
      max: validRows > 0 ? max : 0,
      min: validRows > 0 ? min : 0,
      validRows,
    };
  }, [data, selectedMetricCol]);

  // Format numbers nicely
  const formatValue = (val: number) => {
    if (val === -Infinity || val === Infinity) return 'N/A';
    // Decide based on value if we use decimals
    if (Number.isInteger(val)) {
      return new Intl.NumberFormat().format(val);
    }
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="space-y-4" id="kpi-section-container">
      {/* Metric Selector Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm gap-3">
        <div>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Foco de Métricas
          </span>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
            Resumen de Variables Numéricas
          </h2>
        </div>
        
        {numericColumns.length > 0 ? (
          <div className="flex items-center gap-2">
            <label htmlFor="kpi-metric-select" className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Analizar Columna:
            </label>
            <select
              id="kpi-metric-select"
              value={selectedMetricCol}
              onChange={(e) => onMetricColChange(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
            >
              {numericColumns.map(col => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className="text-xs text-amber-500 dark:text-amber-400 font-medium">
            ⚠️ No se detectaron columnas numéricas en la hoja de cálculo.
          </span>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Records Block */}
        <div 
          id="kpi-card-count"
          className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-3 transition-transform hover:translate-y-[-2px] duration-200"
        >
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Registros Totales
            </p>
            <p className="text-2xl font-bold font-sans text-slate-800 dark:text-white mt-1">
              {data.length}
            </p>
            <div className="mt-2 flex items-center text-[10px] text-emerald-600 font-medium">
              Activo en tiempo real
            </div>
          </div>
        </div>

        {/* Sales or chosen numeric Sum Card */}
        <div 
          id="kpi-card-sum"
          className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-3 transition-transform hover:translate-y-[-2px] duration-200"
        >
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate max-w-[100px] md:max-w-xs" title={`Suma: ${selectedMetricCol}`}>
              Suma Total
            </p>
            <p className="text-2xl font-bold font-sans text-slate-800 dark:text-white mt-1">
              {numericColumns.length > 0 ? formatValue(stats.sum) : '—'}
            </p>
            <div className="mt-2 flex items-center text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[100px] md:max-w-[110px]" title={selectedMetricCol}>
              {selectedMetricCol || 'Ninguno'}
            </div>
          </div>
        </div>

        {/* Average value Card */}
        <div 
          id="kpi-card-avg"
          className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-3 transition-transform hover:translate-y-[-2px] duration-200"
        >
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate" title={`Promedio: ${selectedMetricCol}`}>
              Promedio Mensual
            </p>
            <p className="text-2xl font-bold font-sans text-slate-800 dark:text-white mt-1">
              {numericColumns.length > 0 ? formatValue(stats.avg) : '—'}
            </p>
            <div className="mt-2 text-[10px] text-slate-400 font-medium truncate max-w-[100px] md:max-w-[110px]" title={selectedMetricCol}>
               Basado en {data.length} ítems
            </div>
          </div>
        </div>

        {/* Max value Card */}
        <div 
          id="kpi-card-max"
          className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-3 transition-transform hover:translate-y-[-2px] duration-200"
        >
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate" title={`Máximo: ${selectedMetricCol}`}>
              Valor Máximo
            </p>
            <p className="text-2xl font-bold font-sans text-slate-800 dark:text-white mt-1">
              {numericColumns.length > 0 ? formatValue(stats.max) : '—'}
            </p>
            <div className="mt-2 text-[10px] text-indigo-650 dark:text-indigo-400 font-medium truncate max-w-[100px] md:max-w-[110px]" title={selectedMetricCol}>
              Analizador Activo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
