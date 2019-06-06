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
      const nickEl = node.querySelector('.nick')
      if (
        (!userId || (nickEl && nickEl.innerText.toLowerCase().includes(userId)))
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

  const injectDiRepliesFixer = () => {
    if (!document.getElementById('diFixBase')) {
      const s = document.createElement('script')
      s.id = 'diFixBase'
      s.innerHTML = `
        const origXhrOpenProto = XMLHttpRequest.prototype.open
        window.interceptXhr = (urlPattern, onResolve) => {
          XMLHttpRequest.prototype.open = function() {
            const uri = arguments[1]
            uri.match(urlPattern) && this.addEventListener('readystatechange', function(event) {
              if (this.readyState === 4) {
                const response = onResolve(uri, event.target.responseText)
                Object.defineProperty(this, 'response', {writable: true})
                Object.defineProperty(this, 'responseText', {writable: true})
                this.response = this.responseText = response
              }
            })
            return origXhrOpenProto.apply(this, arguments)
          }
        }
      `;
      (document.head || document.documentElement).appendChild(s)
    }
    const os = document.getElementById('diFix')
    if (os) {
      os.remove()
    }
    const s = document.createElement('script')
    s.id = 'diFix'
    if (state.fixDiReplies) {
      s.innerHTML = `
        interceptXhr(/ol_reply.php/, (uri, response) => {
          if (response.includes('odkazovaný příspěvek již není v databázi') || response.includes("linked writeup wasn't found in our database")) {
            fetch(uri, {credentials: 'omit'})
              .then(res => res.text())
              .then(msg => {
                const responseEl = document.getElementById('rs')
                if (responseEl) {responseEl.innerHTML = msg}
              })
            return '<div>DI? try again as anon..</div>'
          }
          return response
        })
      `
      // todo: find way to fetch writeups
    } else {
      s.innerHTML = `
        interceptXhr(/ol_reply.php/, (uri, response) => {
          return response
        })
      `
    }
    (document.head || document.documentElement).appendChild(s)
  }

  const fixDiByRefetchingList = () => {
    // todo refactor
    if (state.fixDiOther && !!document.getElementById('topic_id')) {
      const topicId = document.getElementById('topic_id').value
      const existingRows = document.getElementsByClassName('w')
      const minId = existingRows[existingRows.length - 1].id.substr(3)
      const maxId = existingRows[0].id.substr(3)
      const currentPostCount = existingRows.length
      const body = new FormData()
      body.append('count', `${currentPostCount * 2}`)
      body.append('min_id', minId)
      body.append('max_id', maxId)
      // body.append('nav', '>') // dafuq todo pagination
      fetch(`https://www.nyx.cz/index.php?l=topic;id=${topicId}`, {
        method: 'post',
        credentials: 'omit',
        body: body
      }).then(res => res.text())
        .then(htmlStr => {
          const helperEl = document.createElement('div')
          helperEl.innerHTML = htmlStr
          const rows = [];
          [].forEach.call(helperEl.getElementsByClassName('w'), row => {
            if (!document.getElementById(row.id)) {
              rows.push(row)
            }
          })
          const updateSchema = []
          let lastRowId = maxId;
          [].forEach.call(existingRows, existingRow => {
            const rowsBefore = rows
              .filter(r => (Number(r.id.substr(3)) > Number(existingRow.id.substr(3)) && existingRow.id.substr(3) === lastRowId)
                || (Number(r.id.substr(3)) > Number(existingRow.id.substr(3)) && Number(r.id.substr(3)) < Number(lastRowId))
              )
            updateSchema.push({existingRow, rowsBefore})
            lastRowId = existingRow.id.substr(3)
          })
          updateSchema.forEach(row => {
            row.rowsBefore.forEach(r => {
              row.existingRow.parentElement.insertBefore(r, row.existingRow)
            })
          })
        })
    }
  }

  const updateSideMenu = () => {
    const liHistoryEl = document.querySelector('li.i9.history')
    if (state.menuHistory && !liHistoryEl) {
      const sideMenuEl = document.querySelector('ul.m.l1')
      if (sideMenuEl) {
        const li = document.createElement('li')
        li.className = 'i9 history'
        li.innerHTML = `<a href="?l=book;l2=2"><span class="icon-entypo icon-bookmarks"></span><span class="text">historie</span></a></li>`
        sideMenuEl.insertBefore(li, sideMenuEl.querySelector('li.last'))
      }
    } else if (!state.menuHistory && !!liHistoryEl) {
      liHistoryEl.remove()
    }
  }

  const translateImageUrlsToTags = () => {
    const msgBox = document.getElementById('message_box')
    if (!!msgBox) {
      msgBox.addEventListener('keyup', () => {
        const regex = /(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|jpeg|gif|png) /g;
        const str = msgBox.value
        const matches = str.match(regex)
        let result = ''
        if (matches && matches.length > 0) {
          matches.forEach(m => {
            result = str.replace(m, ` <img src="${m.trim()}" width="50%">`)
          })
        } else {
          result = str
        }
        msgBox.value = result
      })
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'doFilter':
        const oldFixDiOther = state.fixDiOther
        setState({
          userId: request.userId,
          phrase: request.phrase,
          hide: request.hide,
          fixDiReplies: request.fixDiReplies,
          fixDiOther: request.fixDiOther,
          menuHistory: request.menuHistory,
        })
        updateSideMenu()
        q = doNyxCrapFilter(request.userId, request.phrase)
        injectDiRepliesFixer()
        if (oldFixDiOther && !state.fixDiOther) {
          window.location.reload()
        }
        fixDiByRefetchingList()
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
  injectDiRepliesFixer()
  fixDiByRefetchingList()
  updateSideMenu()
  translateImageUrlsToTags()
}())
