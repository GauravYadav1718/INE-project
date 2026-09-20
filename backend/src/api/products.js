import express from 'express';
import { supabase } from '../db/supabase.js';
import { scrapeProduct } from '../scraper/index.js';

export const router = express.Router();

/**
 * GET /api/products
 * Returns tracked list + latest price/stock + last scrape status + 24h change
 */
router.get('/', async (req, res) => {
    try {
        // Fetch all products
        const { data: products, error: prodErr } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (prodErr) throw prodErr;

        // Fetch latest history for all
        const { data: history } = await supabase.from('price_history').select('*').order('scraped_at', { ascending: false });
        // Fetch latest logs for all
        const { data: logs } = await supabase.from('scrape_logs').select('*').order('created_at', { ascending: false });

        // Map them together
        const enriched = products.map(p => {
            const productHistory = history.filter(h => h.product_id === p.id);
            const latestPrice = productHistory[0];
            
            // Calculate 24h change
            const yesterday = Date.now() - 24 * 60 * 60 * 1000;
            const pastPrice = productHistory.find(h => new Date(h.scraped_at).getTime() <= yesterday) || productHistory[productHistory.length - 1];
            
            let change24h = null;
            if (latestPrice && pastPrice && latestPrice.price !== pastPrice.price) {
                change24h = ((latestPrice.price - pastPrice.price) / pastPrice.price) * 100;
            }

            const latestLog = logs.find(l => l.product_id === p.id);

            return {
                ...p,
                latestPrice: latestPrice ? parseFloat(latestPrice.price) : null,
                inStock: latestPrice ? latestPrice.in_stock : null,
                stockText: latestPrice ? latestPrice.stock_text : null,
                change24h,
                lastScrapeStatus: latestLog ? latestLog.status : null,
                lastScrapeTime: latestLog ? latestLog.created_at : null
            };
        });

        res.json(enriched);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/products
 * Start tracking a new product. Expects { url, name, external_id, image_url }
 * Performs one immediate scrape.
 */
router.post('/', async (req, res) => {
    const { url, name, external_id, image_url } = req.body;
    
    if (!url || !name) {
        return res.status(400).json({ error: 'URL and Name are required' });
    }

    try {
        // Check if exists
        const { data: existing } = await supabase.from('products').select('id').eq('url', url).single();
        if (existing) {
            return res.status(409).json({ error: 'Product already tracked' });
        }

        const { data: product, error } = await supabase.from('products').insert({
            url, name, external_id, image_url
        }).select().single();
        
        if (error) throw error;

        // Perform immediate scrape in background so we don't block response too long,
        // or await it if we want to return the result immediately. Let's await it so the UI updates instantly.
        const scrapeResult = await scrapeProduct(product);
        
        if (scrapeResult.success && scrapeResult.data) {
            const { price, inStock, stockText, currency } = scrapeResult.data;
            if (price) {
                await supabase.from('price_history').insert({
                    product_id: product.id,
                    price,
                    in_stock: inStock,
                    stock_text: stockText
                });
                
                // Update currency on product if detected
                await supabase.from('products').update({ currency }).eq('id', product.id);
            }
        }

        res.status(201).json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/products/:id
 * Updates scrape_interval_minutes or is_active
 */
router.patch('/:id', async (req, res) => {
    const { scrape_interval_minutes, is_active } = req.body;
    
    try {
        const updates = {};
        if (scrape_interval_minutes !== undefined) updates.scrape_interval_minutes = scrape_interval_minutes;
        if (is_active !== undefined) updates.is_active = is_active;

        const { data, error } = await supabase.from('products').update(updates).eq('id', req.params.id).select().single();
        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/products/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('products').delete().eq('id', req.params.id);
        if (error) throw error;
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/products/:id/history
 */
router.get('/:id/history', async (req, res) => {
    try {
        const { data, error } = await supabase.from('price_history')
            .select('*')
            .eq('product_id', req.params.id)
            .order('scraped_at', { ascending: true }); // Chronological for charts
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/products/:id/logs
 */
router.get('/:id/logs', async (req, res) => {
    try {
        const { data, error } = await supabase.from('scrape_logs')
            .select('*')
            .eq('product_id', req.params.id)
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
