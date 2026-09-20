/**
 * Validates parsed product data to prevent corrupting the database.
 * 
 * @param {object} parsedData - The output of the parser { price, currency, inStock, stockText, name }
 * @param {object|null} lastRecord - The last known price_history record for this product
 * @returns {object} { isValid: boolean, error: string|null }
 */
export function validateScrapeResult(parsedData, lastRecord = null) {
    if (!parsedData) {
        return { isValid: false, error: "Parsed data is null or undefined." };
    }

    const { price } = parsedData;

    if (price === null || price === undefined) {
        return { isValid: false, error: "Price was not found." };
    }

    if (typeof price !== 'number' || !Number.isFinite(price)) {
        return { isValid: false, error: `Price '${price}' is not a finite number.` };
    }

    if (price <= 0) {
        return { isValid: false, error: `Price '${price}' must be greater than zero.` };
    }

    // Check bounds if we have a previous record
    if (lastRecord && lastRecord.price) {
        const lastPrice = parseFloat(lastRecord.price);
        const percentChange = Math.abs((price - lastPrice) / lastPrice) * 100;

        // Reject if price moves more than 70% in a single interval
        if (percentChange > 70) {
            return { 
                isValid: false, 
                error: `Price anomaly detected: new price ${price} is ${percentChange.toFixed(1)}% different from last known price ${lastPrice}.` 
            };
        }
    }

    return { isValid: true, error: null };
}
