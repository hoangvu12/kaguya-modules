import type {
  Anime,
  SearchResult,
  Subtitle,
  VideoContainer,
  VideoServer,
} from "../../types";

interface WindowAnime extends Anime {
  baseUrl: string;
  _totalSearch: (media: {
    id: number;
    title: {
      romaji: string;
      english: string;
      userPreferred: string;
      native: string;
    };
  }) => Promise<SearchResult[]>;
  _search: (
    query: string,
    shouldRemoveDuplicates?: boolean
  ) => Promise<SearchResult[]>;
  _servers: Record<number, string>;
}

const anime: WindowAnime = {
  baseUrl: "https://aniwatch-api-72oo.onrender.com",

  getId: async ({ media }) => {
    const searchResults = await anime._totalSearch(media);

    sendResponse({
      data: searchResults?.[0]?.id,
    });
  },

  getEpisodes: async ({ animeId }) => {
    const { data } = await sendRequest<{
      episodes: {
        title: string;
        episodeId: string;
        number: number;
        isFiller: boolean;
      }[];
    }>(`${anime.baseUrl}/anime/episodes/` + animeId);

    sendResponse(
      data?.episodes?.map((ep) => ({
        id: ep.episodeId.replace("?ep=", "questionmarkep="),
        number: ep.number.toString(),
        title: ep.title,
        isFiller: ep.isFiller,
      }))
    );
  },

  search: async ({ query }) => {
    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },

  loadVideoServers: async ({ episodeId }) => {
    const newEpisodeId = episodeId.replace("questionmarkep=", "?ep=");

    sendResponse([
      {
        name: "Server",
        embed: "",
        extraData: {
          id: newEpisodeId,
        },
      },
    ]);

    // const { data } = await sendRequest<{
    //   sub: {
    //     serverName: string;
    //     serverId: number;
    //   }[];
    //   dub: {
    //     serverName: string;
    //     serverId: number;
    //   }[];
    //   raw: {
    //     serverName: string;
    //     serverId: number;
    //   }[];
    //   episodeId: string;
    //   episodeNo: number;
    // }>(`${anime.baseUrl}/anime/servers?episodeId=` + newEpisodeId);

    // const subServers = data.sub.map((server) => {
    //   const serverName = anime._servers[server.serverId] || "vidcloud";

    //   return {
    //     name: `sub-${serverName}`,
    //     embed: "",
    //     extraData: {
    //       id: newEpisodeId,
    //       serverName: serverName.toString(),
    //       category: "sub",
    //     },
    //   };
    // });

    // const dubServers = data.dub.map((server) => {
    //   const serverName = anime._servers[server.serverId] || "vidcloud";

    //   return {
    //     name: `dub-${serverName}`,
    //     embed: "",
    //     extraData: {
    //       id: newEpisodeId,
    //       serverName: serverName.toString(),
    //       category: "dub",
    //     },
    //   };
    // });

    // const rawServers = data.raw.map((server) => {
    //   const serverName = anime._servers[server.serverId] || "vidcloud";

    //   return {
    //     name: `raw-${serverName}`,
    //     embed: "",
    //     extraData: {
    //       id: newEpisodeId,
    //       serverName: serverName.toString(),
    //       category: "raw",
    //     },
    //   };
    // });

    // sendResponse([...subServers, ...dubServers, ...rawServers]);
  },

  async loadVideoContainer(videoServer: VideoServer) {
    const episodeId = videoServer.extraData?.id!;
    // const serverName = videoServer.extraData?.serverName!;
    // const category = videoServer.extraData?.category!;

    // if (!episodeId || !serverName || !category) {
    //   return sendResponse(null);
    // }

    // const { data } = await sendRequest<{
    //   tracks: { file: string; kind: string; label: string }[];
    //   intro: { start: number; end: number };
    //   outro: { start: number; end: number };
    //   sources: { url: string; type: string }[];
    //   anilistID: number;
    //   malID: number;
    // }>(
    //   `${anime.baseUrl}/anime/episode-srcs?id=${episodeId}&server=${serverName}&category=${category}`
    // );

    const { data } = await sendRequest<{
      tracks: { file: string; kind: string; label: string }[];
      intro: { start: number; end: number };
      outro: { start: number; end: number };
      sources: { url: string; type: string }[];
      anilistID: number;
      malID: number;
    }>(`${anime.baseUrl}/anime/episode-srcs?id=${episodeId}`);

    const container: VideoContainer = {
      videos: [],
      subtitles: [],
      timestamps: [],
    };

    const subtitles: Subtitle[] = data?.tracks
      ?.filter((track) => track.kind === "captions")
      .map((track) => ({
        file: { url: track.file },
        language: track.label,
      }));

    container.subtitles = subtitles;
    container.timestamps = [];

    if (data?.intro) {
      container.timestamps?.push({
        type: "Intro",
        startTime: data.intro.start,
        endTime: data.intro.end,
      });
    }

    if (data?.outro) {
      container.timestamps?.push({
        type: "Outro",
        startTime: data.outro.start,
        endTime: data.outro.end,
      });
    }

    const getOrigin = (url: string): string => {
      const match = url.match(/^(https?:\/\/[^/]+)/);
      return match ? match[1] : "";
    };

    if (Array.isArray(data?.sources)) {
      data?.sources?.forEach((source) => {
        const sourceOrigin = getOrigin(source.url);

        container.videos.push({
          file: { url: source.url, headers: { Referer: sourceOrigin } },
          format: source.type as any,
        });
      });

      // container.videos.push({
      //   file: { url: data?.sources?.[0]?.url },
      //   format: "hls",
      // });
    }

    sendResponse(container);
  },

  async _search(query: string): Promise<SearchResult[]> {
    if (!query) return [];

    if (query === "null") return [];

    const { data } = await sendRequest<{
      animes: {
        id: string;
        name: string;
        poster: string;
        duration: string;
        type: string;
        rating: string;
        episodes: {
          sub: number;
          dub: number;
        }[];
      }[];
    }>(`${anime.baseUrl}/anime/search?q=` + encodeURIComponent(query));

    return data?.animes?.map((item) => ({
      id: item.id,
      thumbnail: item.poster,
      title: item.name,
    }));
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
        console.error(err);
      }
    }

    return [];
  },
  _servers: {
    4: "vidstreaming",
    1: "vidcloud",
    5: "streamsb",
    3: "streamtape",
  },
};
