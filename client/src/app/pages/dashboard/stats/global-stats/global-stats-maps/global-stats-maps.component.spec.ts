import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {GlobalStatsMapsComponent} from './global-stats-maps.component';
import {NgxEchartsModule} from 'ngx-echarts';
import {NbCardModule, NbStatusService} from '@nebular/theme';
import * as echarts from 'echarts';

describe('GlobalStatsMapsComponent', () => {
  let component: GlobalStatsMapsComponent;
  let fixture: ComponentFixture<GlobalStatsMapsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NbCardModule, NgxEchartsModule.forRoot({ echarts })],
      providers: [ NbStatusService ],
      declarations: [ GlobalStatsMapsComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GlobalStatsMapsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
