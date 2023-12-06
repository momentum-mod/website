# formats/replay

Readers/writers for Momentum Replay File (.mrf) files. Likely to change
significantly around 0.11.0.

**This library only supports Node!** It relies heavily on Node's `Buffer`
package, and since we have no use for it on frontend currently (almost certainly
never will), we don't provide a polyfill. Importing it from frontend will break
compiles!
