const logSymbols = require('log-symbols');
const chalk = require('chalk');

module.exports = {
    info: (msg, color = 'white') => {
        console.log(chalk[color](msg));
    },
    error: (msg) => {
        console.log(`${logSymbols.warning} ${chalk.red(msg)}`)
    },
    clear: () => console.clear()
}