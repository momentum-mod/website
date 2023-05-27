import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommunityTwitchStreamComponent } from './community-twitch-stream.component';
import { of } from 'rxjs';
import { TwitchAPIService } from '@momentum/frontend/data';

// Avast! Here be the tests for the CommunityTwitchStreamComponent
describe('CommunityTwitchStreamComponent', () => {
  let component: CommunityTwitchStreamComponent;
  let fixture: ComponentFixture<CommunityTwitchStreamComponent>;
  let twitchAPI: TwitchAPIService;

  // Before each test, we be setting up the test bed
  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [CommunityTwitchStreamComponent],
      providers: [
        {
          provide: TwitchAPIService,
          useValue: {
            getGameStreams: jest.fn()
          }
        }
      ]
    });

    await TestBed.compileComponents();
  });

  // And before each test, we be creating the component and getting the TwitchAPIService
  beforeEach(() => {
    fixture = TestBed.createComponent(CommunityTwitchStreamComponent);
    component = fixture.componentInstance;
    twitchAPI = TestBed.inject(TwitchAPIService);
  });

  // This be the first test, to see if the component be created
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // This be the second test, to see if getGameStreams be called on init
  it('should call getGameStreams on init', () => {
    jest
      .spyOn(twitchAPI, 'getGameStreams')
      .mockReturnValueOnce(of({ data: [] }));
    component.ngOnInit();
    expect(twitchAPI.getGameStreams).toHaveBeenCalled();
  });

  // This be the third test, to see if streams and queriedStreams be updated on init
  it('should update streams and queriedStreams on init', () => {
    const streams = [{ id: '1' }, { id: '2' }];
    jest
      .spyOn(twitchAPI, 'getGameStreams')
      .mockReturnValueOnce(of({ data: streams }));
    component.ngOnInit();
    expect(component.streams).toEqual(streams);
    expect(component.queriedStreams).toBe(true);
  });
});
