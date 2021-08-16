import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NavComponent } from './nav.component';
import {TemplateRef, Type} from '@angular/core';
import {NbDialogConfig, NbDialogRef, NbDialogService} from '@nebular/theme';
import {RouterTestingModule} from '@angular/router/testing';

describe('NavComponent', () => {
  let component: NavComponent;
  let fixture: ComponentFixture<NavComponent>;

  let dialogDummy: Partial<NbDialogService>;
  beforeEach(waitForAsync(() => {
    dialogDummy = {
      open<T>(content: Type<T> | TemplateRef<T>, userConfig?: Partial<NbDialogConfig<Partial<T> | string>>):
        NbDialogRef<T> {
        return null;
      },
    };
    TestBed.configureTestingModule({
      imports: [ RouterTestingModule ],
      declarations: [ NavComponent ],
      providers: [ {provide: NbDialogService, useValue: dialogDummy } ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
