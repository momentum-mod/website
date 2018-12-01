export interface TwitchVideo {
  title: string;
  url: string;
  created_at: Date;
  views: number; // TODO removeme when below is uncommented
  length: number; // length in seconds TODO removeme
  channel: { // TODO removeme
    display_name: string;
  };
  preview: string; // TODO removeme
  // TODO: remove the above marked and uncomment below when new Twitch API works properly
  // duration: string;
  // view_count: number;
  // user_name: string;
  // thumbnail_url: string;
}
