export type FileUrl = {
  url: string;
  headers?: Record<string, string>;
};

export type Subtitle = {
  language: string;
  file: FileUrl;
  format: "vtt" | "ass" | "srt";
};

export type Timestamp = {
  type: string;
  startTime: number;
  endTime: number;
};

export type Video = {
  quality?: string;
  format?: "container" | "hls" | "dash";
  file: FileUrl;
};

export type Episode = {
  number: string;
  id: string;
  title?: string;
  isFiller?: boolean;
  description?: string;
  thumbnail?: string;
  extra?: Record<string, string>;
  section?: string;
};

export type VideoServer = {
  name: string;
  extraData?: Record<string, string>;
};

export type Font = {
  name: string;
  file: FileUrl;
};

export type VideoContainer = {
  videos: Video[];
  subtitles?: Subtitle[];
  timestamps?: Timestamp[];
  fonts?: Font[];
};

export type SearchResult = {
  id: string;
  title: string;
  thumbnail: string;
  extra?: Record<string, string>;
};

export type GetIdParams = {
  media: {
    id: number;
    title: {
      romaji: string;
      english: string;
      userPreferred: string;
      native: string;
    };
  };
};

export type GetEpisodeParams = {
  animeId: string;
  extraData?: Record<string, string>;
};

export type GetVideoServersParams = {
  episodeId: string;
  extraData?: Record<string, string>;
};

export type SearchParams = {
  query: string;
};

export type RequestConfig = {
  url: string;
  method: string;
  baseURL: string;
  headers: Record<string, any>;
  params: Record<string, any>;
  data:
    | string
    | Record<string, any>
    | ArrayBuffer
    | ArrayBufferView
    | URLSearchParams;
  timeout: number;
  withCredentials: boolean;
  responseType: string;
  responseEncoding: string;
  xsrfCookieName: string;
  xsrfHeaderName: string; // default
  maxContentLength: number;
  maxBodyLength: number;
  maxRedirects: number;
  socketPath: string | null; // default
  decompress: boolean; // default
};

export type Anime = {
  // Promise<{ data: string; extraData?: Record<string, string> }>;
  getId(params: GetIdParams): Promise<void>;

  // Promise<Episode[]>;
  getEpisodes(params: GetEpisodeParams): Promise<void>;

  // Promise<VideoServer[]>;
  loadVideoServers(params: GetVideoServersParams): Promise<void>;

  // Promise<VideoContainer>
  loadVideoContainer(server: VideoServer): Promise<void>;

  // Promise<SearchResult[]>;
  search(params: SearchParams): Promise<void>;
};
