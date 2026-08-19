import type { Map as MapboxMap } from "mapbox-gl";
import {
  applyMapboxBasemapLanguage,
  clearMapboxBasemapLocaleCache,
  isMapLanguageSynced,
  mapboxLanguageCode,
  syncMapboxBasemapLocale,
} from "@/lib/mapbox-language";

type MockMap = MapboxMap & {
  __language: string | null;
  __styleLoaded: boolean;
  __once: Map<string, Array<() => void>>;
  setLanguage: (language: string) => MockMap;
  getLanguage: () => string | null;
};

function createMockMap(language: string | null = null): MockMap {
  const onceHandlers = new Map<string, Array<() => void>>();
  const map = {
    __language: language,
    __styleLoaded: true,
    __once: onceHandlers,
    isStyleLoaded: () => map.__styleLoaded,
    getStyle: () => ({ version: 8, sources: {}, layers: [] }),
    setLanguage(lang: string) {
      map.__language = lang;
      return map;
    },
    getLanguage: () => map.__language,
    once(event: string, handler: () => void) {
      const list = onceHandlers.get(event) ?? [];
      list.push(handler);
      onceHandlers.set(event, list);
    },
  };
  return map as unknown as MockMap;
}

function asMap(mock: MockMap): MapboxMap {
  return mock as unknown as MapboxMap;
}

describe("mapboxLanguageCode", () => {
  it("maps fi locale to fi", () => {
    expect(mapboxLanguageCode("fi")).toBe("fi");
  });

  it("defaults other locales to en", () => {
    expect(mapboxLanguageCode("en")).toBe("en");
    expect(mapboxLanguageCode("de")).toBe("en");
  });
});

describe("applyMapboxBasemapLanguage", () => {
  it("calls map.setLanguage with fi", () => {
    const mock = createMockMap("en");
    const ok = applyMapboxBasemapLanguage(asMap(mock), "fi");
    expect(ok).toBe(true);
    expect(mock.__language).toBe("fi");
  });

  it("skips setLanguage when map already matches locale", () => {
    const mock = createMockMap("fi");
    const setLanguage = jest.spyOn(mock, "setLanguage");
    const ok = applyMapboxBasemapLanguage(asMap(mock), "fi");
    expect(ok).toBe(true);
    expect(setLanguage).not.toHaveBeenCalled();
    expect(mock.__language).toBe("fi");
  });
});

describe("isMapLanguageSynced", () => {
  it("returns true when map language matches locale", () => {
    const mock = createMockMap("fi");
    expect(isMapLanguageSynced(asMap(mock), "fi")).toBe(true);
    expect(isMapLanguageSynced(asMap(mock), "en")).toBe(false);
  });
});

describe("syncMapboxBasemapLocale", () => {
  const basemap = "mapbox://styles/mapbox/light-v11";

  it("sets language and calls onReady", () => {
    const mock = createMockMap(null);
    const onReady = jest.fn();

    syncMapboxBasemapLocale({
      map: asMap(mock),
      locale: "fi",
      basemapStyle: basemap,
      onReady,
    });

    expect(mock.__language).toBe("fi");
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("uses cache when language already applied", () => {
    const mock = createMockMap("fi");
    const onReady = jest.fn();
    const setLanguage = jest.spyOn(mock, "setLanguage");

    syncMapboxBasemapLocale({
      map: asMap(mock),
      locale: "fi",
      basemapStyle: basemap,
      onReady,
    });
    onReady.mockClear();
    setLanguage.mockClear();

    syncMapboxBasemapLocale({
      map: asMap(mock),
      locale: "fi",
      basemapStyle: basemap,
      onReady,
    });

    expect(setLanguage).not.toHaveBeenCalled();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("waits for style.load when style is not ready", () => {
    const mock = createMockMap(null);
    mock.__styleLoaded = false;
    const onReady = jest.fn();

    syncMapboxBasemapLocale({
      map: asMap(mock),
      locale: "fi",
      basemapStyle: basemap,
      onReady,
    });
    expect(onReady).not.toHaveBeenCalled();

    mock.__styleLoaded = true;
    const handlers = mock.__once.get("style.load") ?? [];
    handlers.forEach((handler) => handler());

    expect(mock.__language).toBe("fi");
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});

describe("clearMapboxBasemapLocaleCache", () => {
  it("allows switching locale after cache clear", () => {
    const mock = createMockMap("en");
    const basemap = "mapbox://styles/mapbox/dark-v11";

    syncMapboxBasemapLocale({
      map: asMap(mock),
      locale: "en",
      basemapStyle: basemap,
      onReady: () => {},
    });

    clearMapboxBasemapLocaleCache(asMap(mock));
    syncMapboxBasemapLocale({
      map: asMap(mock),
      locale: "fi",
      basemapStyle: basemap,
      onReady: () => {},
    });

    expect(mock.__language).toBe("fi");
  });
});
