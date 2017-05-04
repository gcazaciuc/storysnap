module.exports = {
    _navAPI: null,
    setNavAPI: function(navAPI) {
        this._navAPI = navAPI;
    },
    _clickMenuAndWaitForPage: function _clickMenuAndWaitForPage(id) {
        const NavAPI = this._navAPI;
        return NavAPI
                .click(id)
                .then(() => NavAPI.waitForMs(1000))
                .then(() => NavAPI.takeScreenshot(`whole-${id}.png`))
                .then(() => NavAPI.takeElementScreenshot('#storybook-preview-iframe', `output-${id}.png`));
    },
    screenshotAllElements: function screenshotAllElements() {
        const NavAPI = this._navAPI;
        return NavAPI.querySelectorAll('li > a').then(({ nodeIds: topLevelIds }) => {
            const elIds = [].concat(topLevelIds);
            const overallPromise = new Promise((resolve) => resolve());
            const clickPromises = elIds.reduce(
                (acc, id) => overallPromise.then(() => this._clickMenuAndWaitForPage(id)),
                overallPromise
            );
            return clickPromises; 
        });
    }
}