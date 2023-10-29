import { TestBed } from '@angular/core/testing';

import { LeaderboardsService } from './leaderboards.service';

let httpClientSpy: { get: jasmine.Spy; post: jasmine.Spy };
let rankService: LeaderboardsService;
describe('RanksService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    rankService = new LeaderboardsService(<any>httpClientSpy);
    TestBed.configureTestingModule({});
  });
});
