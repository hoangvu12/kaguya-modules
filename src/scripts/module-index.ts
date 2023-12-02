import { z } from "zod";
import {
  archiveModule,
  copyLogo,
  getModuleFolder,
  getModuleIds,
  rewriteIndexFile,
  validateMetadata,
} from "../utils/modules";
import ModuleSchema from "../schemas/module";
import path from "path";
import fs from "fs";
import { handlePath } from "../utils";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("No arguments provided.");
  process.exit(1);
}

const parseArg = (args: string[], providedArg: string) => {
  const argValue = args.find((arg) => arg.startsWith("--" + providedArg));

  if (!argValue) {
    return null;
  }

  return argValue.split("=")[1];
};

const indexName = parseArg(args, "index-name");
const indexAuthor = parseArg(args, "index-author");
const indexURLPattern = parseArg(args, "index-url-pattern");

if (!indexName || !indexAuthor || !indexURLPattern) {
  console.log(
    "Index name (--index-name) and author (--index-author) and URL Pattern (--index-url-pattern) are required."
  );
  process.exit(1);
}

const buildModule = async (module_id: string) => {
  const log = (message: string) => {
    console.log(`[${module_id}] ${message}`);
  };

  if (!(await copyLogo(module_id))) {
    return log(`Failed to copy logo to dist`);
  }

  if (!(await rewriteIndexFile(module_id))) {
    log("Failed to rewrite index file");

    return;
  }

  await archiveModule(module_id, {
    onError(err) {
      log(`Failed to build module (${err.message})`);
    },
  });
};

const parseUrl = (module: z.infer<typeof ModuleSchema>) => {
  let url = indexURLPattern.replace("{{module_id}}", module.id);

  url = url.replace("{{module_name}}", module.name);
  url = url.replace("{{module_version}}", module.version);
  url = url.replace("{{module_type}}", module.type);
  url = url.replace("{{module_author}}", module.info.author);

  return url;
};

const main = async () => {
  const moduleIds = await getModuleIds();

  await Promise.all(moduleIds.map(buildModule));

  const indexJSON: {
    name: string;
    author: string;
    modules: z.infer<typeof ModuleSchema>[];
  } = {
    author: indexAuthor,
    name: indexName,
    modules: [],
  };

  for await (const module_id of moduleIds) {
    const moduleFolder = await getModuleFolder(module_id);
    const metadataFile = path.join(moduleFolder, "metadata.json");

    const metadata = JSON.parse(
      await fs.promises.readFile(metadataFile, "utf-8")
    );

    const validateResult = validateMetadata(metadata);

    if (!validateResult.success) {
      console.log(
        `[${module_id}] metadata.json file is not a valid metadata (${validateResult.error.message})`
      );

      break;
    }

    const url = parseUrl(validateResult.data);

    indexJSON.modules.push({
      ...validateResult.data,
      url,
    });
  }

  fs.promises.writeFile(
    handlePath("./output/index.json", process.cwd()),
    JSON.stringify(indexJSON)
  );

  console.log("Index file generated");
};

main();
