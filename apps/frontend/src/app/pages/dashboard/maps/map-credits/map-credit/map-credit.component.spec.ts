import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MapCreditComponent } from './map-credit.component';
import { MapCreditType } from '@momentum/constants';
import { SharedModule } from '../../../../../shared.module';

describe('MapCreditComponent', () => {
  let component: MapCreditComponent;
  let fixture: ComponentFixture<MapCreditComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [SharedModule],
      declarations: [MapCreditComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapCreditComponent);
    component = fixture.componentInstance;
    component.credits = [[], [], [], []];
    component.type = MapCreditType.AUTHOR;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
