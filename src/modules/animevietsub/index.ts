// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const anime = {
  hasGotBaseUrl: false,
  baseUrl: "",
  getBaseUrl: async () => {
    if (anime.hasGotBaseUrl) return;

    const { request } = await sendRequest("https://bit.ly/animevietsubtv");

    let href = request.responseURL;

    if (href.endsWith("/")) href = href.slice(0, -1);

    anime.baseUrl = href;
    anime.hasGotBaseUrl = true;
  },
  getId: async ({ media }) => {
    await anime.getBaseUrl();

    const searchResults = await anime._totalSearch(media);

    sendResponse({ data: searchResults?.[0]?.id, extraData: {} });
  },
  getEpisodes: async ({ animeId }) => {
    await anime.getBaseUrl();

    const { data: response } = await sendRequest(
      `${anime.baseUrl}/phim/a-a${animeId}/xem-phim.html`
    );

    const parser = new DOMParser();
    const doc = parser.parseFromString(response, "text/html");

    const episodeElements = doc.querySelectorAll(".episode a");
    const episodes = Array.from(episodeElements)
      .map((episodeEl) => {
        const name = episodeEl.getAttribute("title");
        const number = anime._parseNumberFromName(name).toString();
        const id = episodeEl.dataset.id;

        if (!name || !id) return;

        return { title: name, number, id };
      })
      .filter((a) => a);

    sendResponse(episodes);
  },
  search: async ({ query }) => {
    await anime.getBaseUrl();

    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },
  async loadVideoServers({ episodeId }) {
    await anime.getBaseUrl();

    const { data } = await sendRequest({
      url: `${anime.baseUrl}/ajax/player?v=2019a`,
      data: `episodeId=${episodeId}&backup=1`,
      method: "post",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(data?.html, "text/html");

    const serverElements = doc.querySelectorAll("a");
    const servers = Array.from(serverElements)
      .filter((el) => el.dataset.play === "api")
      .map((el) => {
        const id = el.dataset.id;
        const hash = el.dataset.href;
        const name = el.textContent.trim();

        return { name, extraData: { id, hash } };
      });

    sendResponse(servers);
  },

  async loadVideoContainer({ extraData }) {
    await anime.getBaseUrl();

    const { id, hash } = extraData;

    const { data } = await sendRequest({
      url: `${anime.baseUrl}/ajax/player?v=2019a`,
      data: `link=${hash}&id=${id}`,
      method: "post",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });

    const sources = data.link;

    sendResponse({
      videos: sources.map((source) => ({
        file: {
          url: !source.file.includes("https")
            ? `https://${source.file}`
            : source.file,
          headers: {
            referer: anime.baseUrl,
          },
        },
        quality: source.label,
      })),
    });
  },
  _search: async (query) => {
    await anime.getBaseUrl();

    const { data: response } = await sendRequest(
      `${anime.baseUrl}/tim-kiem/${encodeURIComponent(
        query.toLowerCase()
      ).replaceAll("%20", "+")}/`
    );

    const parser = new DOMParser();
    const doc = parser.parseFromString(response, "text/html");

    const searchResultsElements = doc.querySelectorAll(".TPostMv");
    const searchResults = Array.from(searchResultsElements).map((el) => {
      const url = el.querySelector("a").getAttribute("href");
      const id = anime._urlToId(url);
      const title = el.querySelector("h2").textContent;
      const thumbnail = el.querySelector("img").getAttribute("src");

      return {
        id,
        title,
        thumbnail,
      };
    });

    return searchResults;
  },
  _parseNumberFromName: (name) => {
    const numberName = name.replace("Tập ", "");

    const number = parseInt(numberName);

    return isNaN(number) ? "Full" : number.toString();
  },
  _urlToId: (url) => {
    const splitted = url.split("/").filter((a) => a);
    const lastSplit = splitted[splitted.length - 1];

    return lastSplit.split("-").slice(-1)[0].split("a")[1];
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
