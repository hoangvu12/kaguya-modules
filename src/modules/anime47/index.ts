import {
  Anime,
  Episode,
  SearchResult,
  VideoContainer,
  VideoServer,
} from "../../types";

const allowedServers = ["2", "3", "9"];

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
  _stringify: (cipherParams: any) => string;
  _parse: (jsonStr: string) => any;
  _decrypt: (base64: string) => any;
  _parseBetween: (text: string, start: string, end: string) => string;
  _parseIdFromUrl: (url: string) => string | null;
  _parseTitle: (title: string, separators?: string[]) => string[];
  _isVietnamese: (text: string) => boolean;
}

const anime: WindowAnime = {
  baseUrl: "https://anime47.com",

  getId: async ({ media }) => {
    const searchResults = await anime._totalSearch(media);

    sendResponse({
      data: searchResults?.[0]?.id,
    });
  },

  getEpisodes: async ({ animeId }) => {
    const { data } = await sendRequest(
      `${anime.baseUrl}/phim/tomodachi-game/m${animeId}.html`
    );

    const parser = new DOMParser();
    const doc = parser.parseFromString(data, "text/html");

    const watchUrl = doc
      ?.querySelector("#btn-film-watch.btn-red")
      ?.getAttribute("href")
      ?.replace(".", "");

    if (!watchUrl) {
      sendResponse([]);

      return;
    }

    const { data: watchData } = await sendRequest(anime.baseUrl + watchUrl);
    const watchDoc = parser.parseFromString(watchData, "text/html");

    const episodeSections = Array.from(
      watchDoc.querySelectorAll(".server .name span")
    )
      .map((el) => el.textContent?.trim())
      .filter(Boolean);

    const episodesChunk = Array.from(
      watchDoc.querySelectorAll(".server .episodes")
    );

    const episodes: Episode[] = episodesChunk
      .flatMap((chunk, index) => {
        const section = episodeSections[index];

        return Array.from(chunk.querySelectorAll("li a")).map((el) => {
          const numberString = el.textContent?.trim();
          const id = el.getAttribute("data-episode-id")?.toString();

          if (!numberString || !id) return null;

          return {
            number: parseInt(numberString, 10).toString(),
            id,
            section,
          };
        });
      })
      .filter(Boolean);

    sendResponse(episodes);
  },

  loadVideoServers: async ({ episodeId }) => {
    const { data } = await sendRequest(
      `${anime.baseUrl}/xem-phim-a-ep-a/${episodeId}.html`
    );

    const parser = new DOMParser();
    const doc = parser.parseFromString(data, "text/html");

    const serverItems = Array.from(doc.querySelectorAll("#clicksv span"));

    const servers: VideoServer[] = serverItems
      .map((el) => {
        const id = el.getAttribute("id")?.replace("sv", "");

        if (!id || !el.textContent) return null;

        return {
          name: el.textContent,
          extraData: {
            id,
            episodeId,
          },
        };
      })
      .filter(Boolean)
      .filter((server) => allowedServers.includes(server.extraData.id));

    sendResponse(servers);
  },

  loadVideoContainer: async ({ extraData }) => {
    const { id, episodeId } = extraData as { id: string; episodeId: string };

    const { data } = await sendRequest({
      url: `${anime.baseUrl}/player/player.php`,
      method: "POST",
      data: `ID=${episodeId}&SV=${id}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const container: VideoContainer = {
      videos: [],
    };

    if (!data) {
      return sendResponse(container);
    }

    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.min.js"
    );

    // Fa
    if (id === "2") {
      const videoUrl = anime._decrypt(
        anime._parseBetween(data, 'atob("', '")')
      );

      if (!videoUrl) {
        return sendResponse(container);
      }

      container.videos.push({ file: { url: videoUrl } });

      return sendResponse(container);
    }

    // Wa
    if (id === "9") {
      const videoUrl = anime._decrypt(
        anime._parseBetween(data, 'atob("', '")')
      );

      if (!videoUrl) {
        return sendResponse(container);
      }

      container.videos.push({ file: { url: videoUrl } });

      return sendResponse(container);
    }

    // Lo
    if (id === "3") {
      const iframeUrl = anime
        ._parseBetween(data, 'src=\\"', '\\"')
        .replace(/\\\//g, "/");

      const { data: iframeData } = await sendRequest(iframeUrl);

      const videoUrl = anime._parseBetween(
        iframeData,
        '.setup({"file": "',
        '"'
      );

      container.videos.push({ file: { url: videoUrl } });

      return sendResponse(container);
    }

    return sendResponse(container);
  },

  search: async ({ query }) => {
    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },

  _search: async (query) => {
    const { data } = await sendRequest({
      url: `${anime.baseUrl}/post_search.php`,
      data: `ajaxSearch=1&keysearch=${encodeURIComponent(query)}`,
      method: "POST",
    });

    if (!data) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(data, "text/html");

    const searchItems = Array.from(doc.querySelectorAll("li:not(.ss-bottom)"));

    const searchResults: SearchResult[] = searchItems
      .map((el) => {
        const thumbnailStyle = el.querySelector("a")?.getAttribute("style");
        const thumbnail = thumbnailStyle?.match(/url\(["']?(.*?)["']?\)/)?.[1];

        if (!thumbnail) return null;

        const href = el.querySelector("a")?.getAttribute("href");

        if (!href) return null;

        const id = anime._parseIdFromUrl(href);

        if (!id) return null;

        const titlesText = el.querySelector("p:first-of-type")?.textContent;

        if (!titlesText) return null;

        const titles = anime._parseTitle(titlesText);

        const title = (() => {
          const vietnameseTitle = titles.find((title) =>
            anime._isVietnamese(title)
          );

          return vietnameseTitle || titles[0];
        })();

        return {
          id,
          thumbnail,
          title,
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
  _stringify(cipherParams) {
    // @ts-expect-error CryptoJS is loaded from loadScript
    const Crypto = CryptoJS as any;

    const j = {
      ct: cipherParams.ciphertext.toString(Crypto.enc.Base64),
      iv: "",
      s: "",
    };
    if (cipherParams.iv) j.iv = cipherParams.iv.toString();
    if (cipherParams.salt) j.s = cipherParams.salt.toString();

    return JSON.stringify(j);
  },
  _parse(jsonStr) {
    const j = JSON.parse(jsonStr) as any;

    // @ts-expect-error CryptoJS is loaded from loadScript
    const Crypto = CryptoJS as any;

    const cipherParams = Crypto.lib.CipherParams.create({
      ciphertext: Crypto.enc.Base64.parse(j.ct),
    });
    if (j.iv) cipherParams.iv = Crypto.enc.Hex.parse(j.iv);
    if (j.s) cipherParams.salt = Crypto.enc.Hex.parse(j.s);

    return cipherParams;
  },
  _decrypt(base64) {
    const decodedKey = atob(base64);
    // @ts-expect-error CryptoJS is loaded from loadScript
    const Crypto = CryptoJS as any;

    return JSON.parse(
      Crypto.AES.decrypt(decodedKey, "caphedaklak", {
        format: {
          stringify: anime._stringify,
          parse: anime._parse,
        },
      }).toString(Crypto.enc.Utf8)
    );
  },
  _parseBetween(text, start, end) {
    let strArr = [];

    strArr = text.split(start);
    strArr = strArr[1].split(end);

    return strArr[0];
  },
  _parseIdFromUrl(url) {
    const regex = /\/m(\d+)\.html$/;
    const match = url?.match(regex);

    if (match?.[1]) {
      return match[1];
    }

    return null;
  },
  _parseTitle(title, separators = ["|", ",", ";", "-", "/"]) {
    let mostOccuredSeparator = {
      occurTime: 0,
      separator: separators[0],
    };

    for (const separator of separators) {
      const occurTime = title.split(separator).length - 1;

      if (occurTime > mostOccuredSeparator.occurTime) {
        mostOccuredSeparator = {
          occurTime,
          separator,
        };
      }
    }

    const regex = new RegExp(`\\${mostOccuredSeparator.separator}\\s+`);

    return title
      .split(regex)
      .map((title) => title.trim())
      .filter((title) => title);
  },
  _isVietnamese(text) {
    const REGEX =
      /à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ|è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ|ì|í|ị|ỉ|ĩ|ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ|ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ|ỳ|ý|ỵ|ỷ|ỹ|đ/g;

    return REGEX.test(text.toLowerCase());
  },
};
