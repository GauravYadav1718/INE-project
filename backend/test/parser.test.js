import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseProductHTML } from '../src/scraper/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('HTML Parser', () => {
    it('parses normal HTML structure with CSS selectors', () => {
        const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'normal.html'), 'utf-8');
        const { data, strategyUsed, missingSelectors } = parseProductHTML(html, 'http://test.com');
        
        expect(strategyUsed).toBe('css');
        expect(data.name).toBe('Awesome Widget');
        expect(data.price).toBe(79.5);
        expect(data.currency).toBe('USD');
        expect(data.inStock).toBe(true);
        expect(data.stockText).toBe('In stock · 14 left');
    });

    it('parses JSON-LD structure', () => {
        const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'jsonld.html'), 'utf-8');
        const { data, strategyUsed } = parseProductHTML(html, 'http://test.com');
        
        expect(strategyUsed).toBe('json-ld');
        expect(data.name).toBe('Executive Leather Chair');
        expect(data.price).toBe(149.99);
        expect(data.currency).toBe('EUR');
        expect(data.inStock).toBe(true);
    });

    it('fails gracefully on malformed HTML', () => {
        const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'malformed.html'), 'utf-8');
        const { data, strategyUsed, missingSelectors } = parseProductHTML(html, 'http://test.com');
        
        expect(strategyUsed).toBe('failed');
        expect(data.price).toBeNull();
        expect(data.inStock).toBe(false);
        expect(missingSelectors.length).toBeGreaterThan(0);
    });
});
