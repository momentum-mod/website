import {of} from 'rxjs';
import {TwitchAPIService} from './twitch-api.service';

let httpClientSpy: { get: jasmine.Spy };
let twitchAPIService: TwitchAPIService;

describe('ActivityService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    twitchAPIService = new TwitchAPIService(<any> httpClientSpy);
  });

  describe('Unit Tests', () => {
    it('#getGameStreams() should return streams', () => {
      httpClientSpy.get.and.returnValue(of(twitchAPIService));
      twitchAPIService.getGameStreams().subscribe(value =>
          expect(value).toEqual(twitchAPIService, 'expected activity'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
    it('#isUserLive() should return live user', () => {
      httpClientSpy.get.and.returnValue(of(twitchAPIService));
      twitchAPIService.isUserLive('userID').subscribe(value =>
          expect(value).toEqual(twitchAPIService, 'expected activity'),
        fail,
      );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
  });
});
