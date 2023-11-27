import fs from "fs/promises";
import path from "path";
import { hasPath } from "../utils";
import { getModuleFolder, validateMetadata } from "../utils/modules";

import ora from "ora";
import { inputModuleId } from "../utils/module-cli";

const checkIndexFile = async (moduleFolder: string) => {
  const file = path.join(moduleFolder, "index.js");
  const spinner = ora("Is there index.js file?").start();

  if (!hasPath(file)) {
    spinner.fail("index.js file not found");
    return false;
  }

  spinner.succeed("index.js file found");

  return true;
};

const checkLogoFile = async (moduleFolder: string) => {
  const file = path.join(moduleFolder, "logo.png");
  const spinner = ora("Is there logo.png file?").start();

  if (!hasPath(file)) {
    spinner.warn("logo.png file not found, there should be a logo.png file");
  } else {
    spinner.succeed();
  }
};

const checkMetadataFile = async (moduleFolder: string) => {
  const file = path.join(moduleFolder, "metadata.json");
  const spinner = ora("Is there metadata.json file?").start();

  if (!hasPath(file)) {
    spinner.fail("metadata.json file not found");
    return false;
  }

  const metadataString = await fs.readFile(file, "utf-8");

  let metadata = null;

  try {
    metadata = JSON.parse(metadataString);
  } catch (error) {
    spinner.fail("metadata.json file is not a valid JSON");
    return false;
  }

  const validateResult = validateMetadata(metadata);

  if (!validateResult.success) {
    spinner.fail(
      `metadata.json file is not a valid metadata (${validateResult.error.message})`
    );
    return false;
  }

  spinner.succeed("metadata.json validated");

  return true;
};

export const validateModule = async (module_id: string) => {
  const moduleFolder = await getModuleFolder(module_id);

  if (!checkIndexFile(moduleFolder)) {
    return;
  }

  checkLogoFile(moduleFolder);

  if (!checkMetadataFile(moduleFolder)) {
    return;
  }
};

const main = async () => {
  const module_id = await inputModuleId();

  validateModule(module_id);
};

main();
