import * as assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { TimeAgoPipe } from './time-ago.pipe';

describe('TimeAgoPipe', () => {
  let pipe: TimeAgoPipe;

  beforeEach(() => {
    pipe = new TimeAgoPipe(
      { markForCheck: () => {} } as ChangeDetectorRef,
      { runOutsideAngular: (fn) => fn(), run: (fn) => fn() } as NgZone
    );
  });

  afterEach(() => {
    pipe.ngOnDestroy();
    mock.timers.reset();
  });

  it('create an instance', () => assert.ok(pipe));

  it('should return "a few seconds ago" when the input date is less than 45 seconds ago', () => {
    const now = new Date();
    const date = new Date(now.getTime() - 30 * 1000);
    assert.equal(pipe.transform(date.toISOString()), 'a few seconds ago');
  });

  it('should return "a minute ago" when the input date is between 45 and 90 seconds ago', () => {
    const now = new Date();
    const date = new Date(now.getTime() - 60 * 1000);
    assert.equal(pipe.transform(date.toISOString()), 'a minute ago');
  });

  it('should return "X minutes ago" when the input date is between 90 seconds and 45 minutes ago', () => {
    const now = new Date();
    const date = new Date(now.getTime() - 10 * 60 * 1000);
    assert.equal(pipe.transform(date.toISOString()), '10 minutes ago');
  });

  it('should return "an hour ago" when the input date is between 45 and 90 minutes ago', () => {
    const now = new Date();
    const date = new Date(now.getTime() - 60 * 60 * 1000);
    assert.equal(pipe.transform(date.toISOString()), 'an hour ago');
  });

  it('should return "X hours ago" when the input date is between 90 minutes and 22 hours ago', () => {
    const now = new Date();
    const date = new Date(now.getTime() - 10 * 60 * 60 * 1000);
    assert.equal(pipe.transform(date.toISOString()), '10 hours ago');
  });

  it('should return "a day ago" when the input date is between 22 and 36 hours ago', () => {
    const now = new Date();
    const date = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    assert.equal(pipe.transform(date.toISOString()), 'a day ago');
  });

  it('should return "X days ago" when the input date is between 36 hours and 25 days ago', () => {
    const now = new Date();
    const date = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    assert.equal(pipe.transform(date.toISOString()), '10 days ago');
  });

  it('should return "a month ago" when the input date is between 25 and 45 days ago', () => {
    const now = new Date();
    const date = new Date(now.getTime() - 30.416 * 24 * 60 * 60 * 1000);
    assert.equal(pipe.transform(date.toISOString()), 'a month ago');
  });

  it('should return "X months ago" when the input date is between 45 days and 345 days ago', () => {
    const now = new Date();
    const date = new Date(now.getTime() - 30.416 * 6 * 24 * 60 * 60 * 1000);
    assert.equal(pipe.transform(date.toISOString()), '6 months ago');
  });

  it('should return "a year ago" when the input date is between 345 and 545 days ago', () => {
    const now = new Date();
    const date = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    assert.equal(pipe.transform(date.toISOString()), 'a year ago');
  });

  it('should return "X years ago" when the input date is more than 545 days ago', () => {
    const now = new Date();
    const date = new Date(now.getTime() - 365 * 2 * 24 * 60 * 60 * 1000);
    assert.equal(pipe.transform(date.toISOString()), '2 years ago');
  });

  it('should update the value over time', () => {
    mock.timers.enable({ apis: ['Date'], now: Date.now() });
    const now = new Date();
    const date = new Date(now.getTime() - 30 * 1000);
    assert.equal(pipe.transform(date.toISOString()), 'a few seconds ago');

    mock.timers.tick(60 * 1000);

    assert.equal(pipe.transform(date.toISOString()), 'a minute ago');
  });

  it('should handle a Date as input', () => {
    const now = new Date();
    const date = new Date(now.getTime() - 30 * 1000);
    assert.equal(pipe.transform(date), 'a few seconds ago');
  });
});
