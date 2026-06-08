import { ColumnMetadata } from './utils/columnsAnalyzer';

export interface FilterConfig {
  globalSearch: string;
  // Map of column name to selected category strings
  categorical: Record<string, string[]>;
  // Map of column name to min/max numbers
  numeric: Record<string, { min: number; max: number; currentMin: number; currentMax: number }>;
}

export type ThemeMode = 'light' | 'dark';

export interface SheetConfig {
  url: string;
  name: string;
}

export interface SpreadsheetDataResponse {
  success: boolean;
  spreadsheetId?: string;
  gid?: string;
  updatedAt?: string;
  data?: Record<string, string>[];
  rowCount?: number;
  message?: string;
  errorType?: string;
}
