import { getRate } from "./interestRates.js";


function ymOf(date) {

    return (
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0")
    );

}


function eomonth(date, monthsToAdd) {

    return new Date(
        date.getFullYear(),
        date.getMonth() + monthsToAdd + 1,
        0
    );

}


function monthsBetween(start, end) {

    let months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());

    if (end.getDate() < start.getDate()) {

        months--;

    }

    return months;

}


/*
====================================================
CALCULATION RULES
====================================================
*/

const CALCULATION_RULES = {

    "PPh21": {

        "telat-bayar": {

            pasal: "9(2a)",
            rateRow: 2,
            endType: "payment",
            dueDateType: "masa"

        },

        "ketidakbenaran": {

            pasal: "8(5)",
            rateRow: 3

        },

        "stp-kekurangan": {

            pasal: "14(3)",
            rateRow: 2

        },

        "kekurangan-skp": {

            pasal: "19(1)",
            rateRow: 1

        },

        "skpkb-kurang-potong": {

            pasal: "13(3b)",
            rateRow: 5

        }

    },


    "UNIFIKASI": {

        "telat-bayar": {

            pasal: "9(2a)",
            rateRow: 2,
            endType: "payment",
            dueDateType: "masa"

        },

        "ketidakbenaran": {

            pasal: "8(5)",
            rateRow: 3

        },

        "stp-kekurangan": {

            pasal: "14(3)",
            rateRow: 2

        },

        "kekurangan-skp": {

            pasal: "19(1)",
            rateRow: 1

        },

        "skpkb-kurang-potong": {

            pasal: "13(3b)",
            rateRow: 5

        }

    },


    "PPh25": {

        "telat-bayar": {

            pasal: "9(2a)",
            rateRow: 2,
            endType: "payment",
            dueDateType: "masa"

        },

        "pembetulan": {

            pasal: "8(2a)",
            rateRow: 2,
            endType: "payment",
            dueDateType: "masa"

        },

        "stp-kekurangan": {

            pasal: "14(3)",
            rateRow: 2

        },

        "kekurangan-skp": {

            pasal: "19(1)",
            rateRow: 1

        }

    },


    "PPN": {

        "telat-bayar": {

            pasal: "9(2a)",
            rateRow: 2,
            endType: "payment",
            dueDateType: "ppn"

        },

        "skpkb": {

            pasal: "13(2)",
            rateRow: 4,
            endType: "skpkb",
            dueDateType: "ppn"

        },

        "ketidakbenaran": {

            pasal: "8(5)",
            rateRow: 3

        },

        "stp-kekurangan": {

            pasal: "14(3)",
            rateRow: 2

        },

        "kekurangan-skp": {

            pasal: "19(1)",
            rateRow: 1

        }

    },


    "TAHUNAN": {

        "telat-bayar": {

            pasal: "9(2b)",
            rateRow: 2,
            endType: "payment",
            dueDateType: "tahunan"

        },

        "pembetulan": {

            pasal: "8(2)",
            rateRow: 2,
            endType: "payment",
            dueDateType: "tahunan"

        },

        "skpkb": {

            pasal: "13(2)",
            rateRow: 4,
            endType: "skpkb",
            dueDateType: "tahunan",
            rateReference: "january-after-tax-year"

        },

        "ketidakbenaran": {

            pasal: "8(5)",
            rateRow: 3

        },

        "stp-kekurangan": {

            pasal: "14(3)",
            rateRow: 2

        },

        "kekurangan-skp": {

            pasal: "19(1)",
            rateRow: 1

        },

        "angsuran-hutang-pajak": {

            pasal: "19(2)",
            rateRow: 1

        },

        "penundaan-spt": {

            pasal: "19(3)",
            rateRow: 1

        }

    }

};


/*
====================================================
GET RULE
====================================================
*/

export function getCalculationRule(
    jenisPajak,
    jenisSanksi
) {

    return (
        CALCULATION_RULES[jenisPajak]?.[jenisSanksi]
        || null
    );

}


/*
====================================================
CALCULATE DUE DATE
====================================================
*/

export function calculateDueDate(
    jenisPajak,
    masaDate,
    taxpayerType = null
) {

    /*
    ================================================
    SPT MASA
    ================================================
    */

    /*
    PPh 21
    Unifikasi
    PPh 25

    Due:
    15th of following month
    */

    if (

        jenisPajak === "PPh21" ||
        jenisPajak === "UNIFIKASI" ||
        jenisPajak === "PPh25"

    ) {

        return new Date(

            masaDate.getFullYear(),

            masaDate.getMonth() + 1,

            15

        );

    }


    /*
    PPN

    Due:
    Last day of following month
    */

    if (

        jenisPajak === "PPN"

    ) {

        return new Date(

            masaDate.getFullYear(),

            masaDate.getMonth() + 2,

            0

        );

    }


    /*
    ================================================
    SPT TAHUNAN
    ================================================
    */

    /*
    Orang Pribadi

    Due:
    31 March following year
    */

    if (

        jenisPajak === "TAHUNAN" &&
        taxpayerType === "OP"

    ) {

        return new Date(

            masaDate.getFullYear() + 1,

            2,

            31

        );

    }


    /*
    Badan

    Due:
    30 April following year
    */

    if (

        jenisPajak === "TAHUNAN" &&
        taxpayerType === "BADAN"

    ) {

        return new Date(

            masaDate.getFullYear() + 1,

            3,

            30

        );

    }


    throw new Error(

        `Unable to calculate due date for ${jenisPajak}`

    );

}

/*
====================================================
CALCULATE LATE MONTHS
Maximum: 24 months
====================================================
*/

export function calculateMonths(

    startDate,
    endDate

) {

    if (endDate < startDate) {

        return 0;

    }


    let months =

        monthsBetween(
            startDate,
            endDate
        ) + 1;


    /*
    All interest sanctions:
    maximum 24 months
    */

    return Math.min(
        months,
        24
    );

}


/*
====================================================
GET KMK REFERENCE MONTH
====================================================
*/

export function getRateReference(

    rule,
    masaDate,
    dueDate

) {

    /*
    Special rule validated from
    Tahunan SKPKB examples:

    January after the tax year
    */

    if (

        rule.rateReference ===
        "january-after-tax-year"

    ) {

        return (

            masaDate.getFullYear() + 1

        ) + "-01";

    }


    /*
    PPN:
    Current STP logic uses the month
    after the due date.
    */

    if (

        rule.dueDateType ===
        "ppn"

    ) {

        const nextMonth =

            new Date(

                dueDate.getFullYear(),

                dueDate.getMonth() + 1,

                1

            );


        return ymOf(
            nextMonth
        );

    }


    /*
    Default:
    KMK rate from due date month
    */

    return ymOf(
        dueDate
    );

}


/*
====================================================
CALCULATE SANCTION
====================================================
*/

export function calculateSanction({

    jenisPajak,

    jenisSanksi,

    taxpayerType,

    masaDate,

    endDate,

    pokok

}) {


	const rule =

		getCalculationRule(

			jenisPajak,

			jenisSanksi

		);


    if (!rule) {

		throw new Error(

			`Calculation rule not found for ` +
			`${jenisPajak} / ${jenisSanksi}`

		);

    }


    const dueDate =

		calculateDueDate(

			jenisPajak,

			masaDate,

			taxpayerType

		);


    const months =

        calculateMonths(

            dueDate,

            endDate

        );


    const rateReference =

        getRateReference(

            rule,

            masaDate,

            dueDate

        );


    const rate =

        getRate(

            rateReference,

            rule.rateRow

        );


    const sanction =

        rate !== null

            ? pokok * months * rate

            : null;


    return {

        jenisPajak,

		jenisSanksi,

        pasal: rule.pasal,

        rateRow: rule.rateRow,

        dueDate,

        endDate,

        months,

        rateReference,

        rate,

        pokok,

        sanction

    };

}