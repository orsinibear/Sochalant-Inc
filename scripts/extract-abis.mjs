import fs from "node:fs";
import path from "node:path";

const md = fs.readFileSync("contract/frontend.md", "utf8");
const sections = [
  ["sochalant-hook", "### SochalantHook ABI", "### HedgeCallbackReceiver ABI"],
  ["hedge-callback-receiver", "### HedgeCallbackReceiver ABI", "### MockERC20 ABI"],
  ["mock-erc20", "### MockERC20 ABI", "### ReactiveOracleSync ABI"],
];

const outDir = "lib/abis/generated";
fs.mkdirSync(outDir, { recursive: true });

for (const [name, start, end] of sections) {
  const block = md.slice(md.indexOf(start), md.indexOf(end));
  const match = block.match(/```json\n([\s\S]*?)\n```/);
  if (!match) {
    console.error("Failed to extract ABI:", name);
    process.exit(1);
  }
  const parsed = JSON.parse(match[1]);
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(parsed, null, 2));
  console.log(`Wrote ${name}.json (${parsed.length} items)`);
}
