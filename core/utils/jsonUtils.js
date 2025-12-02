import fs from "fs";

export function getJsonData(filePath, jsonPath) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  // simple dot path parser
  return jsonPath.split(".").reduce((obj, key) => obj[key], data);
}
