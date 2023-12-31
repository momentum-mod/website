import { EnumValuePipe } from './enum-value.pipe';

describe('NumberWithCommasPipe', () => {
  let pipe: EnumValuePipe;

  enum TestEnum {
    A = 0,
    B = 1,
    C = 8
  }

  beforeEach(() => {
    pipe = new EnumValuePipe();
  });

  it('should transform a number to a string with commas', () => {
    expect(pipe.transform(TestEnum)).toStrictEqual([0, 1, 8]);
  });
});
