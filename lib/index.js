'use strict'

const path = require('path')
const rollup = require('rollup').rollup
const assign = require('object-assign')
const chokidar = require('chokidar')
const sequence = require('./util/sequence')


function createPreprocessor (options, preconfig, basePath, emitter, logger) {
	const log = logger.create('preprocessor.rollup')
	const watch = new Watch(emitter)
	if(!Array.isArray(options)) { options = [options] }

	let cache = [];

	return (content, file, done) => {
		sequence(options, (singleOptions, i) => {
			const config = assign({}, singleOptions, preconfig.options,
				{
					input: file.path,
					cache: cache[i],
				}
			)

			return rollup(config)
				.then(bundle => {
					cache[i] = bundle;
					watch.capture(bundle)
					return bundle.generate(config.output)
				})
				.then(generated => {
					let output = generated.code
					if (config.sourcemap === 'inline') {
						output += `\n//# sourceMappingURL=${generated.map.toUrl()}\n`
					}
					return output;
				})
				.catch(error => {
					const location = path.relative(basePath, file.path)
					log.error('Error processing “%s”\n\n%s\n', location, error.message)
					done(error, null)
				})
		}).then((results) => done(null, results.join("\n")))
	}
}

function Watch (emitter) {
	this.buffer = new Set()
	this.watchList = new Set()
	this.watch = chokidar.watch()
	this.watch.on('change', () => emitter.refreshFiles())
	emitter.on('run_start', () => this.start())
}

Watch.prototype.capture = function (bundle) {
	bundle.modules.forEach(m => this.buffer.add(m.id))
}

Watch.prototype.clean = function () {
	this.watchList.forEach(m => {
		if (!this.buffer.has(m)) {
			this.watch.unwatch(m)
			this.watchList.delete(m)
		}
	})
}

Watch.prototype.start = function () {
	this.clean()
	this.buffer.forEach(m => {
		if (!this.watchList.has(m)) {
			this.watch.add(m)
			this.watchList.add(m)
		}
	})
	this.buffer.clear()
}


createPreprocessor.$inject = [
	'config.rollupPreprocessor', 'args',
	'config.basePath', 'emitter', 'logger',
]

module.exports = { 'preprocessor:rollup': ['factory', createPreprocessor] }
