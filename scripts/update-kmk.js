const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const FIRST_YEAR = 2020;
const FIRST_MONTH = 12;
const EXPECTED_MIN_PERIODS = 60;
const MONTH_MAP = {
    Januari: "01",
    Februari: "02",
    Maret: "03",
    April: "04",
    Mei: "05",
    Juni: "06",
    Juli: "07",
    Agustus: "08",
    September: "09",
    Oktober: "10",
    November: "11",
    Desember: "12"
};

function formatDate(year, month){

    return `${year}-${String(month).padStart(2,"0")}-01`;

}

async function fetchMonth(date){

    const url =
        `https://fiskal.kemenkeu.go.id/informasi-publik/kmk-tarif-bunga?date=${date}`;

    const response = await axios.get(url);

    const $ = cheerio.load(response.data);
	
	let periodText = "";

	$("em").each((i, el) => {

		const text = $(el).text().trim();

		if (text.includes("Tanggal berlaku")) {
			periodText = text;
		}

	});

	const match = periodText.match(
    /(\d{2})\s+([A-Za-z]+)\s+(\d{4})/
		);
	if (!match) {
    throw new Error(`Unable to parse period from page: ${date}`);
	}

	const monthName = match[2];
	const year = match[3];

	const period = `${year}-${MONTH_MAP[monthName]}`;
	
    const rates = [];

	$(".informasi-table-block tbody tr").each((i,row)=>{

		const rateText = $(row)
			.find("td")
			.eq(2)
			.text()
			.trim();

		const match = rateText.match(/([\d,]+)%/);

		if(match){

			const rate = Number(
				(parseFloat(match[1].replace(",", ".")) / 100)
				.toFixed(4)
			);

			rates.push(rate);

		}

	});

	if (rates.length !== 5) {

		throw new Error(
			`Expected 5 interest rates for ${period}, but found ${rates.length}.`
		);

	}

    return {
    period,
    rates
	};

}

async function buildRatesDatabase() {

    const database = {};

    const now = new Date();

    const totalMonths =
        (now.getFullYear() - FIRST_YEAR) * 12 +
        now.getMonth() + 1;

    let current = 0;

    console.log("\nBuilding KMK database...\n");

    for (let year = FIRST_YEAR; year <= now.getFullYear(); year++) {

        const startMonth = (year === FIRST_YEAR) ? FIRST_MONTH : 1;
        const endMonth = (year === now.getFullYear())
            ? now.getMonth() + 1
            : 12;

        for (let month = startMonth; month <= endMonth; month++) {

            current++;

            const date = formatDate(year, month);

            process.stdout.write(
                `[${current}/${totalMonths}] ${date.substring(0, 7)}... `
            );

            try {

                const result = await fetchMonth(date);

                database[result.period] = result.rates;

                console.log("✓");

            } catch (err) {

                console.log("✗");
                console.error(`   Failed to fetch ${date}`);
                console.error(`   ${err.message}`);

            }

        }

    }

    return database;

}

function loadCurrentDatabase() {

    return JSON.parse(
        fs.readFileSync("kmk.json", "utf8")
    );

}

function compareDatabase(oldDb, newDb) {

    const changes = {
        added: [],
        updated: [],
        removed: []
    };

    // Find added or updated periods
    for (const period in newDb) {

        if (!(period in oldDb)) {

            changes.added.push(period);

        } else {

            const oldRates = JSON.stringify(oldDb[period]);
            const newRates = JSON.stringify(newDb[period]);

            if (oldRates !== newRates) {
                changes.updated.push(period);
            }

        }

    }

    // Find removed periods
    for (const period in oldDb) {

        if (!(period in newDb)) {
            changes.removed.push(period);
        }

    }

    return changes;

}

function printSummary(oldDb, newDb, changes) {

    console.log("\n========================================");
    console.log("             Update Summary");
    console.log("========================================");

    console.log(`Previous Periods : ${Object.keys(oldDb).length}`);
    console.log(`Current Periods  : ${Object.keys(newDb).length}`);

    console.log("");

    console.log(`Added            : ${changes.added.length}`);
    console.log(`Updated          : ${changes.updated.length}`);
    console.log(`Removed          : ${changes.removed.length}`);

    if (changes.added.length) {

        console.log("\nAdded:");

        changes.added.forEach(period =>
            console.log(`  + ${period}`)
        );

    }

    if (changes.updated.length) {

        console.log("\nUpdated:");

        changes.updated.forEach(period =>
            console.log(`  * ${period}`)
        );

    }

    if (changes.removed.length) {

        console.log("\nRemoved:");

        changes.removed.forEach(period =>
            console.log(`  - ${period}`)
        );

    }

}

function saveDatabase(database) {

    fs.writeFileSync(
        "kmk.json",
        JSON.stringify(database, null, 2)
    );

}

async function main(){
	
	try {
	console.log("========================================");
	console.log("      STP KMK Database Updater v.1.0");
	console.log("========================================");
	
	const startTime = Date.now();
	const oldDatabase = loadCurrentDatabase();

	const newDatabase = await buildRatesDatabase();
	
	const changes = compareDatabase(oldDatabase, newDatabase);

	printSummary(oldDatabase, newDatabase, changes);

	const hasChanges =
    changes.added.length > 0 ||
    changes.updated.length > 0 ||
    changes.removed.length > 0;

	if (hasChanges) {
		if (Object.keys(newDatabase).length < EXPECTED_MIN_PERIODS) {

		throw new Error(
			"Database looks incomplete. Aborting save."
			);

		}
		saveDatabase(newDatabase);

		console.log("\n✓ kmk.json updated successfully.");

	} else {

		console.log("\n✓ No changes detected.");
		console.log("✓ kmk.json is already up to date.");

	}
	const seconds =
		((Date.now() - startTime) / 1000).toFixed(2);

	console.log(`\nCompleted in ${seconds} seconds.`);

} catch (err) {
        console.error("\n✗ Update failed.");
        console.error(err.message);

        process.exit(1);
	}
}
main();