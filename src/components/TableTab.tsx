import React, { useState, useMemo } from 'react';
import { ColumnMetadata } from '../utils/columnsAnalyzer';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';

interface TableTabProps {
  data: Record<string, string>[];
  columns: ColumnMetadata[];
}

export const TableTab: React.FC<TableTabProps> = ({ data, columns }) => {
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting State
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  const columnNames = useMemo(() => {
    return columns.map(c => c.name);
  }, [columns]);

  // Handle Header Click for Sorting
  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset page on sort change
  };

  // Process data with sorting
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    const metadata = columns.find(c => c.name === sortColumn);
    const isNumeric = metadata?.type === 'number';

    const cleanNumber = (val: string) => {
      if (!val) return -Infinity;
      const parsed = parseFloat(val.replace(/[\s$€£%]/g, '').replace(/,/g, ''));
      return isNaN(parsed) ? -Infinity : parsed;
    };

    return [...data].sort((a, b) => {
      const valA = a[sortColumn] || '';
      const valB = b[sortColumn] || '';

      if (isNumeric) {
        const numA = cleanNumber(valA);
        const numB = cleanNumber(valB);
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      } else {
        // String localeCompare sorting
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
    });
  }, [data, sortColumn, sortDirection, columns]);

  // Pagination Slice
  const totalRows = sortedData.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedData.slice(startIdx, startIdx + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Sync current page bounds if records change
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Convert and download the current active dataset as a CSV
  const handleExportCSV = () => {
    if (data.length === 0) return;

    const headers = columns.map(c => c.name);
    
    const csvContent = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(h => {
          let cellValue = row[h] || '';
          // Wrap value in quotes if it contains commas, quotes or new lines
          if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
            cellValue = `"${cellValue.replace(/"/g, '""')}"`;
          }
          return cellValue;
        }).join(',')
      )
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dashboard_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden" id="table-tab-root">
      {/* Table Action Utilities */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Resultados de la Tabla
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">
            Mostrando <span className="font-semibold text-slate-700 dark:text-slate-300">{totalRows}</span> registros encontrados con los filtros actuales.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Page Sizer dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Mostrar:</span>
            <select
              aria-label="Registros por página"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-semibold"
            >
              {[10, 25, 50, 100].map(sz => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
          </div>

          {/* Export CSV action button */}
          <button
            onClick={handleExportCSV}
            disabled={totalRows === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:dark:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors shadow-sm focus:outline-none cursor-pointer"
            id="download-csv-btn"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Actual Data Table Grid (Scrollable) */}
      <div className="overflow-x-auto w-full" id="responsive-table-outer">
        {totalRows > 0 ? (
          <table className="w-full text-left border-collapse" id="data-display-table">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-700">
                {columns.map(col => {
                  const isSorted = sortColumn === col.name;
                  return (
                    <th
                      key={col.name}
                      onClick={() => handleSort(col.name)}
                      className="px-4 py-3 select-none text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors"
                      id={`th-col-${col.name.replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{col.name}</span>
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-350 dark:text-slate-500 transition-colors hover:text-slate-500" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-indigo-50/20 dark:hover:bg-slate-700/40 transition-colors"
                >
                  {columns.map(col => {
                    const cellVal = row[col.name];
                    return (
                      <td
                        key={col.name}
                        className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 max-w-[240px] truncate"
                        title={cellVal}
                      >
                        {col.type === 'number' && cellVal !== '' ? (
                          <span className="font-mono">{cellVal}</span>
                        ) : col.type === 'date' && cellVal !== '' ? (
                          <span className="font-mono text-slate-500 dark:text-slate-450">{cellVal}</span>
                        ) : col.type === 'category' ? (
                          <span className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                            {cellVal || '(Vacío)'}
                          </span>
                        ) : (
                          cellVal || <span className="text-slate-400 italic">(Vacío)</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center" id="empty-table-prompt">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-700 rounded-full flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              No se obtuvieron registros
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
              Ninguna de las filas coincide con la combinación activa de filtros y búsqueda global. Prueba a limpiar filtros.
            </p>
          </div>
        )}
      </div>

      {/* Paginator Container */}
      {totalRows > 0 && (
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/10 border-t border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-400 text-center sm:text-left">
            Mostrando fila <span className="font-semibold text-slate-700 dark:text-slate-300">{(currentPage - 1) * pageSize + 1}</span> a{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(currentPage * pageSize, totalRows)}</span> de{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{totalRows}</span>
          </span>

          <div className="flex items-center justify-center gap-2" id="paginator-controls">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 px-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Keep page index sliding window centered
                let pg = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pg = currentPage - 2 + i;
                  if (pg + (4 - i) > totalPages) {
                    pg = totalPages - 4 + i;
                  }
                }
                
                return (
                  <button
                    key={pg}
                    onClick={() => handlePageChange(pg)}
                    className={`w-7.5 h-7.5 text-xs font-semibold rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                      currentPage === pg
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-650 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 px-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
              aria-label="Página siguiente"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
