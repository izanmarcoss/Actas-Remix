import React, { useMemo, useState } from 'react';
import { ColumnMetadata, parseAsNumber } from '../utils/columnsAnalyzer';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Download, Sliders, TrendingUp, BarChart3, PieChartIcon, Activity } from 'lucide-react';

interface AnalysisTabProps {
  data: Record<string, string>[];
  columns: ColumnMetadata[];
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({ data, columns }) => {
  // Selector states
  const [xAxisCol, setXAxisCol] = useState<string>('');
  const [yAxisCol, setYAxisCol] = useState<string>('');
  const [groupCol, setGroupCol] = useState<string>('');
  const [aggType, setAggType] = useState<'sum' | 'avg'>('sum');

  // Identify column lists
  const numericColumns = useMemo(() => columns.filter(c => c.type === 'number'), [columns]);
  const categoricalColumns = useMemo(() => columns.filter(c => c.type === 'category' || c.type === 'date'), [columns]);
  const groupableColumns = useMemo(() => columns.filter(c => c.type === 'category'), [columns]);

  // Set default dimensions once columns load
  React.useEffect(() => {
    if (categoricalColumns.length > 0 && !xAxisCol) {
      // Prioritize date or category
      const dateCol = categoricalColumns.find(c => c.type === 'date');
      const catCol = categoricalColumns.find(c => c.type === 'category');
      setXAxisCol(dateCol?.name || catCol?.name || categoricalColumns[0].name);
    }
    if (numericColumns.length > 0 && !yAxisCol) {
      setYAxisCol(numericColumns[0].name);
    }
    if (groupableColumns.length > 0 && !groupCol) {
      // Find a groupable column that is not the same as X-Axis
      const idealGroup = groupableColumns.find(c => c.name !== xAxisCol);
      setGroupCol(idealGroup?.name || '');
    }
  }, [columns, numericColumns, categoricalColumns, groupableColumns, xAxisCol, yAxisCol, groupCol]);

  // Sync grouping if X-Axis changes to same column
  const handleXAxisChange = (val: string) => {
    setXAxisCol(val);
    if (groupCol === val) {
      setGroupCol('');
    }
  };

  // Color cycles for chart representations
  const COLORS = [
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#f43f5e', // Rose
    '#f59e0b', // Amber
    '#06b6d4', // Cyan
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#14b8a6', // Teal
  ];

  // Aggregation & Partitioning Engine
  const chartData = useMemo(() => {
    if (!xAxisCol || !yAxisCol || data.length === 0) return [];

    // Group rows by X-Axis column
    const groupMap: Record<string, { xValue: string; yValues: number[]; groupValues: Record<string, number[]> }> = {};
    const uniqueGroupsSet = new Set<string>();

    data.forEach(row => {
      const xKey = row[xAxisCol] || '(Vacío)';
      const yVal = parseAsNumber(row[yAxisCol]) || 0;

      if (!groupMap[xKey]) {
        groupMap[xKey] = {
          xValue: xKey,
          yValues: [],
          groupValues: {},
        };
      }

      groupMap[xKey].yValues.push(yVal);

      if (groupCol) {
        const groupKey = row[groupCol] || '(Vacío)';
        uniqueGroupsSet.add(groupKey);
        if (!groupMap[xKey].groupValues[groupKey]) {
          groupMap[xKey].groupValues[groupKey] = [];
        }
        groupMap[xKey].groupValues[groupKey].push(yVal);
      }
    });

    const uniqueGroups = Array.from(uniqueGroupsSet);

    // Build the finalized chart elements list
    const results = Object.values(groupMap).map(gm => {
      // Aggregate general values
      let aggregatedYValue = 0;
      if (gm.yValues.length > 0) {
        const sum = gm.yValues.reduce((a, b) => a + b, 0);
        aggregatedYValue = aggType === 'sum' ? sum : sum / gm.yValues.length;
      }

      const point: Record<string, any> = {
        name: gm.xValue,
        valor_total: Number(aggregatedYValue.toFixed(2)),
      };

      // Aggregate grouped values
      uniqueGroups.forEach(groupKey => {
        const gVals = gm.groupValues[groupKey] || [];
        let groupAgg = 0;
        if (gVals.length > 0) {
          const sum = gVals.reduce((a, b) => a + b, 0);
          groupAgg = aggType === 'sum' ? sum : sum / gVals.length;
        }
        point[groupKey] = Number(groupAgg.toFixed(2));
      });

      return point;
    });

    // Sort by name if name is a date to ensure timeline flows correctly
    const isDateX = columns.find(c => c.name === xAxisCol)?.type === 'date';
    if (isDateX) {
      results.sort((a, b) => Date.parse(a.name) - Date.parse(b.name));
    } else {
      // Sort in descending order of aggregated value for clear ranking bar charts
      results.sort((a, b) => b.valor_total - a.valor_total);
    }

    // Limit to top 15 values for absolute readability
    return results.slice(0, 15);
  }, [data, xAxisCol, yAxisCol, groupCol, aggType, columns]);

  // Identify all series keys present in group mapping (excluding default totals)
  const groupSeriesKeys = useMemo(() => {
    if (!groupCol || chartData.length === 0) return [];
    const keysSet = new Set<string>();
    chartData.forEach(item => {
      Object.keys(item).forEach(k => {
        if (k !== 'name' && k !== 'valor_total') {
          keysSet.add(k);
        }
      });
    });
    return Array.from(keysSet);
  }, [groupCol, chartData]);

  // Prepare custom Distribution Data (Frequency metric of rows by X-Axis value)
  const distributionData = useMemo(() => {
    if (!xAxisCol || data.length === 0) return [];

    const freqMap: Record<string, number> = {};
    data.forEach(row => {
      const xKey = row[xAxisCol] || '(Vacío)';
      freqMap[xKey] = (freqMap[xKey] || 0) + 1;
    });

    const results = Object.entries(freqMap).map(([key, count]) => ({
      name: key,
      frecuencia: count,
    }));

    results.sort((a, b) => b.frecuencia - a.frecuencia);
    return results.slice(0, 10);
  }, [data, xAxisCol]);

  // Helper code to render download canvas
  const handleDownloadPNG = (divId: string, chartName: string) => {
    const cardElement = document.getElementById(divId);
    if (!cardElement) return;

    // Grab the SVG generated inside Recharts
    const svgElement = cardElement.querySelector('svg');
    if (!svgElement) {
      alert('Imposible exportar el gráfico: no se encontró el elemento SVG.');
      return;
    }

    try {
      // Wrap SVG contents
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);

      // Create a blob and object URL
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        
        // Match actual SVG dimensional boundaries but double them for Retina-ready PNG sharpeness
        const originalWidth = svgElement.getBoundingClientRect().width || 600;
        const originalHeight = svgElement.getBoundingClientRect().height || 400;

        canvas.width = originalWidth * 2;
        canvas.height = originalHeight * 2;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(2, 2);
          
          // Render a clean background (since default SVG is transparent)
          const isDarkNow = document.documentElement.classList.contains('dark');
          ctx.fillStyle = isDarkNow ? '#1e293b' : '#ffffff'; // slate-800 vs white
          ctx.fillRect(0, 0, originalWidth, originalHeight);

          // Draw image
          ctx.drawImage(image, 0, 0, originalWidth, originalHeight);

          // Trigger browser physical download
          const pngUrl = canvas.toDataURL('image/png');
          const trigger = document.createElement('a');
          trigger.href = pngUrl;
          trigger.download = `${chartName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
          document.body.appendChild(trigger);
          trigger.click();
          document.body.removeChild(trigger);
        }
        URL.revokeObjectURL(url);
      };
      
      image.src = url;
    } catch (e) {
      console.error('Error drawing SVG to canvas for PNG download:', e);
    }
  };

  return (
    <div className="space-y-6" id="analysis-tab-root">
      
      {/* 1. Dynamic Controls Console */}
      <div 
        id="analysis-selectors"
        className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/85 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-4"
      >
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Sliders className="w-5 h-5 shrink-0" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm whitespace-nowrap">
            Personalizar Gráficos:
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
          {/* Eje X Selection */}
          <div className="flex flex-col gap-1">
            <label htmlFor="select-eje-x" className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Eje X (Categorías)
            </label>
            <select
              id="select-eje-x"
              value={xAxisCol}
              onChange={(e) => handleXAxisChange(e.target.value)}
              className="py-1.5 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 cursor-pointer text-ellipsis overflow-hidden font-semibold"
            >
              {categoricalColumns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>

          {/* Eje Y Selection */}
          <div className="flex flex-col gap-1">
            <label htmlFor="select-eje-y" className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Eje Y (Metrica)
            </label>
            <select
              id="select-eje-y"
              value={yAxisCol}
              onChange={(e) => setYAxisCol(e.target.value)}
              className="py-1.5 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 cursor-pointer text-ellipsis overflow-hidden font-semibold"
            >
              {numericColumns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>

          {/* Grouping Select */}
          <div className="flex flex-col gap-1">
            <label htmlFor="select-agrupacion" className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Agrupación / Leyenda
            </label>
            <select
              id="select-agrupacion"
              value={groupCol}
              onChange={(e) => setGroupCol(e.target.value)}
              className="py-1.5 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 cursor-pointer text-ellipsis overflow-hidden font-semibold"
            >
              <option value="">— Sin Agrupar —</option>
              {groupableColumns
                .filter(col => col.name !== xAxisCol)
                .map(col => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
            </select>
          </div>

          {/* Aggregation Type selection */}
          <div className="flex flex-col gap-1">
            <label htmlFor="select-agregacion" className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Tipo de Agregación
            </label>
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 h-[30px]" id="select-agregacion">
              <button
                onClick={() => setAggType('sum')}
                className={`flex-1 text-[11px] font-medium py-1 rounded-md transition-all cursor-pointer ${
                  aggType === 'sum'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-450 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Suma
              </button>
              <button
                onClick={() => setAggType('avg')}
                className={`flex-1 text-[11px] font-medium py-1 rounded-md transition-all cursor-pointer ${
                  aggType === 'avg'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-450 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Promedio
              </button>
            </div>
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700" id="empty-charts-billboard">
          <p className="text-sm text-slate-500 dark:text-slate-350">
            No hay datos agregados disponibles. Por favor confirma la selección de variables en las listas arriba.
          </p>
        </div>
      ) : (
        /* 2. Charts Visual Array (2x2 Grid) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-charts-grid">
          
          {/* Card: Bar Chart */}
          <div 
            id="chart-card-bar"
            className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[380px] overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-750">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  Gráfico de Barras
                </h4>
              </div>
              <button
                onClick={() => handleDownloadPNG('chart-card-bar', `Grafico_Barras_${yAxisCol}`)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                title="Descargar PNG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    stroke="rgba(148, 163, 184, 0.75)" 
                    angle={chartData.length > 6 ? -25 : 0}
                    textAnchor="end"
                    style={{ fontSize: '10px' }}
                  />
                  <YAxis tickLine={false} axisLine={false} stroke="rgba(148, 163, 184, 0.75)" style={{ fontSize: '10px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#ffffff'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {groupCol && groupSeriesKeys.length > 0 ? (
                    groupSeriesKeys.map((seriesKey, sIdx) => (
                      <Bar 
                        key={seriesKey} 
                        dataKey={seriesKey} 
                        stackId="a" 
                        fill={COLORS[sIdx % COLORS.length]} 
                        radius={sIdx === groupSeriesKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))
                  ) : (
                    <Bar dataKey="valor_total" name={yAxisCol} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card: Line Chart */}
          <div 
            id="chart-card-line"
            className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[380px] overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-750">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  Gráfico de Líneas
                </h4>
              </div>
              <button
                onClick={() => handleDownloadPNG('chart-card-line', `Grafico_Lineas_${yAxisCol}`)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                title="Descargar PNG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    stroke="rgba(148, 163, 184, 0.75)" 
                    angle={chartData.length > 6 ? -25 : 0}
                    textAnchor="end"
                    style={{ fontSize: '10px' }}
                  />
                  <YAxis tickLine={false} axisLine={false} stroke="rgba(148, 163, 184, 0.75)" style={{ fontSize: '10px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#ffffff'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {groupCol && groupSeriesKeys.length > 0 ? (
                    groupSeriesKeys.map((seriesKey, sIdx) => (
                      <Line 
                        key={seriesKey} 
                        type="monotone" 
                        dataKey={seriesKey} 
                        stroke={COLORS[sIdx % COLORS.length]} 
                        strokeWidth={2.5}
                        dot={{ r: 3, strokeWidth: 1.5 }}
                      />
                    ))
                  ) : (
                    <Line type="monotone" dataKey="valor_total" name={yAxisCol} stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card: Pie Chart (Donut visual) */}
          <div 
            id="chart-card-pie"
            className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[380px] overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-755">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  Distribución Porcentual ({xAxisCol})
                </h4>
              </div>
              <button
                onClick={() => handleDownloadPNG('chart-card-pie', `Grafico_Circular_Distribucion`)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-755 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                title="Descargar PNG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 w-full text-xs flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-full sm:w-1/2 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="valor_total"
                      nameKey="name"
                      label={false}
                    >
                      {chartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val) => [`${val}`, yAxisCol]}
                      contentStyle={{ 
                        backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                        border: 'none', 
                        borderRadius: '8px',
                        color: '#ffffff'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend to side-list for Pie Chart */}
              <div className="w-full sm:w-1/2 max-h-[220px] overflow-y-auto space-y-1.5 pr-2 scrollbar-thin">
                {chartData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 truncate">
                      <div 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                      />
                      <span className="text-slate-600 dark:text-slate-350 truncate block" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-slate-800 dark:text-indigo-300 ml-2">
                      {item.valor_total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card: Category Distribution of Frequencies */}
          <div 
            id="chart-card-distribution"
            className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[380px] overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-750">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  Frecuencia de Registros por {xAxisCol}
                </h4>
              </div>
              <button
                onClick={() => handleDownloadPNG('chart-card-distribution', `Distribucion_Frecuencias_${xAxisCol}`)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                title="Descargar PNG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={distributionData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="freqColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    stroke="rgba(148, 163, 184, 0.75)" 
                    angle={distributionData.length > 6 ? -25 : 0}
                    textAnchor="end"
                    style={{ fontSize: '10px' }}
                  />
                  <YAxis tickLine={false} axisLine={false} stroke="rgba(148, 163, 184, 0.75)" style={{ fontSize: '10px' }} />
                  <Tooltip 
                    formatter={(val) => [val, 'Número de Filas']}
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#ffffff'
                    }} 
                  />
                  <Area type="monotone" dataKey="frecuencia" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#freqColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
