import { TestBed } from '@angular/core/testing';

import { RanksService } from './ranks.service';

let httpClientSpy: { get: jasmine.Spy; post: jasmine.Spy };
let rankService: RanksService;
describe('RanksService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    rankService = new RanksService(<any>httpClientSpy);
    TestBed.configureTestingModule({});
  });
});
