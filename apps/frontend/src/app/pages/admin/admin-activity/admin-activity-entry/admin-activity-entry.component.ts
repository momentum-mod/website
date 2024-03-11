import { Component, Input, OnInit } from '@angular/core';
import {
  AdminActivity,
  AdminActivityType,
  Role,
  RoleNames,
  Ban,
  BanNames
} from '@momentum/constants';
import { RouterLink } from '@angular/router';
import { NgStyle } from '@angular/common';
import { Bitflags } from '@momentum/bitflags';
import { Enum } from '@momentum/enum';

@Component({
  selector: 'm-admin-activity-entry',
  template: `
    <div class="flex flex-col gap-1">
      @for (diffEntry of diffEntries; track diffEntry.key) {
        <div class="flex">
          <p class="font-bold p-2">{{ diffEntry.key }}:</p>
          @if (diffEntry.oldValue != null) {
            <p class="grow bg-red-900 p-2">{{ diffEntry.oldValue }}</p>
          }
          @if (diffEntry.newValue != null) {
            <p class="grow bg-green-900 p-2">{{ diffEntry.newValue }}</p>
          }
        </div>
      }
    </div>
  `,
  standalone: true,
  imports: [NgStyle, RouterLink]
})
export class AdminActivityEntryComponent implements OnInit {
  @Input({ required: true }) activityData: AdminActivityEntryData;

  protected diffEntries: Array<{
    key: string;
    oldValue: string;
    newValue: string;
  }> = [];

  ngOnInit() {
    if (this.activityData.diff)
      this.diffEntries = Object.entries(this.activityData.diff).map(
        ([key, [oldValue, newValue]]) => ({
          key,
          oldValue,
          newValue
        })
      );
  }

  static getActivityData(
    activity: AdminActivity & { oldData: any; newData: any }
  ): AdminActivityEntryData {
    switch (activity.type) {
      case AdminActivityType.USER_UPDATE_ROLES:
        return {
          actionText: 'updated roles for user',
          targetName: activity.newData.alias,
          targetLink: '/profile/' + activity.target,
          diff: {
            roles: [
              Enum.values(Role)
                .filter((role) => Bitflags.has(activity.oldData.roles, role))
                .map((role) => RoleNames.get(role))
                .join(', ') || null,
              Enum.values(Role)
                .filter((role) => Bitflags.has(activity.newData.roles, role))
                .map((role) => RoleNames.get(role))
                .join(', ') || null
            ]
          }
        };

      case AdminActivityType.USER_UPDATE_BANS:
        return {
          actionText: 'updated bans for user',
          targetName: activity.newData.alias,
          targetLink: '/profile/' + activity.target,
          diff: {
            bans: [
              Enum.values(Ban)
                .filter((ban) => Bitflags.has(activity.oldData.bans, ban))
                .map((ban) => BanNames.get(ban))
                .join(', ') || null,
              Enum.values(Ban)
                .filter((ban) => Bitflags.has(activity.newData.bans, ban))
                .map((ban) => BanNames.get(ban))
                .join(', ') || null
            ]
          }
        };

      case AdminActivityType.USER_UPDATE_ALIAS:
        return {
          actionText: 'updated alias for user',
          targetName: activity.newData.alias,
          targetLink: '/profile/' + activity.target,
          diff: {
            alias: [activity.oldData.alias, activity.newData.alias]
          }
        };

      case AdminActivityType.USER_UPDATE_BIO:
        return {
          actionText: 'updated bio for user',
          targetName: activity.newData.alias,
          targetLink: '/profile/' + activity.target,
          diff: {
            bio: [activity.oldData.profile?.bio, activity.newData.profile?.bio]
          }
        };

      case AdminActivityType.USER_CREATE_PLACEHOLDER:
        return {
          actionText: 'created placeholder',
          targetName: activity.newData.alias,
          targetLink: '/profile/' + activity.target
        };

      case AdminActivityType.USER_MERGE:
        return {
          actionText: 'merged user',
          targetName: activity.newData.alias,
          targetLink: '/profile/' + activity.newData.id
        };

      case AdminActivityType.USER_DELETE:
        return {
          actionText: 'deleted user',
          targetName: activity.oldData.alias,
          targetLink: '/profile/' + activity.target
        };

      case AdminActivityType.MAP_UPDATE:
        return {
          actionText: 'updated map',
          targetName: activity.newData.name,
          targetLink: '/maps/' + activity.newData.id,
          diff: AdminActivityEntryComponent.calculateDiff(
            activity.oldData,
            activity.newData
          )
        };

      case AdminActivityType.MAP_CONTENT_DELETE:
        return {
          actionText: 'deleted map',
          targetName: activity.oldData.name
        };

      case AdminActivityType.REPORT_UPDATE:
        return {
          actionText: 'updated report',
          targetName: 'ID ' + activity.target
        };

      case AdminActivityType.REPORT_RESOLVE:
        return {
          actionText: 'resolved report',
          targetName: 'ID ' + activity.target
        };

      default:
        return {
          actionText: 'did unknown activity',
          targetName: 'ID ' + activity.type
        };
    }
  }

  static calculateDiff(
    oldData: object,
    newData: object
  ): AdminActivityEntryData['diff'] {
    const result = {};
    new Set([...Object.keys(oldData), ...Object.keys(newData)]).forEach(
      (key) => {
        let oldValue = oldData[key];
        let newValue = newData[key];

        if (oldValue instanceof Date || newValue instanceof Date) {
          oldValue = oldValue.toString();
          newValue = newValue.toString();
        }

        if (typeof oldValue == 'object' || typeof newValue == 'object') {
          oldValue = JSON.stringify(oldValue);
          newValue = JSON.stringify(newValue);
        }

        if (oldValue !== newValue) {
          result[key] = [oldValue, newValue];
        }
      }
    );

    return result;
  }
}

export interface AdminActivityEntryData {
  actionText: string;
  targetName?: string;
  targetLink?: string;
  diff?: Record<string, [string, string]>;
}
