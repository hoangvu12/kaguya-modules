/* eslint-disable no-global-assign */
import { Anime, Episode, SearchResult } from "../../types";

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
  _parseBetween: (text: string, start: string, end: string) => string;
}

const anime: WindowAnime = {
  baseUrl: "https://hhhay.tv",
  getId: async ({ media }) => {
    const searchResults = await anime._totalSearch(media);

    sendResponse({
      data: searchResults?.[0]?.id,
      extraData: searchResults?.[0]?.extra,
    });
  },

  getEpisodes: async ({ animeId, extraData }) => {
    const { data: text } = await sendRequest(`${anime.baseUrl}/${animeId}`);

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    const episodeElements = Array.from(doc.querySelectorAll("#listsv-1 > li"));

    const episodeList: Episode[] = episodeElements
      .map((episodeEl) => {
        const anchor = episodeEl.querySelector("a");
        const href = anchor?.getAttribute("href");
        const sourceEpisodeId = href?.split("/").pop()?.replace(".html", "");
        const name = episodeEl.textContent?.trim();

        if (!sourceEpisodeId || !name) return null;

        const matches = name.match(/\d+([\\.,][\d{1,2}])?/g);

        return {
          number: matches?.[0] || "Full",
          id: sourceEpisodeId,
          extra: {
            animeId,
            postId: extraData?.postId || "",
          },
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number(a.number) - Number(b.number));

    sendResponse(episodeList);
  },

  loadVideoServers: async ({ episodeId, extraData }) => {
    if (!extraData?.animeId) return sendResponse([]);
    if (!extraData?.postId) return sendResponse([]);

    // tap-13-sv1-0000 => tap-13
    const episodeSlug = episodeId.split("-").slice(0, 2).join("-");

    const { data } = await sendRequest({
      url: `${anime.baseUrl}/wp-content/themes/linhminazmovies/player.php?episode_slug=${episodeSlug}&server_id=1&subsv_id=&post_id=${extraData.postId}&custom_var=`,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    const sources = data?.data?.sources;

    if (!sources) return sendResponse([]);

    const parser = new DOMParser();
    const doc = parser.parseFromString(sources, "text/html");

    const iframe = doc.querySelector("iframe")?.getAttribute("src");

    if (!iframe) return sendResponse([]);

    sendResponse([
      {
        name: "SV 1",
        extraData: {
          embed: iframe,
          ...extraData,
        },
      },
    ]);
  },

  loadVideoContainer: async ({ extraData }) => {
    const embed = extraData?.embed;

    if (!embed) return sendResponse(null);

    const { data: text } = await sendRequest(embed);

    const packed =
      "eval(function(p,a,c,k,e,d)" +
      anime._parseBetween(
        text,
        "<script>eval(function(p,a,c,k,e,d)",
        "</script>"
      );

    if (!packed) return sendResponse(null);

    const unpacked = anime._packer.unpack(packed);

    const kaken = anime._parseBetween(unpacked, 'window.kaken="', '"');

    const domain = new URL(embed).origin;

    if (!kaken) return sendResponse(null);

    const { data } = await sendRequest(`${domain}/api/?${kaken}`);

    const sources = data?.sources as {
      file: string;
      type: string;
      label: string;
      default: boolean;
    }[];

    if (!sources) return sendResponse(null);

    sendResponse({
      videos: sources.map((source) => ({
        file: { url: source.file },
        format: "hls",
      })),
    });
  },

  search: async ({ query }) => {
    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },

  _search: async (query) => {
    const url = `${anime.baseUrl}/search/${encodeURIComponent(query)}`;

    const response = await sendRequest(url);

    const isRedirected = response.data.includes("list-eps-ajax");

    const html = response.data;

    if (!html) return [];

    if (isRedirected) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const bookmark = doc.querySelector("#bookmark");

      const postId = bookmark?.getAttribute("data-post_id") || "";
      const thumbnail = bookmark?.getAttribute("data-thumbnail") || "";
      const title = bookmark?.getAttribute("data-title") || "";
      const id =
        bookmark?.getAttribute("data-href")?.split("/").slice(-1)[0] || "";

      return [
        {
          id,
          title,
          thumbnail,
          extra: {
            postId,
          },
        },
      ];
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const posts = doc.querySelectorAll(".halim_box article");

    const searchResults: SearchResult[] = Array.from(posts).map((post) => {
      const anchor = post.querySelector("a");
      const img = post.querySelector("img");

      const id = anchor?.getAttribute("href")?.split("/").slice(-1)[0] || "";
      const thumbnail = img?.getAttribute("data-src") || "";

      const titleElement = post.querySelector(".entry-title");
      const title = titleElement?.textContent?.trim() || "";

      const postId = post.className.split(" ").slice(-1)[0] || "";

      return {
        id,
        title,
        thumbnail,
        extra: {
          postId,
        },
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
  _parseBetween(text, start, end) {
    let strArr = [];

    strArr = text.split(start);

    strArr = strArr[1].split(end);

    return strArr[0];
  },
};
