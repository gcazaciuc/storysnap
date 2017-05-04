const exec = require('child_process').exec;
const chrome = require('chrome-remote-interface');
const launcher = require('./chrome-launcher.js');
const cropper = require('png-crop');
const fs = require('fs');
const Events = {
    MOUSE_PRESSED: 'mousePressed',
    MOUSE_RELEASED: 'mouseReleased',
    MOUSE_MOVED: 'mouseMoved'
};

module.exports = {
    _client: null,
    _documentNodeId: null,
    launch: function launch(url, headless=true) {
        return new Promise((resolve, reject) => {
            launcher.launchChrome(url, headless).then(() => {
                chrome((client) => {
                    const {DOM, Emulation, Network, Page, Runtime, CSS} = client;
                    Page
                        .enable()
                        .then(() => DOM.enable())
                        .then(() => Network.enable())
                        .then(() =>  DOM.getDocument())
                        .then((node) => {
                            this._client = client;
                            const {root: {nodeId: documentNodeId}} = node;
                            this._documentNodeId = documentNodeId;
                            resolve();
                        });
                });
            })
        })
    },
    /**
     * Destroys the launched instance and cleans up the resources
     */
    kill: () => {
        return launcher.kill();
    },
    getBoundingBox: function getBoundingBox(selector) {
        const { DOM } = this._client;
        if (typeof selector === 'number') {
            // we are dealing with a NodeId
            return DOM.getBoxModel({ nodeId: selector });
        }
        return this.querySelector(selector).then(({ nodeId: bodyNodeId }) => {
            return DOM.getBoxModel({ nodeId: bodyNodeId });
        });
    },
    _retrieveNodeId: function _retrieveNodeId(nodeId) {
        const { DOM } = this._client;
        let rootDocPromise = null;
        if (typeof nodeId === 'undefined' || nodeId === null) {
            console.log('Node id not specified');
            rootDocPromise = new Promise((resolve) => resolve({root: {nodeId: this._documentNodeId }}));
        } else {
            console.log('Node id IS specified');
            rootDocPromise = new Promise((resolve) => resolve({root: {nodeId}}));
        }
        return rootDocPromise;
    },
    /**
     * Queries the page returning a single node id
     * of the node matching the specified selector
     */
    querySelector: function querySelector(selector, nodeId) {
        const { DOM } = this._client;
        let rootDocPromise = this._retrieveNodeId(nodeId);
        return rootDocPromise.then((doc) => {
            const {root: {nodeId: documentNodeId}} = doc;
            console.log(doc);
            return DOM.querySelector({
                selector: selector,
                nodeId: documentNodeId,
            })
        });
    },
    /**
     * Queries the page returning all the node ids
     * matching the selector
     */
    querySelectorAll: function querySelector(selector, nodeId) {
        const { DOM } = this._client;
        let rootDocPromise = this._retrieveNodeId(nodeId);
        return rootDocPromise.then((doc) => {
            const {root: {nodeId: documentNodeId}} = doc;
            return DOM.querySelectorAll({
                selector: selector,
                nodeId: documentNodeId,
            })
        });
    },
    /**
     * Low level API for triggering mouse events on a Node
     * identified by a selector.
     * Acceptable event types: mousePressed, mouseReleased, mouseMoved
     */
    mouseEvent: function mouseEvent(eventType, selectorOrNodeId) {
        const { Input } = this._client;
        // determine x & y as the center of the box
        return this.getBoundingBox(selectorOrNodeId).then(({ model: box }) => {
            const x = Math.floor(box.width/2)+box.content[0];
            const y = Math.floor(box.height/2)+box.content[1];
            return Input.dispatchMouseEvent({ type: eventType, x, y, button: 'left' });
        });
    },
    /**
     * High level API for clicking on a certain element
     */
    click: function click(selectorOrNodeId) {
        return this.mouseEvent(Events.MOUSE_PRESSED, selectorOrNodeId).then(() => {
            return this.mouseEvent(Events.MOUSE_RELEASED, selectorOrNodeId);
        });
    },
    /**
     * Navigates to a certain url and waits for the page to load
     */
    navigate: function navigate(url) {
        const { Page } = this._client;
        return new Promise((resolve, reject) => {
            Page.navigate(url).then(() => {
                Page.loadEventFired(() => resolve());
            });
        });
    },
    /**
     * Waits for the current page to fully load
     */
    waitForPageLoad: function waitForPageLoad() {
        const { Page } = this._client;
        return new Promise((resolve, reject) => {
            Page.loadEventFired(() => resolve());
        });
    },
     /**
     * Waits for a specified amount of millis before continuing
     */
    waitForMs: function waitForMs(ms) {
       return new Promise((resolve) => {
            setTimeout(() => resolve(), ms);
       });
    },
    /**
     * Takes a screenshot of a specific element
     */
    takeElementScreenshot: function takeElementScreenshot(selector, screenshotFile = 'output.png') {
        return new Promise((resolve, reject) => {
            this.getBoundingBox(selector).then(({ model: box }) => {
                this.takeScreenshot().then((fullPageScreenshot) => {
                    console.log(box);
                    const config = {
                        width: box.width,
                        height: box.height,
                        left: box.margin[0],
                        top: box.margin[1]
                    };
                    console.log(config);
                    cropper.cropToStream(fullPageScreenshot, config, (err, outputStream) => {
                        if (err) {
                            reject(err);
                        } else {
                            outputStream.pipe(fs.createWriteStream(screenshotFile)).on('close', () => {
                                resolve(outputStream);
                            });
                        }
                    });
                });
            });
        });
    },
    saveImage: function saveImage(buffer, outfile = 'output.png') {
        return new Promise((resolve, reject) => {
            fs.writeFile(outfile, buffer, 'base64', function(err) {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    console.log('Screenshot saved');
                    resolve();
                }
            });
        });
    },
    /**
     * Takes a full page screenshot. This is then cropped
     * by the caller to the region of interest
     */
    takeScreenshot: function takeScreenshot(outfile) {
        return new Promise((resolve, reject) => {
            const client = this._client;
            const { Page } = this._client;
            Page.captureScreenshot({ format: 'png' }).then((screenshot) => {
                const buffer = new Buffer(screenshot.data, 'base64');
                if (outfile) {
                    this.saveImage(buffer, outfile);
                }
                resolve(buffer);
            });
        });
    }
}