chrome.runtime.onStartup.addListener(async () => {
    cleanBrowserHistory()
})

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    const url = removeInfo.url
    if (!url) {
        console.log(`Tab ${tabId} closed. Starting cleaning process...`);
        await removeCookies()
    }
})

/**
 * Checks if a domain is whitelisted. The whitelist is an array of strings where
 * each string is either a domain name (e.g. "example.com") or a domain name
 * prefixed with "*." (e.g. "*.example.com"). The method returns true if the
 * domain or any of its subdomains are in the whitelist.
 * @param {string} domain - the domain to check
 * @param {string[]} whitelist - the whitelist to check against
 * @returns {boolean} true if the domain is whitelisted
 */
function hasEntryInWhitelist(domain, whitelist) {
    return whitelist.some(allowed => {
        allowed = allowed.replace(/^\*\./, '')
        return domain === allowed || domain.endsWith('.', allowed)
    })
}

/**
 * Construct a URL for a cookie.
 * @param {string} domain - the domain of the cookie
 * @param {string} [path] - the path of the cookie (default: "/")
 * @param {boolean} [isSecure] - whether the cookie is secure (default: false)
 * @returns {string} the URL for the cookie
 */
function constructCookieUrl(domain, path, isSecure) {
    const protocol = isSecure ? "https://" : "http://";
    const cookiePath = path || "/";
    return `${protocol}${domain}${cookiePath}`;
}

/**
 * Cleans the browser history and various types of stored data.
 * This function removes browsing history, cache, downloads, file systems,
 * form data, indexedDB, local storage, passwords, and webSQL data from the browser.
 * The removal is done from the beginning of time (since 0).
 */
async function cleanBrowserHistory() {
    chrome.browsingData.remove({ 
        "since": 0 
        }, {
        "history": true,
        "appcache": true,
        "cache": true,
        "cacheStorage": true,
        "downloads": true,
        "fileSystems": true,
        "formData": true,
        "history": true,
        "indexedDB": true,
        "localStorage": true,
        "passwords": true,
        "webSQL": true
    })
}

/**
 * Deletes all cookies, localStorage, indexedDB and cacheStorage from the given domain.
 * @param {string} domain - the domain to remove the data from
 */
function removeCookiesFromDomain(domain) {
    chrome.browsingData.remove({
        "origins": [`http://${domain}`, `https://${domain}`]
    }, {
        "cookies": true,
        "localStorage": true,
        "indexedDB": true,
        "cacheStorage": true,
    })
}

/**
 * Deletes all cookies, localStorage, indexedDB and cacheStorage from all domains
 * not in the whitelist. The whitelist is an array of strings where each string is
 * either a domain name (e.g. "example.com") or a domain name prefixed with "*."
 * (e.g. "*.example.com"). The method returns a Promise that resolves once all
 * cookies have been removed.
 */
async function removeCookies() {
    let { whitelist } = await chrome.storage.local.get('whitelist')

    chrome.cookies.getAll({}, (cookies) => {
        cookies.forEach((cookie) => {
            const domain = cookie.domain.replace(/^\./, '')
            if (!hasEntryInWhitelist(domain, whitelist)) {
                const url = constructCookieUrl(domain, cookie.path, cookie.secure)
                chrome.cookies.remove({ url, name: cookie.name }, (details) => {
                    if (chrome.runtime.lastError) {
                        console.error(`Error while removing Cookie: ${chrome.runtime.lastError}`);
                    } else {
                        console.log(`Cookie deleted: ${cookie.name} (${url})`); 
                    }
                })
                removeCookiesFromDomain(domain)
            }
        })
    })
}
