import {
  type Anime,
  type Episode,
  type SearchResult,
  type VideoServer,
  type Subtitle,
  type VideoContainer,
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
  _extractKey: (id: number) => Promise<string>;
}

const anime: WindowAnime = {
  baseUrl: "https://kaido.to",

  getId: async ({ media }) => {
    const searchResults = await anime._totalSearch(media);

    sendResponse({
      data: searchResults?.[0]?.id,
    });
  },

  getEpisodes: async ({ animeId }) => {
    const requestUrl = `${anime.baseUrl}/ajax/episode/list/${animeId}`;
    const { data } = await sendRequest<{ html: string }>(requestUrl);
    const res = data.html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(res, "text/html");

    const epItemsDOM = Array.from(doc.querySelectorAll(".ep-item"));

    const episodes: Episode[] = epItemsDOM
      .map((el) => {
        const id = el.getAttribute("data-id");
        const number = el.getAttribute("data-number");
        const title = el.getAttribute("data-title") || undefined;

        if (!id || number === null || number === undefined) {
          return null;
        }

        return {
          id,
          number,
          title,
          extra: {
            animeId,
          },
        };
      })
      .filter(Boolean);

    sendResponse(episodes);
  },

  search: async ({ query }) => {
    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },

  loadVideoServers: async ({ episodeId, extraData }) => {
    if (!extraData?.animeId) {
      sendResponse([]);
      return;
    }

    const { data: json } = await sendRequest<{ html: string }>(
      `${anime.baseUrl}/ajax/episode/servers?episodeId=${episodeId}`
    );

    const html = json.html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const serverItems = Array.from(
      doc.querySelectorAll(".servers-sub .server-item")
    );

    const servers: VideoServer[] = serverItems
      .map((el) => {
        const id = el.getAttribute("data-id") || undefined;
        const serverId = el.getAttribute("data-server-id") || undefined;

        const name = el.textContent?.trim();

        if (!name || !id || !serverId) return null;

        return {
          name,
          extraData: {
            id,
            serverId,
          },
        };
      })
      .filter(Boolean);

    sendResponse(servers);
  },

  async loadVideoContainer(videoServer: VideoServer) {
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.min.js"
    );

    if (!videoServer?.extraData?.id) {
      sendResponse({
        videos: [],
        subtitles: [],
        timestamps: [],
      });

      return;
    }

    const requestUrl = `${anime.baseUrl}/ajax/episode/sources?id=${videoServer.extraData.id}`;

    const { data } = await sendRequest<{ link: string }>(requestUrl);

    const sources = data.link;

    const { origin } = new URL(sources);

    const container: VideoContainer = {
      videos: [],
      subtitles: [],
      timestamps: [],
    };

    const sourceIdArray = sources.split("/");
    const sourceId = sourceIdArray[sourceIdArray.length - 1].split("?")[0];

    const getSourcesUrl = `${origin}/ajax/embed-6-v2/getSources?id=${sourceId}`;

    const { data: data2 } = await sendRequest<{
      sources: any[] | any;
      tracks: any[];
      intro: any;
      outro: any;
    }>(getSourcesUrl);

    if (!data2) {
      sendResponse(container);

      return;
    }

    const subtitles: Subtitle[] = data2?.tracks
      ?.filter((track: any) => track.kind === "captions")
      .map((track: any) => ({
        file: { url: track.file },
        language: track.label,
        format: "vtt",
      }));

    container.subtitles = subtitles;

    if (data2?.intro) {
      container.timestamps?.push({
        type: "Intro",
        startTime: data2.intro.start,
        endTime: data2.intro.end,
      });
    }

    if (data2?.outro) {
      container.timestamps?.push({
        type: "Outro",
        startTime: data2.outro.start,
        endTime: data2.outro.end,
      });
    }

    if (Array.isArray(data2?.sources)) {
      container.videos.push({
        file: { url: (data2?.sources as any[])?.[0]?.file },
        format: "hls",
      });

      sendResponse(container);

      return;
    }

    let decryptKey = await anime._extractKey(0);
    let encryptedURL = data2.sources;

    try {
      const encryptedURLTemp = encryptedURL.split("");

      let key = "";

      for (const index of decryptKey as any) {
        for (let i = index[0]; i < index[1]; i++) {
          key += encryptedURLTemp[i];
          encryptedURLTemp[i] = null;
        }
      }

      decryptKey = key;
      encryptedURL = encryptedURLTemp.filter(Boolean).join("");

      // @ts-expect-error CryptoJS is loaded from loadScript
      const Crypto = CryptoJS as any;

      const parseSources = JSON.parse(
        Crypto.AES.decrypt(encryptedURL, decryptKey as string).toString(
          Crypto.enc.Utf8
        )
      ) as any;

      container.videos.push({
        file: { url: parseSources?.[0]?.file },
        format: "hls",
      });
    } catch (err) {
      console.error(err);
    }

    sendResponse(container);
  },

  async _search(query: string): Promise<SearchResult[]> {
    const { data: searchHTML } = await sendRequest<string>(
      `${anime.baseUrl}/search?keyword=${encodeURIComponent(query)}`
    );

    const parser = new DOMParser();
    const doc = parser.parseFromString(searchHTML, "text/html");

    const itemsDOM = Array.from(doc.querySelectorAll(".flw-item"));

    const searchResults: SearchResult[] = itemsDOM
      .map((el) => {
        const aTag = el.querySelector("a");

        if (!aTag) return null;

        const animeName = aTag.getAttribute("title");
        const animeId = aTag.getAttribute("data-id");
        const src = el.querySelector("img")?.getAttribute("data-src");

        if (!animeId || !animeName || !src) return null;

        return {
          id: animeId,
          thumbnail: src,
          title: animeName,
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

  async _extractKey(id: number) {
    const { data: key } = await sendRequest<string>(
      `http://zoro-keys.freeddns.org/keys/e${id}/key.txt`
    );

    return key;
  },
};
