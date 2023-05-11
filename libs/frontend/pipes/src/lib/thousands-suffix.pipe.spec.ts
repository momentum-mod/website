import { ThousandsSuffixPipe } from './thousands-suffix.pipe';

describe('ThousandsSuffixPipe', () => {
  let pipe: ThousandsSuffixPipe;

  beforeEach(() => {
    pipe = new ThousandsSuffixPipe();
  });

  it('should create an instance', () => expect(pipe).toBeTruthy());

  it('should return the input if it is less than 1000', () =>
    expect(pipe.transform(500)).toBe('500'));

  it('should throw a TypeError if the input is NaN', () =>
    expect(() => pipe.transform('A' as any)).toThrowError(TypeError));

  it('should throw a TypeError if the precision is NaN', () =>
    expect(() => pipe.transform(1000, 'A' as any)).toThrowError(TypeError));

  it('should throw a TypeError if the precision is not an integer', () =>
    expect(() => pipe.transform(1000, 1.5)).toThrowError(TypeError));

  it('should return the input with a suffix if it is greater than or equal to 1000', () => {
    expect(pipe.transform(1000)).toBe('1K');
    expect(pipe.transform(1000000)).toBe('1M');
    expect(pipe.transform(122220000, 1)).toBe('122.2M');
    expect(pipe.transform(1000000000)).toBe('1B');
    expect(pipe.transform(1234560000, 4)).toBe('1.2346B');
  });
});
