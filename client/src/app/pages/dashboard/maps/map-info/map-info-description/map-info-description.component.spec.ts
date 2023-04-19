import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MapInfoDescriptionComponent } from './map-info-description.component';
import { MarkdownModule } from 'ngx-markdown';
import { NbUserModule } from '@nebular/theme';
import { MomentumMapType } from '../../../../../@core/models/map-type.model';

describe('MapInfoDescriptionComponent', () => {
  let component: MapInfoDescriptionComponent;
  let fixture: ComponentFixture<MapInfoDescriptionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MarkdownModule.forRoot(), NbUserModule],
      declarations: [MapInfoDescriptionComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapInfoDescriptionComponent);
    component = fixture.componentInstance;
    component.map = {
      id: 1,
      name: 'test',
      type: MomentumMapType.SURF,
      hash: 'no thanks',
      statusFlag: 0,
      info: {
        id: '1',
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
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
