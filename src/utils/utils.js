import { invoke } from '@tauri-apps/api/core'
import { supabase } from '../supabase'

export async function insertPago(id, identificacion, precio, card, auth) {
  const { data, error } = await supabase.from('pagos').insert([
    {
      maquinaId: id,
      lavadoId: 1,
      monto: precio,
      identificacion: identificacion,
      use: true,
      cardName: card,
      auth: auth,
    },
  ])

  if (error) {
    console.error('Error al insertar pago:', error)
    alert('Error al insertar pago.')
  } else {
    console.log('Pago insertado:', data)
  }
}

let video

export function reproducirVideo(element, path) {
  const video = document.getElementById(`steps`)
  video.src = path
  console.log(path)

  video.currentTime = 0 // Reinicia el audio al principio
  video.play().catch((e) => console.error('Error al reproducir el video:', e))
}
export function iniciarBucleVideo(element, videoSrc) {
  element.src = videoSrc
  element.autoplay = true
  element.loop = true
}

export function closeVideo(element) {
  video = document.getElementById(`${element}`)
  video.src = ''
}

export function cerrarModal() {
  const modal = document.getElementById('modal')
  const $accept = document.getElementById('accept')

  modal.style.display = 'none'
  $accept.checked = false
}

async function imprimirTicket(datos) {
  console.log(datos)
  try {
    const datosString = JSON.stringify(datos)
    console.log(datosString)
    await invoke('imprimir_ticket', { datos: datosString })
    console.log('Impresión enviada a la impresora.')
  } catch (error) {
    console.error('Error al imprimir:', error)
  }
}

export function completLavado(numero, tipoLavado, monto, card, auth) {
  const detallesLavado = {
    numero,
    nombre: tipoLavado,
    monto,
    card,
    auth,
  }
  imprimirTicket(detallesLavado)
  return detallesLavado
}

export function initCamera() {
  const videoElement = document.querySelector('video')
  if (!videoElement) {
    console.error('Elemento de video no encontrado')
    return
  }

  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      videoElement.srcObject = stream
      videoElement.play()
    })
    .catch((error) => {
      console.error('No se pudo acceder a la cámara:', error)
    })
}

export function modalError(message) {
  const modal = document.getElementById('modalError')
  const p = document.getElementById('pError')
  p.innerHTML = message
  modal.style.display = 'flex'
  setInterval(() => {
    modal.style.display = 'none'
  }, 3000)
}

export function captureImage() {
  const videoElement = document.querySelector('video')
  if (!videoElement) {
    console.error('Elemento de video no encontrado')
    return
  }

  const canvas = document.createElement('canvas')
  canvas.width = videoElement.videoWidth
  canvas.height = videoElement.videoHeight

  const context = canvas.getContext('2d')
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

  const imageDataUrl = canvas.toDataURL('image/png')
  invoke('save_image', { imageData: imageDataUrl })
}

// Función para enviar datos a Arduino
export function sendToArduino(data) {
  invoke('send_to_arduino', { data })
}
