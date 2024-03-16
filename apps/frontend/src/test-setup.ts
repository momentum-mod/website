import 'jest-preset-angular/setup-jest';

// Dumb polyfill to fix dumb Jest errors
// eslint-disable-next-line unicorn/prefer-node-protocol
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
