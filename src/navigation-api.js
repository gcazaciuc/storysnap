// @ts-check
const exec = require('child_process').exec;
const chrome = require('chrome-remote-interface');
const launcher = require('./chrome-launcher.js');
const ImageManager = require('./image-manager.js');
const cropper = require('png-crop');
const fs = require('fs');
const path = require('path');

const Events = {
    MOUSE_PRESSED: 'mousePressed',
    MOUSE_RELEASED: 'mouseReleased',
    MOUSE_MOVED: 'mouseMoved',
    KEY_UP: 'keyUp',
    KEY_DOWN: 'keyDown'
};

module.exports = {
    _client: null,
    _documentNode: null,
    _screenshotManager: ImageManager,
    /**
     * Launches a new browser instance
     * @param {string} url The URL to open when the browser is launched
     * @param {boolean} headless Whether or not the browser should start in headless
     * mode or not
     */
    launch: function launch(url=undefined, headless=true) {
        return new Promise((resolve, reject) => {
            launcher.launchChrome(url, headless).then(() => {
                chrome((client) => {
                    const {DOM, Emulation, Network, Page, Runtime, CSS} = client;
                    Page
                        .enable()
                        .then(() => DOM.enable())
                        .then(() => Network.enable())
                        .then(() =>  DOM.getDocument({ depth: -1 }))
                        .then((node) => {
                            this._client = client;
                            this._documentNode = node;
                            resolve();
                        });
                });
            })
        })
    },
    /**
     * Returns the chrome-remote-interface client object used to control the navigation session.
     * This allows performing low level operations and should generally be avoided if possible
     * in favor of the NavAPI functions.
     * See the API docs of chrome-remote-interface of what it allows and also consult
     * 
     */
    getClient: function getClient() {
        return this._client;
    },
    /**
     * Destroys the launched instance and cleans up the resources
     */
    kill: () => {
        return launcher.kill();
    },
    /**
     * Gets the bounding box of a node specified by NodeId or selector
     * @param {string|number} selector
     */
    getBoundingBox: function getBoundingBox(selector) {
        const { DOM } = this._client;
        if (typeof selector === 'number') {
            // we are dealing with a NodeId
            return DOM.getBoxModel({ nodeId: selector });
        }
        return this.querySelector(selector).then((node) => {
            const { nodeId: bodyNodeId } = node;
            return DOM.getBoxModel({ nodeId: bodyNodeId });
        }).catch((err) => {
            console.log(`Exception while getting bounding box for ${selector}`)
            throw err;
        });
    },
    _retrieveNodeId: function _retrieveNodeId(nodeId) {
        const { DOM } = this._client;
        let rootDocPromise = null;
        if (typeof nodeId === 'undefined' || nodeId === null) {
            rootDocPromise = DOM.getDocument({ depth: -1 });
        } else {
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
            return DOM.querySelector({
                selector: selector,
                nodeId: documentNodeId,
            })
        }).catch((err) => {
            console.log(`Exception while querying DOM for ${selector}`)
            throw err;
        });
    },
    /**
     * Retrieves the HTML content of a certain node(identified by a selector or node id)
     */
    getHTML: function getHTML(selectorOrNodeId) {
        const { DOM } = this._client;
        if (typeof selectorOrNodeId === 'string') {
            return this.querySelector(selectorOrNodeId).then((node) => {
                const { nodeId } = node;
                return DOM.getOuterHTML({ nodeId });
            });
        }
        return DOM.getOuterHTML({ nodeId: selectorOrNodeId }); 
    },
    /**
     * Gets the attributes of a node specified by either a selector
     * or a node id.
     */
    getAttributes: function getAttributes(selectorOrNodeId) {
        const { DOM } = this._client;
        const attrToObj  = function attrToObj({ attributes }) {
            const obj = {};
            for(let i = 0; i < attributes.length; i += 2) {
                obj[attributes[i]] = attributes[i+1];
            }
            return obj;
        }
        if (typeof selectorOrNodeId === 'string') {
            return this.querySelector(selectorOrNodeId).then((node) => {
                const { nodeId } = node;
                return DOM.getAttributes({ nodeId }).then(attrToObj);
            });
        }
        return DOM.getAttributes({ nodeId: selectorOrNodeId }).then(attrToObj); 
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
     * @param {'mousePressed'|'mouseReleased'|'mouseMoved'} eventType
     * @param {number|string} selectorOrNodeId
     */
    mouseEvent: function mouseEvent(eventType, selectorOrNodeId) {
        const { Input } = this._client;
        // determine x & y as the center of the box
        return this.getBoundingBox(selectorOrNodeId).then(({ model: box }) => {
            const x = Math.floor(box.width/2)+box.content[0];
            const y = Math.floor(box.height/2)+box.content[1];
            return Input.dispatchMouseEvent({
                type: eventType, 
                x, 
                y, 
                button: 'left',
                clickCount: eventType === Events.MOUSE_PRESSED ? 1 : 0
            });
        });
    },
    /**
     * Focuses a certain node given it's selector
     * or NodeId
     */
    focus: function focus(selectorOrNodeId) {
        const { DOM } = this._client;
        if (typeof selectorOrNodeId === 'number') {
            return DOM.focus({nodeId: selectorOrNodeId});
        }
        if (typeof selectorOrNodeId === 'string') {
            return this.querySelector(selectorOrNodeId).then((obj) => {
                return DOM.focus({nodeId: obj.nodeId});
            });
        }
        return new Promise((resolve, reject) => reject());
    },
     /**
     * Low level API for triggering key events on a Node
     * identified by a selector.
     * @param {'keyDown'|'keyUp'|'rawKeyDown'|'char'} eventType
     * @param {number|string} selectorOrNodeId Optional param, if specified
     * it focuses first the specified node and then triggers the key event
     */
    keyEvent: function keyEvent(eventType, key, selectorOrNodeId) {
        const { Input, DOM } = this._client;
        const eventPayload = {
            type: 'char',
            char: key,
            text: key
        };
        return Input.dispatchKeyEvent(eventPayload);
    },
    /**
     * Types the specified text while focused on a certain node id 
     * or DOM selector.
     * @param {string} text The text to type in
     * @param {string} selectorOrNodeId The selector to focus on
     */
    type: function type(text, selectorOrNodeId) {
         return this.focus(selectorOrNodeId)
                .then(() => this.keyEvent(Events.KEY_DOWN, text, selectorOrNodeId))
                .then(() => this.keyEvent(Events.KEY_UP, '', selectorOrNodeId));
    },
    /**
     * High level API for clicking on a certain element
     * @param {number|string} selectorOrNodeId
     */
    click: function click(selectorOrNodeId) {
        return this.mouseEvent(Events.MOUSE_PRESSED, selectorOrNodeId)
               .then(() => this.mouseEvent(Events.MOUSE_RELEASED, selectorOrNodeId));
    },
    /**
     * Navigates to a certain url and waits for the page to load
     * @param {string} url The URL to navigate to
     */
    navigate: function navigate(url) {
        const { Page } = this._client;
        return new Promise((resolve, reject) => {
            Page.navigate({url}).then(() => {
                return Page.loadEventFired(() => resolve());
            });
        });
    },
    /**
     * Waits for the current page to fully load
     * @return {Promise<number>}
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
                    const config = {
                        width: box.width,
                        height: box.height,
                        left: box.margin[0],
                        top: box.margin[1]
                    };
                    cropper.cropToStream(fullPageScreenshot, config, (err, outputStream) => {
                        if (err) {
                            reject(err);
                        } else {
                           this._screenshotManager.onScreenshot(
                               outputStream, screenshotFile
                            ).then(() => resolve(outputStream));
                        }
                    });
                });
            });
        });
    },
    /**
     * Saves a buffer as a png file on disk
     */
    saveImage: function saveImage(buffer, outfile = 'output.png') {
        return new Promise((resolve, reject) => {
            fs.writeFile(outfile, buffer, 'base64', function(err) {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },
    /**
     * Takes a full page screenshot. This is then cropped
     * by the caller to the region of interest
     */
    takeScreenshot: function takeScreenshot(screenshotFile) {
        const client = this._client;
        const { Page } = this._client;
        return Page.captureScreenshot({ format: 'png' }).then((screenshot) => {
            const buffer = new Buffer(screenshot.data, 'base64');
            if (screenshotFile) {
                this._sessionScreenshots.push(screenshotFile);
                return this.saveImage(buffer, screenshotFile);
            }
            return buffer;
        });
    }
}