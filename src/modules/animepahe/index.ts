/* eslint-disable no-global-assign */
import { Anime, Episode, SearchResult, VideoServer } from "../../types";

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
  _packer: {
    detect: (text: string) => boolean;
    get_chunks: (str: string) => string[];
    unpack: (packed: string) => string;
    unpack_chunk: (packed: string) => string;
  };
  _loadAllEpisodes: (animeSession: string) => Promise<any[]>;
  _parseBetween: (text: string, start: string, end: string) => string;
}

const anime: WindowAnime = {
  baseUrl: "https://animepahe.ru",

  getId: async ({ media }) => {
    const searchResults = await anime._totalSearch(media);

    sendResponse({
      data: searchResults?.[0]?.id,
    });
  },

  getEpisodes: async ({ animeId }) => {
    const { data: response } = await sendRequest({
      baseURL: `${anime.baseUrl}/a/${animeId}`,
      headers: {
        cookie: "__ddgid_=; __ddg2_=; __ddg1_=",
      },
    });

    const animeSession = anime._parseBetween(response, 'let id = "', '"');

    const rawEpisodes = await anime._loadAllEpisodes(animeSession);

    const episodes = rawEpisodes.map((episode) => ({
      id: episode.session,
      number: episode.episode.toString(),
      thumbnail: episode.snapshot,
      isFiller: !!episode.filler,
      extra: {
        animeSession,
      },
    }));

    sendResponse(episodes);
  },

  loadVideoServers: async ({ episodeId, extraData }) => {
    if (!extraData?.animeSession) throw new Error("ID not found");

    const url = `${anime.baseUrl}/play/${extraData.animeSession}/${episodeId}`;

    const { data: response } = await sendRequest({
      url,
      headers: {
        cookie: "__ddgid_=; __ddg2_=; __ddg1_=",
      },
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(response, "text/html");

    const serverItems = Array.from(
      doc.querySelectorAll("#resolutionMenu button")
    );

    const servers: VideoServer[] = serverItems
      .map((el) => {
        if (!el.textContent) return null;

        const embed = el.getAttribute("data-src");

        if (!embed) return null;

        return {
          extraData: {
            embed,
          },
          name: el.textContent.trim(),
        };
      })
      .filter(Boolean);

    sendResponse(servers);
  },

  loadVideoContainer: async ({ extraData }) => {
    if (!extraData?.embed) throw new Error("Embed not found");

    const { data: response } = await sendRequest({
      url: extraData.embed,
      headers: {
        referer: "https://kwik.si/",
        cookie: "__ddgid_=; __ddg2_=; __ddg1_=",
      },
    });

    const packedString =
      "eval(function(p,a,c,k,e,d)" +
      anime._parseBetween(
        response,
        "<script>eval(function(p,a,c,k,e,d)",
        "</script>"
      );

    const unpacked = anime._packer.unpack(packedString);

    const stream = anime._parseBetween(unpacked, "const source='", "';");

    sendResponse({
      videos: [
        {
          file: {
            url: stream,
            headers: {
              referer: "https://kwik.si/",
            },
          },
        },
      ],
    });
  },

  search: async ({ query }) => {
    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },

  _loadAllEpisodes(animeSession) {
    const episodes: Episode[] = [];

    const load = async (page = 1): Promise<Episode[]> => {
      const { data: episodeResponse } = await sendRequest({
        baseURL: `${anime.baseUrl}/api?m=release&id=${animeSession}&sort=episode_asc&page=${page}`,
        headers: {
          cookie: "__ddgid_=; __ddg2_=; __ddg1_=",
        },
      });

      if (episodeResponse?.data?.length) {
        episodes.push(...episodeResponse.data);
      }

      if (!episodeResponse?.next_page_url) return episodes;

      return load(page + 1);
    };

    return load(1);
  },
  _search: async (query) => {
    const encodedQuery = encodeURIComponent(query);

    const { data: response } = await sendRequest({
      baseURL: `${anime.baseUrl}/api?m=search&q=${encodedQuery}`,
      headers: {
        cookie: "__ddgid_=; __ddg2_=; __ddg1_=",
      },
    });

    if (!response?.data?.length) return [];

    const searchResults: SearchResult[] = response.data.map((item: any) => {
      return {
        id: item.id.toString(),
        thumbnail: item.poster,
        title: item.title,
      };
    });

    return searchResults;
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
  _packer: {
    detect: function (str) {
      return anime._packer.get_chunks(str).length > 0;
    },

    get_chunks: function (str) {
      const chunks = str.match(
        /eval\(\(?function\(.*?(,0,\{\}\)\)|split\('\|'\)\)\))($|\n)/g
      );
      return chunks ? chunks : [];
    },

    unpack: function (str) {
      const chunks = anime._packer.get_chunks(str);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i].replace(/\n$/, "");
        str = str.split(chunk).join(anime._packer.unpack_chunk(chunk));
      }
      return str;
    },

    unpack_chunk: function (str) {
      let unpacked_source = "";
      const __eval = eval;
      if (anime._packer.detect(str)) {
        try {
          // @ts-expect-error Uh I have to disable
          eval = function (s) {
            // jshint ignore:line
            unpacked_source += s;
            return unpacked_source;
          }; // jshint ignore:line
          __eval(str);
          if (typeof unpacked_source === "string" && unpacked_source) {
            str = unpacked_source;
          }
        } catch (e) {
          // well, it failed. we'll just return the original, instead of crashing on user.
        }
      }

      // @ts-expect-error Uh I have to disable
      eval = __eval; // jshint ignore:line
      return str;
    },
  },
};
