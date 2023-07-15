import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MapInfoDescriptionComponent } from './map-info-description.component';
import { NbUserModule } from '@nebular/theme';
import { MapType } from '@momentum/constants';

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
      type: MapType.SURF,
      hash: 'no thanks',
      statusFlag: 0,
      info: {
        id: 1,
        description: 'Test',
        numTracks: 1,
        creationDate: new Date().toString()
      },
      tracks: [
        {
          trackNum: 0,
          mapID: 1,
          numZones: 1,
          isLinear: false,
          difficulty: 5
        }
      ]
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
