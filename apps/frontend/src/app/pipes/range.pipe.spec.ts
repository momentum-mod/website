import { RangePipe } from './range.pipe';

describe('RangePipe', () => {
  let pipe: RangePipe;

  beforeEach(() => {
    pipe = new RangePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return [0] when start is 1 and stop is undefined', () => {
    expect(pipe.transform(1)).toEqual([0]);
  });

  it('should return [0, 1, 2] when start is 0 and stop is 3', () => {
    expect(pipe.transform(0, 3)).toEqual([0, 1, 2]);
  });

  it('should return [2, 3] when start is 2 and stop is 4', () => {
    expect(pipe.transform(2, 4)).toEqual([2, 3]);
  });
});
