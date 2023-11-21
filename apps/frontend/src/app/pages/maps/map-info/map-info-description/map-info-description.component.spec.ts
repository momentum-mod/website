import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MapInfoDescriptionComponent } from './map-info-description.component';
import { NbUserModule } from '@nebular/theme';
import { Gamemode, MapStatusNew, MMap, TrackType } from '@momentum/constants';
import { ZonesStub } from '@momentum/formats';

describe('MapInfoDescriptionComponent', () => {
  let component: MapInfoDescriptionComponent;
  let fixture: ComponentFixture<MapInfoDescriptionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NbUserModule],
      declarations: [MapInfoDescriptionComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapInfoDescriptionComponent);
    component = fixture.componentInstance;
    component.map = {
      id: 1,
      name: 'test',
      type: Gamemode.SURF,
      hash: 'no thanks',
      status: MapStatusNew.APPROVED,
      zones: ZonesStub,
      hasVmf: false,
      downloadURL: 'bing.com',
      fileName: 'e',
      submitterID: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      info: {
        description: 'Test',
        youtubeID: '',
        creationDate: new Date()
      },
      leaderboards: [
        {
          mapID: 1,
          gamemode: Gamemode.AHOP,
          tier: 5,
          trackNum: 0,
          trackType: TrackType.MAIN,
          style: 0,
          tags: [],
          linear: true,
          ranked: false
        }
      ]
    } as MMap;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
