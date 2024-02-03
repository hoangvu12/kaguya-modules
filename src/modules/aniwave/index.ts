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
  _getVRF(
    query: string,
    action: string
  ): Promise<{ url: string; vrfQuery: string }>;
  _decryptSource(query: string): Promise<string>;
  _getFilemoonLink(filemoonHTML: string): Promise<string>;
  _captialize: (str: string) => string;
}

const anime: WindowAnime = {
  baseUrl: "https://aniwave.to",

  getId: async ({ media }) => {
    const searchResults = await anime._totalSearch(media);

    sendResponse({
      data: searchResults?.[0]?.id,
    });
  },

  getEpisodes: async ({ animeId }) => {
    const { url, vrfQuery } = await anime._getVRF(animeId, "ajax-episode-list");

    const { data } = await sendRequest({
      url: `${anime.baseUrl}/ajax/episode/list/${animeId}?${vrfQuery}=${url}`,
    });

    const result = data?.result;

    if (!result) throw new Error("Result not found");

    const parser = new DOMParser();
    const doc = parser.parseFromString(result, "text/html");

    const listElements = Array.from(doc.querySelectorAll(".episodes li"));

    const episodes = listElements
      .flatMap((el) => {
        const idsString = el.querySelector("a")?.dataset.ids;

        if (!idsString) return null;

        const ids = idsString.split(",");

        const title = el.querySelector(".d-title")?.textContent;
        const number = el.querySelector("a")?.dataset.num;

        const hasDub = el.querySelector("a")?.dataset.dub === "1";

        if (!title || !number || !ids.length) return null;

        if (hasDub) {
          if (ids.length === 3) {
            return [
              {
                id: ids[0],
                number,
                title,
                section: "Sub",
              },
              {
                id: ids[1],
                number,
                title,
                section: "Soft sub",
              },
              {
                id: ids[2],
                number,
                title,
                section: "Dub",
              },
            ];
          }

          if (ids.length === 2) {
            return [
              {
                id: ids[0],
                number,
                title,
                section: "Sub",
              },
              {
                id: ids[1],
                number,
                title,
                section: "Dub",
              },
            ];
          }
        }

        if (ids.length > 1) {
          return [
            {
              id: ids[0],
              number,
              title,
              section: "Sub",
            },
            {
              id: ids[1],
              number,
              title,
              section: "Soft sub",
            },
          ];
        }

        return {
          id: ids[0],
          number,
          title,
          section: "Sub",
        };
      })
      .filter(Boolean);

    sendResponse(episodes);
  },

  search: async ({ query }) => {
    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },

  loadVideoServers: async ({ episodeId }) => {
    const { vrfQuery, url } = await anime._getVRF(
      episodeId,
      "ajax-server-list"
    );

    const { data } = await sendRequest(
      `${anime.baseUrl}/ajax/server/list/${episodeId}?${vrfQuery}=${url}`
    );

    const html = data?.result;

    if (!html) throw new Error("Result not found");

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const allowedServers = ["Filemoon"];

    const listElements = Array.from<HTMLLIElement>(
      doc.querySelectorAll(".servers ul li")
    );

    const servers = listElements
      .map((el) => {
        const serverId = el.dataset.svId;
        const linkId = el.dataset.linkId;

        const serverName = el.textContent?.trim();

        if (!serverId || !serverName || !linkId) return null;

        return {
          embed: "",
          name: serverName,
          extraData: {
            id: serverId,
            link: linkId,
          },
        };
      })
      .filter((server) => server && allowedServers.includes(server.name));

    sendResponse(servers);
  },

  async loadVideoContainer(videoServer: VideoServer) {
    if (!videoServer?.extraData?.link) {
      sendResponse({
        videos: [],
        subtitles: [],
        timestamps: [],
      });

      return;
    }

    const { vrfQuery, url: vrf } = await anime._getVRF(
      videoServer.extraData.link,
      "ajax-server"
    );

    const { data } = await sendRequest(
      `${anime.baseUrl}/ajax/server/${videoServer.extraData.link}?${vrfQuery}=${vrf}`
    );

    const url = data?.result?.url;
    const skipData = data?.result?.skip_data;

    if (!url) throw new Error("URL not found");

    const decryptedSourceUrl = await anime._decryptSource(url);

    const container: VideoContainer = {
      videos: [],
      subtitles: [],
      timestamps: [],
    };

    const { data: filemoonHTML } = await sendRequest(decryptedSourceUrl);

    const m3u8File = await anime._getFilemoonLink(filemoonHTML);

    container.videos = [{ file: { url: m3u8File } }];

    if (skipData) {
      try {
        // {intro: [0, 100], outro: [0, 100]}
        const decryptedSkipData = JSON.parse(
          await anime._decryptSource(skipData)
        ) as Record<string, [number, number]>;

        container.timestamps = Object.entries(decryptedSkipData).map(
          ([key, value]) => {
            return {
              type: anime._captialize(key),
              startTime: value[0],
              endTime: value[1],
            };
          }
        );
      } catch (err) {
        console.log("[Aniwave] Failed to parse skip data");
      }
    }

    sendResponse(container);
  },

  async _search(query: string): Promise<SearchResult[]> {
    const { url, vrfQuery } = await anime._getVRF(query, "9anime-search");

    const encodedQuery = encodeURIComponent(query);

    const { data } = await sendRequest(
      `${anime.baseUrl}/filter?keyword=${encodedQuery}&${vrfQuery}=${url}`
    );

    const parser = new DOMParser();
    const doc = parser.parseFromString(data, "text/html");

    const listElements = Array.from<HTMLElement>(
      doc.querySelectorAll("#list-items .item")
    );

    const searchResults: SearchResult[] = listElements
      .map((itemEl) => {
        const image = itemEl.querySelector("img")?.getAttribute("src");
        const name = itemEl.querySelector(".name")?.textContent;

        const url = itemEl.querySelector("a")?.getAttribute("href");

        if (!image || !name || !url) return null;

        const slug = url.split("/").filter(Boolean)[1].split(".")[1];

        const posterEl = itemEl.querySelector(".poster") as HTMLElement;

        const tip = posterEl?.dataset.tip;

        if (!tip) return null;

        const id = tip?.split("/")[0].replace("?", "");

        return {
          id,
          thumbnail: image,
          title: name,
          extra: { slug },
        };
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

  async _getVRF(
    query: string,
    action: string
  ): Promise<{ url: string; vrfQuery: string }> {
    const encodedQuery = encodeURIComponent(query);

    const { data } = await sendRequest(
      `https://9anime.anify.tv/${action}?query=${encodedQuery}&apikey=enimax`
    );

    return data;
  },

  async _decryptSource(query: string): Promise<string> {
    const encodedQuery = encodeURIComponent(query);

    const url = `https://9anime.anify.tv/decrypt?query=${encodedQuery}&apikey=enimax`;

    const { data } = await sendRequest(url);

    if (!data?.url) {
      throw new Error("Received an empty URL or the URL was not found.");
    }

    return data.url;
  },

  async _getFilemoonLink(filemoonHTML: string): Promise<string> {
    const reqURL = "https:/9anime.anify.tv/filemoon?apikey=enimax";

    const { data: source } = await sendRequest({
      url: reqURL,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: `query=${encodeURIComponent(filemoonHTML)}`,
    });

    if (!source?.url) {
      throw new Error(
        "VIZCLOUD1: Received an empty URL or the URL was not found."
      );
    }

    return source.url;
  },

  _captialize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
};
