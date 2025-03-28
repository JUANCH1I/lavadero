import {
  initCamera,
  completLavado,
  captureImage,
  cerrarModal,
  closeVideo,
  modalError,
  insertPago,
  sendToArduino,
} from './utils/utils.js'
import servicios from './data/servicios.json'
import { invoke } from '@tauri-apps/api/core'

let tipoIdentificacion = ''
let servicioSeleccionado = null
let idDispositivo = ''

function obtenerId() {
  try {
    invoke('obtener_id').then((id) => {
      console.log('ID del dispositivo recibido:', id)
      idDispositivo = id
    })
  } catch (error) {
    console.error('Error al obtener el ID del dispositivo:', error)
  }
}

const pagoCompletado = `
    <div>
      <h1>Pago completado</h1>
      <h1>¡Muchas Gracias!</h1>
    </div>
  `

document.addEventListener('DOMContentLoaded', () => {
  // Solicitar el idDispositivo al cargar la página
  obtenerId()
  sendToArduino('H')
  initCamera()

  let inputQr = document.getElementById('qr')

  inputQr.focus()
  /**document.addEventListener('click', function () {
    inputQr.focus()
  })**/

  inputQr.addEventListener('keypress', async function (event) {
    if (event.key === 'Enter') {
      event.preventDefault() // Evita cualquier acción predeterminada del Enter

      const qrValue = this.value

      this.value = '' // Limpia el input para el próximo escaneo

      try {
        const response = await fetch(
          `http://localhost:3000/validate?token=${qrValue}`
        )
        const responseText = await response.text() // Obtener el texto de la respuesta

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const result = JSON.parse(responseText) // Convertir el texto a JSON

        const modal = document.getElementById('modal')

        if (result.message === 'Token is valid') {
          modal.style.display = 'flex'
          console.log('QR marcado como usado:', result.pago)
          modal.innerHTML = pagoCompletado
          sendToArduino('H')

          setTimeout(() => {
            document.getElementById('modal').style.display = 'none'
          }, 21000)
        } else {
          console.error('Error al marcar el QR como usado:', result.message)

          let errorMessage = 'Error: '
          if (result.message === 'Token already used') {
            errorMessage += 'El QR ya ha sido usado.'
          } else if (result.message === 'Token not found') {
            errorMessage += 'El QR no se encontró.'
          } else if (result.message === 'Token is required') {
            errorMessage += 'El token es requerido.'
          } else {
            errorMessage += result.message
              ? result.message
              : 'Ocurrió un error al marcar el QR como usado.'
          }

          // Mostrar mensaje de error al usuario
          modalError(errorMessage)
        }
      } catch (error) {
        console.error('Error al realizar la solicitud:', error)
        try {
          const errorMessage = JSON.parse(error.message).message
          alert(`Ocurrió un error: ${errorMessage}`)
        } catch (jsonError) {
          // Si el error no es JSON válido, mostrar el mensaje de error genérico
          alert('Ocurrió un error al procesar el QR.')
        }
      }
    }
  })

  function mostrarServicios(servicios) {
    const container = document.getElementById('container')

    servicios.forEach((servicio) => {
      const servicioDiv = document.createElement('div')
      servicioDiv.className = servicio.id

      const img = document.createElement('img')
      img.src = servicio.imagen
      img.alt = servicio.nombre
      img.loading = 'lazy'
      img.decoding = 'async'

      const nombre = document.createElement('h3')
      nombre.textContent = servicio.nombre

      const precio = document.createElement('p')
      precio.textContent = `Precio: $${servicio.precio}`

      const descripcion = document.createElement('p')
      descripcion.textContent = servicio.descripcion

      servicioDiv.appendChild(img)
      container.appendChild(servicioDiv)

      servicioDiv.addEventListener('click', () => {
        servicioSeleccionado = servicio // Almacenar el servicio seleccionado en una variable global
        const condiciones = document.querySelector('.modalCondiciones')
        const modalContainer = document.querySelector('.modalContainer')
        const $accept = document.getElementById('accept')

        modalContainer.style.display = 'flex'
        condiciones.style.display = 'flex'
        container.addEventListener('click', captureImage)

        modalContainer.addEventListener('click', function (event) {
          if (event.target === modalContainer) {
            modalContainer.style.display = 'none'
          }
        })

        $accept.addEventListener('change', async function () {
          if ($accept.checked) {
            const modal = document.getElementById('modal')

            condiciones.style.display = 'none'
            modalContainer.style.display = 'none'

            modal.innerHTML = `
                <div>
                  <h1>Complete el pago en la terminal</h1>
                </div>
              `

            modal.style.display = 'flex'

            try {
              const result = await handlePayment() // Usar await
              console.log(result)
              if (result.status === 'success') {
                console.log('Pago realizado exitosamente')
                modal.innerHTML = `
                    <div>
                      <h1>Pago completado</h1>
                    </div>
                  `
                // Continuar con el flujo de la aplicación
                setTimeout(() => {
                  facturacion(result.transaction)
                }, 5000)
              } else if (result === 'cancelled') {
                console.log('Pago cancelado')
                modal.innerHTML = `
                    <div>
                      <h1>Pago cancelado</h1>
                      <h1>Por favor intente de nuevo</h1>
                    </div>
                  `
                setTimeout(() => {
                  modal.style.display = 'none'
                  document.getElementById('accept').checked = false
                }, 5000)
              }
            } catch (error) {
              console.error('Error al realizar el pago:', error)
              modal.innerHTML = `
                  <div>
                    <h1>Error al realizar el pago</h1>
                    <h1>${error}</h1>
                  </div>
                `
              setTimeout(() => {
                modal.style.display = 'none'
                document.getElementById('accept').checked = false
              }, 5000)
            }
          }
        })
      })
    })
  }

  async function handlePayment() {
    return new Promise((resolve, reject) => {
      invoke('realizar_pago')
        .then((response) => {
          console.log(response)
          let result
          try {
            result =
              typeof response === 'string' ? JSON.parse(response) : response
          } catch (err) {
            return reject('Error al parsear la respuesta')
          }

          if (result.status === 'success') {
            resolve(result)
          } else if (result.status === 'cancelled') {
            resolve('cancelled')
          } else if (result.status === 'error') {
            reject(result.message)
          } else {
            reject('Estado de pago desconocido')
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  function facturacion(transaction) {
    const modal = document.getElementById('modal')
    setTimeout(() => {
      modal.innerHTML = `
          <div>
            <h1>SELECCIONE SU METODO DE FACTURACION</h1>
            <div id="formaFacturacion">
              <button id="cf"><h1>Consumidor final</h1></button>
              <button id="fa"><h1>Factura / Patente</h1></button>
            </div>
          </div>
        `

      document
        .getElementById('fa')
        .addEventListener('click', () =>
          mostrarTecladoNumerico('FA', transaction)
        )
      document.getElementById('cf').addEventListener('click', async () => {
        console.log(transaction)
        completLavado(
          '9999999999999',
          servicioSeleccionado.nombre,
          servicioSeleccionado.precio,
          transaction.NombreGrupoTarjeta,
          transaction.auth
        )

        await insertPago(
          idDispositivo,
          '9999999999999',
          servicioSeleccionado.precio,
          transaction.NombreGrupoTarjeta,
          transaction.auth
        )
        document.getElementById('accept').checked = false
        modal.innerHTML = pagoCompletado
        sendToArduino('H')

        setTimeout(() => {
          document.getElementById('modal').style.display = 'none'
          sendToArduino('L')
        }, 21000)
      })
    }, 3000)
  }

  function mostrarTecladoNumerico(tipo, transaction) {
    const modal = document.getElementById('modal')
    tipoIdentificacion = tipo
    const titulo =
      tipo === 'FA' ? 'INGRESE SU PATENTE' : 'INGRESE SU NÚMERO DE RUC'

    modal.innerHTML = `
        <div>
          <div class="input-area">
            <label for="numeroInput">${titulo}</label>
            <input type="text" id="numeroInput" class="input-number" readonly>
          </div>
          <div id="keyboard" class="simple-keyboard"></div>
          <button id="back">Volver</button>
        </div>
      `

    const inputNumero = document.getElementById('numeroInput')

    const Keyboard = window.SimpleKeyboard.default

    const keyboard = new Keyboard({
      onChange: (input) => onChange(input),
      onKeyPress: (button) => onKeyPress(button),
      layout: {
        default: [
          '1 2 3 4 5 6 7 8 9 0 -',
          'q w e r t y u i o p',
          'a s d f g h j k l',
          'z x c v b n m',
          '{enter} {bksp}',
        ],
      },
      display: {
        '{enter}': 'Enter',
        '{bksp}': 'Borrar',
      },
    })

    document.getElementById('back').addEventListener('click', facturacion)

    function onChange(input) {
      inputNumero.value = input
    }

    function validateInput(input) {
      const regex = /^[a-zA-Z]{3}-[0-9]{3,4}$/
      return regex.test(input)
    }

    function onKeyPress(button) {
      if (button === '{enter}') {
        const input = inputNumero.value
        console.log(transaction)
        if (validateInput(input)) {
          completLavado(
            input,
            servicioSeleccionado.nombre,
            servicioSeleccionado.precio,
            transaction.NombreGrupoTarjeta,
            transaction.auth
          )
          insertPago(
            idDispositivo,
            input,
            servicioSeleccionado.precio,
            transaction.NombreGrupoTarjeta,
            transaction.auth
          )

          document.getElementById('accept').checked = false
          modal.innerHTML = pagoCompletado
          sendToArduino('H')

          setTimeout(() => {
            document.getElementById('modal').style.display = 'none'
          }, 21000)
        } else {
          modal.innerHTML = `<div>
                <h1>Numero no valido</h1>
                <h1>Porfavor intentelo devuelta</h1>
              </div>`
          setTimeout(() => {
            mostrarTecladoNumerico(tipoIdentificacion)
          }, 3000)
        }
      }
    }
  }

  mostrarServicios(servicios.servicios)
})
