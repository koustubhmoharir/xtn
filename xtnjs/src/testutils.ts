import fs from 'node:fs';
import path from 'node:path';
import { parseXtn } from "./parser";

const samplesDir = path.resolve(__dirname, '../../samples');

export function loadXtn(name: string, fromJson = false) {
    const data = fs.readFileSync(path.resolve(samplesDir, `${name}.${fromJson ? "json" : "xtn"}`), 'utf8');
    return parseXtn(data);
}
export function loadJson(name: string) {
    const data = fs.readFileSync(path.resolve(samplesDir, `${name}.json`), 'utf8');
    return JSON.parse(data);
}