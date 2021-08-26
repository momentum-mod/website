import { TestBed } from '@angular/core/testing';

import { ActivityStoreService } from './activity-store.service';

describe('ActivityStoreService', () => {
  let service: ActivityStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActivityStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
