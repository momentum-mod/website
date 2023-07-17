import { MapStatus } from '../enums/map-status.enum';

export const MapStatusName: ReadonlyMap<MapStatus, string> = new Map([
  [MapStatus.APPROVED, 'Approved'],
  [MapStatus.PENDING, 'Pending'],
  [MapStatus.NEEDS_REVISION, 'Needs Revision'],
  [MapStatus.PRIVATE_TESTING, 'Private Testing'],
  [MapStatus.PUBLIC_TESTING, 'Public Testing'],
  [MapStatus.READY_FOR_RELEASE, 'Ready for Release'],
  [MapStatus.REJECTED, 'Rejected'],
  [MapStatus.REMOVED, 'Removed']
]);
