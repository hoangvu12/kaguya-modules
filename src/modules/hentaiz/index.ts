import { Anime, SearchResult } from "../../types";

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
  _removeDuplicates: <T>(
    arr: T[],
    shouldRemove: (a: T, b: T) => boolean
  ) => T[];
  _dropRight: <T>(array: T[], n?: number) => T[];
  _parseBetween: (str: string, start: string, end: string) => string;
  _replaceAll: (str: string, find: string, replace: string) => string;
}

const anime: WindowAnime = {
  baseUrl: "https://ihentai.day",
  getId: async ({ media }) => {
    const searchResults = await anime._totalSearch(media);

    sendResponse({
      data: searchResults?.[0]?.id,
      extraData: {
        searchTitle: searchResults?.[0]?.extra?.searchTitle,
      },
    });
  },
  getEpisodes: async ({ animeId, extraData }) => {
    if (!extraData?.searchTitle) {
      sendResponse([]);

      return;
    }

    const searchResults = await anime._search(extraData.searchTitle, false);

    const correctsearchResults = searchResults.filter(
      (searchResult) => searchResult.id === animeId
    );

    const filteredSearchResults = correctsearchResults.filter(
      (searchResult) => searchResult.extra?.idWithEpisode
    );

    sendResponse(
      filteredSearchResults.map((searchResult) => ({
        id: searchResult.extra?.idWithEpisode!,
        number: anime._replaceAll(
          searchResult.extra!.idWithEpisode!.split("-").pop()!,
          "/",
          ""
        ),
        thumbnail: searchResult?.extra?.bigThumbnail,
      }))
    );
  },
  async _search(query, shouldRemoveDuplicates = true) {
    const list: any[] = [];
    const LIMIT = 120;
    const MAX_PAGE = 3;

    const requestData = async (page: number): Promise<any> => {
      const encodedQuery = encodeURIComponent(query);

      const { data: json } = await sendRequest(
        `https://bunny-cdn.com/api/videos?fields%5B0%5D=title&fields%5B1%5D=slug&fields%5B2%5D=views&filters%5B%24or%5D%5B0%5D%5Btitle%5D%5B%24contains%5D=${encodedQuery}&filters%5B%24or%5D%5B1%5D%5BotherTitles%5D%5B%24contains%5D=${encodedQuery}&filters%5B%24or%5D%5B2%5D%5Bcategories%5D%5Bname%5D%5B%24contains%5D=${encodedQuery}&filters%5B%24or%5D%5B3%5D%5Btags%5D%5Bname%5D%5B%24contains%5D=${encodedQuery}&filters%5B%24or%5D%5B4%5D%5Bstudios%5D%5Bname%5D%5B%24contains%5D=${encodedQuery}&filters%5B%24or%5D%5B5%5D%5Bseries%5D%5Bname%5D%5B%24contains%5D=${encodedQuery}&filters%5B%24or%5D%5B6%5D%5Byear%5D%5Bname%5D%5B%24contains%5D=${encodedQuery}&sort%5B0%5D=publishedAt%3Adesc&sort%5B1%5D=slug%3Adesc&pagination%5Bpage%5D=${page}&pagination%5BpageSize%5D=${LIMIT}&populate%5B0%5D=thumbnail&populate%5B1%5D=bigThumbnail`
      );

      const dataWithTypes = json as {
        data: Array<{
          id: number;
          publishedAt: string;
          slug: string;
          title: string;
          views: number;
          thumbnail: {
            id: number;
            name: string;
            alternativeText: any;
            caption: any;
            width: number;
            height: number;
            formats: {
              thumbnail: {
                name: string;
                hash: string;
                ext: string;
                mime: string;
                path: any;
                width: number;
                height: number;
                size: number;
                sizeInBytes: number;
                url: string;
              };
            };
            hash: string;
            ext: string;
            mime: string;
            size: number;
            url: string;
            previewUrl: any;
            provider: string;
            provider_metadata: any;
            createdAt: string;
            updatedAt: string;
          };
          bigThumbnail: {
            id: number;
            name: string;
            alternativeText: any;
            caption: any;
            width: number;
            height: number;
            formats: {
              thumbnail: {
                name: string;
                hash: string;
                ext: string;
                mime: string;
                path: any;
                width: number;
                height: number;
                size: number;
                sizeInBytes: number;
                url: string;
              };
            };
            hash: string;
            ext: string;
            mime: string;
            size: number;
            url: string;
            previewUrl: any;
            provider: string;
            provider_metadata: any;
            createdAt: string;
            updatedAt: string;
          };
        }>;
        meta: {
          pagination: {
            page: number;
            pageSize: number;
            pageCount: number;
            total: number;
          };
        };
      };

      let searchResults = dataWithTypes.data.map((video) => {
        return {
          id: anime
            ._dropRight(video.slug.replaceAll("/", "").split("-"))
            .join("-"),
          title: anime._dropRight(video.title.split(" ")).join(" "),
          thumbnail: `https://bunny-cdn.com${video.thumbnail.url}`,
          extra: {
            searchTitle: anime._dropRight(video.title.split(" ")).join(" "),
            bigThumbnail: `https://bunny-cdn.com${video.bigThumbnail.url}`,
            idWithEpisode: video.slug.replaceAll("/", ""),
          },
        };
      });

      if (shouldRemoveDuplicates) {
        searchResults = anime._removeDuplicates(
          searchResults,
          (a: any, b: any) => a.id === b.id
        );
      }

      list.push(...searchResults);

      if (page * LIMIT < json.count && page < MAX_PAGE) {
        return requestData(page + 1);
      }

      return list;
    };

    await requestData(1);

    return list;
  },
  search: async ({ query }) => {
    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },
  async loadVideoServers({ episodeId }) {
    sendResponse([
      {
        name: "Sonar",
        extraData: {
          episodeId,
        },
        embed: "",
      },
    ]);
  },

  async loadVideoContainer({ extraData }) {
    if (!extraData?.episodeId) return;

    const { data: text } = await sendRequest({
      url: `${anime.baseUrl}/watch/${extraData.episodeId}`,
    });

    const iframeSrc = anime._parseBetween(text, '<iframe src="', '"');

    const cdnId = iframeSrc.split("/").filter(Boolean).pop();

    // https://ipa.sonar-cdn.com/play/c0f339b7-ecf9-41c7-8c4b-c1fe15b2f806

    const { data: json } = await sendRequest(
      `https://ipa.sonar-cdn.com/play/${cdnId}`
    );

    const mp4Sources = json.mp4;
    const hlsSources = json.hls;

    const sources = [...mp4Sources, ...hlsSources];

    sendResponse({
      videos: sources.map((source) => ({
        file: {
          url: source.url,
        },
      })),
    });
  },
  _dropRight(array, n = 1) {
    if (n >= array.length) {
      return [];
    }

    return array.slice(0, array.length - n);
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
  _removeDuplicates<T>(arr: T[], shouldRemove: (a: T, b: T) => boolean) {
    const uniqueArr: T[] = [];

    for (const item of arr) {
      const isDuplicate = uniqueArr.some((existingItem) =>
        shouldRemove(existingItem, item)
      );
      if (!isDuplicate) {
        uniqueArr.push(item);
      }
    }

    return uniqueArr;
  },
  _parseBetween(str, start, end) {
    let strArr = [];

    strArr = str.split(start);
    strArr = strArr[1].split(end);

    return strArr[0];
  },
  _replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, "g"), replace);
  },
};
