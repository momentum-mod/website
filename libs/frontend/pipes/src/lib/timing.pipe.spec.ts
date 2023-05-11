import { TimingPipe } from './timing.pipe';

describe('TimingPipe', () => {
  let pipe: TimingPipe;

  beforeEach(() => {
    pipe = new TimingPipe();
  });

  it('should transform a number to a timing string', () => {
    expect(pipe.transform(1)).toBe('1.00');
    expect(pipe.transform(60)).toBe('01:00.00');
    expect(pipe.transform(3600)).toBe('01:00:00');
  });
});
