import path from "path";
import { ExecuteCodeFunction, createExecutor } from "../utils/executor";
import { inputModuleId } from "../utils/module-cli";
import { filterIndexFile, getModuleFolder } from "../utils/modules";
import { hasPath } from "../utils";
import ora from "ora";
import { z } from "zod";
import fs from "fs/promises";
import { EpisodeSchema } from "../schemas/episode";
import { SearchResultSchema } from "../schemas/search-result";
import { VideoServerSchema } from "../schemas/video-server";
import { VideoContainerSchema } from "../schemas/video-container";

const GetIdResultSchema = z.object({
  data: z.string(),
  extraData: z.record(z.string()).nullable().optional(),
});
const GetEpisodesResultSchema = z.array(EpisodeSchema).nonempty();
const GetSearchResultSchema = z.array(SearchResultSchema);
const GetVideoServersResultSchema = z.array(VideoServerSchema).nonempty();

const getIdResultParams = {
  media: {
    id: 21,
    title: {
      romaji: "ONE PIECE",
      english: "ONE PIECE",
      native: "ONE PIECE",
      userPreferred: "ONE PIECE",
    },
  },
};

const checkIndexFile = (moduleFolder: string) => {
  const file = path.join(moduleFolder, "index.js");
  const spinner = ora("Is there index.js file?").start();

  if (!hasPath(file)) {
    spinner.fail("index.js file not found");
    return false;
  }

  spinner.succeed("index.js file found");

  return true;
};

const checkGetIdFunction = async (executeCode: ExecuteCodeFunction) => {
  const spinner = ora("anime.getId").start();

  const data = await executeCode<z.infer<typeof GetIdResultSchema>>(
    "anime.getId",
    getIdResultParams
  );

  const validation = GetIdResultSchema.safeParse(data);

  if (!validation.success) {
    spinner.fail(`anime.getId (${validation.error.message})`);

    console.error(data);

    return undefined;
  }

  spinner.succeed();

  return validation.data;
};

const checkSearchFunction = async (executeCode: ExecuteCodeFunction) => {
  const spinner = ora("anime.search").start();

  const data = await executeCode<z.infer<typeof GetSearchResultSchema>>(
    "anime.search",
    { query: "one piece" }
  );

  const validation = GetSearchResultSchema.safeParse(data);

  if (!validation.success) {
    spinner.fail(`anime.search (${validation.error.message})`);

    console.error(data);

    return undefined;
  }

  spinner.succeed();

  return true;
};

const checkGetEpisodesFunction = async (
  input: z.infer<typeof GetIdResultSchema>,
  executeCode: ExecuteCodeFunction
) => {
  const spinner = ora("anime.getEpisodes").start();

  const data = await executeCode<z.infer<typeof GetEpisodesResultSchema>>(
    "anime.getEpisodes",
    { animeId: input.data }
  );

  const validation = GetEpisodesResultSchema.safeParse(data);

  if (!validation.success) {
    spinner.fail(`anime.getEpisodes (${validation.error.message})`);

    console.error(data);

    return undefined;
  }

  spinner.succeed();

  return validation.data;
};

const checkVideoServersFunction = async (
  input: z.infer<typeof EpisodeSchema>,
  executeCode: ExecuteCodeFunction
) => {
  const spinner = ora("anime.loadVideoServers").start();

  const data = await executeCode<z.infer<typeof GetVideoServersResultSchema>>(
    "anime.loadVideoServers",
    {
      extraData: input.extra,
      episodeId: input.id,
    }
  );

  const validation = GetVideoServersResultSchema.safeParse(data);

  if (!validation.success) {
    spinner.fail(`anime.loadVideoServers (${validation.error.message})`);

    console.error(data);

    return undefined;
  }

  spinner.succeed();

  return validation.data;
};

const checkVideoContainer = async (
  input: z.infer<typeof VideoServerSchema>,
  executeCode: ExecuteCodeFunction
) => {
  const spinner = ora("anime.loadVideoContainer").start();

  const data = await executeCode<z.infer<typeof VideoContainerSchema>>(
    "anime.loadVideoContainer",
    input
  );

  const validation = VideoContainerSchema.safeParse(data);

  if (!validation.success) {
    spinner.fail(`anime.loadVideoContainer (${validation.error.message})`);

    console.error(data);

    return undefined;
  }

  spinner.succeed();

  return validation.data;
};

const main = async () => {
  const module_id = await inputModuleId();
  const moduleFolder = await getModuleFolder(module_id);
  const indexFile = path.join(moduleFolder, "index.js");

  if (!checkIndexFile(moduleFolder)) {
    return;
  }

  const indexFileContent = filterIndexFile(
    await fs.readFile(indexFile, "utf-8")
  );

  if (!indexFileContent) {
    console.log("index.js file is empty");

    return;
  }

  const { executeCode, injectCode } = createExecutor();

  injectCode(indexFileContent);

  const animeId = await checkGetIdFunction(executeCode);

  if (!animeId) {
    return;
  }

  const episodes = await checkGetEpisodesFunction(animeId, executeCode);

  if (!episodes) {
    return;
  }

  const videoServers = await checkVideoServersFunction(
    episodes[0],
    executeCode
  );

  if (!videoServers) {
    return;
  }

  const videoContainer = await checkVideoContainer(
    videoServers[0],
    executeCode
  );

  if (!videoContainer) {
    return;
  }

  const searchResults = await checkSearchFunction(executeCode);

  if (!searchResults) {
    return;
  }

  console.log(`Module ${module_id} passed all tests`);
};

main();
