document.getElementById('addDomainBtn').addEventListener('click', async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTabUrl = tabs[0].url;

      if (currentTabUrl) {
          const domain = new URL(currentTabUrl).hostname;

          const domainWithoutWWW = domain.replace(/^www\./, '');
          const domainWithWildcard = `*.${domainWithoutWWW}`;

          chrome.storage.local.get('whitelist', (result) => {
              let whitelist = result.whitelist || [];

              if (!whitelist.includes(domainWithoutWWW)) {
                  whitelist.push(domainWithoutWWW);
              }
              if (!whitelist.includes(domainWithWildcard)) {
                  whitelist.push(domainWithWildcard);
              }

              chrome.storage.local.set({ whitelist: whitelist }, () => {
                  updateWhitelistTextarea(whitelist);

                  document.getElementById('statusMsg').innerText = `Domain ${domainWithoutWWW} and ${domainWithWildcard} added to Whitelist!`;
              });
          });
      }
  });
});

document.getElementById('clearWhitelistBtn').addEventListener('click', () => {
  chrome.storage.local.remove('whitelist', () => {
      updateWhitelistTextarea([]);
      document.getElementById('statusMsg').innerText = "Whitelist wiped entirely!";
  });
});

function updateWhitelistTextarea(whitelist) {
  const textarea = document.getElementById('whitelistTextarea');
  textarea.value = whitelist.join('\n');
}

chrome.storage.local.get('whitelist', (result) => {
  let whitelist = result.whitelist || [];
  updateWhitelistTextarea(whitelist);
});
