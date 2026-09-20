import { validateScrapeResult } from '../src/scraper/validate.js';

describe('Scrape Validator', () => {
    it('validates a correct price', () => {
        const result = validateScrapeResult({ price: 100.50, currency: 'USD' });
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
    });

    it('rejects null or missing price', () => {
        const result = validateScrapeResult({ price: null });
        expect(result.isValid).toBe(false);
        
        const result2 = validateScrapeResult({});
        expect(result2.isValid).toBe(false);
    });

    it('rejects zero or negative prices', () => {
        const result = validateScrapeResult({ price: 0 });
        expect(result.isValid).toBe(false);
        
        const result2 = validateScrapeResult({ price: -50 });
        expect(result2.isValid).toBe(false);
    });

    it('rejects non-finite prices', () => {
        const result = validateScrapeResult({ price: NaN });
        expect(result.isValid).toBe(false);
        
        const result2 = validateScrapeResult({ price: Infinity });
        expect(result2.isValid).toBe(false);
    });

    it('rejects price swings > 70%', () => {
        // Last price was 100, new price is 171 (71% increase)
        const result = validateScrapeResult({ price: 171 }, { price: 100 });
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/anomaly detected/i);

        // Last price was 100, new price is 29 (71% decrease)
        const result2 = validateScrapeResult({ price: 29 }, { price: 100 });
        expect(result2.isValid).toBe(false);
        expect(result2.error).toMatch(/anomaly detected/i);
    });

    it('accepts price swings <= 70%', () => {
        // Last price was 100, new price is 170 (70% increase)
        const result = validateScrapeResult({ price: 170 }, { price: 100 });
        expect(result.isValid).toBe(true);

        // Last price was 100, new price is 30 (70% decrease)
        const result2 = validateScrapeResult({ price: 30 }, { price: 100 });
        expect(result2.isValid).toBe(true);
    });
});
