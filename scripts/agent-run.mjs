import fs from "fs";
import OpenAI from "openai";
import simpleGit from "simple-git";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const git = simpleGit();

const diff = await git.diff(["HEAD~1", "HEAD", "--", "src"]);

const prompt = `
You are a code review + patch generator.
Input: unified diff of changed files.
Output: multi-file unified diffs with small fixes, comments, and improvements.
Keep API stable.
`;

const resp = await client.chat.completions.create({
  model: "gpt-4.1-mini",
  response_format: { type: "json" },
  messages: [
    { role: "system", content: prompt },
    { role: "user", content: diff },
  ],
});

fs.writeFileSync("agent-output.json", JSON.stringify(resp, null, 2));
console.log("Agent output saved to agent-output.json");
