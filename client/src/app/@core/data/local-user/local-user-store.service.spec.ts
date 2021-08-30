import { TestBed } from '@angular/core/testing';

import { LocalUserStoreService } from './local-user-store.service';

describe('LocalUserStoreService', () => {
  let service: LocalUserStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalUserStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
