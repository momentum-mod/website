import { TestBed } from '@angular/core/testing';

import { StatsStoreService } from './stats-store.service';

describe('StatsStoreService', () => {
  let service: StatsStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatsStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
