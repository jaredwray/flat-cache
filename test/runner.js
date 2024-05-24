/* eslint-disable unicorn/no-process-exit */
'use strict';
// eslint-disable-next-line import/order
const Mocha = require('mocha');
// We run mocha manually otherwise istanbul coverage won't work
// run `npm test --coverage` to generate coverage report
// To set these options run the test script like:
//  > BAIL=true GREP=array_expression REPORTER=dot npm test
const options = {
	ui: 'bdd',
	bail: Boolean(process.env.BAIL),
	reporter: process.env.REPORTER || 'spec',
	grep: process.env.GREP,
	colors: true,
};

// We use the dot reporter on travis since it works better
if (process.env.TRAVIS) {
	options.reporter = 'dot';
}

const m = new Mocha(options);

if (process.env.INVERT) {
	m.invert();
}

const expand = require('glob-expand');

for (const file of expand('test/specs/**/*.js')) {
	m.addFile(file);
}

m.run(error => {
	const exitCode = error ? 1 : 0;
	if (error) {
		console.log('failed tests: ' + error);
	}

	process.exit(exitCode);
});
