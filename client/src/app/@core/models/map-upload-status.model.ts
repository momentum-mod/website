export enum MapUploadStatus {
  APPROVED = 0,
  PENDING = 1,
  NEEDS_REVISION = 2,
  PRIVATE_TESTING = 3,
  PUBLIC_TESTING = 4,
  READY_FOR_RELEASE = 5,
  REJECTED = 6,
  REMOVED = 7,
}

export function getStatusFromEnum(value: MapUploadStatus): string {
    switch (value) {
      case MapUploadStatus.APPROVED:
        return 'Approved';
      case MapUploadStatus.PENDING:
        return 'Pending';
      case MapUploadStatus.NEEDS_REVISION:
        return 'Needs Revision';
      case MapUploadStatus.PRIVATE_TESTING:
        return 'Private Testing';
      case MapUploadStatus.PUBLIC_TESTING:
        return 'Public Testing';
      case MapUploadStatus.READY_FOR_RELEASE:
        return 'Ready for Release';
      case MapUploadStatus.REJECTED:
        return 'Rejected';
      case MapUploadStatus.REMOVED:
        return 'Removed';
      default:
        return MapUploadStatus[value];
  }
}
