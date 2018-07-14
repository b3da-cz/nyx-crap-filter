chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateBadgeText') {
    chrome.browserAction.setBadgeText({
      text: request.text,
    })
    chrome.browserAction.setBadgeBackgroundColor({
      color: 'darkred',
    })
  }
})

// chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
//   if (changeInfo.status === 'complete') {
//     chrome.browserAction.setBadgeText({
//       text: '',
//     })
//   }
// })

chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    chrome.browserAction.setBadgeText({
      text: '',
    })
    if (tab.url.includes('nyx.cz')) {
      chrome.browserAction.enable(tab.id)
      chrome.tabs.sendMessage(tab.id, {
        action: 'setBadgeText',
      })
    } else {
      chrome.browserAction.disable(tab.id)
    }
  })
})
