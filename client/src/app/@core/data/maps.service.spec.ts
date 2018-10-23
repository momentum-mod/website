import {MapsService} from './maps.service';
import {of} from 'rxjs';
import {MomentumMap} from '../models/momentum-map.model';

let httpClientSpy: { get: jasmine.Spy };
let mapsService: MapsService;

describe('MapsService', () => {
  beforeEach(() => {
    // TODO: spy on other methods too
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    mapsService = new MapsService(<any> httpClientSpy);
  });

  it('should return expected maps', () => {
    const expectedMaps: MomentumMap[] = [
      {
        id: 9,
        name: 'testmap1',
      },
      {
        id: 40000,
        name: 'testmap2',
      },
    ];


    httpClientSpy.get.and.returnValue(of(expectedMaps));
    mapsService.searchMaps('whatever').subscribe(value =>
        expect(value).toEqual(expectedMaps, 'expected maps == 3'),
        fail,
      );
    expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
  });
/*
  it('should return expected heroes (HttpClient called once)', () => {
    const expectedHeroes: Hero[] =
      [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];

    httpClientSpy.get.and.returnValue(asyncData(expectedHeroes));

    heroService.getHeroes().subscribe(
      heroes => expect(heroes).toEqual(expectedHeroes, 'expected heroes'),
      fail,
    );
  });

  it('should return an error when the server returns a 404', () => {
    const errorResponse = new HttpErrorResponse({
      error: 'test 404 error',
      status: 404, statusText: 'Not Found'
    });

    httpClientSpy.get.and.returnValue(asyncError(errorResponse));

    heroService.getHeroes().subscribe(
      heroes => fail('expected an error, not heroes'),
      error  => expect(error.message).toContain('test 404 error')
    );
  });*/
});
