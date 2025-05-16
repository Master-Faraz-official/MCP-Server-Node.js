// utils/project.ts

import fs from "fs/promises";
import path from "path";

export async function getProjectStructure(
  dir: string,
  depth = 2
): Promise<any> {
  const result: Record<string, any> = {};
  const items = await fs.readdir(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory() && depth > 0) {
      result[item] = await getProjectStructure(fullPath, depth - 1);
    } else {
      result[item] = "file";
    }
  }

  return result;
}

export async function readFileContent(
  baseDir: string,
  relPath: string
): Promise<string> {
  const fullPath = path.join(baseDir, relPath);
  return await fs.readFile(fullPath, "utf-8");
}
