export const MISSING = '__MISSING_FIELD_MARKER__'

export interface CompareOptions {
  numericEqual: boolean;
  trimString: boolean;
  missingNullEqual: boolean;
  stringNumberEqual: boolean;
  keyIgnoreCase?: boolean;
  sliceEquals?: boolean;
  sliceDecimal?: number;
  /** Field names to skip at any object depth (e.g. id, traceId). */
  ignoreFields?: string[];
}

export function isIgnoredFieldKey(key: string, options: CompareOptions): boolean {
  const fields = options.ignoreFields
  if (!fields?.length) return false

  const compareKey = options.keyIgnoreCase ? key.toLowerCase() : key
  return fields.some((field) => {
    const trimmed = field.trim()
    if (!trimmed) return false
    const normalized = options.keyIgnoreCase ? trimmed.toLowerCase() : trimmed
    return normalized === compareKey
  })
}

export interface JsonDiffResult {
  type: 'MISSING_FIELD' | 'TYPE_MISMATCH' | 'VALUE_MISMATCH';
  path: string;
  json1: string;
  json2: string;
  json1Type: string;
  json2Type: string;
}

export function getValueType(value: any): string {
  if (value === MISSING) return 'missing';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

export function isPlainObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeString(value: any, trim: boolean): any {
  return trim && typeof value === 'string' ? value.trim() : value;
}

export function toComparableNumber(value: any, trim: boolean): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const comparableValue = trim ? value.trim() : value;

  if (!trim && comparableValue !== comparableValue.trim()) {
    return null;
  }

  if (comparableValue === '') {
    return null;
  }

  const numberValue = Number(comparableValue);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function isEqualNumberValue(a: any, b: any, options: CompareOptions): boolean {
  const numberA = toComparableNumber(a, options.trimString);
  const numberB = toComparableNumber(b, options.trimString);

  if (numberA === null || numberB === null) return false;

  if (options.sliceEquals && options.sliceDecimal !== undefined && options.sliceDecimal >= 0) {
    const sliceNum = (num: number, decimals: number) => {
      const str = num.toString();
      if (str.includes('e')) {
        const factor = Math.pow(10, decimals);
        return Math.trunc(num * factor) / factor;
      }
      const parts = str.split('.');
      if (parts.length === 1) return num;
      if (decimals === 0) return parseFloat(parts[0]);
      const slicedDec = parts[1].slice(0, decimals);
      return parseFloat(`${parts[0]}.${slicedDec}`);
    };
    if (sliceNum(numberA, options.sliceDecimal) === sliceNum(numberB, options.sliceDecimal)) {
      return true;
    }
  }

  return Object.is(numberA, numberB) || Math.abs(numberA - numberB) < Number.EPSILON;
}

export function isEqualPrimitive(a: any, b: any, options: CompareOptions): boolean {
  if (options.missingNullEqual) {
    const aNullish = a === null || a === MISSING;
    const bNullish = b === null || b === MISSING;
    if (aNullish && bNullish) return true;
  }

  if ((options.numericEqual || options.sliceEquals) && typeof a === 'number' && typeof b === 'number') {
    if (isEqualNumberValue(a, b, options)) return true;
  }

  const isMixedStringNumber =
    (typeof a === 'string' && typeof b === 'number') ||
    (typeof a === 'number' && typeof b === 'string');
  const isBothStrings = typeof a === 'string' && typeof b === 'string';

  if (options.stringNumberEqual && (isMixedStringNumber || isBothStrings)) {
    if (isEqualNumberValue(a, b, options)) return true;
  }

  const normalizedA = normalizeString(a, options.trimString);
  const normalizedB = normalizeString(b, options.trimString);
  return Object.is(normalizedA, normalizedB);
}

export function escapePathKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : `[${JSON.stringify(key)}]`;
}

export function valueToDisplay(value: any): string {
  if (value === MISSING) return '<missing>';
  if (value === undefined) return '<undefined>';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (_) {
    return String(value);
  }
}

export function addDiff(
  diffs: JsonDiffResult[],
  type: JsonDiffResult['type'],
  path: string,
  value1: any,
  value2: any
) {
  diffs.push({
    type,
    path,
    json1: valueToDisplay(value1),
    json2: valueToDisplay(value2),
    json1Type: getValueType(value1),
    json2Type: getValueType(value2),
  });
}

export function compareValues(
  a: any,
  b: any,
  path: string,
  diffs: JsonDiffResult[],
  options: CompareOptions
) {
  const typeA = getValueType(a);
  const typeB = getValueType(b);

  if (isEqualPrimitive(a, b, options)) return;

  if (typeA === 'missing' || typeB === 'missing') {
    addDiff(diffs, 'MISSING_FIELD', path, a, b);
    return;
  }

  if (typeA !== typeB) {
    addDiff(diffs, 'TYPE_MISMATCH', path, a, b);
    return;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    const maxLength = Math.max(a.length, b.length);
    for (let i = 0; i < maxLength; i++) {
      compareValues(
        i < a.length ? a[i] : MISSING,
        i < b.length ? b[i] : MISSING,
        `${path}[${i}]`,
        diffs,
        options
      );
    }
    return;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (!options.keyIgnoreCase) {
      const keys = Array.from(new Set([...keysA, ...keysB]))
        .filter((key) => !isIgnoredFieldKey(key, options))
        .sort();
      for (const key of keys) {
        compareValues(
          Object.prototype.hasOwnProperty.call(a, key) ? a[key] : MISSING,
          Object.prototype.hasOwnProperty.call(b, key) ? b[key] : MISSING,
          `${path}.${escapePathKey(key)}`,
          diffs,
          options
        );
      }
      return;
    }

    const aMap = new Map<string, string>();
    const bMap = new Map<string, string>();
    const normalizedKeys = new Set<string>();

    for (const k of keysA) {
      if (isIgnoredFieldKey(k, options)) continue
      const norm = k.toLowerCase();
      aMap.set(norm, k);
      normalizedKeys.add(norm);
    }
    for (const k of keysB) {
      if (isIgnoredFieldKey(k, options)) continue
      const norm = k.toLowerCase();
      bMap.set(norm, k);
      normalizedKeys.add(norm);
    }

    const sortedNormKeys = Array.from(normalizedKeys).sort();

    for (const normKey of sortedNormKeys) {
      const origKeyA = aMap.get(normKey);
      const origKeyB = bMap.get(normKey);

      const valA = origKeyA !== undefined ? a[origKeyA] : MISSING;
      const valB = origKeyB !== undefined ? b[origKeyB] : MISSING;

      const displayKey = origKeyA !== undefined ? origKeyA : origKeyB!;

      compareValues(
        valA,
        valB,
        `${path}.${escapePathKey(displayKey)}`,
        diffs,
        options
      );
    }
    return;
  }

  addDiff(diffs, 'VALUE_MISMATCH', path, a, b);
}

export function compareJsonObjects(obj1: any, obj2: any, options: CompareOptions): JsonDiffResult[] {
  const diffs: JsonDiffResult[] = [];
  compareValues(obj1, obj2, '$', diffs, options);
  return diffs;
}
