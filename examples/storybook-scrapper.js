// @ts-check
/**
 * A module that opens up React Storybook and does
 * screenshots of each component it can find
 */
const path = require('path');

module.exports = ({ NavAPI, ImageManager }, options) => NavAPI.launch(options.storybookUrl).then(() => {
    const stories = [];
    
    ImageManager.createScreenshotsDirs();

    const  _takeStoryScreenshot = function _takeStoryScreenshot(story) {
        if (!story) {
            return new Promise((resolve, reject) => resolve(null));
        }
        const { id } = story;
        const title = story.title.split(' ').join('-').toLowerCase();
        const takeElementScreenshot = () => {
            return NavAPI.takeElementScreenshot(
                '#storybook-preview-iframe', 
                `${title}.png`
            );
        };
        return NavAPI
                .click(id)
                .then(takeElementScreenshot)
                .then(() => story);
    };
    const _findUnexploredStories = function _findUnexploredStories(ids, resolve) {
        if (!ids.length) {
            return resolve(null);
        }
        const idToCheck = ids.pop();
        return NavAPI.getAttributes(idToCheck).then(({ title }) => {
            if (stories.indexOf(title) === -1) {
                stories.push(title);
                resolve({ id: idToCheck, title });
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
                .then((story) => {
                    if (story) {
                        return screenshotAllElements();
                    }
                    return null;
                });
    }
    return screenshotAllElements();
});