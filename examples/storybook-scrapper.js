// @ts-check
/**
 * A module that opens up React Storybook and does
 * screenshots of each component it can find
 */
const tap = (msg, fn) => (...args) => {
    console.log(msg, args);
    return fn.apply(null, args);
}

const path = require('path');

module.exports = ({ NavAPI, ImageManager }, options) => NavAPI.launch(options.storybookUrl).then(() => {
    const stories = [];
    
    ImageManager.createScreenshotsDirs();

    const  _takeStoryScreenshot = function _takeStoryScreenshot(id) {
        if (!id) {
            return new Promise((resolve, reject) => resolve(null));
        }
        const takeWholeScreenshot  = tap(`Whole screenshot ${id}`, () => NavAPI.takeScreenshot(`whole-${id}.png`));
        const takeElementScreenshot = tap(`Element screenshot ${id}`,() => {
            return NavAPI.takeElementScreenshot(
                '#storybook-preview-iframe', 
                `output-${id}.png`
            );
        });
        return NavAPI
                .click(id)
                .then(takeElementScreenshot)
                .then(() => id);
    };
    const _findUnexploredStories = function _findUnexploredStories(ids, resolve) {
        if (!ids.length) {
            return resolve(null);
        }
        const idToCheck = ids.pop();
        return NavAPI.getHTML(idToCheck).then(({ outerHTML: html }) => {
            if (stories.indexOf(html) === -1) {
                console.log(JSON.stringify(stories));
                stories.push(html);
                resolve(idToCheck);
            } else {
                return _findUnexploredStories(ids, resolve);
            }
        });
    }
    const _getNextStory = function _getNextStory() {
          return NavAPI.querySelectorAll('li a').then(({ nodeIds: topLevelIds }) => {
                 return new Promise((resolve, reject) => {
                    _findUnexploredStories(topLevelIds, resolve);
                 });
          });
    }
    const screenshotAllElements = function screenshotAllElements() {
        return _getNextStory()
                .then(_takeStoryScreenshot)
                .then((storyId) => {
                    if (storyId) {
                        return screenshotAllElements();
                    }
                    return null;
                });
    }
    return screenshotAllElements().then(() => {
        return ImageManager.compareAll().then(() => {
            console.log('Done comparing all React Storybook screenshots...');
        });
    });
});