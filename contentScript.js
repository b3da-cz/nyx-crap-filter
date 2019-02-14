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

  // DI fixer, have to be injected
  setTimeout(() => {
    const s = document.createElement('script')
    s.innerHTML = `
    const origXhrOpenProto = XMLHttpRequest.prototype.open
    const interceptXhr = (urlPattern, onResolve) => {
      XMLHttpRequest.prototype.open = function() {
        const uri = arguments[1]
        uri.match(urlPattern) && this.addEventListener('readystatechange', function(event) {
          if (this.readyState === 4) {
            const response = onResolve(uri, event.target.responseText)
            Object.defineProperty(this, 'response',     {writable: true})
            Object.defineProperty(this, 'responseText', {writable: true})
            this.response = this.responseText = response
          }
        })
        return origXhrOpenProto.apply(this, arguments)
      }
    }
    interceptXhr(/ol_reply.php/, (uri, response) => {
      if (response.includes('odkazovaný příspěvek již není v databázi')) {
        fetch(uri, {credentials: 'omit'})
          .then(res => res.text())
          .then(msg => {
            const responseEl = document.getElementById('rs')
            if (responseEl) {responseEl.innerHTML = msg}
          })
        return 'DI? try again as anon..'
      }
      return response
    })
    `;
    (document.head || document.documentElement).appendChild(s)
  })
}())
