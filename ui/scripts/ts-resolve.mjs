// Lets plain Node (22.6 or later, type stripping) run the ui/src TypeScript the CLI scripts import:
// a relative import with no extension resolves to the .ts file next to it, as Vite resolves it.
// No dependency. Used by ui/scripts/record.ts:
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/record.ts ...
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[cm]?[jt]s$/.test(specifier)) {
      try {
        return next(`${specifier}.ts`, context);
      } catch {
        // fall through to the default resolution and its error
      }
    }
    return next(specifier, context);
  }
});
