/* eslint-disable @typescript-eslint/no-unused-vars */
import { Anime, VideoContainer } from "../../types";

const CrunchyrollClient = class {
  USER_AGENT = "Crunchyroll/3.28.0 Android/9 okhttp/4.9.2";
  BASIC_TOKEN =
    "dnZnbnJybGdnc2pfZl90MXJmZ2o6TEhnWXNGYzh0X0ZhNkJhQmFuS0pTempnR01UUUt3QnI=";
  LOCALES = [
    "en-US",
    "de-DE",
    "es-419",
    "es-ES",
    "fr-FR",
    "it-IT",
    "pt-BR",
    "pt-PT",
    "ru-RU",
    "ar-SA",
    "hi-IN",
  ];

  device = {
    device_id: "46989315-8261-4a19-99b5-e7920396b50f",
    device_name: "SM-N976N",
    device_type: "samsung SM-N976N",
  };

  locale = "";
  static = "https://static.crunchyroll.com";
  api = "https://beta-api.crunchyroll.com";
  refresh_token: string | null = null;
  bearer_expire = 0;
  bearer_token = null;
  cms_expire = 0;
  cms_token: any = null;

  is_initialized = false;

  constructor(locale = "en-US", refresh_token: string | null = null) {
    if (!this.LOCALES.includes(locale)) {
      throw new Error("Selected locale is not compatible.");
    }

    this.locale = locale;
    this.refresh_token = refresh_token;
  }

  async init() {
    if (this.is_initialized) return;

    if (!this.refresh_token) {
      await this.getAnonymousUserJwt();
    } else {
      await this.refreshUserJwt(this.refresh_token);
    }

    await this.getIndex();

    this.is_initialized = true;
  }

  async makeRequest(
    url: string,
    method = "GET",
    params: Record<string, string> | null = null,
    data: any = null,
    _ = null,
    headers: Record<string, string> | null = null,
    authorization: "BASIC" | "BEARER" | "CMS" | null = null
  ) {
    if (!headers) {
      headers = { accept: "*/*", "user-agent": this.USER_AGENT };
    }

    switch (authorization) {
      case "BASIC":
        headers["authorization"] = `Basic ${this.BASIC_TOKEN}`;
        break;
      case "BEARER":
        if (this.bearer_expire <= Date.now() / 1000) {
          if (!this.refresh_token) {
            await this.getAnonymousUserJwt();
          } else {
            await this.refreshUserJwt(this.refresh_token);
          }
        }

        headers["authorization"] = `Bearer ${this.bearer_token}`;
        break;
      case "CMS":
        url = url.replace("BUCKET", this.cms_token?.["bucket"]?.substring(1));
        if (params === null) {
          params = {};
        }
        params["Policy"] = this.cms_token["policy"];
        params["Signature"] = this.cms_token["signature"];
        params["Key-Pair-Id"] = this.cms_token["key_pair_id"];

        break;
    }

    if (params) {
      data = params;
    }

    const axiosConfig = {
      method,
      headers,
      data:
        method === "POST" ? new URLSearchParams(data).toString() : undefined,
      url: method === "POST" ? url : `${url}?${new URLSearchParams(data)}`,
    };

    const { data: res } = await sendRequest(axiosConfig);

    return res;
  }

  async getAnonymousUserJwt() {
    const device = JSON.parse(JSON.stringify(this.device)) as any;
    device["grant_type"] = "client_id";
    const j_response: any = await this.makeRequest(
      `${this.api}/auth/v1/token`,
      "POST",
      null,
      device,
      null,
      null,
      "BASIC"
    );

    this.bearer_expire = Date.now() / 1000 + j_response["expires_in"];
    this.bearer_token = j_response["access_token"];
    return j_response;
  }

  async refreshUserJwt(refresh_token: string) {
    const device = JSON.parse(JSON.stringify(this.device)) as any;
    device["refresh_token"] = refresh_token;
    device["grant_type"] = "refresh_token";
    device["scope"] = "offline_access";

    const j_response: any = await this.makeRequest(
      `${this.api}/auth/v1/token`,
      "POST",
      null,
      device,
      null,
      null,
      "BASIC"
    );

    this.refresh_token = j_response["refresh_token"];
    this.bearer_expire = Date.now() / 1000 + j_response["expires_in"];
    this.bearer_token = j_response["access_token"];
    return j_response;
  }

  async getIndex() {
    const j_response: any = await this.makeRequest(
      `${this.api}/index/v2`,
      "GET",
      null,
      null,
      null,
      null,
      "BEARER"
    );

    this.cms_token = j_response["cms"];
    this.cms_expire = new Date(this.cms_token["expires"]).getTime() / 1000;

    return j_response;
  }

  async getPanels(panel_ids: string[] = [], fields = null) {
    await this.init();

    const params: Record<string, string> = { locale: this.locale };

    if (fields !== null) {
      params["fields"] = fields;
    }
    return this.makeRequest(
      `${this.api}/cms/v2/BUCKET/objects/${panel_ids.join(",")}`,
      "GET",
      params,
      null,
      null,
      null,
      "CMS"
    );
  }

  async getStreams(stream_id: string) {
    await this.init();

    return this.makeRequest(
      `${this.api}/cms/v2/BUCKET/videos/${stream_id}/streams`,
      "GET",
      null,
      null,
      null,
      null,
      "CMS"
    );
  }

  async search(query: string, start = 0, limit = 20, type = null) {
    const params: Record<string, any> = {
      q: query,
      start: start,
      n: limit,
      locale: this.locale,
    };
    if (type !== null) {
      params["type"] = type;
    }

    return this.makeRequest(
      `${this.api}/content/v2/discover/search`,
      "GET",
      params,
      null,
      null,
      null,
      "BEARER"
    );
  }

  async getEpisodes(season_id: string) {
    await this.init();

    return this.makeRequest(
      `${this.api}/cms/v2/BUCKET/episodes`,
      "GET",
      { season_id: season_id, locale: this.locale },
      null,
      null,
      null,
      "CMS"
    );
  }

  async getEpisode(episode_id: string) {
    await this.init();

    return this.makeRequest(
      `${this.api}/cms/v2/BUCKET/episodes/${episode_id}`,
      "GET",
      { locale: this.locale },
      null,
      null,
      null,
      "CMS"
    );
  }

  async getSeasons(series_id: string) {
    await this.init();

    return this.makeRequest(
      `${this.api}/cms/v2/BUCKET/seasons`,
      "GET",
      { series_id: series_id, locale: this.locale },
      null,
      null,
      null,
      "CMS"
    );
  }

  async getSeason(season_id: string) {
    await this.init();

    return this.makeRequest(
      `${this.api}/cms/v2/BUCKET/seasons/${season_id}`,
      "GET",
      { locale: this.locale },
      null,
      null,
      null,
      "CMS"
    );
  }

  async safeGetEpisodes(season_id: string) {
    try {
      return await this.getEpisodes(season_id);
    } catch (err) {
      return null;
    }
  }

  async getAllEpisodes(series_id: string) {
    const episodeIDs = (await this.getSeasons(series_id)).items.map(
      (elem: any) => elem.id
    );
    const promises = [];

    for (const id of episodeIDs) {
      promises.push(this.safeGetEpisodes(id));
    }

    const episodes = (await Promise.all(promises)).filter(Boolean);

    return episodes;
  }

  async getSeries(series_id: string) {
    await this.init();

    return this.makeRequest(
      `${this.api}/cms/v2/BUCKET/series/${series_id}`,
      "GET",
      { locale: this.locale },
      null,
      null,
      null,
      "CMS"
    );
  }
};

interface WindowAnime extends Anime {
  // @ts-expect-error For some reason it doesn't work
  crunchyrollClient: CrunchyrollClient;
  _totalSearch: (media: any) => Promise<any>;
  _search: (query: string) => Promise<any>;
}

const anime: WindowAnime = {
  crunchyrollClient: new CrunchyrollClient(
    "en-US",
    "82b6eb07-918b-4434-81c5-2797056dc56f"
  ),
  getId: async ({ media }) => {
    const searchResults = await anime._totalSearch(media);

    sendResponse({
      data: searchResults?.[0]?.id,
    });
  },
  search: async ({ query }) => {
    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },
  getEpisodes: async ({ animeId }) => {
    const client = anime.crunchyrollClient;

    const seasonsJSON = await client.getAllEpisodes(animeId);

    const totalEpisodes = [];

    for (const episodes of seasonsJSON) {
      for (const episodesItem of episodes.items) {
        let sectionName = episodesItem?.season_title?.replace(
          episodesItem.series_title,
          ""
        );

        if (!sectionName) {
          sectionName = "Season 1";
        }

        totalEpisodes.push({
          id: episodesItem.id,
          number: episodesItem.episode,
          thumbnail:
            episodesItem.images?.thumbnail?.[0]?.[3].source ??
            episodesItem.images?.thumbnail?.[0]?.[0].source,
          description: episodesItem.description,
          title: episodesItem.title,
          section: sectionName,
        });
      }
    }

    sendResponse(totalEpisodes);
  },
  _search: async (query) => {
    const client = anime.crunchyrollClient;

    const searchJSON = await client.search(query, 0, 50);
    const searchData = [];
    const items = searchJSON.data[0].items;

    for (let i = 0; i < items.length; i++) {
      const searchItem = items[i];

      searchData.push({
        title: searchItem.title,
        thumbnail:
          searchItem.images?.poster_tall?.[0]?.[3]?.source ??
          searchItem.images?.poster_tall?.[0]?.[0]?.source,
        id: searchItem.id,
      });
    }

    return searchData;
  },
  async _totalSearch(media) {
    const titles = Array.from(
      new Set([media?.title?.english, media?.title?.romaji])
    );

    if (!titles?.length) return [];

    for (const title of titles) {
      try {
        const searchResults = await anime._search(title);

        if (!searchResults?.length) continue;

        return searchResults;
      } catch (err) {
        continue;
      }
    }

    return [];
  },
  async loadVideoServers({ episodeId }) {
    const client = anime.crunchyrollClient;

    const panels = await client.getPanels([episodeId]);

    const streamId = panels.items?.[0]?.__links__?.streams?.href
      ?.split("videos/")?.[1]
      .split("/")?.[0];

    const streamsJSON = await client.getStreams(streamId);

    const supportedKeys = [
      "adaptive_dash",
      "adaptive_hls",
      "download_dash",
      "download_hls",
      "multitrack_adaptive_hls_v2",
      "vo_adaptive_dash",
      "vo_adaptive_hls",
    ];

    const videoServers = [];

    for (const streamName in streamsJSON.streams) {
      if (!supportedKeys.includes(streamName)) continue;

      const streamElem = streamsJSON.streams[streamName];
      const subtitles = streamsJSON.subtitles;

      const composedSubtitles = Object.entries(subtitles).map(
        ([_, subtitle]: [any, any]) => ({
          file: {
            url: subtitle.url,
          },
          language: subtitle.locale,
          format: subtitle.format,
        })
      );

      videoServers.push({
        embed: "",
        name: streamName,
        extraData: {
          stream: streamElem?.[""]?.url,
          subtitles: JSON.stringify(composedSubtitles),
        },
      });
    }

    sendResponse(videoServers);
  },

  async loadVideoContainer({ extraData }) {
    const stream = extraData?.stream;
    const stringSubtitles = extraData?.subtitles;

    if (!stream) throw new Error("Stream not found");

    const videoContainer: VideoContainer = {
      videos: [{ file: { url: stream } }],
      subtitles: [],
      fonts: [],
      timestamps: [],
    };

    try {
      const subtitles = JSON.parse(stringSubtitles ?? "[]") as any[];

      subtitles.forEach((subtitle: any) => {
        subtitle.format = "ass";
      });

      videoContainer.subtitles = subtitles;
      videoContainer.fonts = [
        {
          file: {
            url: "https://cdn.discordapp.com/attachments/708287522374942761/1147558898648223814/Adobe_Arabic_Regular.ttf",
          },
          name: "Adobe Arabic",
        },
        {
          file: {
            url: "https://cdn.discordapp.com/attachments/708287522374942761/1147560004610699326/trebuc.ttf",
          },
          name: "Trebuchet MS",
        },
        {
          file: {
            url: "https://cdn.discordapp.com/attachments/708287522374942761/1147565830184390686/arial.ttf",
          },
          name: "Arial",
        },
        {
          file: {
            url: "https://cdn.discordapp.com/attachments/708287522374942761/1147566984964358174/Tahoma_Regular_font.ttf",
          },
          name: "Tahoma",
        },
      ];
    } catch {
      console.log("Failed to parse subtitles");
    }

    sendResponse(videoContainer);
  },
};
