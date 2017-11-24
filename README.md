# Storysnap
A CSS regression utility for [Storybook](https://github.com/storybooks/storybook) based on headless Chrome.

## Install

* You must have Chrome >= 59 installed on the machine where this script is running.*

`npm i storysnap`

You can also install it globally using '-g' flag and access it as simply `storysnap`.

## Usage

Storysnap provides a CLI and also a programatic way to use it.

### CLI usage

`storysnap --output ./screenshots`

The arguments are as follows:

1. --output - (Optional) Location where the screenshots taken during nav will be saved.
2. --port ( Default to 6006 ). The port on which Storybook runs or will be started
3. --host ( Default `localhost`). The host on which Storybook will be started.
4. --autostart ( Default `false`). Whether Storysnap should spin off a new instance of React Storybook instead of connecting to an already existing instance
5. --bin - Indicated the location of the `start-storybook` binary. Used only if `autostart` is true.
6. --config-dir ( Default `.storybook` ). The directory where the Storybook configuration resides.
7. --concurrency ( Defaults to max number of CPUs availabl ). How many parallel workers to use for screenshots.

### Programatic usage

There are 2 functions being exported by the package that can be used in a NodeJS app:

 - `storysnap(options)` - Returns a promise that is resolved when the screenshots have been taken. Options is an object similar to CLI options, but with keys camel cased( eg `{ output: 'screenshot', configDir: '.storybook'}`).
 - `startStorybookServer(options)` - Programatically start a Storybook server. Returns a Promise that it's resolved when the server started.

 ```js
 const {storysnap} = require('storysnap');
 storysnap({
     output: './screenshots',
     port: 6006,
     host: 'localhost',
     autostart: true
 });
 ```


