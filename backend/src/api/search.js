import express from 'express';
import { fetch } from 'undici';

export const router = express.Router();

let searchCache = {
    data: null,
    timestamp: 0
};

/**
 * GET /api/search?q=partial
 * Live search of the mock store by partial/full name. Caches catalog for 60s.
 */
router.get('/', async (req, res) => {
    const query = (req.query.q || '').toLowerCase();
    
    try {
        const now = Date.now();
        // Cache for 60s
        if (!searchCache.data || (now - searchCache.timestamp > 60000)) {
            // Fetch the mock store's catalog. We found this endpoint during recon.
            // It has pagination but for a mock store, page 1 with high pageSize usually gets everything.
            const response = await fetch(`${process.env.TARGET_BASE_URL || 'https://demo.inelabteamdev.com'}/api/catalog?page=1&pageSize=1000`);
            if (!response.ok) {
                return res.status(502).json({ error: 'Failed to fetch catalog from target store' });
            }
            const data = await response.json();
            searchCache = {
                data: data.items || [],
                timestamp: now
            };
        }

        const results = searchCache.data.filter(item => item.name.toLowerCase().includes(query));
        res.json(results);

    } catch (error) {
        console.error("[Search] Error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
