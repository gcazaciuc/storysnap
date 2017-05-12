const utils = {
    node: function node(name, attributes) {
        var _node   = document.createElementNS('', name);
        for (var attrName in attributes) {
            var value = attributes[attrName];
            if (attributes.hasOwnProperty(attrName) && isString(attrName)) {
                _node.setAttribute(attrName, value);
            }
        }
        return _node;
    }
}
/**
 * JUnit XML (xUnit) exporter for test results.
 *
 */
function XUnitExporter() {
}

XUnitExporter.prototype.getXML = function getXML(results) {
    const self = this;
    const suiteNode = utils.node('testsuite', {
            name: result.name,
            tests: result.assertions,
            failures: result.failed,
            errors: result.crashed,
            time: 'N/A',
            timestamp: (new Date()).toISOString(),
            'package': 'N/A'
    });
    results.forEach((result) => {
        // successful test cases
        const testCase = utils.node('testcase', {
            name: success.message || success.standard,
            classname: generateClassName(success.file),
            time: utils.ms2seconds(~~success.time)
        });
        suiteNode.appendChild(testCase);
       
        // warnings
        const warningNode = utils.node('system-out');
        warningNode.appendChild(self._xmlDocument.createCDATASection(result.warnings.join('\n')));
        suiteNode.appendChild(warningNode);
        this._xml.appendChild(suiteNode);
    });

    this._xml.setAttribute('time', utils.ms2seconds(this.results.calculateDuration()));

    return this._xmlDocument;
};

XUnitExporter.prototype.report = function report(comparisonResults) {
    const serializer = new XMLSerializer();
    this.setupDocument();
    let document = this.getXML(comparisonResults);
    return `<?xml version="1.0" encoding="UTF-8"?>${serializer.serializeToString(document)}`;
};

XUnitExporter.prototype.setupDocument = function setupDocument() {
    // Note that we do NOT use a documentType here, because validating
    // parsers try to fetch the (non-existing) DTD and fail #1528
    this._xmlDocument = document.implementation.createDocument("", "");
    this._xml = this._xmlDocument.appendChild(this._xmlDocument.createElement("testsuites"));
};

module.exports = new XUnitExporter();