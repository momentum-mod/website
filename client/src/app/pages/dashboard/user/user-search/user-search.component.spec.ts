import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {UserSearchComponent} from './user-search.component';
import {NbListModule, NbThemeModule, NbUserModule} from '@nebular/theme';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {DataModule} from '../../../../@core/data/data.module';
import {HttpClientTestingModule} from '@angular/common/http/testing';

describe('UserSearchComponent', () => {
  let component: UserSearchComponent;
  let fixture: ComponentFixture<UserSearchComponent>;
  // let httpMock: HttpTestingController;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NbThemeModule, FormsModule, ReactiveFormsModule, NbUserModule, NbListModule, DataModule.forRoot(),
        HttpClientTestingModule],
      declarations: [ UserSearchComponent ],
    })
    .compileComponents();
    // httpMock = getTestBed().get(HttpTestingController);
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
