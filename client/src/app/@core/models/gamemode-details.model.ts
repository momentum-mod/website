import { SafeResourceUrl } from '@angular/platform-browser';

export interface GameModeDetails {
  url: string;
  modeTitle: string;
  modeDescription: string;
  imageUrl: string;
  iconUrl: string;
  isImplemented: boolean;
  useYoutubeEmbed: boolean;
  playingYoutubeEmbed?: boolean;
  youtubeVidID?: string;
  youtubeVidURL?: SafeResourceUrl;
}
