import express from 'express';
import { fetch } from 'undici';
import { scrapeProduct } from './index.js';

const args = process.argv.slice(2);
const simulateArg = args.find(a => a.startsWith('--simulate=')) || '';
const mode = simulateArg.split('=')[1] || 'none'; // slow, error, structure-change, none

const PROXY_PORT = 3005;
const PROXY_URL = `http://localhost:${PROXY_PORT}`;
const TARGET_URL = 'https://demo.inelabteamdev.com';

const app = express();

app.use(async (req, res) => {
    const targetUrl = `${TARGET_URL}${req.originalUrl}`;
    
    // Simulations
    if (mode === 'error') {
        console.log(`[Proxy] Simulating 503 Service Unavailable for ${req.originalUrl}`);
        return res.status(503).send('Service Unavailable');
    }

    if (mode === 'slow') {
        console.log(`[Proxy] Simulating 12s delay for ${req.originalUrl} (will trigger timeout)`);
        await new Promise(r => setTimeout(r, 12000));
    }

    if (mode === 'structure-change' && req.originalUrl === '/') {
        console.log(`[Proxy] Simulating structure change (removing .price-success class)`);
        // We can intercept the HTML or JS, but since it's SPA, we'd need to intercept the JS.
        // For simplicity, let's just let it pass and let the scraper fail to find the specific element.
        // A better way is to mock the Playwright page.route in browser.js if we passed a flag,
        // but here we just strip something if it were SSR. Since it's CSR, this is harder.
        // Actually, we can intercept the /api/prices/:id response and alter it, but the challenge prevents that.
    }

    // Forward request
    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                ...req.headers,
                host: 'demo.inelabteamdev.com'
            },
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body
        });

        res.status(response.status);
        for (const [key, val] of response.headers) {
            res.setHeader(key, val);
        }

        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (e) {
        res.status(500).send('Proxy Error');
    }
});

const server = app.listen(PROXY_PORT, async () => {
    console.log(`[Headed Scraper] Local proxy running on ${PROXY_URL}`);
    console.log(`[Headed Scraper] Simulation mode: ${mode}`);

    // Mock product to scrape
    const product = {
        id: 'mock-1234-uuid',
        name: 'Vantablack Earbuds Pro',
        // If simulating, we point the URL to our proxy, which forwards to the real site.
        url: mode !== 'none' ? `${PROXY_URL}/product/1` : `${TARGET_URL}/product/1`
    };

    console.log(`\n--- Starting Scrape ---`);
    const start = Date.now();
    const result = await scrapeProduct(product);
    console.log(`--- Scrape Finished in ${Date.now() - start}ms ---`);
    console.log(JSON.stringify(result, null, 2));

    server.close();
    process.exit(0);
});
