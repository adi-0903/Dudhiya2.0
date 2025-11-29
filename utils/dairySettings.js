export const DEFAULT_DAIRY_SETTINGS = {
  baseSnf: '9.0',
  clrConversionFactor: '0.14',
  fatSnfRatio: '60_40',
  rateType: 'fat_snf'
};

export const INTERNAL_TO_API_FAT_SNF_RATIO = {
  '60_40': '60/40',
  '52_48': '52/48'
};

export const API_TO_INTERNAL_FAT_SNF_RATIO = Object.entries(INTERNAL_TO_API_FAT_SNF_RATIO).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {});

const formatDecimalString = (value, decimals, fallback) => {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return fallback.toString();
  }
  return num.toFixed(decimals);
};

const toDecimalString = (value, decimals, fallback) => {
  const num = parseFloat(value);
  if (!isNaN(num)) {
    return num.toFixed(decimals);
  }

  const fallbackNum = parseFloat(
    typeof fallback === 'number' ? fallback : fallback ?? DEFAULT_DAIRY_SETTINGS.baseSnf
  );

  if (isNaN(fallbackNum)) {
    return parseFloat(DEFAULT_DAIRY_SETTINGS.baseSnf).toFixed(decimals);
  }

  return fallbackNum.toFixed(decimals);
};

export const sanitizeDairyInfo = (info = {}) => {
  const baseSnf = formatDecimalString(
    info.base_snf ?? DEFAULT_DAIRY_SETTINGS.baseSnf,
    1,
    DEFAULT_DAIRY_SETTINGS.baseSnf
  );

  const clrConversion = formatDecimalString(
    info.clr_conversion_factor ?? DEFAULT_DAIRY_SETTINGS.clrConversionFactor,
    2,
    DEFAULT_DAIRY_SETTINGS.clrConversionFactor
  );

  return {
    id: info.id,
    dairy_name: info.dairy_name || '',
    dairy_address: info.dairy_address || '',
    rate_type: info.rate_type || DEFAULT_DAIRY_SETTINGS.rateType,
    base_snf: baseSnf,
    fat_snf_ratio: API_TO_INTERNAL_FAT_SNF_RATIO[info.fat_snf_ratio] || DEFAULT_DAIRY_SETTINGS.fatSnfRatio,
    clr_conversion_factor: clrConversion
  };
};

export const buildDairyUpdatePayload = (currentInfo, overrides = {}) => {
  if (!currentInfo?.id) {
    return null;
  }

  const merged = {
    ...currentInfo,
    ...overrides
  };

  const baseSnfString = toDecimalString(
    merged.base_snf ?? DEFAULT_DAIRY_SETTINGS.baseSnf,
    1,
    DEFAULT_DAIRY_SETTINGS.baseSnf
  );
  const clrConversionString = toDecimalString(
    merged.clr_conversion_factor ?? DEFAULT_DAIRY_SETTINGS.clrConversionFactor,
    2,
    DEFAULT_DAIRY_SETTINGS.clrConversionFactor
  );
  const resolvedRatio = INTERNAL_TO_API_FAT_SNF_RATIO[
    merged.fat_snf_ratio || DEFAULT_DAIRY_SETTINGS.fatSnfRatio
  ];

  return {
    id: merged.id,
    dairy_name: merged.dairy_name || '',
    dairy_address: merged.dairy_address || '',
    rate_type: merged.rate_type || DEFAULT_DAIRY_SETTINGS.rateType,
    base_snf: baseSnfString,
    clr_conversion_factor: clrConversionString,
    fat_snf_ratio: resolvedRatio
  };
};
