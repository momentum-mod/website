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

const { NgModule, provideZonelessChangeDetection } = require('@angular/core');
const { getTestBed } = require('@angular/core/testing');
const {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} = require('@angular/platform-browser-dynamic/testing');

// The app runs zoneless and zone.js isn't installed, so every TestBed must be
// zoneless too, otherwise Angular throws NG0908.
class ZonelessTestingModule {}
NgModule({ providers: [provideZonelessChangeDetection()] })(
  ZonelessTestingModule
);

getTestBed().initTestEnvironment(
  [BrowserDynamicTestingModule, ZonelessTestingModule],
  platformBrowserDynamicTesting()
);
