import type { Anime, SearchResult, VideoServer } from "../../types";

interface WindowAnime extends Anime {
  baseUrl: string;

  // Helper functions
  _parseBetween: (text: string, start: string, end: string) => string;
  _removeDuplicates: <T>(arr: T[], comparator: (a: T, b: T) => boolean) => T[];
  _getNextEpisodes: (
    animeId: string,
    snapshot: string,
    csrf: string
  ) => Promise<SearchResult[]>;
  _parseSearchResults: (html: string) => SearchResult[];
  _parseEpisodes: (html: string, animeId: string) => SearchResult[];

  _totalSearch: (media: {
    id: number;
    title: {
      romaji: string;
      english: string;
      userPreferred: string;
      native: string;
    };
  }) => Promise<SearchResult[]>;

  _search: (query: string) => Promise<SearchResult[]>;
}

const anime: WindowAnime = {
  baseUrl: "https://anizone.to",

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

    const episodes = anime._parseEpisodes(html, animeId);

    const snapshot = anime._parseBetween(html, 'wire:snapshot="', '"');
    const csrf = anime._parseBetween(
      html,
      '<meta name="csrf-token" content="',
      '"'
    );

    if (html.includes(`x-intersect="$wire.loadMore()"`)) {
      const allEpisodes = await anime._getNextEpisodes(animeId, snapshot, csrf);
      sendResponse(allEpisodes);
    } else {
      sendResponse(episodes);
    }
  },

  search: async ({ query }) => {
    sendResponse(await anime._search(query));
  },

  _search: async (query) => {
    const { data: html } = await sendRequest<string>(
      `${anime.baseUrl}/anime?search=${encodeURIComponent(query)}`
    );

    return anime._parseSearchResults(html);
  },

  loadVideoServers: async ({ episodeId }) => {
    const [animeId, number] = episodeId.split("-");

    sendResponse([
      {
        embed: "",
        name: "Server",
        extraData: {
          animeId,
          number,
        },
      },
    ]);
  },

  loadVideoContainer: async (videoServer: VideoServer) => {
    const { extraData } = videoServer;
    const animeId = extraData?.animeId;
    const number = extraData?.number;

    if (!animeId) return sendResponse({ videos: [], subtitles: [] });

    const { data: html } = await sendRequest<string>(
      `${anime.baseUrl}/anime/${animeId}/${number}`
    );

    const source = anime._parseBetween(html, 'media-player src="', '"');
    const tracks = Array.from(
      new DOMParser()
        .parseFromString(html, "text/html")
        .querySelectorAll("media-player track")
    ).map((track) => ({
      file: { url: track.getAttribute("src") },
      language: track.getAttribute("label"),
    }));

    sendResponse({
      videos: [
        {
          format: "hls",
          file: { url: source },
        },
      ],
      subtitles: tracks,
    });
  },

  _parseBetween: (text, start, end) => {
    const strArr = text.split(start);
    return strArr[1]?.split(end)[0] || "";
  },

  _removeDuplicates: (arr, comparator) => {
    return arr.filter(
      (item, index, self) =>
        self.findIndex((t) => comparator(t, item)) === index
    );
  },

  _parseEpisodes: (html, animeId) => {
    const doc = new DOMParser().parseFromString(html, "text/html");

    return Array.from(doc.querySelectorAll("ul li")).map((item) => {
      const id = item
        .querySelector("a")
        ?.getAttribute("href")
        ?.split("/")
        .pop();
      const thumbnail = anime._parseBetween(
        item.querySelector("img")?.getAttribute(":src") || "",
        "hvr || fcs ? '",
        "'"
      );
      const title = item.querySelector("h3")?.textContent?.trim();

      return {
        id: `${animeId}-${id}`,
        number: id,
        title,
        thumbnail,
      };
    }) as SearchResult[];
  },

  _getNextEpisodes: async (animeId, snapshot, csrf) => {
    const { data: response } = await sendRequest<{
      components: Array<{
        snapshot: string;
        effects: {
          html: string;
        };
      }>;
    }>({
      url: `${anime.baseUrl}/livewire/update`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: `${anime.baseUrl}/anime/${animeId}`,
      },
      data: {
        _token: csrf,
        components: [
          {
            snapshot,
            updates: {},
            calls: [{ path: "", method: "loadMore", params: [] }],
          },
        ],
      },
    });

    if (!response?.components?.[0]?.effects?.html) return [];

    const newSnapshot = response.components[0].snapshot;
    const newEpisodes = anime._parseEpisodes(
      response.components[0].effects.html,
      animeId
    );

    if (
      response.components[0].effects.html.includes(
        `x-intersect="$wire.loadMore()"`
      )
    ) {
      const moreEpisodes = await anime._getNextEpisodes(
        animeId,
        newSnapshot,
        csrf
      );
      return [...newEpisodes, ...moreEpisodes];
    }

    return newEpisodes;
  },

  _parseSearchResults: (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return anime._removeDuplicates(
      Array.from(doc.querySelectorAll(".grid div.relative")).map((item) => {
        const image = item.querySelector(".absolute img")?.getAttribute("src");
        const name = item
          .querySelector(".relative a")
          ?.textContent?.trim()
          .split("\n")[0];
        const href = item.querySelector("a")?.getAttribute("href");
        const id = href?.split("/").pop();

        return {
          id,
          title: name,
          thumbnail: image,
        };
      }),
      (a, b) => a.id === b.id
    ) as SearchResult[];
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
};
