"use strict";

const path = require("path");
const rollup = require("rollup");
const Watcher = require("./Watcher");

function createPreprocessor(options, preconfig, basePath, emitter, logger) {
  const cache = new Map();
  const log = logger.create("preprocessor.rollup");
  const watcher = new Watcher(emitter);
  const optionGroup = Array.isArray(options) ? options : [options];

  return async function preprocess(original, file, done) {
    const processedFiles = [];

    for (let options of optionGroup) {
      const location = path.relative(basePath, file.path);
      try {
        const config = Object.assign({}, options, preconfig.options, {
          input: file.path,
          cache: cache.get([file.path, options.output.file])
        });

        const bundle = await rollup.rollup(config);
        cache.set([file.path, options.output.file], bundle.cache);

        const [entry, ...dependencies] = bundle.watchFiles;
        watcher.add(entry, dependencies);

        log.info("Generating bundle for ./%s", location);
        const { output } = await bundle.generate(config);

        for (const result of output) {
          if (!result.isAsset) {
            const { code, map } = result;
            const { sourcemap } = config.output;

            file.sourceMap = map;

            const processed =
                  sourcemap === "inline"
                  ? code + `\n//# sourceMappingURL=${map.toUrl()}\n`
                  : code;

            processedFiles.push(processed);
          }
        }
      } catch (error) {
        log.error("Failed to process ./%s\n\n%s\n", location, error.stack);
        done(error, null);
      }
    }

    if (processedFiles.length) {
      done(null, processedFiles.join("\n"));
    } else {
      log.warn("Nothing was processed.");
      done(null, original);
    }
  };
}

createPreprocessor.$inject = [
  "config.rollupPreprocessor",
  "args",
  "config.basePath",
  "emitter",
  "logger"
];

module.exports = { "preprocessor:rollup": ["factory", createPreprocessor] };
