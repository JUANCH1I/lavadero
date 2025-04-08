// Configura tus credenciales
let agentId = 'agt_Zb-YaNDz'
let auth = {
  type: 'key',
  clientKey:
    'Z29vZ2xlLW9hdXRoMnwxMDMzNTAwMzA0NDI2NjQwNDM3MDk6RlR2YjBzYmZZQmZsYkxIaVhrY3ox',
}

let videoElement = document.querySelector('#videoElement')
let textArea = document.querySelector('#textArea')
let langSelect = document.querySelector('#langSelect')
let speechButton = document.querySelector('#speechButton')
let answers = document.querySelector('#answers')
let reconnectButton = document.querySelector('#reconnectButton')
let srcObject

let agentManager // global para poder usar en otras funciones

// Carga dinámica del SDK
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const sdk = await import('@d-id/client-sdk')
    await initAgentManager(sdk)
  } catch (e) {
    console.error('Error al importar @d-id/client-sdk:', e)
  }
})

const callbacks = {
  onSrcObjectReady(value) {
    videoElement.srcObject = value
    srcObject = value
    return srcObject
  },
  onConnectionStateChange(state) {
    console.log('onConnectionStateChange(): ', state)
    if (state === 'connecting') {
      document.querySelector('#container').style.display = 'flex'
      document.querySelector('#hidden').style.display = 'none'
    } else if (state === 'connected') {
      textArea.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          chat()
        }
      })
      langSelect.removeAttribute('disabled')
      speechButton.removeAttribute('disabled')
    } else if (state === 'disconnected' || state === 'closed') {
      textArea.removeEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          chat()
        }
      })
      document.querySelector('#hidden_h2').innerHTML =
        agentManager.agent.preview_name + ' Disconnected'
      document.querySelector('#hidden').style.display = 'block'
      langSelect.setAttribute('disabled', true)
      speechButton.setAttribute('disabled', true)
    }
  },
  onVideoStateChange(state) {
    console.log('onVideoStateChange(): ', state)
    if (state === 'STOP') {
      videoElement.muted = true
      videoElement.srcObject = undefined
      videoElement.src = agentManager.agent.presenter.idle_video
    } else {
      videoElement.muted = false
      videoElement.src = ''
      videoElement.srcObject = srcObject
    }
  },
  onNewMessage(messages, type) {
    let msg = messages[messages.length - 1]
    if (
      msg.role === 'assistant' &&
      messages.length !== 1 &&
      type === 'answer'
    ) {
      answers.innerHTML = `${timeDisplay()} - ${msg.content}`
      document
        .getElementById(`${msg.id}_plus`)
        ?.addEventListener('click', () => rate(msg.id, 1))
      document
        .getElementById(`${msg.id}_minus`)
        ?.addEventListener('click', () => rate(msg.id, -1))
    } else {
      answers.innerHTML += `${timeDisplay()} - [${msg.role}] : ${
        msg.content
      }<br>`
    }
    answers.scrollTop = answers.scrollHeight
  },
  onError(error, errorData) {
    console.log('Error:', error, 'Error Data', errorData)
  },
}

let streamOptions = { compatibilityMode: 'auto', streamWarmup: true }

async function initAgentManager(sdk) {
  agentManager = await sdk.createAgentManager(agentId, {
    auth,
    callbacks,
    streamOptions,
  })

  console.log('sdk.createAgentManager()', agentManager)

  document.querySelector(
    '#videoElement'
  ).style.backgroundImage = `url(${agentManager.agent.presenter.source_url})`

  console.log('agentManager.connect()')
  agentManager.connect()

  reconnectButton.addEventListener('click', () => reconnect())
  textArea.focus()
  langSelect.setAttribute('disabled', true)
  speechButton.setAttribute('disabled', true)
  window.chat = chat
}

function chat() {
  const val = textArea.value
  if (val !== '') {
    agentManager.chat(val)
    textArea.value = ''
  }
}

function rate(messageID, score) {
  const result = agentManager.rate(messageID, score)
  console.log(`Mensaje ${messageID} calificado con: ${score}`, result)
}

function reconnect() {
  const result = agentManager.reconnect()
  console.log('Reconectando...', result)
}

function timeDisplay() {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
}
