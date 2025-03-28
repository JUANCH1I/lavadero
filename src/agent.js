import * as sdk from '@d-id/client-sdk'

// Configura tus credenciales (reemplaza los valores con los reales)
let agentId = 'agt_Zb-YaNDz' // Reemplaza con tu Agent ID
let auth = {
  type: 'key',
  clientKey:
    'Z29vZ2xlLW9hdXRoMnwxMDMzNTAwMzA0NDI2NjQwNDM3MDk6RlR2YjBzYmZZQmZsYkxIaVhrY3ox',
}

// HTML Variables declaration
let videoElement = document.querySelector('#videoElement')
let textArea = document.querySelector('#textArea')
let langSelect = document.querySelector('#langSelect')
let speechButton = document.querySelector('#speechButton')
let answers = document.querySelector('#answers')
let connectionLabel = document.querySelector('#connectionLabel')
let reconnectButton = document.querySelector('#reconnectButton')
let srcObject

// 4. Define the SDK callbacks functions in this object
const callbacks = {
  // Link the HTML Video element with the WebRTC Stream Object (Video & Audio tracks)
  onSrcObjectReady(value) {
    console.log('onSrcObjectReady():', value)
    videoElement.srcObject = value
    srcObject = value
    return srcObject
  },

  // Connection States callback method
  onConnectionStateChange(state) {
    console.log('onConnectionStateChange(): ', state)

    if (state == 'connecting') {
      document.querySelector('#container').style.display = 'flex'
      document.querySelector('#hidden').style.display = 'none'
    } else if (state == 'connected') {
      // Setting the 'Enter' Key to Send a message
      textArea.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          chat()
        }
      })
      langSelect.removeAttribute('disabled')
      speechButton.removeAttribute('disabled')
    } else if (state == 'disconnected' || state == 'closed') {
      textArea.removeEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          chat()
        }
      })
      document.querySelector(
        '#hidden_h2'
      ).innerHTML = `${agentManager.agent.preview_name} Disconnected`
      document.querySelector('#hidden').style.display = 'block'
      langSelect.setAttribute('disabled', true)
      speechButton.setAttribute('disabled', true)
    }
  },

  // Switching between the idle and streamed videos
  onVideoStateChange(state) {
    console.log('onVideoStateChange(): ', state)
    if (state == 'STOP') {
      videoElement.muted = true
      videoElement.srcObject = undefined
      videoElement.src = agentManager.agent.presenter.idle_video
    } else {
      videoElement.muted = false
      videoElement.src = ''
      videoElement.srcObject = srcObject
    }
  },

  // New messages callback method
  onNewMessage(messages, type) {
    console.log('onNewMessage():', messages, type)
    // We want to show only the last message from the entire 'messages' array
    let lastIndex = messages.length - 1
    let msg = messages[lastIndex]

    // Show Rating buttons only for the Agent's (assistant) full answers
    if (msg.role == 'assistant' && messages.length != 1) {
      if (type == 'answer') {
        answers.innerHTML = `${timeDisplay()} - ${msg.content}`

        document
          .getElementById(`${msg.id}_plus`)
          .addEventListener('click', () => rate(msg.id, 1))
        document
          .getElementById(`${msg.id}_minus`)
          .addEventListener('click', () => rate(msg.id, -1))
      }
    } else {
      answers.innerHTML += `${timeDisplay()} - [${msg.role}] : ${
        msg.content
      }  <br>`
    }

    // Auto-scroll to the last message
    answers.scrollTop = answers.scrollHeight
  },

  // Error handling
  onError(error, errorData) {
    console.log('Error:', error, 'Error Data', errorData)
  },
}

// 5. Define the Stream options object (Optional)
let streamOptions = { compatibilityMode: 'auto', streamWarmup: true }

// agentManager.chat() -> Agents API (communicating with your created Agent and its knowledge -> Streams back the D-ID's LLM response)
function chat() {
  let val = textArea.value
  if (val !== '') {
    let chat = agentManager.chat(val)
    console.log('agentManager.chat()')
    textArea.value = ''
  }
}

// agentManager.rate() -> Rating the Agent's answers - for future Agents Analytics and Insights feature
function rate(messageID, score) {
  let rate = agentManager.rate(messageID, score)
  console.log(`Message ID: ${messageID} Rated:${score}\n`, 'Result', rate)
}

// agentManager.reconnect() -> Reconnect the Agent to a new WebRTC session
function reconnect() {
  console.log('clicked')
  let reconnect = agentManager.reconnect()
  console.log('agentManager.reconnect()', reconnect)
}

// 'cleaner' time display in (HH:MM:SS)
function timeDisplay() {
  const currentTime = new Date()
  const hours = currentTime.getHours().toString().padStart(2, '0')
  const minutes = currentTime.getMinutes().toString().padStart(2, '0')
  const seconds = currentTime.getSeconds().toString().padStart(2, '0')
  const formattedTime = `${hours}:${minutes}:${seconds}`
  return formattedTime
}

// Reminder to place Agent ID and Client Key at the top of this file
if (agentId == '' || auth.clientKey == '') {
  console.error('Missing agentID and auth.clientKey variables')
  console.log(
    `Missing agentID and auth.clientKey variables:\n\nFetch the data-client-key and the data-agent-id as explained on the Agents SDK Overview Page:\nhttps://docs.d-id.com/reference/agents-sdk-overview\n\nPaste these into their respective variables at the top of the main.js file and save.`
  )
}

// Event Listeners for Agent's built-in methods
reconnectButton.addEventListener('click', () => reconnect())
//speechButton.addEventListener('click', () => toggleStartStop())

// Focus on input and button disabling when loading
window.addEventListener('load', () => {
  textArea.focus(), langSelect.setAttribute('disabled', true)
  speechButton.setAttribute('disabled', true)
})

// *** Finally ***
// 6. Create the 'agentManager' instance with the values created in previous steps
let agentManager = await sdk.createAgentManager(agentId, {
  auth,
  callbacks,
  streamOptions,
})

console.log('sdk.createAgentManager()', agentManager)

// Setting the thumbnail as the video background image to avoid "flickering".
// Set one of the following (depends on the Avatar's type): agentManager.agent.presenter.source_url / agentManager.agent.presenter.thumbnail
document.querySelector(
  '#videoElement'
).style.backgroundImage = `url(${agentManager.agent.presenter.source_url})`

// agentManager.connect() method -> Creating a new WebRTC session and connecting it to the Agent
console.log('agentManager.connect()')
//agentManager.connect()

window.chat = chat
