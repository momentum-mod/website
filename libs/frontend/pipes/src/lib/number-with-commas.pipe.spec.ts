import { NumberWithCommasPipe } from './number-with-commas.pipe';

describe('NumberWithCommasPipe', () => {
  let pipe: NumberWithCommasPipe;

  beforeEach(() => {
    pipe = new NumberWithCommasPipe();
  });

  it('should transform a number to a string with commas', () => {
    expect(pipe.transform(1000)).toBe('1,000');
    expect(pipe.transform(1000000)).toBe('1,000,000');
  });
});
