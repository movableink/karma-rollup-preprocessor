module.exports = function (config) {
	config.set({
		plugins: [
			'karma-jasmine',
			'karma-mocha-reporter',
			'karma-phantomjs-launcher',
			require('./lib'),
		],

		frameworks: ['jasmine'],
		reporters: ['mocha'],
		browsers: ['PhantomJS'],

		logLevel: config.LOG_INFO, // disable > error > warn > info > debug
		captureTimeout: 60000,
		autoWatch: true,
		singleRun: true,
		colors: true,
		port: 9876,

		basePath: '',
		files: [
			{ pattern: 'test/t1.js', watched: false },
			{ pattern: 'test/t2.js', watched: false },
			{ pattern: 'test/t3.js', watched: false },
		],
		exclude: [],

		preprocessors: {
			'test/t1.js': ['rollup'],
			'test/t2.js': ['rollup'],
			'test/t3.js': ['rollupNode'],
		},

		rollupPreprocessor: {
			format: 'iife',
			name: 'lib',
			plugins: [
				require('rollup-plugin-buble')(),
			],
		},

		customPreprocessors: {
			rollupNode: {
				base: 'rollup',
				options: {
					plugins: [
						require('rollup-plugin-node-resolve')(),
						require('rollup-plugin-commonjs')(),
						require('rollup-plugin-buble')(),
					],
				},
			},
		},
	})
}
