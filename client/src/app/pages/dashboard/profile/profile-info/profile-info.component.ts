import { Component, OnInit } from '@angular/core';
import { Permission } from '../../../../@core/data/user.service';
import {ProfileService, UserProfile} from '../../../../@core/data/profile.service';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {switchMap} from 'rxjs/operators';
import {Observable} from 'rxjs';

@Component({
  selector: 'profile-info',
  templateUrl: './profile-info.component.html',
  styleUrls: ['./profile-info.component.scss'],
})
export class ProfileInfoComponent implements OnInit {

  userProfile$: Observable<UserProfile>;
  permission = Permission;

  constructor(private route: ActivatedRoute,
              private profileService: ProfileService) { }

  ngOnInit() {
    this.userProfile$ = this.route.paramMap.pipe(
      switchMap((params: ParamMap) =>
        params.has('id') ?
        this.profileService.getUserProfile(params.get('id')) :
        this.profileService.getLocalProfile(),
      ),
    );
  }
}
