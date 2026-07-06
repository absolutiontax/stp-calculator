// interestRates.js

let rates = {};

// Load KMK data
export async function loadRates() {
    try {
        const response = await fetch("kmk.json");

        if (!response.ok) {
            throw new Error("Failed to load KMK data");
        }

        rates = await response.json();

    } catch (err) {
        console.error(err);
        rates = {};
    }
}

// Get one interest rate
export function getRate(period, sanksi) {

    const row = rates[period];

    if (!row) return null;

    return row[sanksi - 1] ?? null;
}

// Return all rates
export function getAllRates() {
    return rates;
}

// Add or update one month's rates
export function setRate(period, values) {
    rates[period] = values;
}

// Delete one month's rates
export function deleteRate(period) {
    delete rates[period];
}