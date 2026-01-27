export const formatPrice = (value: number | string): string => {
  const numeric = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  return numeric.toLocaleString('ru-RU');
};
