/* eslint-disable no-console */
/**
 * Debug helper: inspect Posiflora bouquets and filters.
 *
 * Usage:
 *   node scripts/posiflora-debug-showcase.js
 *
 * Reads ./backend/.env (no printing of secrets) and prints a few bouquet fields
 * to help validate the correct data source for the storefront.
 */
const fs = require('fs');
const path = require('path');
const { URL, URLSearchParams } = require('url');
const util = require('util');

function parseEnvFile(filePath) {
  const out = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function safePick(obj, paths) {
  for (const p of paths) {
    const v = obj?.[p];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return null;
}

function summarizeBouquets(responseJson, limit = 5) {
  const data = Array.isArray(responseJson?.data) ? responseJson.data : [];
  return data.slice(0, limit).map((b) => ({
    id: b.id,
    title: b?.attributes?.title ?? null,
    status: b?.attributes?.status ?? null,
    public: b?.attributes?.public ?? null,
    onWindowAt: b?.attributes?.onWindowAt ?? null,
    amount: b?.attributes?.amount ?? null,
    saleAmount: b?.attributes?.saleAmount ?? null,
    trueSaleAmount: b?.attributes?.trueSaleAmount ?? null,
    docNo: b?.attributes?.docNo ?? null,
    logoId: b?.relationships?.logo?.data?.id ?? null,
    specWithVarId: b?.relationships?.specWithVar?.data?.id ?? null,
  }));
}

function summarizeImages(included) {
  if (!Array.isArray(included)) return [];
  return included
    .filter((r) => r?.type === 'images')
    .slice(0, 5)
    .map((img) => ({
      id: img.id,
      url:
        safePick(img?.attributes, [
          'fileShop',
          'fileMedium',
          'fileSmall',
          'file',
          'url',
          'link',
          'path',
          'original',
          'preview',
          'medium',
          'small',
          'thumb',
          'thumbnail',
          'fileUrl',
          'downloadUrl',
        ]) ?? null,
      attributesKeys: img?.attributes ? Object.keys(img.attributes).slice(0, 10) : [],
    }));
}

function joinApiUrl(apiUrl, endpointPath) {
  const base = String(apiUrl || '').replace(/\/+$/, '');
  const p = String(endpointPath || '').replace(/^\/+/, '');
  return `${base}/${p}`;
}

async function createSession({ apiUrl, username, password }) {
  const url = joinApiUrl(apiUrl, '/sessions');
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: { type: 'sessions', attributes: { username, password } },
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Create session failed: ${resp.status} ${resp.statusText} ${text.slice(0, 200)}`);
  }
  const json = await resp.json();
  const token = json?.data?.attributes?.accessToken;
  if (!token) throw new Error('Create session failed: accessToken missing');
  return token;
}

async function getJson(apiUrl, token, pathname, params) {
  const url = new URL(joinApiUrl(apiUrl, pathname));
  if (params) {
    const sp = new URLSearchParams(params);
    url.search = sp.toString();
  }
  const resp = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.api+json',
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`GET ${pathname} failed: ${resp.status} ${resp.statusText} ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`GET ${pathname} failed: invalid JSON`);
  }
}

async function main() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env not found at ${envPath}`);
  }
  const env = parseEnvFile(envPath);
  const apiUrl = env.POSIFLORA_API_URL;
  const username = env.POSIFLORA_USERNAME;
  const password = env.POSIFLORA_PASSWORD;
  const storeId = env.POSIFLORA_STORE_ID;

  if (!apiUrl || !username || !password) {
    throw new Error('POSIFLORA_API_URL / POSIFLORA_USERNAME / POSIFLORA_PASSWORD are required in backend/.env');
  }

  console.log('[Posiflora debug] apiUrl:', apiUrl);
  console.log('[Posiflora debug] storeId:', storeId || '(empty)');

  const token = await createSession({ apiUrl, username, password });
  console.log('[Posiflora debug] session ok');

  const scenarios = [
    {
      name: 'bouquets (no filters)',
      path: '/bouquets',
      params: { 'page[number]': '1', 'page[size]': '5', include: 'logo,specWithVar' },
    },
    {
      name: 'store by env id',
      path: `/stores/${storeId}`,
      params: undefined,
    },
    {
      name: 'bouquets by store',
      path: '/bouquets',
      params: {
        'page[number]': '1',
        'page[size]': '5',
        include: 'logo,specWithVar',
        ...(storeId ? { 'filter[store]': storeId } : {}),
      },
    },
    {
      name: 'bouquets by store + statuses=demonstrated',
      path: '/bouquets',
      params: {
        'page[number]': '1',
        'page[size]': '5',
        include: 'logo,specWithVar',
        ...(storeId ? { 'filter[store]': storeId } : {}),
        'filter[statuses]': 'demonstrated',
      },
    },
    {
      name: 'bouquets by store (filter[stores])',
      path: '/bouquets',
      params: {
        'page[number]': '1',
        'page[size]': '5',
        include: 'logo,specWithVar',
        ...(storeId ? { 'filter[stores]': storeId } : {}),
      },
    },
    {
      name: 'bouquets by store (filter[stores]) + statuses=demonstrated',
      path: '/bouquets',
      params: {
        'page[number]': '1',
        'page[size]': '5',
        include: 'logo,specWithVar',
        ...(storeId ? { 'filter[stores]': storeId } : {}),
        'filter[statuses]': 'demonstrated',
      },
    },
    {
      name: 'bouquets by store + onWindow=true',
      path: '/bouquets',
      params: {
        'page[number]': '1',
        'page[size]': '5',
        include: 'logo,specWithVar',
        ...(storeId ? { 'filter[store]': storeId } : {}),
        'filter[onWindow]': 'true',
      },
    },
    {
      name: 'bouquets by store + public=true',
      path: '/bouquets',
      params: {
        'page[number]': '1',
        'page[size]': '5',
        include: 'logo,specWithVar',
        ...(storeId ? { 'filter[store]': storeId } : {}),
        public: 'true',
      },
    },
    {
      name: 'bouquets by store + statuses[]=demonstrated',
      path: '/bouquets',
      params: {
        'page[number]': '1',
        'page[size]': '5',
        include: 'logo,specWithVar',
        ...(storeId ? { 'filter[store]': storeId } : {}),
        'filter[statuses][]': 'demonstrated',
      },
    },
    {
      name: 'inventory-items public + active prices (for comparison)',
      path: '/inventory-items',
      params: {
        'page[number]': '1',
        'page[size]': '5',
        'filter[dataSource]': 'both',
        ...(storeId ? { 'filter[store]': storeId } : {}),
        'filter[hasActivePrices]': 'true',
        public: 'true',
      },
    },
  ];

  for (const s of scenarios) {
    try {
      const json = await getJson(apiUrl, token, s.path, s.params);
      const total = json?.meta?.total ?? null;
      console.log('\n---', s.name, '---');
      console.log('meta.total:', total);
      console.log(
        util.inspect(
          {
            sample: summarizeBouquets(json, 5),
            includedImagesSample: summarizeImages(json?.included),
          },
          { depth: 6, colors: false, maxArrayLength: 20 }
        )
      );
    } catch (err) {
      console.log('\n---', s.name, '---');
      console.error(String(err?.message || err));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

