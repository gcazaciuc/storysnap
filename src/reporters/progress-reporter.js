module.exports = {
    report: function report(comparisonResults) {
        Object.keys(comparisonResults).forEach((file) => {
            const res = comparisonResults[file];
            const printedResult = res ? 'PASS' : 'FAILED';
            console.log(`${printedResult} Comparing actual/${file} with expected/${file} `)
        });
    }
}