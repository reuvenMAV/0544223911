#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)));
const workflow = JSON.parse(readFileSync(join(root, "yael-mavashev-booking-lifecycle.workflow.json"), "utf8"));
const raw = JSON.stringify(workflow);
const failures = [];

function assert(cond, message) {
  if (!cond) failures.push(message);
}

assert(workflow.name === "Yael Mavashev — תורים", `unexpected name: ${workflow.name}`);
assert(workflow.id === "YaelBookLifeCycle01", `unexpected id: ${workflow.id}`);
assert(workflow.active === false, "workflow must stay inactive");
assert(!raw.includes("1eBm_9r1tPe5Jj6F8SmFGecvlYDsDRcxnUoRgMoDg6sU"), "Haya sheet id leaked");
assert(!raw.includes("csdDb9xcveSmLOkV"), "Haya Google Sheets credential leaked");
assert(!raw.includes("d1Atqo9toCWxZbKH"), "Haya Green 642 credential leaked");
assert(!raw.includes("Google Sheets חיה"), "Haya Sheets credential name leaked");
assert(!raw.includes("Green 642"), "Haya Green 642 name leaked");
assert(!raw.includes("שלהבת חיה"), "Haya salon name leaked");
assert(!raw.includes("הנביאים 45"), "Haya address leaked");
assert(!raw.includes("CRU3_86YLBC6EAE"), "Haya Google review link leaked");
assert(!raw.includes("לחיה"), "Haya owner labels leaked");
assert(raw.includes("Yael Mavashev"), "Yael brand missing");
assert(raw.includes("yael.mavash.net"), "Yael API host missing");
assert(raw.includes("אשקלון"), "Yael city missing");
assert(raw.includes("נווה הדרים"), "Yael neighborhood missing");
assert(raw.includes("054-806-0140") || raw.includes("972548060140"), "Yael phone should appear in customer copy");
assert(raw.includes("972548060140@c.us"), "Yael owner chat id missing");
assert(!raw.includes("972544223911@c.us"), "Reuven owner chat id must not remain");
assert(raw.includes("Green account"), "Yael Green credential missing");
assert(raw.includes("Yt6E9F43cXq2ctMX"), "Yael Green credential id missing");
assert(!raw.includes("Padox2sWCSv4sRZ5"), "dead Green biz140 credential must not remain");
assert(!raw.includes("d1Atqo9toCWxZbKH"), "Haya Green 642 credential leaked");
assert(raw.includes("https://yael.mavash.net/survey"), "Yael survey URL missing");
assert(raw.includes("yael-review-rating"), "Yael Fillout webhook path missing");
assert(!raw.includes("review-rating1"), "Haya Fillout webhook path leaked");
assert(raw.includes("$vars.YAEL_N8N_TOKEN"), "n8n token variable missing");

const nodeTypes = workflow.nodes.map((node) => node.type);
assert(nodeTypes.includes("n8n-nodes-base.httpRequest"), "HTTP source nodes missing");
assert(nodeTypes.includes("n8n-nodes-whatsapp-green-api.greenApi"), "Green API nodes missing");
assert(!nodeTypes.some((type) => /openai|openrouter|anthropic|lmChat/i.test(type)), "AI nodes should not be added here");

const sheetNodes = workflow.nodes.filter((node) => node.type === "n8n-nodes-base.googleSheets");
assert(sheetNodes.length === 0, "Google Sheets nodes must not remain");

if (failures.length) {
  console.error(failures.map((item) => `FAIL ${item}`).join("\n"));
  process.exit(1);
}
console.log(`PASS Yael workflow ${workflow.nodes.length} nodes, inactive, no Haya ids`);
