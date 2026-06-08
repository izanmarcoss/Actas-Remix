import React, { useMemo } from 'react';
import { ColumnMetadata } from '../utils/columnsAnalyzer';
import { FilterConfig } from '../types';
import { Search, RotateCcw, SlidersHorizontal, Sliders, ChevronDown, ChevronUp } from 'lucide-react';

interface FiltersSectionProps {
  columns: ColumnMetadata[];
  filterConfig: FilterConfig;
  onFilterConfigChange: (updater: (prev: FilterConfig) => FilterConfig) => void;
  onResetFilters: () => void;
}

export const FiltersSection: React.FC<FiltersSectionProps> = ({
  columns,
  filterConfig,
  onFilterConfigChange,
  onResetFilters,
}) => {
  // Collapsible category triggers stored locally
  const [openSection, setOpenSection] = React.useState<Record<string, boolean>>({});

  const toggleSection = (colName: string) => {
    setOpenSection(prev => ({ ...prev, [colName]: !prev[colName] }));
  };

  const handleGlobalSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onFilterConfigChange(prev => ({
      ...prev,
      globalSearch: value,
    }));
  };

  const handleCategoricalToggle = (colName: string, optionValue: string) => {
    onFilterConfigChange(prev => {
      const currentSelected = prev.categorical[colName] || [];
      const updatedSelected = currentSelected.includes(optionValue)
        ? currentSelected.filter(v => v !== optionValue)
        : [...currentSelected, optionValue];

      return {
        ...prev,
        categorical: {
          ...prev.categorical,
          [colName]: updatedSelected,
        },
      };
    });
  };

  const handleNumericMinChange = (colName: string, valueStr: string) => {
    const val = valueStr === '' ? '' : Number(valueStr);
    onFilterConfigChange(prev => {
      const range = prev.numeric[colName];
      if (!range) return prev;
      
      const newMin = val === '' ? range.min : Math.max(range.min, Math.min(range.max, val));

      return {
        ...prev,
        numeric: {
          ...prev.numeric,
          [colName]: {
            ...range,
            currentMin: newMin,
          },
        },
      };
    });
  };

  const handleNumericMaxChange = (colName: string, valueStr: string) => {
    const val = valueStr === '' ? '' : Number(valueStr);
    onFilterConfigChange(prev => {
      const range = prev.numeric[colName];
      if (!range) return prev;
      
      const newMax = val === '' ? range.max : Math.max(range.min, Math.min(range.max, val));

      return {
        ...prev,
        numeric: {
          ...prev.numeric,
          [colName]: {
            ...range,
            currentMax: newMax,
          },
        },
      };
    });
  };

  // Group columns for cleaner layout
  const categoricalColumns = useMemo(() => {
    return columns.filter(col => col.type === 'category' && col.uniqueValues.length > 0);
  }, [columns]);

  const numericColumns = useMemo(() => {
    return columns.filter(col => col.type === 'number');
  }, [columns]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterConfig.globalSearch) count++;
    
    Object.values(filterConfig.categorical).forEach(arrVal => {
      const arr = arrVal as string[];
      if (arr.length > 0) count++;
    });

    Object.entries(filterConfig.numeric).forEach(([colName, boundsVal]) => {
      const bounds = boundsVal as { min: number; max: number; currentMin: number; currentMax: number };
      if (bounds.currentMin > bounds.min || bounds.currentMax < bounds.max) {
        count++;
      }
    });

    return count;
  }, [filterConfig]);

  return (
    <div 
      id="filters-container"
      className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-5 h-full"
    >
      {/* Filters Title Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">
            Panel de Filtros
          </h3>
          {activeFiltersCount > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-indigo-950 dark:text-indigo-300">
              {activeFiltersCount}
            </span>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <button
            id="reset-filters-btn"
            onClick={onResetFilters}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors py-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Limpiar
          </button>
        )}
      </div>

      {/* Global Search Input */}
      <div className="relative" id="global-search-container">
        <label htmlFor="global-search-input" className="sr-only">Buscar registros</label>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          id="global-search-input"
          type="text"
          value={filterConfig.globalSearch}
          onChange={handleGlobalSearchChange}
          placeholder="Búsqueda global..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500 transition-shadow"
        />
      </div>

      {/* Numerical filters (Ranges sliders and inputs) */}
      {numericColumns.length > 0 && (
        <div className="space-y-4" id="numeric-filters-list">
          <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-500/80" />
            <h4 className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Rangos Numéricos
            </h4>
          </div>

          <div className="flex flex-col gap-4">
            {numericColumns.map(col => {
              const bounds = filterConfig.numeric[col.name];
              if (!bounds) return null;

              return (
                <div key={col.name} className="space-y-1.5" id={`numeric-filter-${col.name}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      {col.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {bounds.min} - {bounds.max}
                    </span>
                  </div>

                  {/* Standard Range Double Slider */}
                  <div className="flex items-center gap-2">
                    <input
                      aria-label={`Mínimo ${col.name}`}
                      type="number"
                      step="any"
                      min={bounds.min}
                      max={bounds.max}
                      value={bounds.currentMin === bounds.min ? '' : bounds.currentMin}
                      placeholder={String(bounds.min)}
                      onChange={(e) => handleNumericMinChange(col.name, e.target.value)}
                      className="w-1/2 p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] text-center text-slate-800 dark:text-slate-100 placeholder-slate-400 py-1"
                    />
                    <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                    <input
                      aria-label={`Máximo ${col.name}`}
                      type="number"
                      step="any"
                      min={bounds.min}
                      max={bounds.max}
                      value={bounds.currentMax === bounds.max ? '' : bounds.currentMax}
                      placeholder={String(bounds.max)}
                      onChange={(e) => handleNumericMaxChange(col.name, e.target.value)}
                      className="w-1/2 p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] text-center text-slate-800 dark:text-slate-100 placeholder-slate-400 py-1"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Categorical columns filters */}
      {categoricalColumns.length > 0 && (
        <div className="space-y-3 flex-1 flex flex-col" id="categorical-filters-list">
          <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-500/80" />
            <h4 className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Categorías ({categoricalColumns.length})
            </h4>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] md:max-h-[none] pr-1 scrollbar-thin">
            {categoricalColumns.map(col => {
              const selectedValues = filterConfig.categorical[col.name] || [];
              const isOpen = openSection[col.name] !== false; // Open by default

              return (
                <div 
                  key={col.name} 
                  className="rounded-lg border border-slate-100 dark:border-slate-700/60 transition-colors"
                  id={`cat-filter-group-${col.name}`}
                >
                  <button
                    onClick={() => toggleSection(col.name)}
                    className="flex items-center justify-between w-full px-3 py-2 text-left cursor-pointer"
                  >
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {col.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {selectedValues.length > 0 && (
                        <span className="bg-indigo-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {selectedValues.length}
                        </span>
                      )}
                      {isOpen ? (
                        <ChevronUp className="w-3 h-3 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Options List */}
                  {isOpen && (
                    <div className="px-3 pb-2.5 pt-1 space-y-1 bg-slate-50/50 dark:bg-slate-900 max-h-[140px] overflow-y-auto scrollbar-thin select-none">
                      {col.uniqueValues.map(option => {
                        const isChecked = selectedValues.includes(option);
                        const labelId = `chk-${col.name}-${option}`;
                        return (
                          <div 
                            key={option} 
                            className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 p-1 rounded transition-colors"
                          >
                            <input
                              type="checkbox"
                              id={labelId}
                              checked={isChecked}
                              onChange={() => handleCategoricalToggle(col.name, option)}
                              className="accent-indigo-600 w-3.5 h-3.5 border-slate-300 dark:border-slate-700 rounded cursor-pointer"
                            />
                            <label
                              htmlFor={labelId}
                              className="text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer truncate flex-1"
                              title={option || '(Vacío)'}
                            >
                              {option || '(Vacío)'}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
