import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {RunInfoComponent} from './run-info.component';
import {DisqusModule} from 'ngx-disqus';
import {ThemeModule} from '../../../../@theme/theme.module';
import {RouterTestingModule} from '@angular/router/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {UsersService} from '../../../../@core/data/users.service';
import {Observable, of} from 'rxjs';

describe('RunInfoComponent', () => {
  let component: RunInfoComponent;
  let fixture: ComponentFixture<RunInfoComponent>;

  let usersServiceStub: Partial<UsersService>;
  beforeEach(async(() => {
    usersServiceStub = {
      getRunHistory(userID: string, options?: object): Observable<any> {
        return of({
          count: 1,
          runs: [{
            id: 1,
          }],
        });
      },
    };
    TestBed.configureTestingModule({
      imports: [
        ThemeModule,
        DisqusModule.forRoot('momentum-mod'),
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      declarations: [ RunInfoComponent ],
      providers: [
        { provide: UsersService, useValue: usersServiceStub },
      ],
    })
    .compileComponents();
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
