import { Anime, Episode, SearchResult, VideoServer } from "../../types";

interface WindowAnime extends Anime {
  baseUrl: string;
  csrf: string;
  cookieString: string;
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
  _getCookiesAndCsrf: () => Promise<void>;
  _serialize: (obj: Record<string, any>) => string;
  _parseBetween: (text: string, start: string, end: string) => string;
}

type Server = {
  link: string;
  name: string;
  id: number;
  sort: number;
};

const anime: WindowAnime = {
  baseUrl: "https://animetvn3.com",
  csrf: "",
  cookieString: "",
  getId: async ({ media }) => {
    const searchResults = await anime._totalSearch(media);

    sendResponse({
      data: searchResults?.[0]?.id,
    });
  },

  getEpisodes: async ({ animeId }) => {
    const { data: text } = await sendRequest(
      `${anime.baseUrl}/thong-tin-phim/f${animeId}-a.html`
    );

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    const playUrl = doc.querySelector(".play-now")?.getAttribute("href");

    if (!playUrl) {
      sendResponse([]);

      return;
    }

    const { data: watchText } = await sendRequest(playUrl);

    const watchDoc = parser.parseFromString(watchText, "text/html");

    const serverItems = Array.from(watchDoc.querySelectorAll(".svep"));

    const episodes: Episode[] = serverItems
      .flatMap((serverEl) => {
        const serverName = serverEl
          .querySelector(".svname")
          ?.textContent?.trim();

        if (!serverName) return null;

        const episodeItems = Array.from(serverEl.querySelectorAll("a"));

        const episodeList: Episode[] = episodeItems
          .map((episodeEl) => {
            const sourceEpisodeId = episodeEl
              ?.getAttribute("id")
              ?.split("_")[1]
              ?.toString();
            const name = episodeEl.textContent?.trim();

            if (!sourceEpisodeId || !name) return null;

            const number = parseInt(name, 10)?.toString();

            if (!number) return null;

            return {
              section: serverName,
              id: sourceEpisodeId,
              number,
            };
          })
          .filter(Boolean);

        return episodeList;
      })
      .filter(Boolean);

    sendResponse(episodes);
  },

  loadVideoServers: async ({ episodeId }) => {
    await anime._getCookiesAndCsrf();

    const allowServers = ["TVN", "FB", "LOT"];

    type Response = {
      success: boolean;
      links: Server[];
    };

    const { data } = await sendRequest<Response>({
      url: `${anime.baseUrl}/ajax/getExtraLinks`,
      method: "post",
      data: `epid=${episodeId}`,
      headers: {
        "x-csrf-token": anime.csrf,
        cookie: anime.cookieString,
      },
    });

    if (!data?.success) {
      sendResponse([]);

      return;
    }

    const servers: VideoServer[] = data?.links
      .map((link) => {
        const name = link.name.split("-")[1];

        return {
          embed: "",
          name,
          extraData: {
            id: link.id.toString(),
            link: link.link,
          },
        };
      })
      .filter((server) => allowServers.includes(server.name));

    sendResponse(servers);
  },

  loadVideoContainer: async ({ name, extraData }) => {
    const { id, link } = extraData as {
      id: string;
      link: string;
    };

    const { data: source } = await sendRequest({
      url: `${anime.baseUrl}/ajax/getExtraLink`,
      method: "post",
      headers: {
        "x-csrf-token": anime.csrf,
        cookie: anime.cookieString,
      },
      data: anime._serialize({
        id,
        link,
      }),
    });

    if (name === "TVN") {
      const { data } = await sendRequest(source.link);

      const idUser = anime._parseBetween(data, 'var idUser = "', '"');
      const idfile = anime._parseBetween(data, 'var idfile = "', '"');

      const postUrl = `https://api-plhq.playhbq.xyz/apiv4/${idUser}/${idfile}`;

      const { data: streamData } = await sendRequest({
        url: postUrl,
        method: "post",
        data: `referrer=${encodeURIComponent(anime.baseUrl)}&typeend=html`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (!streamData?.data) {
        sendResponse({
          videos: [],
        });

        return;
      }

      sendResponse({
        videos: [{ file: { url: streamData?.data } }],
      });

      return;
    }

    if (name === "FB") {
      const { data } = await sendRequest(source.link);
      const html = data.replace(/(\r\n|\n|\r)/gm, "").replace(/ +/g, "");

      const sources = eval(
        anime._parseBetween(html, '"sources":', ",height")
      ) as { file: string; label: string; type: "mp4" }[];

      sendResponse({
        videos: sources.map((source) => {
          {
            source.file;
          }
        }),
      });

      return;
    }

    if (name === "LOT") {
      const { data } = await sendRequest(source.link);

      const base64 = anime._parseBetween(data, "Player('", "')");

      const decodedBase64 = atob(base64);

      sendResponse({
        videos: [{ file: { url: decodedBase64 } }],
      });

      return;
    }

    sendResponse({
      videos: [],
    });
  },

  search: async ({ query }) => {
    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },

  _search: async (query) => {
    await anime._getCookiesAndCsrf();

    const { data: text } = await sendRequest({
      url: `${anime.baseUrl}/ajax/search`,
      method: "POST",
      data: `key=${encodeURIComponent(query)}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-csrf-token": anime.csrf,
        cookie: anime.cookieString,
      },
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    const listElements = Array.from(doc.querySelectorAll(".search-list .item"));

    const data: SearchResult[] = listElements
      .map((element) => {
        const linkElement = element.querySelector("a.image");
        const href = linkElement?.getAttribute("href");

        if (!href) return null;

        const thumbnail = linkElement
          ?.querySelector("img.thumb")
          ?.getAttribute("src");

        if (!thumbnail) return null;

        const title = linkElement
          ?.querySelector("h3.title")
          ?.textContent?.trim();

        if (!title) return null;

        const id = href.split(/f(\d+)-/)[1];

        return { thumbnail, title, id };
      })
      .filter(Boolean);

    return data;
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
  _getCookiesAndCsrf: async () => {
    const { data: text, headers } = await sendRequest(anime.baseUrl);

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    const csrf = doc
      .querySelector("meta[name=csrf-token]")
      ?.getAttribute("content");

    if (!csrf) return;

    anime.csrf = csrf;

    const setCookieHeaders = headers["set-cookie"] as string[] | string;

    if (Array.isArray(setCookieHeaders)) {
      if (!setCookieHeaders?.length) return;

      const cookies = setCookieHeaders.map((header) => {
        const [cookie] = header.split(";");

        return cookie;
      });

      anime.cookieString = cookies.join("; ");
    } else {
      if (!setCookieHeaders) return;

      const cookies = setCookieHeaders.split(",").map((header) => {
        const [cookie] = header.split(";");

        return cookie;
      });

      anime.cookieString = cookies.join("path=/, ");
    }
  },
  _serialize: (obj: Record<string, any>) => {
    return Object.entries(obj)
      .map((pair) => {
        const [key, value] = pair;

        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      })
      .join("&");
  },
  _parseBetween(text, start, end) {
    let strArr = [];

    strArr = text.split(start);
    strArr = strArr[1].split(end);

    return strArr[0];
  },
};
