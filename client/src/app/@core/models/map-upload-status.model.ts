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
        break;
      case MapUploadStatus.NEEDS_REVISION:
        return 'Needs Revision';
        break;
      case MapUploadStatus.PRIVATE_TESTING:
        return 'Private Testing';
        break;
      case MapUploadStatus.PUBLIC_TESTING:
        return 'Public Testing';
        break;
      case MapUploadStatus.READY_FOR_RELEASE:
        return 'Ready for Release';
        break;
      case MapUploadStatus.REJECTED:
        return 'Rejected';
        break;
      case MapUploadStatus.REMOVED:
        return 'Removed';
        break;
      default:
        return MapUploadStatus[value];
  }
}
