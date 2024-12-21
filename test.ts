import fs from "node:fs";
import { extractKeysAtLevel } from "./build/cursedJson.ts";

const file = (await fs.promises.readFile("./src/settingsSchema.ts", "utf-8")).split("settingsSchema = ").pop()!;
console.log(extractKeysAtLevel(file, 2))
//const categories = extractKeysAtLevel(file, 1);
//for (const category of categories) {
//    const result = extractJSON(file, [category]);
//    const keys = extractKeysAtLevel(result, 1);
//    for (const key of keys) {
//        const name = extractJSON(result, [key, "name"]);
//        const description = extractJSON(result, [key, "description"]);
//        console.log(name, description);
//    }
//}

