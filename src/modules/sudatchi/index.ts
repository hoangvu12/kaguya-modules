import type {
  Anime,
  SearchResult,
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
  _parseBetween: (text: string, start: string, end: string) => string;
  _getSubtitleUrl: () => Promise<string>;
}

const anime: WindowAnime = {
  baseUrl: "https://sudatchi.com",

  getId: async ({ media }) => {
    sendResponse({
      data: media.id.toString(),
    });
  },

  getEpisodes: async ({ animeId }) => {
    const { data: json } = await sendRequest<{
      id: number;
      title: {
        english: string;
        romaji: string;
        native: string;
      };
      episodesCount: number;
      episodes: Array<any>;
      startDate: {
        year: number;
        month: number;
        day: number;
      };
      bannerImage: string;
      coverImage: string;
      logoImage: string;
      description: string;
      genres: Array<string>;
      format: string;
      season: string;
      isAdult: boolean;
      status: any;
      nextAirSchedule: any;
      otherSeasons: Array<{
        id: number;
        title: string;
        season: string;
        format: string;
        coverImage: string;
        bannerImage: any;
        startYear: any;
        relationType: string;
      }>;
      characters: Array<{
        id: number;
        name: string;
        image: string;
        role: string;
      }>;
      rating: string;
      themes: Array<string>;
      studio: string;
      producers: Array<string>;
    }>({
      url: `${anime.baseUrl}/api/anime/${animeId}`,
      headers: {
        Origin: "https://sudatchi.com",
        Referer: "https://sudatchi.com/",
      },
    });

    const episodes = json.episodes;

    if (!episodes?.length) return sendResponse([]);

    sendResponse(
      episodes.map((episode) => ({
        id: `${animeId}-${episode.id}`,
        number: episode.number.toString(),
        thumbnail: `https://sudatchi.com/api/proxy/${episode.imgUrl}`,
        title: episode.title,
        extra: {
          number: episode.number.toString(),
          animeId,
          episodeId: episode.id.toString(),
        },
      }))
    );
  },

  search: async ({ query }) => {
    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },

  loadVideoServers: async ({ extraData }) => {
    const number = extraData?.number;
    const animeId = extraData?.animeId;
    const episodeId = extraData?.episodeId;

    if (!number || !animeId) return sendResponse([]);

    sendResponse([
      {
        embed: "",
        name: "Server",
        extraData: {
          number,
          animeId,
          episodeId,
        },
      },
    ]);
  },

  async loadVideoContainer(videoServer: VideoServer) {
    const number = videoServer?.extraData?.number;
    const animeId = videoServer?.extraData?.animeId;
    const episodeId = videoServer?.extraData?.episodeId;

    const container: VideoContainer = {
      videos: [],
      fonts: [],
      subtitles: [],
      timestamps: [],
    };

    container.videos.push({
      file: {
        url: `${anime.baseUrl}/api/streams?episodeId=${episodeId}`,
        headers: {
          Origin: "https://sudatchi.com",
          Referer: "https://sudatchi.com/",
        },
      },
      format: "hls",
    });

    const { data: streamJson } = await sendRequest<{
      anime: {
        id: number;
        titleRomanji: string;
        titleEnglish: string;
        titleJapanese: string;
        synonym: string;
        synopsis: string;
        slug: string;
        year: number;
        isAdult: boolean;
        totalEpisodes: number;
        imgUrl: string;
        imgBanner: string;
        trailerLink: string;
        Type: {
          id: number;
          name: string;
        };
        Status: {
          id: number;
          name: string;
        };
        Season: {
          id: number;
          name: string;
        };
        AnimeGenres: Array<{
          Genre: {
            id: number;
            name: string;
          };
        }>;
      };
      currentEpisode: string;
      episode: {
        id: number;
        title: string;
        number: number;
        imgUrl: string;
        animeId: number;
        isProcessed: boolean;
        openingStartsAt: number;
        openingEndsAt: number;
        _count: {
          EpisodeViews: number;
        };
        AudioStreams: Array<{
          id: number;
          episodeId: number;
          languageId: number;
          isDefault: boolean;
          autoSelect: boolean;
          playlistUri: string;
        }>;
      };
      episodes: Array<{
        id: number;
        title: string;
        number: number;
        imgUrl: string;
        animeId: number;
        isProcessed: boolean;
        openingStartsAt: number;
        openingEndsAt: number;
        _count: {
          EpisodeViews: number;
        };
        AudioStreams: Array<{
          id: number;
          episodeId: number;
          languageId: number;
          isDefault: boolean;
          autoSelect: boolean;
          playlistUri: string;
        }>;
      }>;
      previousEpisode: any;
      nextEpisode: any;
      servers: Array<any>;
      subtitlesJson: string;
      subtitles: Array<{
        id: number;
        name: string;
        language: string;
      }>;
      subtitlesMap: {
        "1": string;
        "2": string;
        "4": string;
        "6": string;
      };
      comments: Array<any>;
      fonts: Array<string>;
    }>({
      url: `${anime.baseUrl}/api/episode/${animeId}/${number}`,
      headers: {
        Origin: "https://sudatchi.com",
        Referer: "https://sudatchi.com/",
      },
    });

    const subtitles = JSON.parse(streamJson?.subtitlesJson) as Array<{
      id: number;
      episodeId: number;
      subtitleId: number;
      url: string;
      SubtitlesName: {
        id: number;
        name: string;
        language: string;
      };
    }>;

    // const fonts = data?.props?.pageProps?.episodeData?.fonts;

    if (subtitles?.length) {
      container.subtitles = subtitles.map((sub) => {
        // let url = "";

        // if (sub.url.startsWith("/subtitles")) {
        //   url = `https://sudatchi.com${sub.url}`;
        // } else {
        //   url = `${subtitleUrl}${sub.url}`;
        // }

        const url = `https://sudatchi.com/api/proxy/${sub.url}`.replace(
          "/ipfs/",
          "/"
        );

        return {
          file: {
            url,
            headers: {
              Origin: "https://sudatchi.com",
              Referer: "https://sudatchi.com/",
            },
          },
          language: sub.SubtitlesName.name,
          format: "ass",
        };
      });
    }

    const openingStartsAt = streamJson?.episode.openingStartsAt;
    const openingEndsAt = streamJson?.episode.openingEndsAt;

    if (openingEndsAt && openingStartsAt) {
      container.timestamps = [
        {
          startTime: openingStartsAt,
          endTime: openingEndsAt,
          type: "OP",
        },
      ];
    }

    // Can't manage to make this work with Jassub
    // if (fonts?.length) {
    //   container.fonts = fonts.map((font) => {
    //     const fontName = font.split("/").pop().split(".")[0];

    //     return {
    //       file: { url: `${this.url}${font}` },
    //       name: fontName,
    //     };
    //   });
    // }

    container.fonts = [
      {
        file: {
          url: `https://github.com/justrajdeep/fonts/raw/master/Arial.ttf`,
        },
        name: "Arial",
      },
      {
        file: {
          url: `https://github.com/justrajdeep/fonts/raw/master/Arial%20Bold.ttf`,
        },
        name: "Arial",
      },
      {
        file: {
          url: "https://github.com/justrajdeep/fonts/raw/master/Times%20New%20Roman.ttf",
        },
        name: "Times New Roman",
      },
      {
        file: {
          url: "https://github.com/justrajdeep/fonts/raw/master/Trebuchet%20MS.ttf",
        },
        name: "Trebuchet MS",
      },
      {
        file: {
          url: "https://github.com/justrajdeep/fonts/raw/master/Tahoma.ttf",
        },
        name: "Tahoma",
      },
      {
        file: {
          url: "https://github.com/hoangvu12/kaguya-fonts/raw/master/AdobeArabic-Regular.ttf",
        },
        name: "Adobe Arabic",
      },
      {
        file: {
          url: "https://github.com/hoangvu12/kaguya-fonts/raw/master/Swiss%20721%20BT.ttf",
        },
        name: "Swis721 BT",
      },
    ];

    sendResponse(container);
  },

  async _search(query: string): Promise<SearchResult[]> {
    if (!query) return [];

    if (query === "null") return [];

    const { data } = await sendRequest<{
      results: {
        id: number;
        title: {
          romaji?: string;
          english?: string;
        };
        coverImage: {
          medium: string;
        };
      }[];
    }>({
      url: `${anime.baseUrl}/api/fetchAnime`,
      headers: {
        Origin: "https://sudatchi.com",
        Referer: "https://sudatchi.com/",
      },
      data: {
        query,
      },
      method: "POST",
    });

    if (!data?.results?.length) return [];

    return data.results.map((anime) => ({
      id: anime.id.toString(),
      title: anime.title.romaji || anime.title.english || "",
      thumbnail: anime.coverImage.medium,
      extra: {
        anilistId: anime.id.toString(),
      },
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
  _parseBetween(text, start, end) {
    let strArr = [];

    strArr = text.split(start);
    strArr = strArr[1].split(end);

    return strArr[0];
  },

  async _getSubtitleUrl() {
    const response = await sendRequest({
      url: "https://raw.githubusercontent.com/hoangvu12/kext-domain/master/domains.json",
      headers: {
        Origin: "https://sudatchi.com",
        Referer: "https://sudatchi.com/",
      },
    });
    const json = (await response.data) as { [key: string]: string };

    if (!json?.["sudatchi-sub"]) return "";

    return json["sudatchi-sub"];
  },
};
