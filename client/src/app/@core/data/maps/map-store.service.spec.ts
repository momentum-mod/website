import { TestBed } from '@angular/core/testing';

import { MapStoreService } from './map-store.service';

describe('MapStoreService', () => {
  let service: MapStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
