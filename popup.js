let state = {}
try {
  state = JSON.parse(window.localStorage.getItem('net.b3da.ncf-state')) || {}
} catch (e) {
  state = {}
}
const setState = newState => {
  state = {...state, ...newState}
  window.localStorage.setItem('net.b3da.ncf-state', JSON.stringify(state))
}

let inputUserId, inputPhrase, inputHide, inputFixDiReplies, inputFixDiOther

const getActiveTab = () => {
  return new Promise(resolve => {
    chrome.tabs.query({
      active: true,
      currentWindow: true,
    }, tabs => {
      resolve(tabs[0])
    })
  })
}

const doFilter = () => {
  getActiveTab()
    .then(tab => {
      if (tab.url.includes('nyx.cz')) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'doFilter',
          userId: state.userId ? state.userId.toLowerCase() : '',
          phrase: state.phrase ? state.phrase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '',
          hide: state.hide,
          fixDiReplies: state.fixDiReplies,
          fixDiOther: state.fixDiOther,
        }, response => {
          if (response && response.action === 'filterResult') {
            chrome.extension.sendMessage({
              action: 'updateBadgeText',
              text: response.quantity ? response.quantity.toString() : ''
            })
            // resultEl.innerText = `Filtruji ${response.quantity} post${response.quantity > 4 ? 'ů' : response.quantity > 1 ? 'y' : ''}`
          }
        })
      } else {
        // resultEl.innerText = 'Tady to asi nebude fungovat ;)'
      }
    })
    .catch(e => console.warn('error: ', e))
}

const listenForBtnUpdateOnClick = () => {
  document.getElementById('btnUpdate').addEventListener('click', () => {
    setState({
      userId: inputUserId.value,
      phrase: inputPhrase.value,
      hide: inputHide.checked,
      fixDiReplies: inputFixDiReplies.checked,
      fixDiOther: inputFixDiOther.checked,
    })
    doFilter()
  })
}

const checkForContentScriptStateUpdate = () => {
  return new Promise(resolve => {
    getActiveTab()
      .then(tab => {
        if (tab.url.includes('nyx.cz')) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'syncState',
          }, response => {
            if (response) {
              setState(response)
            }
            resolve(response)
          })
        }
      })
      .catch(e => console.warn('error: ', e))
  })
}

const initCrapFilter = () => {
  checkForContentScriptStateUpdate().then(() => {
    inputUserId.value = state.userId
    inputPhrase.value = state.phrase
    inputHide.checked = !!state.hide
    inputFixDiReplies.checked = !!state.fixDiReplies
    inputFixDiOther.checked = !!state.fixDiOther
    listenForBtnUpdateOnClick()
    doFilter()
  })
}

document.addEventListener('DOMContentLoaded', () => {
  inputUserId = document.getElementById('inputUserId')
  inputPhrase = document.getElementById('inputPhrase')
  inputHide = document.getElementById('inputHide')
  inputFixDiReplies = document.getElementById('inputFixDiReplies')
  inputFixDiOther = document.getElementById('inputFixDiOther')
  initCrapFilter();
})
