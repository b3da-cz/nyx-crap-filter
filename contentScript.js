(function () {
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

  const showAllFilteredCrap = () => {
    [].forEach.call(document.getElementsByClassName('w'), node => {
      node.classList.remove('ncf-filtered')
      node.classList.remove('ncf-hidden')
    })
  }

  const doNyxCrapFilter = (userId, phrase, hide) => {
    if (!userId && !phrase) {
      showAllFilteredCrap()
      return 0
    }
    const nodes = document.getElementsByClassName('w')
    let i = 0;
    [].forEach.call(nodes, node => {
      if (
        (!userId || node.querySelector('.nick').innerText.toLowerCase().includes(userId))
        && node.querySelector('.wci').innerText.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(phrase)
      ) {
        if (hide) {
          node.classList.add('ncf-hidden')
        } else {
          node.classList.add('ncf-filtered')
          node.classList.remove('ncf-hidden');
        }
        i++
      } else {
        node.classList.remove('ncf-hidden')
        node.classList.remove('ncf-filtered')
      }
    })
    return i
  }

  let q = 0

  const updateBadgeText = () => {
    chrome.extension.sendMessage({
      action: 'updateBadgeText',
      text: q.toString()
    })
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'doFilter') {
      setState({
        userId: request.userId,
        phrase: request.phrase,
        hide: request.hide,
      })
      q = doNyxCrapFilter(request.userId, request.phrase, request.hide)
      sendResponse({
        action: 'filterResult',
        quantity: q,
      })
    }
    if (request.action === 'setBadgeText') {
      updateBadgeText()
    }
  })

  q = doNyxCrapFilter(state.userId, state.phrase, state.hide)
  updateBadgeText()
}())
