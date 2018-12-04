import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {RunInfoComponent} from './run-info.component';
import {DisqusModule} from 'ngx-disqus';
import {ThemeModule} from '../../../../@theme/theme.module';
import {RouterTestingModule} from '@angular/router/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';

describe('RunInfoComponent', () => {
  let component: RunInfoComponent;
  let fixture: ComponentFixture<RunInfoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        ThemeModule,
        DisqusModule.forRoot('momentum-mod'),
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      declarations: [ RunInfoComponent ],
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
