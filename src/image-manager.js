const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

module.exports = {
    _sessionScreenshots: [],
    _screenshotDir: __dirname,
    /**
     * Gets the base directory where screenshots are saved
     */
    getScreenshotDir: function getScreenshotDir() {
        return this._screenshotDir;
    },
    /**
     * Sets the base directory where screenshots should be saved
     */
    setScreenshotDir: function setScreenshotDir(screenshotDir) {
        this._screenshotDir = screenshotDir;
    },
    getExpectedPath: function getExpectedPath(file = '') {
        return path.join(this.getScreenshotDir(), 'expected', file);
    },
    getActualPath: function getExpectedPath(file = '') {
        return path.join(this.getScreenshotDir(), 'actual', file);
    },
    getDiffPath: function getExpectedPath() {
        return path.join(this.getScreenshotDir(), 'diff');
    },
    createScreenshotsDirs: function() {
        const screenshotDir = this._screenshotDir;
        this._sessionScreenshots = [];
        if (!fs.existsSync(this.getScreenshotDir())) {
            fs.mkdirSync(this.getScreenshotDir());
        }
        const expectedPath = this.getExpectedPath();
        const actualPath = this.getActualPath();
        const diffPath = this.getDiffPath();
        if (!fs.existsSync(expectedPath)) {
            fs.mkdirSync(expectedPath);
        }
        if (!fs.existsSync(actualPath)) {
            fs.mkdirSync(actualPath);
        } else {
            // Ensure the directory containing actuals(current) screenshots is always empty
            // when the test run begings
            rimraf.sync(actualPath);
            fs.mkdirSync(actualPath);
        }
        if (!fs.existsSync(diffPath)) {
            fs.mkdirSync(diffPath);
        } else {
            rimraf.sync(diffPath);
            fs.mkdirSync(diffPath);
        }
    },
    _copyFile: function _copyFile(source, dest, resolve) {
        fs.createReadStream(source)
          .pipe(fs.createWriteStream(dest))
          .on('close', () => {
            resolve();
          });
    },
    _writeToDisk: function _writeToDisk(outputStream, screenshotFile, resolve) {
        outputStream.pipe(fs.createWriteStream(screenshotFile)).on('close', () => {
            resolve(outputStream);
        });
    },
    onScreenshot: function onScreenshot(outputStream, screenshotBaseName) {
        this._sessionScreenshots.push(screenshotBaseName);
        return new Promise((resolve, reject) => {
            const actualPath = this.getActualPath(screenshotBaseName);
            const expectedPath = this.getExpectedPath(screenshotBaseName);
            if (!fs.existsSync(actualPath)) {
                this._writeToDisk(outputStream, actualPath, () => {
                    this._copyFile(actualPath, expectedPath, () => resolve(outputStream));
                });
            } else {
                this._writeToDisk(outputStream, expectedPath, resolve);
            } 
        });
    },
    compareAll: function compareAll(screenshotsToCompare = null) {
        const screenshots = screenshotsToCompare || this._sessionScreenshots;
        if (!screenshots.length) {
            return;
        }
        const firstScreenshot = screenshots.pop();
        return this.compare(
            path.join(this.getActualPath(), firstScreenshot),
            path.join(this.getExpectedPath(), firstScreenshot),
            path.join(this.getDiffPath(), `${firstScreenshot}-diff.png`)
        ).then((result) => {
            return this.compareAll(screenshots);
        });
    },
    compare: function compare(img1, img2, diffImg = 'diff.png') {
        return new Promise((resolve, reject) => {
            let filesRead = 0;
            const doneReading = function doneReading() {
                if (++filesRead < 2) return;
                var diff = new PNG({ width: img1Str.width, height: img1Str.height });

                const numPixelsDiff = pixelmatch(
                    img1Str.data, img2Str.data, diff.data, img1Str.width, img1Str.height, 
                    { threshold: 0.1 }
                );

                diff.pack().pipe(fs.createWriteStream(diffImg)).on('close', () => {
                    resolve(numPixelsDiff);
                });
            }
            const img1Str = fs.createReadStream(img1).pipe(new PNG()).on('parsed', doneReading);
            const img2Str = fs.createReadStream(img2).pipe(new PNG()).on('parsed', doneReading);
        });
    }
}