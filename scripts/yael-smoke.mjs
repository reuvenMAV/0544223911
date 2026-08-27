#!/usr/bin/env node
/**
 * Production smoke for Yael. Does not create bookings or mutate data.
 * Usage: SMOKE_BASE_URL=https://yael.mavash.net pnpm smoke
 */
const base = (process.env.SMOKE_BASE_URL || "").replace(/\/+$/, "");
if (!base) {
  console.error("SMOKE_BASE_URL is required");
  process.exit(1);
}

const ASSETS = [
  ["/assets/yael-hero-spa_d491bd84.jpg", 164578, "image/jpeg"],
  ["/assets/yael-pedicure-detail_d4a4994b.jpg", 278968, "image/jpeg"],
  ["/assets/yael-manicure-detail_2f9812d6.jpg", 273558, "image/jpeg"],
  ["/assets/yael-studio-atmosphere_eb67dd3d.jpg", 192994, "image/jpeg"],
  ["/assets/yael-mavashev-logo_6c718b1a.png", 336614, "image/png"],
];

let failed = 0;
function pass(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}

async function get(path) {
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const res = await fetch(url, { redirect: "follow" });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    url,
    status: res.status,
    type: (res.headers.get("content-type") || "").split(";")[0].trim(),
    buf,
  };
}

const home = await get("/");
if (home.status === 200) pass(`GET / -> 200 (${home.buf.length} bytes)`);
else fail(`GET / -> ${home.status}`);

const html = home.buf.toString("utf8");
if (html.includes("Yael Mavashev")) pass("HTML marker Yael Mavashev");
else fail("HTML marker Yael Mavashev missing");
if (html.includes("Mavash AI")) fail("Wrong upstream: Mavash AI still present");
else pass("Mavash AI absent");

const jsHref = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
if (!jsHref) {
  fail("bundled index JS not found in HTML");
} else {
  const js = await get(jsHref[0]);
  if (js.status === 200) pass(`GET ${jsHref[0]} -> 200`);
  else fail(`GET ${jsHref[0]} -> ${js.status}`);
  const body = js.buf.toString("utf8");
  for (const [path] of ASSETS) {
    if (path.endsWith(".png")) continue;
    if (body.includes(path)) pass(`bundle refs ${path}`);
    else fail(`bundle missing ${path}`);
  }
  if (body.includes("/manus-storage/yael-")) fail("bundle still refs /manus-storage/yael-");
  else pass("bundle has no /manus-storage/yael- refs");
  if (body.includes("054-808-0140") || body.includes("972548080140")) {
    pass("phone 054-808-0140 / WhatsApp present");
  } else {
    fail("phone/WhatsApp missing from bundle");
  }
  if (body.includes("המלצות אמיתיות בדרך")) pass("empty testimonials copy present");
  else fail("empty testimonials copy missing");
}

for (const [path, bytes, type] of ASSETS) {
  const res = await get(path);
  const okStatus = res.status === 200;
  const okType = res.type === type || res.type.startsWith("image/");
  const okBytes = res.buf.length === bytes;
  if (okStatus && okType && okBytes) {
    pass(`GET ${path} -> 200 ${res.type} ${res.buf.length}`);
  } else {
    fail(
      `GET ${path} -> ${res.status} ${res.type} ${res.buf.length} (want 200 ${type} ${bytes})`,
    );
  }
}

const services = await get("/api/booking/services");
if (services.status !== 200) {
  fail(`GET /api/booking/services -> ${services.status}`);
} else {
  let payload;
  try {
    payload = JSON.parse(services.buf.toString("utf8"));
  } catch {
    fail("GET /api/booking/services is not JSON");
    payload = null;
  }
  const items = Array.isArray(payload)
    ? payload
    : payload?.items || payload?.services;
  if (Array.isArray(items) && items.length > 0) {
    pass(`GET /api/booking/services -> 200 (${items.length} services)`);
  } else {
    fail("GET /api/booking/services returned no services");
  }
}

console.log("");
if (failed) {
  console.error(`smoke failed: ${failed} check(s) against ${base}`);
  process.exit(1);
}
console.log(`smoke passed against ${base}`);
