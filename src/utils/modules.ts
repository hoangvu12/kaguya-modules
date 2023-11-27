/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable quotes */
import fs from "fs";
import { handlePath, hasPath } from ".";
import ModuleSchema from "../schemas/module";
import path from "path";
import archiver from "archiver";

export const getModuleIds = async () => {
  const modulesFolder = handlePath("./modules");

  const data = await fs.promises.readdir(modulesFolder);

  return data;
};

export const getModuleFolder = async (moduleId: string) => {
  const modulesFolder = handlePath(`./modules/${moduleId}`);

  if (!hasPath(modulesFolder)) {
    throw new Error(`Module ${moduleId} not found`);
  }

  return modulesFolder;
};

export const readModuleFile = async (moduleId: string, fileName: string) => {
  const moduleFolder = await getModuleFolder(moduleId);

  const filePath = handlePath(`${moduleFolder}/${fileName}`);

  try {
    const data = await fs.promises.readFile(filePath, "utf-8");

    return data;
  } catch (error) {
    throw new Error(`File ${fileName} not found`);
  }
};

export const validateMetadata = (metadataFile: any) => {
  return ModuleSchema.safeParse(metadataFile);
};

export const filterIndexFile = (indexFile: string) => {
  return indexFile
    .replace('"use strict";', "")
    .replace(
      'Object.defineProperty(exports, "__esModule", { value: true });',
      ""
    );
};

export const copyLogo = async (module_id: string) => {
  try {
    const srcModuleFolder = handlePath(
      `./modules/${module_id}`,
      path.resolve(process.cwd(), "./src")
    );
    const distModuleFolder = handlePath(
      `./modules/${module_id}`,
      path.resolve(process.cwd(), "./dist")
    );

    const fromLogoPath = path.join(srcModuleFolder, "logo.png");
    const toLogoPath = path.join(distModuleFolder, "logo.png");

    await fs.promises.copyFile(fromLogoPath, toLogoPath);

    return true;
  } catch (err) {
    return false;
  }
};

export const rewriteIndexFile = async (module_id: string) => {
  try {
    const moduleFolder = handlePath(`./modules/${module_id}`);
    const indexPath = path.join(moduleFolder, "index.js");

    const indexFile = await fs.promises.readFile(indexPath, "utf-8");

    const newFile = filterIndexFile(indexFile);

    await fs.promises.writeFile(indexPath, newFile);

    return true;
  } catch (err) {
    return false;
  }
};

export const archiveModule = async (
  module_id: string,
  {
    onError = () => {},
    onFinished = () => {},
  }: {
    onError?: (err: archiver.ArchiverError) => void;
    onFinished?: () => void;
  }
) => {
  const archive = archiver("zip");

  const outputFolder = handlePath("./output", process.cwd());
  const moduleFolder = handlePath(`./modules/${module_id}`);

  if (!hasPath(outputFolder)) {
    await fs.promises.mkdir(outputFolder);
  }

  archive.file(path.join(moduleFolder, "index.js"), { name: "index.js" });
  archive.file(path.join(moduleFolder, "logo.png"), { name: "logo.png" });
  archive.file(path.join(moduleFolder, "metadata.json"), {
    name: "metadata.json",
  });

  const output = fs.createWriteStream(
    path.join(outputFolder, `${module_id}.kmodule`)
  );

  archive.on("error", (err) => {
    onError(err);
  });

  output.on("close", () => {
    onFinished();
  });

  archive.pipe(output);

  archive.finalize();
};
