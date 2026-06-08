/**
 * Column analyzer utility to dynamically detect columns and data types
 * from a Google Sheets dataset.
 */

export type ColumnType = 'number' | 'date' | 'category' | 'text';

export interface ColumnMetadata {
  name: string;
  type: ColumnType;
  uniqueValues: string[];
  minNumber?: number;
  maxNumber?: number;
}

/**
 * Remove currency symbols, percentage signs, and thousands separators to test for numbers.
 */
export function cleanNumericValue(val: string): string {
  if (!val) return '';
  // Remove spaces, currency symbols ($, €, £), percent marks (%), and commas
  // e.g. "$1,240.50" -> "1240.50", "45%" -> "45"
  const cleaned = val.replace(/[\s$€£%]/g, '').replace(/,/g, '');
  return cleaned;
}

/**
 * Attemps to parse a string value into a number.
 */
export function parseAsNumber(val: string): number | null {
  const cleaned = cleanNumericValue(val);
  if (!cleaned) return null;
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Checks if a string is a date.
 * Excludes plain integers or simple small numbers.
 */
export function parseAsDate(val: string): Date | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  // Exclude strings that are just simple integers (e.g. "1240", "30")
  if (/^\d{1,4}$/.test(trimmed)) return null;
  // If it's a timestamp or date-formatted string
  const timestamp = Date.parse(trimmed);
  if (isNaN(timestamp)) return null;
  
  const d = new Date(timestamp);
  // Ensure we didn't just parse a low integer from a Unix timestamp by mistake
  if (d.getFullYear() < 1970 || d.getFullYear() > 2100) return null;
  
  return d;
}

/**
 * Automatically inspects dataset records and determines metadata.
 */
export function analyzeColumns(records: Record<string, string>[]): ColumnMetadata[] {
  if (records.length === 0) return [];

  const firstRecord = records[0];
  const columnNames = Object.keys(firstRecord);
  const rowCount = records.length;

  return columnNames.map(colName => {
    let numericCount = 0;
    let dateCount = 0;
    let validCount = 0;
    const values = records.map(r => r[colName] || '');
    const nonEmpties = values.filter(v => v !== '');

    const uniqueSet = new Set<string>();
    let parsedNums: number[] = [];

    nonEmpties.forEach(val => {
      validCount++;
      const numVal = parseAsNumber(val);
      if (numVal !== null) {
        numericCount++;
        parsedNums.push(numVal);
      }

      const dateVal = parseAsDate(val);
      if (dateVal !== null) {
        dateCount++;
      }

      uniqueSet.add(val);
    });

    // Populate unique values
    const uniqueValues = Array.from(uniqueSet).sort((a, b) => {
      // Intelligently sort unique values (numerically if possible)
      const na = parseAsNumber(a);
      const nb = parseAsNumber(b);
      if (na !== null && nb !== null) {
        return na - nb;
      }
      return a.localeCompare(b);
    });

    // Determine coordinate type
    let type: ColumnType = 'text';
    
    if (validCount > 0) {
      const numericRatio = numericCount / validCount;
      const dateRatio = dateCount / validCount;

      if (numericRatio > 0.6) {
        type = 'number';
      } else if (dateRatio > 0.6) {
        type = 'date';
      } else if (uniqueValues.length <= 15 || uniqueValues.length <= Math.max(5, rowCount * 0.35)) {
        type = 'category';
      }
    }

    const meta: ColumnMetadata = {
      name: colName,
      type,
      uniqueValues,
    };

    if (type === 'number' && parsedNums.length > 0) {
      meta.minNumber = Math.min(...parsedNums);
      meta.maxNumber = Math.max(...parsedNums);
    }

    return meta;
  });
}
