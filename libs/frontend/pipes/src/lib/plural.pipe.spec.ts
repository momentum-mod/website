import { PluralPipe } from './plural.pipe';

describe('PluralPipe', () => {
  let pipe: PluralPipe;

  beforeEach(() => {
    pipe = new PluralPipe();
  });

  it('should transform a number to a pluralized string', () => {
    expect(pipe.transform(1, 'cat')).toBe('1 cat');
    expect(pipe.transform(2, 'cat')).toBe('2 cats');
    expect(pipe.transform(3, 'child', 'children')).toBe('3 children');
  });
});
