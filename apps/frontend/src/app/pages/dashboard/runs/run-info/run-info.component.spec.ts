import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { RunInfoComponent } from './run-info.component';
import { ThemeModule } from '../../../../theme/theme.module';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Observable, of } from 'rxjs';
import { RanksService } from '../../../../@core/data/ranks.service';
import { TimeagoDefaultFormatter, TimeagoFormatter } from 'ngx-timeago';

describe('RunInfoComponent', () => {
  let component: RunInfoComponent;
  let fixture: ComponentFixture<RunInfoComponent>;

  let ranksServiceStub: Partial<RanksService>;
  beforeEach(waitForAsync(() => {
    ranksServiceStub = {
      getRanks(mapID: number, options?: object): Observable<any> {
        return of({
          count: 1,
          runs: [
            {
              id: 1
            }
          ]
        });
      }
    };
    TestBed.configureTestingModule({
      imports: [ThemeModule, RouterTestingModule, HttpClientTestingModule],
      declarations: [RunInfoComponent],
      providers: [
        { provide: RanksService, useValue: ranksServiceStub },
        { provide: TimeagoFormatter, useClass: TimeagoDefaultFormatter }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RunInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
