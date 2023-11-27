import prompts from "prompts";
import { getModuleIds } from "./modules";

export const inputModuleId = async () => {
  const moduleIds = await getModuleIds();

  const { module_id } = await prompts({
    type: "select",
    name: "module_id",
    message: "Select the module",
    choices: moduleIds.map((id) => ({
      title: id,
      value: id,
    })),
  });

  return module_id;
};
