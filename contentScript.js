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

  const addClasses = node => {
    if (state.hide) {
      node.classList.add('ncf-hidden')
    } else {
      node.classList.add('ncf-filtered')
      node.classList.remove('ncf-hidden');
    }
  }

  const removeClasses = node => {
    node.classList.remove('ncf-filtered')
    node.classList.remove('ncf-hidden')
  }

  const showAllFilteredCrap = () => {
    [].forEach.call(document.getElementsByClassName('w'), node => {
      removeClasses(node)
    })
  }

  const doNyxCrapFilter = (userId, phrase) => {
    if (!userId && !phrase) {
      showAllFilteredCrap()
      return 0
    }
    let i = 0;
    [].forEach.call(document.getElementsByClassName('w'), node => {
      if (
        (!userId || node.querySelector('.nick').innerText.toLowerCase().includes(userId))
        && node.querySelector('.wci').innerText.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(phrase)
      ) {
        addClasses(node)
        i++
      } else {
        removeClasses(node)
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

  const listenForOnPageFilterUpdate = () => {
    document.addEventListener('click', ev => {
      if (ev.ctrlKey && !ev.shiftKey) {
        try {
          const node = ev.target.closest('.w')
          const userId = node.querySelector('.nick').innerText.toLowerCase()
          const phrase = window.getSelection().toString().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
          setState({
            userId: userId,
            phrase: phrase,
          })
          doNyxCrapFilter(userId, phrase)
        } catch (e) {console.warn(e)}
      } else if (ev.ctrlKey && ev.shiftKey) {
        setState({
          userId: '',
          phrase: '',
        })
        doNyxCrapFilter()
      }
    })
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'doFilter':
        setState({
          userId: request.userId,
          phrase: request.phrase,
          hide: request.hide,
        })
        q = doNyxCrapFilter(request.userId, request.phrase)
        sendResponse({
          action: 'filterResult',
          quantity: q,
        })
        break
      case 'syncState':
        sendResponse(state)
        break
      case 'setBadgeText':
        updateBadgeText()
        break
    }
  })

  q = doNyxCrapFilter(state.userId, state.phrase)
  updateBadgeText()
  listenForOnPageFilterUpdate()
}())
