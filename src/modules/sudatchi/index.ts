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
}

const anime: WindowAnime = {
  baseUrl: "https://sudatchi.com",

  getId: async ({ media }) => {
    const searchResults = await anime._totalSearch(media);

    const searchResultWithSameId = searchResults.find(
      (result) => Number(result.extra?.anilistId) === media.id
    );

    if (searchResultWithSameId) {
      return sendResponse({
        data: searchResultWithSameId.id,
        extraData: searchResultWithSameId.extra,
      });
    }

    sendResponse({
      data: searchResults?.[0]?.id,
      extraData: searchResults?.[0]?.extra,
    });
  },

  getEpisodes: async ({ animeId }) => {
    const { data: html } = await sendRequest<string>(
      `${anime.baseUrl}/anime/${animeId}`
    );

    const props = anime._parseBetween(
      html,
      '<script id="__NEXT_DATA__" type="application/json">',
      "</script>"
    );

    if (!props) return sendResponse([]);

    const data = JSON.parse(props) as {
      props: {
        pageProps: {
          animeData: {
            id: number;
            anilistId: number;
            titleRomanji: string;
            titleEnglish: string;
            titleJapanese: string;
            titleSpanish: any;
            titleFilipino: any;
            titleHindi: any;
            titleKorean: any;
            synonym: string;
            synopsis: string;
            slug: string;
            statusId: number;
            typeId: number;
            year: number;
            seasonId: number;
            totalEpisodes: string;
            seasonNumber: any;
            imgUrl: string;
            imgBanner: string;
            trailerLink: string;
            animeCrunchyId: string;
            crunchyrollId: string;
            hidiveId: any;
            seasonHidiveId: any;
            initialAirDate: string;
            isAdult: boolean;
            prequelId: any;
            sequelId: any;
            Status: {
              id: number;
              name: string;
            };
            Type: {
              id: number;
              name: string;
            };
            Season: {
              id: number;
              name: string;
            };
            characters: Array<{
              id: number;
              anilistId: number;
              name: string;
              role: string;
              imageUrl: string;
              animeId: number;
              voiceActors: Array<{
                id: number;
                characterId: number;
                voiceActorId: number;
                voiceActor: {
                  id: number;
                  anilistId: number;
                  name: string;
                  language: string;
                  imageUrl: string;
                };
              }>;
            }>;
            AnimeGenres: Array<{
              animeId: number;
              genreId: number;
              Genre: {
                id: number;
                name: string;
              };
            }>;
            Episodes: Array<{
              id: number;
              title: string;
              number: number;
              imgUrl: string;
              animeId: number;
              isProcessed: boolean;
              openingStartsAt: number;
              openingEndsAt: number;
              _count: {
                Subtitles: number;
                AudioStreams: number;
              };
              releaseDate: any;
              subtitleCount: number;
              audioCount: number;
            }>;
            nextAirSchedule: {
              id: number;
              animeId: number;
              episodeId: any;
              episodeNumber: number;
              airDate: string;
            };
          };
        };
      };
    };

    if (!data?.props?.pageProps?.animeData?.Episodes?.length)
      return sendResponse([]);

    const episodes = data.props.pageProps.animeData.Episodes;

    sendResponse(
      episodes.map((episode) => ({
        id: `${animeId}-${episode.id}`,
        number: episode.number.toString(),
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

    const { data: json } = await sendRequest<{ url: string }>(
      `${anime.baseUrl}/api/streams?episodeId=${episodeId}`
    );

    if (!json?.url) return sendResponse(container);

    container.videos.push({
      file: { url: `${anime.baseUrl}/${json.url}` },
    });

    const { data: html } = await sendRequest<string>(
      `${anime.baseUrl}/watch/${animeId}/${number}`
    );

    const props = anime._parseBetween(
      html,
      '<script id="__NEXT_DATA__" type="application/json">',
      "</script>"
    );

    if (!props) return sendResponse(container);

    const data = JSON.parse(props) as {
      props: {
        pageProps: {
          episodeData: {
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
          };
        };
      };
    };

    if (!data) return sendResponse(container);

    const subtitles = JSON.parse(
      data?.props?.pageProps?.episodeData?.subtitlesJson
    ) as Array<{
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
        let url = "";

        if (sub.url.startsWith("/subtitles")) {
          url = `https://sudatchi.com${sub.url}`;
        } else {
          url = `https://ipfs.animeui.com${sub.url}`;
        }

        return {
          file: { url },
          language: sub.SubtitlesName.name,
          format: "ass",
        };
      });
    }

    const openingStartsAt =
      data?.props?.pageProps?.episodeData?.episode.openingStartsAt;
    const openingEndsAt =
      data?.props?.pageProps?.episodeData?.episode.openingEndsAt;

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
    ];

    sendResponse(container);
  },

  async _search(query: string): Promise<SearchResult[]> {
    if (!query) return [];

    if (query === "null") return [];

    const encodedQuery = encodeURIComponent(query);

    const { data } = await sendRequest<{
      animes: Array<{
        id: number;
        anilistId: number;
        titleRomanji: string;
        titleEnglish: string;
        titleJapanese: string;
        titleSpanish: any;
        titleFilipino: any;
        titleHindi: any;
        titleKorean: any;
        synonym: string;
        synopsis: string;
        slug: string;
        statusId: number;
        typeId: number;
        year: number;
        seasonId: number;
        totalEpisodes: number;
        seasonNumber: any;
        imgUrl: string;
        imgBanner: string;
        trailerLink: string;
        animeCrunchyId: string;
        crunchyrollId: string;
        hidiveId: any;
        seasonHidiveId: any;
        initialAirDate: string;
        isAdult: boolean;
        prequelId: any;
        sequelId: any;
        Type: {
          id: number;
          name: string;
        };
        Status: {
          id: number;
          name: string;
        };
      }>;
      page: number;
      pages: number;
      genres: Array<{
        id: number;
        name: string;
      }>;
      years: Array<{
        year: number;
      }>;
      types: Array<{
        id: number;
        name: string;
      }>;
      status: Array<{
        id: number;
        name: string;
      }>;
      selectedGenres: Array<any>;
      selectedYears: Array<any>;
      selectedTypes: Array<any>;
      selectedStatus: Array<any>;
    }>(
      `${anime.baseUrl}/api/directory?page=1&genres=&years=&types=&status=&title=${encodedQuery}&category=`
    );

    if (!data?.animes?.length) return [];

    return data.animes.map((anime) => ({
      id: anime.slug,
      title: anime.titleEnglish || anime.titleRomanji || anime.titleJapanese,
      thumbnail: `https://ipfs.animeui.com/ipfs/${anime.imgUrl}`,
      extra: {
        anilistId: anime.anilistId.toString(),
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
};
