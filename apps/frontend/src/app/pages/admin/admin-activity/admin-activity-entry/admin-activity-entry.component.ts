import { Component, Input, OnInit } from '@angular/core';
import {
  AdminActivity,
  AdminActivityType,
  Role,
  RoleNames,
  Ban,
  BanNames,
  ISO_8601_REGEXP
} from '@momentum/constants';
import { RouterLink } from '@angular/router';
import { NgStyle } from '@angular/common';
import * as Bitflags from '@momentum/bitflags';
import * as Enum from '@momentum/enum';

@Component({
  selector: 'm-admin-activity-entry',
  template: `
    <div
      class="grid grid-cols-[6rem_1fr_1fr] gap-x-8 gap-y-1 bg-black bg-opacity-10 p-4 shadow-inner"
    >
      <p class="col-start-2 font-medium">Old Value</p>
      <p class="font-medium">New Value</p>
      @for (diffEntry of diffEntries; track diffEntry.key) {
        <p class="font-medium">{{ diffEntry.key }}</p>
        @if (diffEntry.oldValue != null) {
          <p class="font-mono whitespace-pre-wrap [word-wrap:anywhere]">
            {{ diffEntry.oldValue }}
          </p>
        } @else {
          <p class="font-mono text-gray-200">null</p>
        }
        @if (diffEntry.newValue != null) {
          <p class="font-mono whitespace-pre-wrap [word-wrap:anywhere]">
            {{ diffEntry.newValue }}
          </p>
        } @else {
          <p class="font-mono text-gray-300">null</p>
        }
      }
    </div>
  `,
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
      case AdminActivityType.USER_UPDATE:
        return {
          actionText: 'updated user',
          targetName: activity.newData.alias,
          targetLink: '/profile/' + activity.target,
          diff: AdminActivityEntryComponent.calculateUserDiff(
            activity.oldData,
            activity.newData
          )
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

      case AdminActivityType.REVIEW_DELETED:
        return {
          actionText: 'deleted review',
          targetName: 'ID ' + activity.target
        };

      case AdminActivityType.REVIEW_COMMENT_DELETED:
        return {
          actionText: 'deleted review comment',
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

        if (ISO_8601_REGEXP.test(oldValue))
          oldValue = new Date(oldValue).toLocaleString();
        if (ISO_8601_REGEXP.test(newValue))
          newValue = new Date(newValue).toLocaleString();

        if (typeof oldValue == 'object')
          oldValue = JSON.stringify(oldValue, undefined, 4);
        if (typeof newValue == 'object')
          newValue = JSON.stringify(newValue, undefined, 4);

        if (oldValue !== newValue) {
          result[key] = [oldValue, newValue];
        }
      }
    );

    return result;
  }

  static calculateUserDiff(oldUser, newUser) {
    const result: AdminActivityEntryData['diff'] = {};

    const getBitflagNames = (eEnum, nameMap: ReadonlyMap<any, string>, value) =>
      Enum.values(eEnum)
        .filter((x) => Bitflags.has(value, x))
        .map((x) => nameMap.get(x))
        .join(', ') || null;

    if (oldUser.alias !== newUser.alias) {
      result['alias'] = [oldUser.alias, newUser.alias];
    }

    if (oldUser.profile?.bio !== newUser.profile?.bio) {
      result['bio'] = [oldUser.profile?.bio, newUser.profile?.bio];
    }

    if (oldUser.country !== newUser.country) {
      result['country'] = [oldUser.country, newUser.country];
    }

    if (oldUser.bans !== newUser.bans) {
      result['bans'] = [oldUser.bans, newUser.bans].map((bans) =>
        getBitflagNames(Ban, BanNames, bans)
      ) as [string, string];
    }

    if (oldUser.roles !== newUser.roles) {
      result['roles'] = [oldUser.roles, newUser.roles].map((roles) =>
        getBitflagNames(Role, RoleNames, roles)
      ) as [string, string];
    }

    if (
      JSON.stringify(oldUser.profile?.socials) !==
      JSON.stringify(newUser.profile?.socials)
    ) {
      Object.assign(
        result,
        AdminActivityEntryComponent.calculateDiff(
          oldUser.profile?.socials || {},
          newUser.profile?.socials || {}
        )
      );
    }

    return result;
  }
}

export interface AdminActivityEntryData {
  actionText: string;
  targetName?: string;
  targetLink?: string;
  diff?: Record<string, [string, string]>;
}
