import { UnsortedKeyvaluePipe } from './unsorted-keyvalue.pipe';
import { ɵdefaultKeyValueDiffers as defaultKeyValueDiffers } from '@angular/core';

describe('UnsortedKeyvaluePipe', () => {
  let pipe: UnsortedKeyvaluePipe;

  beforeEach(() => {
    pipe = new UnsortedKeyvaluePipe(defaultKeyValueDiffers);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return the same order of keys as the input object', () => {
    const input = { c: 1, a: 2, b: 3 };
    const result = pipe.transform(input);
    expect(result).toEqual([
      { key: 'c', value: 1 },
      { key: 'a', value: 2 },
      { key: 'b', value: 3 }
    ]);
  });
});
