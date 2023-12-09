import { Anime, Episode, SearchResult, VideoServer } from "../../types";

interface SearchResponse {
  page: number;
  nbPages: number;
  nbHits: number;
  hitsPerPage: number;
  hits: string;
}

interface SearchHit {
  id: number;
  name: string;
  titles: string[];
  slug: string;
  description: string;
  views: number;
  interests: number;
  poster_url: string;
  cover_url: string;
  brand: string;
  brand_id: number;
  duration_in_ms: number;
  is_censored: boolean;
  rating: number;
  likes: number;
  dislikes: number;
  downloads: number;
  monthly_rank: number;
  tags: string[];
  created_at: number;
  released_at: number;
}

interface HentaiTag {
  id: number;
  text: string;
}

interface Title {
  lang: string;
  kind: string;
  title: string;
}

interface HentaiVideo {
  id: number;
  is_visible: boolean;
  name: string;
  slug: string;
  created_at: Date;
  released_at: Date;
  description: string;
  views: number;
  interests: number;
  poster_url: string;
  cover_url: string;
  is_hard_subtitled: boolean;
  brand: string;
  duration_in_ms: number;
  is_censored: boolean;
  rating: number;
  likes: number;
  dislikes: number;
  downloads: number;
  monthly_rank: number;
  brand_id: string;
  is_banned_in: string;
  preview_url?: any;
  primary_color?: any;
  created_at_unix: number;
  released_at_unix: number;
  hentai_tags: HentaiTag[];
  titles: Title[];
}

interface HentaiTag2 {
  id: number;
  text: string;
  count: number;
  description: string;
  wide_image_url: string;
  tall_image_url: string;
}

interface HentaiFranchise {
  id: number;
  name: string;
  slug: string;
  title: string;
}

interface HentaiFranchiseHentaiVideo {
  id: number;
  name: string;
  slug: string;
  created_at: Date;
  released_at: Date;
  views: number;
  interests: number;
  poster_url: string;
  cover_url: string;
  is_hard_subtitled: boolean;
  brand: string;
  duration_in_ms: number;
  is_censored: boolean;
  rating: number;
  likes: number;
  dislikes: number;
  downloads: number;
  monthly_rank: number;
  brand_id: string;
  is_banned_in: string;
  preview_url?: any;
  primary_color?: any;
  created_at_unix: number;
  released_at_unix: number;
}

interface HentaiVideoStoryboard {
  id: number;
  num_total_storyboards: number;
  sequence: number;
  url: string;
  frame_width: number;
  frame_height: number;
  num_total_frames: number;
  num_horizontal_frames: number;
  num_vertical_frames: number;
}

interface Brand {
  id: number;
  title: string;
  slug: string;
  website_url?: any;
  logo_url?: any;
  email?: any;
  count: number;
}

interface NextHentaiVideo {
  id: number;
  name: string;
  slug: string;
  created_at: Date;
  released_at: Date;
  views: number;
  interests: number;
  poster_url: string;
  cover_url: string;
  is_hard_subtitled: boolean;
  brand: string;
  duration_in_ms: number;
  is_censored: boolean;
  rating?: any;
  likes: number;
  dislikes: number;
  downloads: number;
  monthly_rank: number;
  brand_id: string;
  is_banned_in: string;
  preview_url?: any;
  primary_color?: any;
  created_at_unix: number;
  released_at_unix: number;
}

interface NextRandomHentaiVideo {
  id: number;
  name: string;
  slug: string;
  created_at: Date;
  released_at: Date;
  views: number;
  interests: number;
  poster_url: string;
  cover_url: string;
  is_hard_subtitled: boolean;
  brand: string;
  duration_in_ms: number;
  is_censored: boolean;
  rating: number;
  likes: number;
  dislikes: number;
  downloads: number;
  monthly_rank: number;
  brand_id: string;
  is_banned_in: string;
  preview_url?: any;
  primary_color?: any;
  created_at_unix: number;
  released_at_unix: number;
}

interface Stream {
  id: number;
  server_id: number;
  slug: string;
  kind: string;
  extension: string;
  mime_type: string;
  width: number;
  height: string;
  duration_in_ms: number;
  filesize_mbs: number;
  filename: string;
  url: string;
  is_guest_allowed: boolean;
  is_member_allowed: boolean;
  is_premium_allowed: boolean;
  is_downloadable: boolean;
  compatibility: string;
  hv_id: number;
  server_sequence: number;
  video_stream_group_id: string;
  extra2?: any;
}

interface Server {
  id: number;
  name: string;
  slug: string;
  na_rating: number;
  eu_rating: number;
  asia_rating: number;
  sequence: number;
  is_permanent: boolean;
  streams: Stream[];
}

interface VideosManifest {
  servers: Server[];
}

interface Desktop {
  id: number;
  ad_id: string;
  ad_type: string;
  placement: string;
  image_url?: any;
  iframe_url: string;
  click_url?: any;
  width: number;
  height: number;
  page: string;
  form_factor: string;
  video_url?: any;
  impressions: number;
  clicks: number;
  seconds: number;
  placement_x?: any;
}

interface Ntv1 {
  desktop: Desktop;
}

interface Desktop2 {
  id: number;
  ad_id: string;
  ad_type: string;
  placement: string;
  image_url?: any;
  iframe_url: string;
  click_url?: any;
  width: number;
  height: number;
  page: string;
  form_factor: string;
  video_url?: any;
  impressions: number;
  clicks: number;
  seconds: number;
  placement_x?: any;
}

interface Ntv2 {
  desktop: Desktop2;
}

interface Mobile {
  id: number;
  ad_id: string;
  ad_type: string;
  placement: string;
  image_url?: any;
  iframe_url: string;
  click_url?: any;
  width: number;
  height: number;
  page: string;
  form_factor: string;
  video_url?: any;
  impressions: number;
  clicks: number;
  seconds: number;
  placement_x?: any;
}

interface Desktop3 {
  id: number;
  ad_id: string;
  ad_type: string;
  placement: string;
  image_url?: any;
  iframe_url: string;
  click_url: string;
  width: number;
  height: number;
  page: string;
  form_factor: string;
  video_url?: any;
  impressions: number;
  clicks: number;
  seconds: number;
  placement_x?: any;
}

interface Footer0 {
  mobile: Mobile;
  desktop: Desktop3;
}

interface Mobile2 {
  id: number;
  ad_id: string;
  ad_type: string;
  placement: string;
  image_url: string;
  iframe_url?: any;
  click_url: string;
  width: number;
  height: number;
  page: string;
  form_factor: string;
  video_url?: any;
  impressions: number;
  clicks: number;
  seconds: number;
  placement_x: string;
}

interface Native1 {
  mobile: Mobile2;
}

interface Mobile3 {
  id: number;
  ad_id: string;
  ad_type: string;
  placement: string;
  image_url: string;
  iframe_url?: any;
  click_url: string;
  width: number;
  height: number;
  page: string;
  form_factor: string;
  video_url?: any;
  impressions: number;
  clicks: number;
  seconds: number;
  placement_x: string;
}

interface Native0 {
  mobile: Mobile3;
}

interface Desktop4 {
  id: number;
  ad_id: string;
  ad_type: string;
  placement: string;
  image_url?: any;
  iframe_url: string;
  click_url: string;
  width: number;
  height: number;
  page: string;
  form_factor: string;
  video_url?: any;
  impressions: number;
  clicks: number;
  seconds: number;
  placement_x?: any;
}

interface Ntv0 {
  desktop: Desktop4;
}

interface Bs {
  ntv_1: Ntv1;
  ntv_2: Ntv2;
  footer_0: Footer0;
  native_1: Native1;
  native_0: Native0;
  ntv_0: Ntv0;
}

interface Video {
  player_base_url: string;
  hentai_video: HentaiVideo;
  hentai_tags: HentaiTag2[];
  hentai_franchise: HentaiFranchise;
  hentai_franchise_hentai_videos: HentaiFranchiseHentaiVideo[];
  hentai_video_storyboards: HentaiVideoStoryboard[];
  brand: Brand;
  watch_later_playlist_hentai_videos?: any;
  like_dislike_playlist_hentai_videos?: any;
  playlist_hentai_videos?: any;
  similar_playlists_data?: any;
  next_hentai_video: NextHentaiVideo;
  next_random_hentai_video: NextRandomHentaiVideo;
  videos_manifest: VideosManifest;
  user_license?: any;
  bs: Bs;
  ap: number;
  pre: string;
  host: string;
}

interface Data {
  video: Video;
}

interface MobileApps {
  code_name: string;
  _build_number: number;
  _semver: string;
  _md5: string;
  _url: string;
}

interface Env {
  vhtv_version: number;
  premium_coin_cost: number;
  mobile_apps: MobileApps;
}

interface Tab {
  id: string;
  icon: string;
  title: string;
}

interface AccountDialog {
  is_visible: boolean;
  active_tab_id: string;
  tabs: Tab[];
}

interface ContactUsDialog {
  is_visible: boolean;
  is_video_report: boolean;
  subject: string;
  email: string;
  message: string;
  is_sent: boolean;
}

interface GeneralConfirmationDialog {
  is_visible: boolean;
  is_persistent: boolean;
  is_mini_close_button_visible: boolean;
  is_cancel_button_visible: boolean;
  cancel_button_text: string;
  title: string;
  body: string;
  confirm_button_text: string;
  confirmation_callback?: any;
}

interface Snackbar {
  timeout: number;
  context: string;
  mode: string;
  y: string;
  x: string;
  is_visible: boolean;
  text: string;
}

interface Search {
  cache_sorting_config: any[];
  cache_tags_filter?: any;
  cache_active_brands?: any;
  cache_blacklisted_tags_filter?: any;
  search_text: string;
  search_response_payload?: any;
  total_search_results_count: number;
  order_by: string;
  ordering: string;
  tags_match: string;
  page_size: number;
  offset: number;
  page: number;
  number_of_pages: number;
  tags: any[];
  active_tags_count: number;
  brands: any[];
  active_brands_count: number;
  blacklisted_tags: any[];
  active_blacklisted_tags_count: number;
  is_using_preferences: boolean;
}

interface State {
  scrollY: number;
  version: number;
  is_new_version: boolean;
  r?: any;
  country_code?: any;
  page_name: string;
  user_agent: string;
  ip?: any;
  referrer?: any;
  geo?: any;
  is_dev: boolean;
  is_wasm_supported: boolean;
  is_mounted: boolean;
  is_loading: boolean;
  is_searching: boolean;
  browser_width: number;
  browser_height: number;
  system_msg: string;
  data: Data;
  auth_claim?: any;
  session_token: string;
  session_token_expire_time_unix: number;
  env: Env;
  user?: any;
  user_setting?: any;
  user_search_option?: any;
  playlists?: any;
  shuffle: boolean;
  account_dialog: AccountDialog;
  contact_us_dialog: ContactUsDialog;
  general_confirmation_dialog: GeneralConfirmationDialog;
  snackbar: Snackbar;
  search: Search;
}

interface NuxtData {
  layout: string;
  data: any[];
  error?: any;
  serverRendered: boolean;
  state: State;
}

interface WindowAnime extends Anime {
  baseUrl: string;

  _search(query: string): Promise<SearchResult[]>;
  _dropRight<T>(array: T[], n?: number): T[];
  _removeDuplicates<T>(array: T[], comparator: (a: T, b: T) => boolean): T[];
  _totalSearch: (media: {
    id: number;
    title: {
      romaji: string;
      english: string;
      userPreferred: string;
      native: string;
    };
  }) => Promise<SearchResult[]>;
  _parseBetween: (text: string, start: string, end: string) => string;
}

const anime: WindowAnime = {
  baseUrl: "https://hanime.tv",

  getId: async ({ media }) => {
    const searchResults = await anime._totalSearch(media);

    sendResponse({ data: searchResults?.[0]?.id, extraData: {} });
  },

  search: async ({ query }) => {
    const searchResults = await anime._search(query);

    sendResponse(searchResults);
  },

  getEpisodes: async ({ animeId }) => {
    const actualSourceId = animeId + "-1";

    const { data: text } = await sendRequest({
      url: `${anime.baseUrl}/videos/hentai/${actualSourceId}`,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 OPR/104.0.0.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      },
    });

    const nuxtData = JSON.parse(
      anime._parseBetween(text, "window.__NUXT__=", ";</script>")
    ) as NuxtData;

    if (!nuxtData?.state?.data?.video) {
      sendResponse([]);

      return;
    }

    const videoData = nuxtData.state.data.video;

    const episodes: Episode[] = videoData.hentai_franchise_hentai_videos.map(
      (video) => ({
        id: video.slug,
        number: video.slug.split("-").pop()!,
        thumbnail: video.poster_url,
      })
    );

    sendResponse(episodes);
  },

  loadVideoServers: async ({ episodeId }) => {
    const { data: text } = await sendRequest({
      url: `${anime.baseUrl}/videos/hentai/${episodeId}`,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 OPR/104.0.0.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      },
    });

    const nuxtData = JSON.parse(
      anime._parseBetween(text, "window.__NUXT__=", ";</script>")
    ) as NuxtData;

    if (!nuxtData?.state?.data?.video?.videos_manifest) {
      sendResponse([]);

      return;
    }

    const videoData = nuxtData.state.data.video;
    const videoManifest = videoData.videos_manifest;

    const servers = videoManifest.servers;

    const composedServers: VideoServer[] = servers.map((server) => ({
      name: server.name,
      extraData: {
        streams: JSON.stringify(server.streams),
      },
    }));

    sendResponse(composedServers);
  },

  async loadVideoContainer({ extraData }) {
    try {
      if (!extraData?.streams) {
        sendResponse(null);

        return;
      }

      const streams = JSON.parse(extraData?.streams) as Stream[];

      const playableStreams = streams.filter((stream) => stream.url);

      sendResponse({
        videos: playableStreams.map((stream) => ({
          file: { url: stream.url },
          quality: stream.height + "p",
        })),
      });
    } catch (err) {
      sendResponse(null);
    }
  },

  async _search(query) {
    const list: SearchResult[] = [];

    const requestData = async (pageIndex: number) => {
      const { data: json } = await sendRequest<SearchResponse>({
        url: "https://search.htv-services.com/",
        method: "POST",
        data: {
          search_text: query,
          tags: [],
          tags_mode: "AND",
          brands: [],
          blacklist: [],
          order_by: "released_at_unix",
          ordering: "desc",
          page: pageIndex,
        },
      });

      const hits = JSON.parse(json.hits) as SearchHit[];

      const animeList: SearchHit[] = anime._removeDuplicates(
        hits.map((hit) => {
          return {
            ...hit,
            name: anime._dropRight(hit.name.split(" ")).join(" "),
            slug: anime._dropRight(hit.slug.split("-")).join("-"),
          };
        }),
        (a, b) => a.slug === b.slug
      );

      list.push(
        ...animeList.map((anime) => {
          return {
            thumbnail: anime.cover_url,
            id: anime.slug,
            title: anime.name,
          };
        })
      );

      if (json.page + 1 < json.nbPages) {
        await requestData(json.page + 1);
      }
    };

    await requestData(0);

    return list;
  },

  _dropRight<T>(array: T[], n = 1): T[] {
    if (n >= array.length) {
      return [];
    }

    return array.slice(0, array.length - n);
  },

  _removeDuplicates<T>(array: T[], comparator: (a: T, b: T) => boolean): T[] {
    const uniqueArr: T[] = [];

    for (const item of array) {
      const isDuplicate = uniqueArr.some((existingItem) =>
        comparator(existingItem, item)
      );

      if (!isDuplicate) {
        uniqueArr.push(item);
      }
    }

    return uniqueArr;
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
  _parseBetween(text, start, end) {
    let strArr = [];

    strArr = text.split(start);
    strArr = strArr[1].split(end);

    return strArr[0];
  },
};
