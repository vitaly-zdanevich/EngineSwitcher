export type search_engine_t = 'duckduckgo' | 'ecosia' | 'startpage' | 'bing' | 'google' | 'yandex' | 'enwiki'
export interface SearchEngine {
    /** duckduckgo */
    id: search_engine_t,
    /** DuckDuckGo */
    name: string,
    /**
     * This should be a finger print which is able to cover all conditions.
     * e.g. Sometimes, the hostname of StartPage will become to s7-us4.startpage.com
     * so its hostname should be startpage.com instead of www.startpage.com
     */
    hostname: string,
    /** `q` in ?q= */
    queryKey: string,
    /** https://duckduckgo.com/?q={} */
    queryUrl: string,
    /** Need to get query string via content.js */
    queryNeedContentScript: boolean,
    iconUrl: string,
}

export interface CurrentState {
    keyword: string,
    currentEngine: SearchEngine,
    nextEngine: SearchEngine,
}

export interface MyStorage {
    enabledEngines: search_engine_t[],
    floatButton: {
        enabled: boolean,
    }
}

export const ENGINES: SearchEngine[] = [
    {
        id: 'duckduckgo',
        name: 'DuckDuckGo',
        hostname: 'duckduckgo.com',
        queryKey: 'q',
        queryUrl: 'https://duckduckgo.com/?q={}',
        queryNeedContentScript: false,
        iconUrl: browser.runtime.getURL('img/engines/duckduckgo.svg'),
    },
    {
        id: 'ecosia',
        name: 'Ecosia',
        hostname: 'www.ecosia.org',
        queryKey: 'q',
        queryUrl: 'https://www.ecosia.org/search?q={}',
        queryNeedContentScript: false,
        iconUrl: browser.runtime.getURL('img/engines/ecosia.svg'),
    },
    {
        id: 'startpage',
        name: 'StartPage',
        hostname: 'startpage.com',
        queryKey: 'query',
        queryUrl: 'https://www.startpage.com/sp/search?query={}',
        queryNeedContentScript: true,
        iconUrl: browser.runtime.getURL('img/engines/startpage.svg'),
    },
    {
        id: 'bing',
        name: 'Bing',
        hostname: 'www.bing.com',
        queryKey: 'q',
        queryUrl: 'https://www.bing.com/search?q={}',
        queryNeedContentScript: false,
        iconUrl: browser.runtime.getURL('img/engines/bing.svg'),
    },
    {
        id: 'google',
        name: 'Google',
        hostname: 'www.google.com',
        queryKey: 'q',
        queryUrl: 'https://www.google.com/search?q={}',
        queryNeedContentScript: false,
        iconUrl: browser.runtime.getURL('img/engines/google.svg'),
    },
    {
        id: 'yandex',
        name: 'Yandex',
        hostname: 'www.yandex.com',
        queryKey: 'q',
        queryUrl: 'https://yandex.com/search/?text={}',  // https://yandex.ru/search/?text={}
        queryNeedContentScript: false,
        iconUrl: browser.runtime.getURL('img/engines/yandex.svg'),
    },
    {
        id: 'enwiki',
        name: 'English Wikipedia (Not recommended)',
        hostname: 'en.wikipedia.org',
        queryKey: 'search',
        queryUrl: 'https://en.wikipedia.org/w/index.php?search={}&title=Special:Search&fulltext=1&ns0=1',
        queryNeedContentScript: false,
        iconUrl: browser.runtime.getURL('img/engines/wikipedia.svg'),
    },
]


export type TypedMsg =
    { type: 'getQueryStringFromPage', data: string } |
    { type: 'getEnabledEnginesFromBg', data: SearchEngine[] }
// TODO: This is actually unnecessary... browser.storage can be access in content scripts
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage

export function deepCopy<T>(x: T): T {
    return JSON.parse(JSON.stringify(x))
}

export function parseUrlToGetQuery(engine: SearchEngine, url: string): string {
    const urlObj = new URL(url)
    const params = new URLSearchParams(urlObj.search)
    return params.get(engine.queryKey) || ''
}

export function isUrlSupported (currentUrl: string): boolean {
    const urlObj = new URL(currentUrl + '')
    return ENGINES.some(eng => urlObj.hostname.includes(eng.hostname))
}

export function getEngineObjOfUrl (currentUrl: string): SearchEngine | undefined {
    const urlObj = new URL(currentUrl + '')
    return ENGINES.find(eng => urlObj.hostname.includes(eng.hostname))
}

export function storageSetSync (d: Partial<MyStorage>): void {
    browser.storage.sync.set(d)
}

class StorageManager {
    area: browser.storage.StorageArea
    constructor() {
        // Firefox for Android (90) doesn't support `sync` area yet,
        // so write a fallback for it.
        if (browser.storage.sync) {
            this.area = browser.storage.sync
        } else {
            this.area = browser.storage.local
        }
    }
    getDefaultData(): MyStorage {
        return {
            enabledEngines: ["duckduckgo", "ecosia", "startpage", "bing", "google"],
            floatButton: {
                enabled: true,
            },
        }
    }
    setData(d: Partial<MyStorage>): void {
        this.area.set(deepCopy(d))
    }
    getData (): Promise<MyStorage> {
        return this.area.get().then((_d) => {
            const d = _d as unknown as MyStorage
            // Too lazy to do migration ....
            if (
                d.enabledEngines === undefined ||
                d.floatButton === undefined ||
                d.floatButton.enabled === undefined
            ) {
                const defaultValue = storageManager.getDefaultData()
                storageManager.setData(defaultValue)
                return defaultValue
            }
            return d
        }).catch((err) => {
            console.error('Error when getting settings from browser.storage:', err)
            return storageManager.getDefaultData()
        })
    }
    onDataChanged(cb: (changes: browser.storage.ChangeDict) => void) {
        browser.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'sync' || areaName === 'local') {
                cb(changes)
            }
        })
    }
}
export const storageManager = new StorageManager()
