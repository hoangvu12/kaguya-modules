/* eslint-disable @typescript-eslint/no-explicit-any */
export enum VideoFormat {
  CONTAINER = "container",
  HLS = "hls",
  DASH = "dash",
}

export enum SubtitleFormat {
  VTT = "vtt",
  ASS = "ass",
  SRT = "srt",
}

export type FileUrl = {
  url: string;
  headers?: Record<string, string>;
};

export type Subtitle = {
  language: string;
  file: FileUrl;
  format: SubtitleFormat;
};

export type Timestamp = {
  type: string;
  startTime: number;
  endTime: number;
};

export type Video = {
  quality?: string;
  format?: VideoFormat;
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

export type VideoContainer = {
  videos: Video[];
  subtitles: Subtitle[];
  timestamps: Timestamp[];
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

declare global {
  function sendRequest<T = any>(
    config: string | Partial<RequestConfig>
  ): Promise<{
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, any>;
    request?: any;
  }>;

  function sendResponse<T = any>(response: T): void;
  async function loadScript(url: string): Promise<void>;
}

export {};
