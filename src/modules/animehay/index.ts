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
  _urlToId: (url: string) => string;
  _getFirePlayerUrl: (url: string) => Promise<string>;
}

const anime: WindowAnime = {
  baseUrl: "https://animehay.city",

  getId: async ({ media }) => {
    const searchResults = await anime._totalSearch(media);

    sendResponse({
      data: searchResults?.[0]?.id,
    });
  },

  getEpisodes: async ({ animeId }) => {
    const { data: text } = await sendRequest(
      `${anime.baseUrl}/thong-tin-phim/a-${animeId}.html`
    );

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    const episodeElements = Array.from(
      doc.querySelectorAll(".list-item-episode > a")
    );

    const episodeList: Episode[] = episodeElements
      .map((episodeEl) => {
        const href = episodeEl.getAttribute("href");

        if (!href) return null;

        const sourceEpisodeId = (href.match(/-(\d+)\.html$/) || [])[1] || null;
        const name = episodeEl.textContent?.trim();

        if (!sourceEpisodeId || !name) return null;

        const number = parseInt(name)?.toString();

        if (!sourceEpisodeId || !number) return null;

        return {
          id: sourceEpisodeId,
          number,
        };
      })
      .filter(Boolean);

    sendResponse(episodeList);
  },

  loadVideoServers: async ({ episodeId }) => {
    const { data: text } = await sendRequest(
      `${anime.baseUrl}/xem-phim/a-${episodeId}.html`
    );

    const pattern = /(?<=['"(])(https?:\/\/\S+)(?=['")])/gi;
    const matches: string[] = Array.from(text.matchAll(pattern));

    const servers: VideoServer[] = [];

    for (const match of matches) {
      const url = match[0];
      let name = "";

      if (url.includes("cdninstagram.com")) {
        name = "FBO";
      } else if (url.includes("suckplayer.xyz")) {
        name = "VPRO";
      } else {
        continue;
      }

      servers.push({
        name,
        extraData: {
          link: url,
        },
      });
    }

    sendResponse(servers);
  },

  loadVideoContainer: async ({ name, extraData }) => {
    const { link } = extraData as { link: string };

    if (name === "FBO") {
      sendResponse({
        videos: [
          {
            quality: "720p",
            file: {
              url: link,
            },
          },
        ],
      });

      return;
    }

    if (name === "VPRO") {
      const url = await anime._getFirePlayerUrl(link);

      sendResponse({
        videos: [
          {
            quality: "720p",
            file: {
              url: url,
              headers: {
                Origin: "https://suckplayer.xyz",
              },
            },
          },
        ],
      });

      return;
    }
  },

  async _getFirePlayerUrl(url: string) {
    const id = url.split("/")[4];

    const { data } = await sendRequest({
      url: `https://suckplayer.xyz/player/index.php?data=${id}&do=getVideo`,
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://suckplayer.xyz",
      },
      data: `r=${encodeURIComponent(anime.baseUrl)}&hash=${id}`,
    });

    const link = data.securedLink;

    return link;
  },

  search: async ({ query }) => {
    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },

  _search: async (query) => {
    const { data } = await sendRequest({
      url: `${anime.baseUrl}/api`,
      headers: {
        referrer: anime.baseUrl,
      },
      data: { action: "live_search", keyword: query },
      method: "POST",
    });

    if (!data?.result) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(data.result, "text/html");

    const linkElements = Array.from(
      doc.querySelectorAll(`a[href^="${anime.baseUrl}"]`)
    );

    const searchResults: SearchResult[] = linkElements
      .map((element) => {
        const href = element.getAttribute("href");
        const thumbnail = element.querySelector("img")?.getAttribute("src");
        const title = element.querySelector(".fw-500")?.textContent?.trim();

        if (!href || !thumbnail || !title) return null;

        const id = anime._urlToId(href);

        return { thumbnail, title, id };
      })
      .filter(Boolean);

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
  _urlToId: (url) => {
    const splitted = url.split("/");
    const lastSplit = splitted[splitted.length - 1];

    return lastSplit.split("-").slice(-1)[0].replace(".html", "");
  },
};
