import express from 'express';
import { supabase } from '../db/supabase.js';
import { scrapeBatch } from '../scraper/index.js';

export const router = express.Router();

// Simple in-memory lock for a single instance (sufficient for Render free tier)
let isRunning = false;
let lastRunStartedAt = 0;

/**
 * POST /api/cron/scrape
 * Scrapes every active product whose interval has elapsed.
 */
router.post('/scrape', async (req, res) => {
    // 1. Authenticate with x-cron-secret
    const secret = req.headers['x-cron-secret'];
    if (secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Prevent overlapping runs (Idempotency / Lock)
    const now = Date.now();
    const staleTimeout = 30 * 60 * 1000; // 30 minutes
    if (isRunning) {
        if (now - lastRunStartedAt < staleTimeout) {
            return res.status(409).json({ message: 'Scrape already in progress' });
        } else {
            console.warn('[Cron] Previous run seems stale, breaking lock.');
        }
    }

    isRunning = true;
    lastRunStartedAt = now;

    try {
        // 3. Find active products that are due for a scrape
        const { data: products, error: prodErr } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true);
            
        if (prodErr) throw prodErr;

        // Fetch latest log to check interval
        const { data: latestLogs } = await supabase.from('scrape_logs').select('product_id, created_at').order('created_at', { ascending: false });
        
        const dueProducts = products.filter(product => {
            const lastLog = latestLogs.find(l => l.product_id === product.id);
            if (!lastLog) return true; // never scraped
            
            const lastScrapeTime = new Date(lastLog.created_at).getTime();
            const elapsedMinutes = (now - lastScrapeTime) / (1000 * 60);
            
            return elapsedMinutes >= (product.scrape_interval_minutes || 120);
        });

        if (dueProducts.length === 0) {
            isRunning = false;
            return res.json({ message: 'No products due for scraping', count: 0 });
        }

        console.log(`[Cron] Starting batch scrape for ${dueProducts.length} products`);

        // Send a response early so cron-job.org doesn't timeout if the scrape takes minutes
        res.status(202).json({ message: 'Scrape batch started', count: dueProducts.length });

        // 4. Scrape with bounded concurrency
        const results = await scrapeBatch(dueProducts, 3);
        
        // 5. Insert valid results into price_history
        for (const res of results) {
            if (res.success && res.data && res.data.price) {
                await supabase.from('price_history').insert({
                    product_id: res.product.id,
                    price: res.data.price,
                    in_stock: res.data.inStock,
                    stock_text: res.data.stockText
                });
            }
        }

        console.log(`[Cron] Batch completed. Success: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => !r.success).length}`);

    } catch (error) {
        console.error('[Cron] Fatal error during scrape batch:', error);
    } finally {
        isRunning = false;
    }
});
