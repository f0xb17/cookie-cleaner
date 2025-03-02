const DEFAULT_WHITELIST = ["example.com", "google.com"];

/**
 * Activate alarm to automatically delete browsing data every 30 seconds.
 */

/** chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("cleanBrowsingData", { periodInMinutes: 0.5 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "cleanBrowsingData") {
        await cleanBrowsingData();
    }
}); */

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    const url = removeInfo.url;
    if (!url) {
        await cleanBrowsingData();
        return;
    }

    const domain = new URL(url).hostname.replace(/^\./, "");

    if (!isDomainWhitelisted(domain, DEFAULT_WHITELIST)) {
        console.log(`Tab ${tabId} closed. Starting cleaning process...`);
        await cleanBrowsingData();
    }
});

chrome.windows.onRemoved.addListener(async (windowId) => {
    const windows = await chrome.windows.getAll({ populate: true });
    if (windows.length === 0) {
        console.log("All Windows closed, remove History...");
        await cleanHistoryData();
        await cleanBrowsingData();
    }
});

async function cleanBrowsingData() {
    let { whitelist } = await chrome.storage.local.get("whitelist");
    whitelist = whitelist || DEFAULT_WHITELIST;

    chrome.cookies.getAll({}, (cookies) => {
        cookies.forEach((cookie) => {
            const domain = cookie.domain.replace(/^\./, "");
            if (!isDomainWhitelisted(domain, whitelist)) {
                const url = constructCookieUrl(domain, cookie.path, cookie.secure);
                chrome.cookies.remove({ url, name: cookie.name }, (details) => {
                    if (chrome.runtime.lastError) {
                        console.error(`Error while removing Cookie: ${chrome.runtime.lastError}`);
                    } else {
                        console.log(`Cookie deleted: ${cookie.name} (${url})`);
                    }
                });
            }
        });
    });

    chrome.browsingData.remove({ since: 0 }, {
        cache: true,
        downloads: true,
        fileSystems: true,
        formData: true,
        indexedDB: true,
        localStorage: true,
        serviceWorkers: true,
        webSQL: true
    });
}

function isDomainWhitelisted(domain, whitelist) {
    return whitelist.some(allowed => {
        allowed = allowed.replace(/^\*\./, "");
        return domain === allowed || domain.endsWith("." + allowed);
    });
}

function constructCookieUrl(domain, path, isSecure) {
    const protocol = isSecure ? "https://" : "http://";
    const cookiePath = path || "/";
    return `${protocol}${domain}${cookiePath}`;
}

async function cleanHistoryData() {
    chrome.browsingData.remove({ since: 0 }, {
        history: true
    });
    console.log("History removed!");
}
