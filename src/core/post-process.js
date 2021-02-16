// @ts-check
/**
 * Module core/post-process
 *
 * Corresponds to respecConfig.postProcess and config.afterEnd.
 *  - postProcess: an array of functions that get called
 *      after processing finishes. This is not recommended and the feature is not
 *      tested. Use with care, if you know what you're doing. Chances are you really
 *      want to be using a new module with your own profile.
 *  - afterEnd: final thing that is called.
 */
import { showError } from "./utils.js";
import { sub } from "./pubsubhub.js";

export const name = "core/post-process";

let doneResolver;
export const done = new Promise(resolve => {
  doneResolver = resolve;
});

sub(
  "plugins-done",
  async config => {
    const result = [];
    if (Array.isArray(config.postProcess)) {
      const promises = config.postProcess
        .filter(f => {
          const isFunction = typeof f === "function";
          if (!isFunction) {
            const msg = "Every item in `postProcess` must be a JS function.";
            showError(msg, name);
          }
          return isFunction;
        })
        .map(async f => {
          try {
            return await f(config, document);
          } catch (err) {
            const msg = `Function ${f.name} threw an error during \`postProcess\`.`;
            const hint = "See developer console.";
            showError(msg, name, { hint });
            console.error(err);
          }
        });
      const values = await Promise.all(promises);
      result.push(...values);
    }
    if (typeof config.afterEnd === "function") {
      result.push(await config.afterEnd(config, document));
    }
    doneResolver(result);
  },
  { once: true }
);
