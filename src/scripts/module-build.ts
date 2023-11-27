import ora from "ora";
import { inputModuleId } from "../utils/module-cli";
import { archiveModule, copyLogo, rewriteIndexFile } from "../utils/modules";

const main = async () => {
  const module_id = await inputModuleId();

  const copySpinner = ora("Copying logo to dist").start();

  if (!(await copyLogo(module_id))) {
    copySpinner.fail("Failed to copy logo to dist");

    return;
  }

  copySpinner.succeed("Logo copied to dist");

  const rewriteSpinner = ora("Rewriting index file").start();

  if (!(await rewriteIndexFile(module_id))) {
    rewriteSpinner.fail("Failed to rewrite index file");

    return;
  }

  rewriteSpinner.succeed("Index file rewritten");

  const spinner = ora("Building module").start();

  await archiveModule(module_id, {
    onError(err) {
      spinner.fail(`Failed to build module (${err.message})`);
    },
    onFinished() {
      spinner.succeed(`Module built successfully`);
    },
  });
};

main();
