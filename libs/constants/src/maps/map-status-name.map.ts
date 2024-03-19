import { MapStatus } from '../enums/map-status.enum';

export const MapStatusName: ReadonlyMap<MapStatus, string> = new Map([
  [MapStatus.APPROVED, 'Approved'],
  [MapStatus.PRIVATE_TESTING, 'Private Testing'],
  [MapStatus.CONTENT_APPROVAL, 'Content Approval'],
  [MapStatus.PUBLIC_TESTING, 'Public Testing'],
  [MapStatus.FINAL_APPROVAL, 'Final Approval'],
  [MapStatus.DISABLED, 'Disabled']
]);
