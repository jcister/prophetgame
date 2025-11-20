const PRECACHE_NAME = "prophet-precache-v3";
const RUNTIME_NAME = "prophet-runtime-v1";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/images/logo/android-chrome-192x192.png",
  "/images/logo/android-chrome-512x512.png",
  "/images/logo/poc_logo.ico",
  "/images/hero/background_video.mp4",
  "/images/hero/hero_section.png",
  "/audio/card_pickup.wav",
  "/audio/card_place.wav",
  "/audio/error.wav",
  "/audio/game_start.wav",
  "/audio/success.wav",
  "/audio/ui_select.wav",
  "/images/presidents/1.joseph_smith.jpeg",
  "/images/presidents/2.brigham_young.jpeg",
  "/images/presidents/3.john_taylor.jpeg",
  "/images/presidents/4.wilford_woodruff.jpeg",
  "/images/presidents/5.lorenzo_snow.jpeg",
  "/images/presidents/6.joseph_f_smith.jpeg",
  "/images/presidents/7.heber_j_grant.jpeg",
  "/images/presidents/8.george_albert_smith.jpeg",
  "/images/presidents/9.david_o_mckay.jpeg",
  "/images/presidents/10.joseph_fielding_smith.jpeg",
  "/images/presidents/11.harold_b_lee.jpeg",
  "/images/presidents/12.spencer_w_kimball.jpeg",
  "/images/presidents/13.ezra_taft_benson.jpeg",
  "/images/presidents/14.howard_w_hunter.jpeg",
  "/images/presidents/15.gordon_b_hinckley.jpeg",
  "/images/presidents/16.thomas_s_monson.jpeg",
  "/images/presidents/17.russell_nelson.jpeg",
  "/images/presidents/18.dallin_oaks.jpeg"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(PRECACHE_NAME).then(async cache => {
      const results = await Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(new Request(url, { cache: "reload" })))
      );
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const url = PRECACHE_URLS[index];
          console.warn("Precache failed for", url, result.reason);
        }
      });

      await precacheNextAssets(cache);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames.map(name => {
            if (name !== PRECACHE_NAME && name !== RUNTIME_NAME) {
              return caches.delete(name);
            }
            return undefined;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (request.headers.get("range")) {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, PRECACHE_NAME));
    return;
  }

  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(staleWhileRevalidate(event, RUNTIME_NAME));
    return;
  }

  if (url.pathname.startsWith("/images/") || url.pathname.startsWith("/audio/")) {
    event.respondWith(cacheFirst(request, RUNTIME_NAME));
    return;
  }
});

async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(RUNTIME_NAME);
      cache.put(request, networkResponse.clone()).catch(error => {
        console.error("Failed to cache navigation response", error);
      });
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const offlineFallback = await caches.match(OFFLINE_URL);
    if (offlineFallback) {
      return offlineFallback;
    }

    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain" }
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(error => {
        console.error("Cache put failed", error);
      });
    }
    return response;
  } catch (error) {
    const offlineFallback = await caches.match(OFFLINE_URL);
    if (offlineFallback) {
      return offlineFallback;
    }
    throw error;
  }
}

async function staleWhileRevalidate(event, cacheName) {
  const { request } = event;
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const networkFetch = fetch(request)
    .then(response => {
      if (response && response.ok) {
        cache.put(request, response.clone()).catch(error => {
          console.error("Cache update failed", error);
        });
      }
      return response;
    })
    .catch(() => undefined);

  if (cachedResponse) {
    event.waitUntil(networkFetch);
    return cachedResponse;
  }

  const networkResponse = await networkFetch;
  if (networkResponse) {
    return networkResponse;
  }

  const offlineFallback = await caches.match(OFFLINE_URL);
  if (offlineFallback) {
    return offlineFallback;
  }

  return new Response("Resource unavailable offline.", {
    status: 504,
    headers: { "Content-Type": "text/plain" }
  });
}

async function precacheNextAssets(cache) {
  try {
    const assetUrls = new Set();

    const buildManifest = await fetchJson("/_next/build-manifest.json");
    if (buildManifest) {
      collectManifestEntries(assetUrls, buildManifest.polyfillFiles);
      collectManifestEntries(assetUrls, buildManifest.lowPriorityFiles);
      collectManifestEntries(assetUrls, buildManifest.rootMainFiles);
      if (buildManifest.pages) {
        Object.values(buildManifest.pages).forEach(entries => collectManifestEntries(assetUrls, entries));
      }
    }

    const appBuildManifest = await fetchJson("/_next/app-build-manifest.json");
    if (appBuildManifest?.pages) {
      Object.values(appBuildManifest.pages).forEach(entries => collectManifestEntries(assetUrls, entries));
    }

    if (assetUrls.size === 0) {
      return;
    }

    const urls = Array.from(assetUrls);
    const results = await Promise.allSettled(
      urls.map(url => cache.add(new Request(url, { cache: "reload" })))
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const url = urls[index];
        console.warn("Next asset precache failed for", url, result.reason);
      }
    });
  } catch (error) {
    console.warn("Unable to precache Next.js assets", error);
  }
}

function collectManifestEntries(assetUrls, entries) {
  if (!Array.isArray(entries)) {
    return;
  }
  entries.forEach(entry => {
    if (typeof entry === "string") {
      const normalized = entry.startsWith("/_next/") ? entry : `/_next/${entry}`;
      assetUrls.add(normalized);
    }
  });
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch (error) {
    console.warn("Failed to fetch", url, error);
    return null;
  }
}
