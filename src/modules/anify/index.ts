import type { Anime, VideoContainer } from "../../types/index";

interface WindowAnime extends Anime {
  baseUrl: string;
}

const anime: WindowAnime = {
  baseUrl: "https://api.anify.tv",
  getId: async ({ media }) => {
    sendResponse({
      data: media.id.toString(),
    });
  },
  getEpisodes: async ({ animeId }) => {
    const { data } = await sendRequest(`${anime.baseUrl}/episodes/${animeId}`);

    if (!data?.length) {
      sendResponse([]);

      return;
    }

    const episodes = data.flatMap((provider: any) => {
      const providerEpisodes = provider.episodes.map((episode: any) => ({
        number: episode.number.toString(),
        id: episode.id,
        title: episode.title,
        thumbnail: episode.img,
        isFiller: episode.isFiller,
        section: provider.providerId,
        extra: {
          ...episode,
          providerId: provider.providerId,
          mediaId: animeId,
        },
      }));

      return providerEpisodes;
    });

    sendResponse(episodes);
  },
  search: async () => {
    sendResponse([]);
  },
  async loadVideoServers({ extraData }) {
    sendResponse([
      {
        name: "Default",
        extraData: extraData,
      },
    ]);
  },

  async loadVideoContainer({ extraData }) {
    const container: VideoContainer = {
      videos: [],
      subtitles: [],
      timestamps: [],
    };

    if (!extraData?.id) {
      return sendResponse(container);
    }

    const { data } = await sendRequest(
      `${anime.baseUrl}/sources?providerId=${
        extraData?.providerId
      }&watchId=${encodeURIComponent(extraData?.id)}&episodeNumber=${
        extraData?.number
      }&id=${extraData?.mediaId}&subType=sub`
    );

    if (!data?.sources?.length) throw new Error("No sources found");

    container.videos = data.sources.map((source: any) => ({
      quality: source.quality,
      file: {
        url: source.url,
        headers: data.headers || {},
      },
    }));

    if (data?.subtitles?.length) {
      container.subtitles = data.subtitles.map((subtitle: any) => ({
        file: {
          url: subtitle.url,
        },
        language: subtitle.lang,
      }));
    }

    if (data?.intro) {
      container.timestamps?.push({
        type: "Intro",
        startTime: data.intro.start,
        endTime: data.intro.end,
      });
    }

    if (data?.outro) {
      container.timestamps?.push({
        type: "Outro",
        startTime: data.outro.start,
        endTime: data.outro.end,
      });
    }

    sendResponse(container);
  },
};
