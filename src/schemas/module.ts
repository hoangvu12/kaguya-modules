import { z } from "zod";

const ModuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  languages: z.array(z.string()),
  info: z.object({
    author: z.string(),
  }),
  type: z.enum(["anime", "manga"]),
  url: z.string().url().optional(),
});

export default ModuleSchema;
