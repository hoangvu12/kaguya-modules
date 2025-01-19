/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { Anime, SearchResult, VideoContainer } from "../../types";

interface WindowAnime extends Anime {
  baseUrl: string;

  // Helper functions
  _createPoster: (poster: { hq: string }) => string;
  _createThumbnail: (poster: { hq: string }) => string;
  _getVideoResolution: (width: number, height: number) => string;
  _loadEpisodesByLanguage: (
    animeId: string,
    language: string
  ) => Promise<SearchResult[]>;

  // Additional internal functions (if needed)
  _totalSearch: (media: {
    id: number;
    title: { english?: string; romaji?: string };
  }) => Promise<SearchResult[]>;
  _parseBetween: (text: string, start: string, end: string) => string;
  _search: (query: { query: string }) => Promise<SearchResult[]>;

  serverToKey: {
    [key: string]: string;
  };
  serverToOrder: {
    [key: string]: string[];
  };
  resolutions: {
    [key: string]: string;
  };
}

const anime: WindowAnime = {
  baseUrl: "https://www2.kickassanime.mx",

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
    const { data: languages } = await sendRequest<any>(
      `${anime.baseUrl}/api/show/${animeId}/language`
    );

    let availableLanguages = ["ja-JP"];

    if (languages?.result?.length) {
      availableLanguages = languages.result;
    }

    const episodePromises = availableLanguages.map(async (language) => {
      return anime._loadEpisodesByLanguage(animeId, language);
    });

    const episodeChunks = await Promise.allSettled(episodePromises);

    const episodes = episodeChunks
      .filter((chunk) => chunk.status === "fulfilled")
      .flatMap(
        (chunk) => (chunk as PromiseFulfilledResult<SearchResult[]>).value
      );

    sendResponse(episodes);
  },

  search: async ({ query }) => {
    const results = await anime._search({ query });

    sendResponse(results);
  },

  _search: async ({ query }) => {
    const { data: searchResults } = await sendRequest<any[]>({
      url: `${anime.baseUrl}/api/search`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });

    return searchResults.map((result) => ({
      id: result.slug,
      title: result.title_en,
      thumbnail: anime._createPoster(result.poster),
    }));
  },

  loadVideoServers: async ({ extraData }) => {
    if (!extraData?.animeId || !extraData?.slug) return sendResponse([]);

    const { data: episodeData } = await sendRequest<any>(
      `${anime.baseUrl}/api/show/${extraData.animeId}/episode/${extraData.slug}`
    );

    const servers = episodeData?.servers
      .filter((server: any) => {
        return server.shortName !== "bird";
      })
      ?.map((server: any) => ({
        name: server.name,
        extraData: { shortName: server.shortName, embed: server.src },
      }));

    sendResponse(servers || []);
  },

  loadVideoContainer: async ({ extraData }) => {
    if (!extraData?.embed || !extraData?.shortName)
      return sendResponse({ videos: [], subtitles: [], timestamps: [] });

    const shortName = extraData.shortName.toLowerCase();
    const container: VideoContainer = {
      videos: [],
      subtitles: [],
      timestamps: [],
    };

    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.min.js"
    );

    // @ts-expect-error CryptoJS is loaded from loadScript
    const Crypto = CryptoJS as any;

    try {
      const url = new URL(extraData.embed);

      if (shortName === "bird") {
        const { data: sourceResponse } = await sendRequest<any>(
          url.toString().replace("player.php", "source.php")
        );

        const { data: manifest } = await sendRequest<string>(
          sourceResponse.manifest
        );

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(manifest, "text/xml");

        // Select all <Representation> elements within <AdaptationSet>
        const representations = xmlDoc.querySelectorAll(
          "MPD Period AdaptationSet Representation"
        );

        representations.forEach((el) => {
          const mimeType = el.getAttribute("mimeType");
          const codec = el.getAttribute("codecs")?.split(".")[0];
          const width = Number(el.getAttribute("width"));
          const height = Number(el.getAttribute("height"));
          const link = el.querySelector("BaseURL")?.textContent;

          if (mimeType === "video/mp4" && link) {
            container.videos.push({
              file: { url: link },
              quality: `${anime._getVideoResolution(width, height)} - ${codec}`,
              format: "dash",
            });
          }
        });

        if (sourceResponse?.subtitles) {
          sourceResponse.subtitles.forEach((sub: any) => {
            container.subtitles?.push({
              file: {
                url: sub.src.startsWith("//")
                  ? `https:${sub.src}`
                  : new URL(sub.src, url).href,
              },
              language: sub.name,
              format: sub.filename.split(".").pop()?.toLowerCase() || "vtt",
            });
          });
        }
      } else {
        const USER_AGENT =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0";

        const { data: playerResponse } = await sendRequest<string>({
          url: url.toString(),
          headers: { "User-Agent": USER_AGENT },
        });
        const cid = playerResponse.split("cid:")[1].split("'")[1].trim();
        const metaData = Crypto.enc.Hex.parse(cid).toString(Crypto.enc.Utf8);
        const sigArray = [];
        const key: string =
          (anime.serverToKey[shortName as string] as string) ?? "";

        const signatureItems = {
          SIG: playerResponse.split("signature:")[1].split("'")[1].trim(),
          USERAGENT: USER_AGENT,
          IP: metaData.split("|")[0],
          ROUTE: metaData.split("|")[1].replace("player.php", "source.php"),
          KEY: key,
          TIMESTAMP: Math.floor(Date.now() / 1000),
          MID: url.searchParams.get(shortName === "duck" ? "mid" : "id"),
        };

        for (const item of anime.serverToOrder[shortName]) {
          // @ts-ignore fk this
          sigArray.push(signatureItems[item]);
        }

        const sig = Crypto.SHA1(sigArray.join("")).toString(Crypto.enc.Hex);
        const requestUrl = `${url.origin}${signatureItems.ROUTE}?${
          shortName === "duck" ? "mid" : "id"
        }=${signatureItems.MID}&e=${signatureItems.TIMESTAMP}&s=${sig}`;

        const { data: finalResponse } = await sendRequest<any>({
          url: requestUrl,
          headers: {
            referer: `${url.origin}${signatureItems.ROUTE.replace(
              "source.php",
              "player.php"
            )}?${shortName === "duck" ? "mid" : "id"}=${signatureItems.MID}`,
            "user-agent": signatureItems.USERAGENT,
          },
        });

        const result = finalResponse.data;
        const finalResult: any = JSON.parse(
          Crypto.AES.decrypt(
            result.split(":")[0],
            Crypto.enc.Utf8.parse(signatureItems.KEY),
            {
              mode: Crypto.mode.CBC,
              iv: Crypto.enc.Hex.parse(result.split(":")[1]),
              keySize: 256,
            }
          ).toString(Crypto.enc.Utf8)
        );

        let hlsURL = "";

        if (finalResult.hls) {
          hlsURL = finalResult.hls.startsWith("//")
            ? `https:${finalResult.hls}`
            : finalResult.hls;
          container.videos.push({ file: { url: hlsURL }, format: "hls" });
        }

        if (finalResult.subtitles) {
          finalResult.subtitles.forEach((sub: any) => {
            container.subtitles?.push({
              file: {
                url: sub.src.startsWith("//")
                  ? `https:${sub.src}`
                  : new URL(sub.src, hlsURL).href,
              },
              language: sub.name,
            });
          });
        }
      }

      sendResponse(container);
    } catch (err) {
      console.error(err);
      sendResponse(container);
    }
  },

  _createPoster: (poster) => `${anime.baseUrl}/image/poster/${poster.hq}.webp`,
  _createThumbnail: (poster) =>
    `${anime.baseUrl}/image/thumbnail/${poster.hq}.webp`,
  _getVideoResolution: (width, height) => {
    const resStr = `${width}x${height}`;
    return anime.resolutions[resStr] ?? resStr;
  },

  _loadEpisodesByLanguage: async (animeId, language) => {
    const { data: episodes } = await sendRequest(
      `${anime.baseUrl}/api/show/${animeId}/episodes?lang=${language}`
    );

    return (
      episodes?.result?.map((episode: any) => ({
        id: `ep-${episode.episode_string}-${episode.slug}`,
        number: episode.episode_string,
        title: episode.title,
        thumbnail: anime._createThumbnail(episode.thumbnail),
        extra: {
          animeId,
          slug: `ep-${episode.episode_string}-${episode.slug}`,
        },
        section: language,
      })) || []
    );
  },

  _totalSearch: async (media) => {
    const titles = Array.from(
      new Set([media?.title?.english, media?.title?.romaji])
    );

    if (!titles?.length) return [];

    for (const title of titles) {
      if (!title) continue;

      try {
        const searchResults = await anime._search({ query: title });

        if (!searchResults?.length) continue;

        return searchResults;
      } catch (err) {
        console.error(err);
      }
    }

    return [];
  },

  _parseBetween: (text, start, end) => {
    let strArr = [];

    strArr = text.split(start);
    strArr = strArr[1].split(end);

    return strArr[0];
  },

  serverToKey: {
    vid: "e13d38099bf562e8b9851a652d2043d3",
    duck: "4504447b74641ad972980a6b8ffd7631",
    bird: "4b14d0ff625163e3c9c7a47926484bf2",
  },
  serverToOrder: {
    vid: ["IP", "USERAGENT", "ROUTE", "MID", "TIMESTAMP", "KEY"],
    duck: ["IP", "USERAGENT", "ROUTE", "MID", "TIMESTAMP", "KEY"],
    bird: ["IP", "USERAGENT", "ROUTE", "MID", "KEY"],
  },
  resolutions: {
    "7680x4320": "8K",
    "3840x2160": "4K",
    "1920x1080": "FHD",
    "1280x720": "HD",
    "852x480": "WVGA",
    "640x360": "nHD",
    "426x240": "WQVGA",
    "256x144": "QQVGA",
  },
};
