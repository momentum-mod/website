import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileNotifyEditComponent } from './profile-notify-edit.component';
import { NbDialogRef, NbStatusService } from '@nebular/theme';
import { SharedModule } from '../../../../../shared.module';

describe('ProfileNotifyEditComponent', () => {
  let component: ProfileNotifyEditComponent;
  let fixture: ComponentFixture<ProfileNotifyEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      declarations: [ProfileNotifyEditComponent],
      providers: [NbStatusService, { provide: NbDialogRef, useValue: {} }]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileNotifyEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
