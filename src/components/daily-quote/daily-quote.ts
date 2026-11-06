import { fetchJson } from '../../services/api';

const DAILY_QUOTE_STORAGE_KEY = 'your-energy-daily-quote';
const QUOTE_ERROR_MESSAGE = 'Unable to load the quote. Please try again later.';
const DAILY_QUOTE_API_URL = 'https://your-energy.b.goit.study/api/quote';

export interface DailyQuote {
  author: string;
  quote: string;
}

interface StoredDailyQuote {
  date: string;
  quote: DailyQuote;
}

const quoteRequests = new Map<string, Promise<DailyQuote>>();

function isDailyQuote(value: unknown): value is DailyQuote {
  if (typeof value !== 'object' || value === null) return false;
  if (!('author' in value) || !('quote' in value)) return false;

  return typeof value.author === 'string' && typeof value.quote === 'string';
}

export function getDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readStoredQuote(date: string): DailyQuote | undefined {
  try {
    const stored = localStorage.getItem(DAILY_QUOTE_STORAGE_KEY);
    if (!stored) return undefined;

    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('date' in parsed) ||
      !('quote' in parsed) ||
      typeof parsed.date !== 'string' ||
      parsed.date !== date ||
      !isDailyQuote(parsed.quote)
    ) {
      return undefined;
    }

    return parsed.quote;
  } catch {
    return undefined;
  }
}

function saveQuote(date: string, quote: DailyQuote): void {
  localStorage.setItem(
    DAILY_QUOTE_STORAGE_KEY,
    JSON.stringify({ date, quote } satisfies StoredDailyQuote)
  );
}

export function getDailyQuote(): Promise<DailyQuote> {
  const date = getDateKey();
  const storedQuote = readStoredQuote(date);
  if (storedQuote) return Promise.resolve(storedQuote);

  const pendingRequest = quoteRequests.get(date);
  if (pendingRequest) return pendingRequest;

  const request = fetchJson<unknown>(DAILY_QUOTE_API_URL)
    .then(quote => {
      if (!isDailyQuote(quote)) {
        throw new Error('The quote response has an invalid format.');
      }
      if (getDateKey() === date) {
        try {
          saveQuote(date, quote);
        } catch {
          // A cache write failure must not hide a valid API response.
        }
      }
      return quote;
    })
    .finally(() => {
      quoteRequests.delete(date);
    });

  quoteRequests.set(date, request);
  return request;
}

function renderQuote(container: HTMLElement, quote: DailyQuote): void {
  const text = container.querySelector<HTMLElement>('[data-quote-text]');
  const author = container.querySelector<HTMLElement>('[data-quote-author]');
  const error = container.querySelector<HTMLElement>('[data-quote-error]');
  if (!text || !author || !error) {
    throw new Error('Daily quote is missing required elements.');
  }

  text.textContent = `“${quote.quote}”`;
  author.textContent = quote.author;
  error.hidden = true;
}

function renderError(container: HTMLElement): void {
  const text = container.querySelector<HTMLElement>('[data-quote-text]');
  const author = container.querySelector<HTMLElement>('[data-quote-author]');
  const error = container.querySelector<HTMLElement>('[data-quote-error]');
  if (!text || !author || !error) {
    throw new Error('Daily quote is missing required elements.');
  }

  text.textContent = '';
  author.textContent = '';
  error.textContent = QUOTE_ERROR_MESSAGE;
  error.hidden = false;
}

export function initDailyQuotes(): void {
  for (const container of document.querySelectorAll<HTMLElement>(
    '[data-daily-quote]'
  )) {
    getDailyQuote()
      .then(quote => renderQuote(container, quote))
      .catch(() => renderError(container));
  }
}
