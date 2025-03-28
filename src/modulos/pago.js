//Modulo para el pago y factura con el SRI
const { ipcRenderer } = require('electron')

export function enviarPago(monto, numero) {
  const idDispositivo = ipcRenderer.sendSync('obtener-id')
  console.log(idDispositivo)

  if (!idDispositivo) {
    console.error('No se pudo obtener el ID del dispositivo.')
    return
  }

  ipcRenderer.send('nuevoPago', idDispositivo, monto, numero)

  console.log(`Enviando pago de ${monto} para el dispositivo ${idDispositivo}`)
}
