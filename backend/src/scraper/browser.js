import { chromium } from 'playwright';

let browserInstance = null;

async function getBrowser() {
    if (!browserInstance) {
        browserInstance = await chromium.launch({
            headless: process.env.HEADLESS !== 'false',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
    }
    return browserInstance;
}

/**
 * Uses Playwright to load the page, trigger anti-bot challenges (mouse move),
 * and wait for the price to appear in the DOM.
 * 
 * @param {string} url - Target URL
 * @returns {object} { html, duration, error }
 */
export async function scrapeWithBrowser(url) {
    const startTime = Date.now();
    let browser = null;
    let context = null;

    try {
        browser = await getBrowser();
        context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });
        
        const page = await context.newPage();

        // Block images, fonts, and media to cut latency
        await page.route('**/*', (route) => {
            const type = route.request().resourceType();
            if (['image', 'font', 'media'].includes(type)) {
                route.abort();
            } else {
                route.continue();
            }
        });

        // Navigate to URL
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Hide cookie overlays or modals that might intercept pointer events
        await page.addStyleTag({ content: '.cookie-overlay, [class*="cookie"] { display: none !important; }' });

        // Simulate mouse movements to trigger the price load (required by target site's anti-bot)
        // The challenge requires minMoves: 8 and minDwellMs: 600 over the price block.
        try {
            // First find where the price block is
            const priceBlock = await page.waitForSelector('.price-block', { timeout: 5000 });
            await priceBlock.scrollIntoViewIfNeeded();
            const box = await priceBlock.boundingBox();
            if (box) {
                const startX = box.x + 10;
                const startY = box.y + 10;
                
                // Move over the block 12 times slowly to satisfy minMoves: 8 and delta > 40ms
                // Use a tiny zig-zag pattern (e.g. +/- 5px) to ensure we NEVER leave the bounding box!
                for (let i = 0; i < 12; i++) {
                    const offsetX = (i % 2 === 0) ? 5 : -5;
                    const offsetY = (i % 3 === 0) ? 5 : -5;
                    await page.mouse.move(startX + offsetX, startY + offsetY);
                    await page.waitForTimeout(100);
                }
                
                // Dwell over the block to satisfy minDwellMs: 600
                await page.waitForTimeout(800);
            }

            // After hover challenge, the Reveal price button should be enabled
            const revealButton = await page.$('button.btn-primary:has-text("Reveal price")');
            if (revealButton) {
                // Playwright click will wait for it to be enabled by default
                await revealButton.click({ timeout: 5000 });
                console.log(`[Browser] Clicked Reveal Price button`);
            }
        } catch(e) {
            console.warn(`[Browser] Could not perform mouse challenge:`, e.message);
        }

        // Wait for the price to actually appear. 
        // We know from reverse engineering that .price-success class is added, or an amount is shown
        try {
            await page.waitForFunction(() => {
                const priceValue = document.querySelector('.price-success span');
                const dataPrice = document.querySelector('[data-price="true"]');
                return (priceValue && priceValue.innerText) || (dataPrice && dataPrice.innerText);
            }, { timeout: 10000 });
        } catch (error) {
            console.warn(`[Browser] Timeout waiting for price selector on ${url}`);
            // Let it fall through, maybe the page is just structured differently now
        }

        const html = await page.content();
        const duration = Date.now() - startTime;
        
        await context.close();
        return { html, duration, error: null };
        
    } catch (error) {
        if (context) await context.close();
        return { html: null, duration: Date.now() - startTime, error: error.message };
    }
}
