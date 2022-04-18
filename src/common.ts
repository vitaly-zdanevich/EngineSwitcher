export type search_engine_t =
    'duckduckgo' |
    'ecosia' |
    'startpage' |
    'bing' |
    'google' |
    'yandex-en' |
    'yandex-ru' |
    'goo' |
    'yahoo-us' |
    'yahoo-jp' |
    'enwiki'
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
    apiLevel: 1,
    enabledEngines: search_engine_t[],
    floatButton: {
        enabled: boolean,
    },
    extra: {
        /** Remove annoying and useless shitty notifications on top of page in Ecosia. */
        ecosiaEliminateNotifications: boolean,
    }
}

export const ALL_ENGINES: SearchEngine[] = [
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
        id: 'yandex-en',
        name: 'Yandex',
        hostname: 'yandex.com',
        queryKey: 'text',
        queryUrl: 'https://yandex.com/search/?text={}',  // https://yandex.ru/search/?text={}
        queryNeedContentScript: false,
        iconUrl: browser.runtime.getURL('img/engines/yandex-en.svg'),
    },
    {
        id: 'yandex-ru',
        name: 'Яндекс',
        hostname: 'yandex.ru',
        queryKey: 'text',
        queryUrl: 'https://yandex.ru/search/?text={}',  // https://yandex.ru/search/?text={}
        queryNeedContentScript: false,
        iconUrl: browser.runtime.getURL('img/engines/yandex-ru.svg'),
    },
    {
        id: 'yahoo-us',
        name: 'Yahoo!',
        hostname: 'search.yahoo.com',
        queryKey: 'p',
        queryUrl: 'https://search.yahoo.com/search?p={}',
        queryNeedContentScript: false,
        iconUrl: browser.runtime.getURL('img/engines/yahoo-us.svg'),
    },
    {
        id: 'yahoo-jp',
        name: 'Yahoo! JAPAN',
        hostname: 'search.yahoo.co.jp',
        queryKey: 'p',
        queryUrl: 'https://search.yahoo.co.jp/search?p={}',
        queryNeedContentScript: false,
        iconUrl: browser.runtime.getURL('img/engines/yahoo-jp.svg'),
    },
    {
        id: 'goo',
        name: 'goo',
        hostname: 'search.goo.ne.jp',
        queryKey: 'MT',
        queryUrl: 'https://search.goo.ne.jp/web.jsp?MT={}&IE=UTF-8&OE=UTF-8',
        queryNeedContentScript: false,
        iconUrl: browser.runtime.getURL('img/engines/goo.svg'),
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

export function getEngineById(engineId: search_engine_t): SearchEngine {
    return ALL_ENGINES.find(x=>x.id === engineId)!
}

export function objectAssign<N, T extends N>(target: T, newVal: N): T {
    return Object.assign(target, newVal)
}

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
    return ALL_ENGINES.some(eng => urlObj.hostname.includes(eng.hostname))
}

export function getEngineObjOfUrl (currentUrl: string): SearchEngine | undefined {
    const urlObj = new URL(currentUrl + '')
    return ALL_ENGINES.find(eng => urlObj.hostname.includes(eng.hostname))
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
        let enabledEngines: search_engine_t[] = ["duckduckgo", "ecosia", "startpage"]
        if (navigator.languages.includes('ja-JP') || navigator.languages.includes('zh-TW')) {
            enabledEngines = enabledEngines.concat(["goo", "yahoo-jp"])
        } else if (navigator.languages.some(x=>x.startsWith('ru-'))) {
            enabledEngines = enabledEngines.concat(["yandex-ru"])
        }
        if (!enabledEngines.includes("yandex-ru")) {
            enabledEngines.push("yandex-en")
        }
        if (!enabledEngines.includes("yahoo-jp")) {
            enabledEngines.push("yahoo-us")
        }
        enabledEngines = enabledEngines.concat(["bing", "google"])
        return {
            apiLevel: 1,
            enabledEngines: enabledEngines,
            floatButton: {
                enabled: true,
            },
            extra: {
                ecosiaEliminateNotifications: true,
            }
        }
    }
    /** Set data object (can be partial) into LocalStorage. */
    setDataPartially(d: Partial<MyStorage>): void {
        console.log('[SET] TO STORAGE', deepCopy(d))
        this.area.set(deepCopy(d))
    }
    setData(d: Partial<MyStorage>): void {
        this.area.set(deepCopy(d))
    }
    getData (): Promise<MyStorage> {
        return this.area.get().then((_d) => {
            const d = _d as unknown as MyStorage
            const defaultValue = storageManager.getDefaultData()
            // Too lazy to do migration ....
            if (
                !d ||
                d.enabledEngines === undefined ||
                d.floatButton === undefined ||
                d.floatButton.enabled === undefined
            ) {
                storageManager.setData(defaultValue)
                return defaultValue
            }
            return Object.assign(defaultValue, d)
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
