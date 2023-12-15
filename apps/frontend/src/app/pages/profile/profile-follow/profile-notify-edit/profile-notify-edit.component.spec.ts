import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileNotifyEditComponent } from './profile-notify-edit.component';
import { SharedModule } from '../../../../shared.module';

describe('ProfileNotifyEditComponent', () => {
  let component: ProfileNotifyEditComponent;
  let fixture: ComponentFixture<ProfileNotifyEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedModule],
      declarations: [ProfileNotifyEditComponent]
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
