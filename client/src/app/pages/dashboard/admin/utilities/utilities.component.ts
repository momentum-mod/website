import { Component, OnInit } from '@angular/core';
import {NbDialogService} from '@nebular/theme';
import {ToasterService} from 'angular2-toaster';
import {AdminService} from '../../../../@core/data/admin.service';
import {ConfirmDialogComponent} from '../../../../@theme/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'utilities',
  templateUrl: './utilities.component.html',
  styleUrls: ['./utilities.component.scss'],
})
export class UtilitiesComponent implements OnInit {

  constructor(private adminService: AdminService,
              private toasterService: ToasterService,
              private dialogService: NbDialogService) { }

  ngOnInit() {
  }

  showResetCosXPConfigDialog() {
    this.dialogService.open(ConfirmDialogComponent, {
      context: {
        title: 'Are you sure?',
        message: 'You are about to set the cosmetic XP to 0 for all users. Are you sure you want to proceed?',
      },
    }).onClose.subscribe(response => {
      if (response) {
        this.resetCosmeticXPGlobally();
      }
    });
  }

  showResetRankXPConfirmDialog() {
    this.dialogService.open(ConfirmDialogComponent, {
      context: {
        title: 'Are you sure?',
        message: 'You are about to set the rank XP to 0 for all users. Are you sure you want to proceed?',
      },
    }).onClose.subscribe(response => {
      if (response) {
        this.resetRankXPGobally();
      }
    });
  }

  resetCosmeticXPGlobally() {
    this.adminService.updateAllUserStats({
      cosXP: 0,
    }).subscribe(res => {
      this.toasterService.popAsync('success', 'Success', 'Successfully reset cosmetic XP globally');
    }, err => {
      this.toasterService.popAsync('error', 'Failed', 'Failed to reset cosmetic XP globally');
    });
  }

  resetRankXPGobally() {
    this.adminService.updateAllUserStats({
      rankXP: 0,
    }).subscribe(res => {
      this.toasterService.popAsync('success', 'Success', 'Successfully reset rank XP globally');
    }, err => {
      this.toasterService.popAsync('error', 'Failed', 'Failed to reset rank XP globally');
    });
  }

}
