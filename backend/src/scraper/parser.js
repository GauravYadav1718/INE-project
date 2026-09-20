import * as cheerio from 'cheerio';

/**
 * Extracts price, currency, stock status, and name from HTML.
 * Tries multiple selector strategies in order.
 * 
 * @param {string} html - The raw HTML string
 * @param {string} url - The URL of the product
 * @returns {object} { data, strategyUsed, missingSelectors }
 */
export function parseProductHTML(html, url) {
    const $ = cheerio.load(html);
    const result = {
        price: null,
        currency: 'USD',
        inStock: false,
        stockText: null,
        name: null
    };

    let strategyUsed = null;
    const missingSelectors = [];

    // 1. Try JSON-LD
    const jsonLdScripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < jsonLdScripts.length; i++) {
        try {
            const data = JSON.parse($(jsonLdScripts[i]).html());
            let productData = Array.isArray(data) ? data.find(d => d['@type'] === 'Product') : data;
            if (productData && productData['@type'] === 'Product') {
                if (productData.name) result.name = productData.name;
                if (productData.offers) {
                    const offer = Array.isArray(productData.offers) ? productData.offers[0] : productData.offers;
                    if (offer.price) result.price = parseFloat(offer.price);
                    if (offer.priceCurrency) result.currency = offer.priceCurrency;
                    if (offer.availability) {
                        result.inStock = offer.availability.includes('InStock');
                        result.stockText = offer.availability;
                    }
                    strategyUsed = 'json-ld';
                    return { data: result, strategyUsed, missingSelectors };
                }
            }
        } catch (e) {
            // ignore JSON parse errors
        }
    }
    missingSelectors.push('application/ld+json');

    // 2. Try Embedded Next.js/Nuxt Data
    try {
        const nextData = $('#__NEXT_DATA__').html();
        if (nextData) {
            const parsed = JSON.parse(nextData);
            // Deep search for price could go here. For now, just mark missing if not found.
        }
    } catch (e) {}
    missingSelectors.push('__NEXT_DATA__');

    // 3. Fallback to CSS Selectors (specific to our target's structure)
    
    // Extract Name
    result.name = $('h1').text().trim() || $('.tile-name').text().trim() || $('title').text().trim();
    
    // Extract Price (Targeting the complex DOM structure we reverse-engineered)
    // Strategy A: The hidden data-price attribute (might be a trap, but worth trying)
    let priceText = $('.price-main .amount[data-price="true"]').text() || $('.price-main .price-value').text();
    
    // Strategy B: The visible rendered text in the price block
    if (!priceText) {
        // Find the visible price element which typically has the large font weight
        priceText = $('.price-success span[style*="font-size: 2.4rem"]').text() || 
                    $('.price-success span[style*="font-weight: 700"]').text() ||
                    $('.price-block span[style*="font-weight"]').first().text();
    }

    if (priceText) {
        // Strip currency symbols and thousands separators
        const cleanPrice = priceText.replace(/[^0-9.]/g, '');
        result.price = parseFloat(cleanPrice);
        if (priceText.includes('₹') || priceText.includes('Rs') || priceText.includes('INR')) result.currency = 'INR';
        else if (priceText.includes('€')) result.currency = 'EUR';
        else if (priceText.includes('£')) result.currency = 'GBP';
        else result.currency = 'USD'; // default
        strategyUsed = 'css';
    } else {
        missingSelectors.push('.price-success span[style*="font-size: 2.4rem"]');
    }

    // Extract Stock
    const stockBadge = $('.stock-badge');
    if (stockBadge.length > 0) {
        result.stockText = stockBadge.text().trim();
        const textLower = result.stockText.toLowerCase();
        result.inStock = stockBadge.hasClass('in-stock') || (!textLower.includes('out of stock') && !textLower.includes('sold out'));
    } else {
        // Fallback looking for text
        const bodyText = $('body').text().toLowerCase();
        if (bodyText.includes('out of stock')) {
            result.inStock = false;
            result.stockText = 'Out of stock';
        } else if (bodyText.includes('in stock') || bodyText.includes('left')) {
            result.inStock = true;
            result.stockText = 'In stock';
        } else {
            missingSelectors.push('.stock-badge');
        }
    }

    if (!strategyUsed) {
        strategyUsed = 'failed';
    }

    return { data: result, strategyUsed, missingSelectors };
}
