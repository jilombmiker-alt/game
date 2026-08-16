import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders the nine-world hub, legacy routes, medium routes, and product documents", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /霓虹雨季/);
  assert.match(html, /雾港来信/);
  assert.match(html, /北境余烬/);
  assert.match(html, /今天别做主角/);
  assert.match(html, /我们在废墟上发明明天/);
  assert.match(html, /借神之名/);
  assert.match(html, /退潮线以内/);
  assert.match(html, /盐月沉入森林/);
  assert.match(html, /史书之外有长河/);
  assert.match(html, /产品文档/);
  assert.match(html, /无需登录/);

  const neonResponse = await worker.fetch(
    new Request("http://localhost/neon-rain", { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(neonResponse.status, 200);
  assert.match(await neonResponse.text(), /霓虹雨季/);

  const mistResponse = await worker.fetch(
    new Request("http://localhost/mist-harbor", { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(mistResponse.status, 200);
  assert.match(mistResponse.headers.get("content-type") ?? "", /^text\/html\b/i);
  const mistHtml = await mistResponse.text();
  assert.match(mistHtml, developmentPreviewMeta);
  assert.match(mistHtml, /雾港来信/);
  assert.match(mistHtml, /无需登录/);

  const emberResponse = await worker.fetch(
    new Request("http://localhost/ember-north", { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(emberResponse.status, 200);
  assert.match(emberResponse.headers.get("content-type") ?? "", /^text\/html\b/i);
  const emberHtml = await emberResponse.text();
  assert.match(emberHtml, developmentPreviewMeta);
  assert.match(emberHtml, /北境余烬/);
  assert.match(emberHtml, /无需登录/);

  const dayoffResponse = await worker.fetch(
    new Request("http://localhost/day-off", { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(dayoffResponse.status, 200);
  assert.match(dayoffResponse.headers.get("content-type") ?? "", /^text\/html\b/i);
  const dayoffHtml = await dayoffResponse.text();
  assert.match(dayoffHtml, developmentPreviewMeta);
  assert.match(dayoffHtml, /今天别做主角/);
  assert.match(dayoffHtml, /无需登录/);

  for (const [route, title] of [["m01", "我们在废墟上发明明天"], ["m05", "史书之外有长河"]]) {
    const mediumResponse = await worker.fetch(
      new Request(`http://localhost/world/${route}`, { headers: { accept: "text/html" } }),
      {
        ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      },
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(mediumResponse.status, 200);
    const mediumHtml = await mediumResponse.text();
    assert.match(mediumHtml, developmentPreviewMeta);
    assert.match(mediumHtml, new RegExp(title));
    assert.match(mediumHtml, /开始新的分支/);
  }

  const docsResponse = await worker.fetch(
    new Request("http://localhost/product-docs", { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(docsResponse.status, 200);
  const docsHtml = await docsResponse.text();
  assert.match(docsHtml, /72 条结构化测评集/);
  assert.match(docsHtml, /教师版产品需求文档/);
  assert.match(docsHtml, /GitHub 项目说明与证据入口/);
  assert.match(docsHtml, /life-branch-source-v2\.zip/);
});
