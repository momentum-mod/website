export interface MapImage {
  id: string;
  small: string;
  medium: string;
  large: string;
}

export interface UpdateMapImages {
  imageIDs: string[];
}

export interface UpdateMapImagesWithFiles {
  images: File[];
  data: UpdateMapImages;
}
