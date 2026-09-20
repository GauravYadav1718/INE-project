import pLimit from 'p-limit';
import { supabase } from '../db/supabase.js';
import { fetchWithRetry } from './fetcher.js';
import { scrapeWithBrowser } from './browser.js';
import { parseProductHTML } from './parser.js';
import { validateScrapeResult } from './validate.js';
import { detectAndAlertStructuralChanges } from './changeDetection.js';

async function getLastPriceRecord(productId) {
    const { data } = await supabase
        .from('price_history')
        .select('*')
        .eq('product_id', productId)
        .order('scraped_at', { ascending: false })
        .limit(1)
        .single();
    return data || null;
}

async function logScrapeResult(productId, status, duration, strategy, httpStatus, errorMessage, attempts = 1) {
    await supabase.from('scrape_logs').insert({
        product_id: productId,
        status: status,
        attempts: attempts,
        duration_ms: duration,
        http_status: httpStatus,
        error_message: errorMessage,
        strategy: strategy
    });
}

/**
 * Orchestrates scraping a single product: HTTP -> Validate -> Browser -> Validate.
 * Never throws, always returns a safe result object.
 */
export async function scrapeProduct(product) {
    console.log(`[Scraper] Starting scrape for ${product.name} (${product.url})`);
    const lastRecord = await getLastPriceRecord(product.id);
    const startOverall = Date.now();
    let totalAttempts = 0;

    // Phase 1: Lightweight HTTP Fetch
    totalAttempts++;
    const httpRes = await fetchWithRetry(product.url);
    if (httpRes.html) {
        const parsed = parseProductHTML(httpRes.html, product.url);
        const validation = validateScrapeResult(parsed.data, lastRecord);
        
        if (validation.isValid) {
            // Success via HTTP (highly unlikely for this specific target, but keeping the ladder)
            await logScrapeResult(product.id, 'success', Date.now() - startOverall, 'http', httpRes.status, null, totalAttempts);
            return { success: true, product, data: parsed.data };
        } else {
            console.log(`[Scraper] HTTP validation failed for ${product.name}: ${validation.error}. Escalating to browser.`);
        }
    } else {
        console.log(`[Scraper] HTTP fetch failed for ${product.name}: ${httpRes.error}. Escalating to browser.`);
    }

    // Phase 2: Escalate to Browser
    totalAttempts++;
    const browserRes = await scrapeWithBrowser(product.url);
    if (browserRes.html) {
        const parsed = parseProductHTML(browserRes.html, product.url);
        const validation = validateScrapeResult(parsed.data, lastRecord);

        // Check for structural changes regardless of success/failure if page loaded
        await detectAndAlertStructuralChanges(product.id, parsed, browserRes.html);

        if (validation.isValid) {
            // Success via Browser
            // If totalAttempts > 1, the overall status is technically 'retried' because HTTP failed first
            await logScrapeResult(product.id, 'retried', Date.now() - startOverall, 'browser', 200, null, totalAttempts);
            return { success: true, product, data: parsed.data };
        } else {
            console.error(`[Scraper] Browser validation failed for ${product.name}: ${validation.error}`);
            await logScrapeResult(product.id, 'failed', Date.now() - startOverall, 'browser', 200, validation.error, totalAttempts);
            return { success: false, product, error: validation.error };
        }
    } else {
        console.error(`[Scraper] Browser scrape failed for ${product.name}: ${browserRes.error}`);
        await logScrapeResult(product.id, 'failed', Date.now() - startOverall, 'browser', null, browserRes.error, totalAttempts);
        return { success: false, product, error: browserRes.error };
    }
}

/**
 * Scrapes a batch of products with bounded concurrency.
 */
export async function scrapeBatch(products, concurrency = 3) {
    const limit = pLimit(concurrency);
    const promises = products.map(product => limit(() => scrapeProduct(product)));
    const results = await Promise.allSettled(promises);
    
    // Convert Promise.allSettled results to a clean array
    return results.map(res => res.status === 'fulfilled' ? res.value : { success: false, error: 'Unexpected promise rejection' });
}
