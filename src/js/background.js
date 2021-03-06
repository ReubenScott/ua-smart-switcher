import config from '../config'
import agents from '../agents'

const initialState = {
  enabled: false,
  os: config.ui[0].platform,
  browser: config.ui[0].browsers[0],
  agents
}

const state = {}

const onBeforeSendHeaders = ({ requestHeaders }) => {
  if (state.enabled && requestHeaders && requestHeaders.length) {
    const header = requestHeaders.find(h => h.name === 'User-Agent')
    if (header) {
      header.value = state.agents[state.os][state.browser].string
      return { requestHeaders }
    }
  }
}

const getAgents = callback => {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', 'https://uas.ztdev.com/v1/user_agents/latest', true)
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) return callback(JSON.parse(xhr.responseText).results)
      callback(null)
    }
  }
  xhr.send()
}

const updateLoop = (delay) => {
  setTimeout(() => {
    getAgents(agents => {
      if (agents && Object.keys(agents).length > 0) {
        chrome.storage.local.set({ agents })
      }
      updateLoop(3600 * 1000)
    })
  }, delay)
}

const updateBadge = () => {
  if (!state.enabled) {
    chrome.browserAction.setBadgeText({ text: 'Off' })
  } else if (state.os && state.browser) {
    const text = config.platforms[state.os].badge + '/' +
      config.browsers[state.browser].badge
    chrome.browserAction.setBadgeText({ text: text.toUpperCase() })
  }
}

const init = () => {
  updateLoop(2000)

  chrome.webRequest.onBeforeSendHeaders.addListener(
    onBeforeSendHeaders,
    { 'urls': ['http://*/*', 'https://*/*'] },
    ['requestHeaders', 'blocking']
  )

  chrome.storage.onChanged.addListener(values => {
    for (let key in values) {
      state[key] = values[key].newValue
    }
    updateBadge()
  })

  chrome.storage.local.get(null, values => {
    for (let key in values) {
      state[key] = values[key]
    }

    if (!values.browser) {
      chrome.storage.local.set(initialState)
    } else if (!values.agents) {
      chrome.storage.local.set({ agents })
    }
    updateBadge()
  })
}
init()
