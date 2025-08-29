import fs from "fs";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = require.resolve(
  "pdfjs-dist/build/pdf.worker.mjs"
);

export async function extractGroupedFields(pdfPath) {
  const raw = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await getDocument({ _data: raw }).promise;

  const fieldGroups = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const blocks = content.items
      .map((item) => ({
        _str: item.str.trim(),
        _x: item.transform[4],
        _y: item.transform[5],
      }))
      .filter((b) => b.str.length > 2);

    // 🧱 Group into lines by Y position
    const linesMap = new Map();
    for (const b of blocks) {
      const y = Math.round(b.y);
      if (!linesMap.has(y)) linesMap.set(y, []);
      linesMap.get(y).push(b);
    }

    const lines = Array.from(linesMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([y, items]) => ({
        y,
        _text: items
          .sort((a, b) => a.x - b.x)
          .map((b) => b.str)
          .join(" ")
          .trim(),
      }));

    let index = 0;
    for (const { text, y } of lines) {
      let type = null;
      let name = null;

      if (/initials?:\s*[_\u2500\-]{3,}/i.test(text)) {
        type = "initials";
        name = `Initials_${pageNum}_${index}`;
      } else if (/signature[:\s]*[_\u2500\-]{3,}/i.test(text)) {
        type = "signature";
        name = `Signature_${pageNum}_${index}`;
      } else if (/date[:\s]*[_\u2500\-]{3,}/i.test(text)) {
        type = "date";
        name = `Date_${pageNum}_${index}`;
      } else if (/^\s*.+:\s*[_\u2500\-]{4,}/.test(text)) {
        type = "text_field";
        name = text.split(":")[0].trim().replace(/\s+/g, "_");
      } else if (/\[\s?\]|\( ?\)/.test(text) || /☐|☑/.test(text)) {
        type = "checkbox";
        name = `Checkbox_${pageNum}_${index}`;
      }

      if (type && name) {
        fieldGroups.push({
          name,
          type,
          _page: pageNum,
          _rawLine: text,
          _certifies: type === "initials" || type === "signature" || type === "date"
              ? mergeAboveLines(lines, index, 3)
              : undefined,
          _visibleTextNearby: type !== "initials" && type !== "signature" && type !== "date"
              ? getNearbyLines(lines, y)
              : undefined,
        });
      }

      index++;
    }
  }

  return fieldGroups;
}

function mergeAboveLines(lines, index, count = 3) {
  return lines
    .slice(Math.max(0, index - count), index)
    .map((l) => l.text)
    .reverse()
    .join(" ");
}

function getNearbyLines(lines, centerY, range = 40) {
  return lines
    .filter((l) => Math.abs(l.y - centerY) < range)
    .sort((a, b) => Math.abs(a.y - centerY) - Math.abs(b.y - centerY))
    .slice(0, 4)
    .map((l) => l.text);
}
