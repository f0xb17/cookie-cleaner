/**
 * Get the whitelist from local storage and returns it as a Promise.
 * @returns {Promise<string[]>} A promise, which resolves to the whitelist array.
 */
async function getWhitelist() {
  return new Promise((resolve) => {
    chrome.storage.local.get('whitelist', (result) => {
      resolve(result.whitelist || [])
    })
  })
}

/**
 * Stores the given whitelist in local storage.
 * @param {string[]} whitelist The array of domains to store.
 * @returns {Promise<void>} A promise that resolves when the operation is complete successfully.
 */
async function saveWhitelist(whitelist) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ whitelist: whitelist }, () => {
      resolve()
    })
  })
}

/**
 * Adds a single domain to the whitelist, if not already present.
 * @param {string} domain The domain to add.
 * @returns {Promise<boolean>} True if the domain was added, false if it was already present.
 */
async function addSingleDomainToWhitelist(domain) {
  if (!domain) return false
  let whitelist = await getWhitelist()
  if (!whitelist.includes(domain)) {
    whitelist.push(domain)
    await saveWhitelist(whitelist)
    return true
  }
  return false
}

/**
 * Removes a single domain from the whitelist, if present.
 * @param {string} domain The domain to remove.
 * @returns {Promise<boolean>} True if the domain was removed, false if it was not present.
 */
async function removeSingleDomainFromWhitelist(domain) {
  if (!domain) return false
  let whitelist = await getWhitelist()
  const initialLength = whitelist.length
  whitelist = whitelist.filter((item) => item !== domain)
  if (whitelist.length < initialLength) {
    await saveWhitelist(whitelist)
    return true
  }
  return false
}

/**
 * Adds a single domain and its wildcard variant to the whitelist.
 * @param {string} domain The domain to add.
 * @param {string} wildcardDomain The wildcard variant of the domain.
 */
async function addDomainAndWildcard(domain, wildcardDomain) {
  await addSingleDomainToWhitelist(domain)
  await addSingleDomainToWhitelist(wildcardDomain)
}

/**
 * Removes a single domain and its wildcard variant from the whitelist.
 * @param {string} domain The domain to remove.
 * @param {string} wildcardDomain The wildcard variant of the domain.
 */
async function removeDomainAndWildcard(domain, wildcardDomain) {
  await removeSingleDomainFromWhitelist(domain)
  await removeSingleDomainFromWhitelist(wildcardDomain)
}

// This method updates the display of the whitelist.
async function updateWhitelistDisplay() {
  const whitelist = await getWhitelist()
  const whitelistDisplayList = document.getElementById('whitelistDisplayList')
  whitelistDisplayList.innerHTML = ''

  if (whitelist.length === 0) {
    const listItem = document.createElement('li')
    listItem.textContent = 'No domains on whitelist yet.'
    listItem.style.fontStyle = 'italic'
    listItem.style.color = '#888'
    whitelistDisplayList.appendChild(listItem)
  } else {
    whitelist.forEach((domain) => {
      const listItem = document.createElement('li')
      listItem.textContent = domain

      const removeButton = document.createElement('button')
      removeButton.textContent = 'Remove'
      removeButton.className = 'remove-item-btn'
      removeButton.addEventListener('click', async () => {
        let baseDomain = domain.replace(/^\*\./, '')
        const wildcardForm = `*.${baseDomain}`

        await removeDomainAndWildcard(baseDomain, wildcardForm)
        await updateUI()
      })

      listItem.appendChild(removeButton)
      whitelistDisplayList.appendChild(listItem)
    })
  }
}

/**
 * Updates the UI for the current domain buttons.
 * @param {string} currentTabDomainWithoutWww The domain of the current tab without the 'www.' prefix.
 * @param {string} currentTabDomainWithWildcard The wildecard domain of the current tab.
 */
async function updateCurrentDomainButtons(currentTabDomainWithoutWww, currentTabDomainWithWildcard) {
  const whitelist = await getWhitelist()
  const domainDisplayElement = document.getElementById('domainWithoutWww')
  const toggleButton = document.getElementById('toggleDomainWithoutWwwBtn')

  domainDisplayElement.textContent = currentTabDomainWithoutWww || 'N/A'

  if (!currentTabDomainWithoutWww) {
    toggleButton.style.display = 'none'
    return
  }

  const isWithoutWwwWhitelisted = whitelist.includes(currentTabDomainWithoutWww)
  const isWithWildcardWhitelisted = whitelist.includes(currentTabDomainWithWildcard)
  const isWhitelisted = isWithoutWwwWhitelisted || isWithWildcardWhitelisted

  if (isWhitelisted) {
    toggleButton.textContent = 'Remove'
    toggleButton.className = 'remove-btn'
    toggleButton.onclick = async () => {
      await removeDomainAndWildcard(currentTabDomainWithoutWww, currentTabDomainWithWildcard)
      await updateUI()
    }
  } else {
    toggleButton.textContent = 'Add'
    toggleButton.className = 'add-btn'
    toggleButton.onclick = async () => {
      await addDomainAndWildcard(currentTabDomainWithoutWww, currentTabDomainWithWildcard)
      await updateUI()
    }
  }
  toggleButton.style.display = 'block'
}

/**
 * Extracts the domain and wildcard domain from a given URL.
 * @param {string} url The url to extract the domains from.
 * @returns {{domainWithoutWww: string, domainWithWildcard: string}} The extracted domains.
 */
function extractDomainsFromUrl(url) {
  let domainWithoutWww = ''
  let domainWithWildcard = ''

  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    try {
      const domain = new URL(url).hostname
      domainWithoutWww = domain.replace(/^www\./, '')
      domainWithWildcard = `*.${domainWithoutWww}`
    } catch (e) {
      console.error('Invalid URL during domain extraction:', url, e)
    }
  }
  return { domainWithoutWww, domainWithWildcard }
}

async function updateUI() {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const currentTabUrl = tabs[0]?.url
    const { domainWithoutWww, domainWithWildcard } = extractDomainsFromUrl(currentTabUrl)

    await updateCurrentDomainButtons(domainWithoutWww, domainWithWildcard)
    await updateWhitelistDisplay()
  })
}

document.getElementById('clearWhitelistBtn').addEventListener('click', async () => {
  await saveWhitelist([])
  await updateUI()
})

document.addEventListener('DOMContentLoaded', updateUI)
