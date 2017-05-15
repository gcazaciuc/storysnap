const chalk = require('chalk');
module.exports = {
    report: function report(comparisonResults) {
        Object.keys(comparisonResults).forEach((file) => {
            const res = comparisonResults[file].passed;
            let printedResult = null;
            if (res) {
                printedResult = chalk.green(`PASS Comparing actual/${file} with expected/${file} `)
            } else {
                printedResult = chalk.red(`FAILED Comparing actual/${file} with expected/${file} `)
            }
            console.log(printedResult);
        });
    }
}