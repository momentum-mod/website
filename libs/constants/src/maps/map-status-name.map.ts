import { MapStatus, MapStatusNew } from '../enums/map-status.enum';

export const MapStatusName: ReadonlyMap<MapStatus, string> = new Map([
  [MapStatus.APPROVED, 'Approved'],
  [MapStatus.PENDING, 'Pending'],
  [MapStatus.NEEDS_REVISION, 'Needs Revision'],
  [MapStatus.PRIVATE_TESTING, 'Private Testing'],
  [MapStatus.PUBLIC_TESTING, 'Public Testing'],
  [MapStatus.READY_FOR_RELEASE, 'Ready for Release'],
  [MapStatus.REMOVED, 'Removed']
]);

export const MapStatusNameNew: ReadonlyMap<MapStatusNew, string> = new Map([
  [MapStatusNew.APPROVED, 'Approved'],
  [MapStatusNew.PRIVATE_TESTING, 'Private Testing'],
  [MapStatusNew.CONTENT_APPROVAL, 'Content Approval'],
  [MapStatusNew.PUBLIC_TESTING, 'Public Testing'],
  [MapStatusNew.FINAL_APPROVAL, 'Final Approval'],
  [MapStatusNew.DISABLED, 'Disabled']
]);
