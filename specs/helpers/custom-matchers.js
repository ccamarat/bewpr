beforeEach(() => {
    jasmine.addMatchers({
        toBeNear(util, customEqualityTesters) {
            return {
                compare (actual, expected, within = 1) {
                    return {
                        pass: (actual >= (expected - within)) && (actual <= (expected + within)),
                        message: `Expected ${actual} to be ${expected} +/- ${within}.`
                    };
                }
            }
        }
    });
});
