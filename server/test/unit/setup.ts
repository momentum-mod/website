// Without the below comment in Jest's setupFiles somewhere, Jest hits a type
// error when trying to run unit tests. It only occurs when in a shared
// node_modules structure, apparently because Jasmine is installed in there as
// well? It's very strange. See https://github.com/ngneat/spectator/issues/282

/// <reference types="jest" />

// This MUST be imported for absolute modules to be recognised!
import 'tsconfig-paths/register';

BigInt.prototype['toJSON'] = function () {
  return this.toString();
};
