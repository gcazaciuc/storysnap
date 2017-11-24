const puppeteer = require('puppeteer');
const path = require('path');
const storybookUrl = `http://localhost:6006`;
const getNames = (storiesEl) => storiesEl.map((el) => el.getAttribute('data-name'));
const timePromise = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let capturedScreenshots = 0;

const screenshotStories = async (page, kind, stories, workerPayload) => {
    const getName = (kind, story) => {
        const kindName = kind.split(' ').join('-').replace('/', '-');
        const storyName = story.split(' ').join('-').replace('/', '-');
        return `${[kindName, storyName].join('-')}.png`;
    }
    for( story of stories) {
        const storyUrl = `${storybookUrl}/?selectedKind=${kind}&selectedStory=${encodeURI(story)}&full=1`;
        await page.goto(storyUrl, {
            waitUntil: 'load'
        });
        const previewFrame = page.frames()[1];
        const previewArea = await previewFrame.$('#root');
        const screenshotPath = path.resolve(
            path.join(workerPayload.screenshotDir, getName(kind, story))
        );
        await page.screenshot({
            path: screenshotPath
        });
        capturedScreenshots++;
    }
}

const screenshotKind = async (browser, workerPayload) => {
    const { kind } = workerPayload;
    capturedScreenshots = 0;
    const page = await browser.newPage();
    const kindUrl = `${storybookUrl}/?selectedKind=${encodeURI(kind)}`;
    await page.goto(kindUrl);
    const stories = await page.$$eval('a[data-name]', getNames);
    await screenshotStories(page, kind, stories, workerPayload);
    return page.close();
}

module.exports = function (inp, callback) {
    puppeteer.launch({ headless: true }).then((browser) => {
        return screenshotKind(browser, inp).then(() => {
            return browser.close();
        });
    }).then(() => {
        callback(null, Object.assign(inp, { capturedScreenshots }) )
    });
}