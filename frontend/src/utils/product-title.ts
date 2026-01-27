const OPEN_QUOTES = ['«', '"', '“', '„'];
const CLOSE_QUOTES = ['»', '"', '”', '‟'];
const LETTER_REGEX = /[A-Za-zА-Яа-яЁё]/;

export const extractQuotedTitle = (value?: string | null): string | null => {
  if (!value) return null;
  const text = value.trim();
  for (let i = 0; i < text.length; i += 1) {
    if (!OPEN_QUOTES.includes(text[i])) continue;
    let start = i + 1;
    while (start < text.length && !LETTER_REGEX.test(text[start]) && !CLOSE_QUOTES.includes(text[start])) {
      start += 1;
    }
    let end = start;
    while (end < text.length && !CLOSE_QUOTES.includes(text[end])) {
      end += 1;
    }
    if (end > start) {
      const candidate = text.slice(start, end).trim();
      if (candidate) {
        return candidate;
      }
    }
  }
  return null;
};

export const formatProductTitle = (value?: string | null): string => {
  return extractQuotedTitle(value) || value?.trim() || '';
};
