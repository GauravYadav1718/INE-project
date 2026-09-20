import { supabase } from '../db/supabase.js';

/**
 * Detects structural changes and logs them to the database.
 * 
 * @param {string} productId - The UUID of the product
 * @param {object} parserResult - The result object from parseProductHTML
 * @param {string} rawHtml - The raw HTML snippet for debugging
 */
export async function detectAndAlertStructuralChanges(productId, parserResult, rawHtml) {
    const { strategyUsed, missingSelectors } = parserResult;

    // If we completely failed to find the price using any strategy, but the page loaded 200 OK
    // Or if we have a list of missing primary selectors
    if (strategyUsed === 'failed' || (missingSelectors && missingSelectors.length > 0)) {
        
        // Take a small snippet of the HTML to store (avoid blowing up DB)
        const rawSnippet = rawHtml ? rawHtml.substring(0, 1000) : null;

        try {
            await supabase.from('structure_alerts').insert({
                product_id: productId,
                missing_selectors: missingSelectors,
                raw_snippet: rawSnippet
            });
            console.warn(`[Change Detection] Structure alert logged for product ${productId}. Missing selectors: ${missingSelectors.join(', ')}`);
        } catch (err) {
            console.error(`[Change Detection] Failed to log structure alert for product ${productId}:`, err);
        }
    }
}
