import { fetch } from 'undici';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateJitterBackoff(attempt, base = 500, cap = 8000) {
    const temp = Math.min(cap, base * 2 ** attempt);
    return Math.floor(temp / 2 + Math.random() * (temp / 2));
}

/**
 * Fetches HTML from a URL using undici with exponential backoff and jitter.
 * 
 * @param {string} url - Target URL
 * @param {number} maxRetries - Max number of retries (default 4)
 * @returns {object} { html, status, duration }
 */
export async function fetchWithRetry(url, maxRetries = 4) {
    const controller = new AbortController();
    let attempt = 0;
    
    while (attempt <= maxRetries) {
        const startTime = Date.now();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const duration = Date.now() - startTime;
            
            if (response.ok) {
                const html = await response.text();
                return { html, status: response.status, duration, error: null };
            }

            // Don't retry on 404 or 400
            if (response.status === 404 || response.status === 400) {
                return { html: null, status: response.status, duration, error: `HTTP ${response.status}` };
            }

            // Retry on 429 or 5xx
            if (response.status === 429 || response.status >= 500) {
                throw new Error(`HTTP ${response.status}`);
            }

            return { html: null, status: response.status, duration, error: `Unexpected HTTP ${response.status}` };

        } catch (error) {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            
            const isRetryable = error.name === 'AbortError' || error.message.includes('fetch failed') || error.message.includes('HTTP');
            
            if (!isRetryable || attempt === maxRetries) {
                return { html: null, status: null, duration, error: error.message };
            }

            const delayMs = calculateJitterBackoff(attempt);
            console.log(`[Fetcher] Request failed: ${error.message}. Retrying in ${delayMs}ms (Attempt ${attempt + 1}/${maxRetries})`);
            await sleep(delayMs);
            attempt++;
        }
    }
}
