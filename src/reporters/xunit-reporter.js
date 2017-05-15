const builder = require('xmlbuilder');
const fs = require('fs');
module.exports = {
    report: function(comparisonResults, opts) {
         const files  =Object.keys(comparisonResults);
         const numFailedTests = files.filter((f) => !comparisonResults[f].passed).length;
         const testSuite = builder.create('testsuites').ele('testsuite', {
             errors: 0,
             tests: files.length,
             skipped: 0,
             failures: numFailedTests,
             time: "0",
             timestamp: (new Date()).toISOString()
         });
         files.forEach((file) => {
            const tcRes = comparisonResults[file];
            const res = comparisonResults[file].passed;
            const msg = `${tcRes.actual} should match ${tcRes.expected}`;
            const tc = testSuite.ele('testcase', {
                classname: 'N/A',
                name: msg,
                time: '0'
            });
            if (!res) {
                tc.ele('failure', {
                    message: msg
                }, msg);
            }
         });
         const report = testSuite.end({ pretty: true });
         const reportFile = opts.xunitFile || 'test_results.xml';
         fs.writeFileSync(reportFile, report);
    }
}