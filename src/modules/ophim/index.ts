import type { Anime, SearchResult, VideoServer } from "../../types";

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
  baseUrl: "https://ophim.cc",

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
      `${anime.baseUrl}/phim/${animeId}`
    );

    const slugify = (text: string) => {
      return text
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/&/g, "-and-")
        .replace(/[\s\W-]+/g, "-");
    };

    const props = anime._parseBetween(
      html,
      '<script id="__NEXT_DATA__" type="application/json">',
      "</script>"
    );

    if (!props) return sendResponse([]);

    const json = JSON.parse(props) as {
      props: {
        pageProps: {
          data: {
            seoOnPage: {
              og_type: string;
              titleHead: string;
              seoSchema: {
                "@context": string;
                "@type": string;
                name: string;
                dateModified: string;
                dateCreated: string;
                url: string;
                datePublished: string;
                image: string;
                director: string;
              };
              descriptionHead: string;
              og_image: Array<string>;
              updated_time: number;
              og_url: string;
            };
            breadCrumb: Array<{
              name: string;
              slug?: string;
              position: number;
              isCurrent?: boolean;
            }>;
            params: {
              slug: string;
            };
            item: {
              tmdb: {
                type: any;
                id: string;
                season: any;
                vote_average: number;
                vote_count: number;
              };
              imdb: {
                id: string;
              };
              created: {
                time: string;
              };
              modified: {
                time: string;
              };
              _id: string;
              name: string;
              origin_name: string;
              content: string;
              type: string;
              status: string;
              thumb_url: string;
              poster_url: string;
              is_copyright: boolean;
              sub_docquyen: boolean;
              chieurap: boolean;
              trailer_url: string;
              time: string;
              episode_current: string;
              episode_total: string;
              quality: string;
              lang: string;
              notify: string;
              showtimes: string;
              slug: string;
              year: number;
              view: number;
              actor: Array<string>;
              director: Array<string>;
              category: Array<{
                id: string;
                name: string;
                slug: string;
              }>;
              country: Array<{
                id: string;
                name: string;
                slug: string;
              }>;
              episodes: Array<{
                server_name: string;
                server_data: Array<{
                  name: string;
                  slug: string;
                  filename: string;
                  link_embed: string;
                  link_m3u8: string;
                }>;
              }>;
            };
          };
        };
        __N_SSP: boolean;
      };
      page: string;
      query: {
        slug: string;
      };
      buildId: string;
      isFallback: boolean;
      gssp: boolean;
      scriptLoader: Array<any>;
    };

    const item = json?.props?.pageProps?.data?.item;

    if (!item?.episodes?.length) return sendResponse([]);

    sendResponse(
      item?.episodes.flatMap((server) => {
        return server.server_data.map((episode) => {
          return {
            id: `${animeId}-${slugify(server.server_name)}-${episode.slug}`,
            number: episode.name,
            section: server.server_name,
            extra: {
              stream: episode.link_m3u8,
            },
          };
        });
      })
    );
  },

  search: async ({ query }) => {
    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },

  loadVideoServers: async ({ extraData }) => {
    sendResponse([
      {
        embed: "",
        name: "Server",
        extraData: extraData,
      },
    ]);
  },

  async loadVideoContainer(videoServer: VideoServer) {
    if (!videoServer.extraData?.stream) return sendResponse({ videos: [] });

    sendResponse({
      videos: [{ file: { url: videoServer.extraData.stream } }],
    });
  },

  async _search(query: string): Promise<SearchResult[]> {
    if (!query) return [];

    if (query === "null") return [];

    const encodedQuery = encodeURIComponent(query);

    const { data } = await sendRequest<string>(
      `${anime.baseUrl}/tim-kiem?keyword=${encodedQuery}`
    );

    const props = anime._parseBetween(
      data,
      '<script id="__NEXT_DATA__" type="application/json">',
      "</script>"
    );

    const json = JSON.parse(props) as {
      props: {
        pageProps: {
          data: {
            seoOnPage: {
              og_type: string;
              titleHead: string;
              descriptionHead: string;
              og_image: Array<string>;
              og_url: string;
            };
            breadCrumb: Array<{
              name: string;
              isCurrent: boolean;
              position: number;
            }>;
            titlePage: string;
            items: Array<{
              name: string;
              origin_name: string;
              slug: string;
              type: string;
              thumb_url: string;
              poster_url: string;
              sub_docquyen: boolean;
              chieurap: boolean;
              time: string;
              episode_current: string;
              quality: string;
              lang: string;
              year: number;
              category: Array<{
                id: string;
                name: string;
                slug: string;
              }>;
              country: Array<{
                id: string;
                name: string;
                slug: string;
              }>;
              modified: {
                user_id: string;
                user_name: string;
                time: string;
              };
              _id: string;
            }>;
            params: {
              type_slug: string;
              keyword: string;
              filterCategory: Array<string>;
              filterCountry: Array<string>;
              filterYear: string;
              filterType: string;
              sortField: string;
              sortType: string;
              pagination: {
                totalItems: number;
                totalItemsPerPage: number;
                currentPage: number;
                pageRanges: number;
              };
            };
            type_list: string;
            APP_DOMAIN_FRONTEND: string;
            APP_DOMAIN_CDN_IMAGE: string;
          };
        };
        __N_SSP: boolean;
      };
      page: string;
      query: {
        keyword: string;
      };
      buildId: string;
      isFallback: boolean;
      gssp: boolean;
      scriptLoader: Array<any>;
    };

    const items = json?.props?.pageProps?.data?.items;

    if (!items?.length) return [];

    return items.map((item) => {
      const thumbnail = `http://img.ophim1.com/uploads/movies/${item.poster_url}`;

      return {
        id: item.slug,
        title: item.name || item.origin_name,
        thumbnail: `${anime.baseUrl}/_next/image?url=${encodeURIComponent(
          thumbnail
        )}&w=384&q=75`,
      };
    });
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
