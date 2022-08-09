export interface FileStoreFile {
    fileKey: string;
    basePath: string;
    fullPath: string;
    downloadURL: string;
    hash?: string;
}

export interface FileStoreCloudFile {
    fileKey: string;
    hash: string;
}
