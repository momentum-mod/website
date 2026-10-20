const { JSDOM } = require('jsdom');
const dom = new JSDOM(
  '<!doctype html><html><head></head><body></body></html>',
  {
    url: 'http://localhost/'
  }
);

Object.defineProperties(globalThis, {
  window: { configurable: true, value: dom.window },
  document: { configurable: true, value: dom.window.document },
  navigator: { configurable: true, value: dom.window.navigator },
  Node: { configurable: true, value: dom.window.Node },
  Element: { configurable: true, value: dom.window.Element },
  HTMLElement: { configurable: true, value: dom.window.HTMLElement },
  Event: { configurable: true, value: dom.window.Event },
  MutationObserver: {
    configurable: true,
    value: dom.window.MutationObserver
  },
  XMLHttpRequest: { configurable: true, value: dom.window.XMLHttpRequest },
  getComputedStyle: {
    configurable: true,
    value: dom.window.getComputedStyle.bind(dom.window)
  }
});

require('zone.js');
const zone = (globalThis as any).Zone;
// Zone's testing bundle selects jsdom's window and expects its original timers here.
dom.window[zone.__symbol__('setTimeout')] = dom.window.setTimeout;
dom.window[zone.__symbol__('clearTimeout')] = dom.window.clearTimeout;
require('zone.js/testing');

const { getTestBed } = require('@angular/core/testing');
const {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} = require('@angular/platform-browser-dynamic/testing');

getTestBed().initTestEnvironment(
  [BrowserDynamicTestingModule],
  platformBrowserDynamicTesting()
);
