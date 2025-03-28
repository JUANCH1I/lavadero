let recognition
// Verificamos si la Web Speech API está disponible
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  // Seleccionamos el constructor que esté disponible
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()

  // Configuración básica
  recognition.lang = 'es-ES' // Ajusta el idioma si lo necesitas
  recognition.continuous = false // Se detiene tras una pausa en el habla
  recognition.interimResults = false // Solo se muestran resultados finales

  // Cuando inicia el reconocimiento
  recognition.onstart = () => {
    console.log('Reconocimiento de voz iniciado')
  }

  // Al obtener un resultado se extrae la transcripción y se muestra en consola y en pantalla
  recognition.onresult = (event) => {
    let transcript = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        transcript += event.results[i][0].transcript
        textArea.value += event.results[i][0].transcript
      }
    }
    console.log('Has dicho:', transcript) // Se muestra en la consola
  }

  // En caso de error
  recognition.onerror = (event) => {
    console.error('Error en el reconocimiento:', event.error)
  }

  // Al finalizar el reconocimiento
  recognition.onend = function () {
    if (textArea.value.trim().length > 0) {
      chat()
    }
  }
} else {
  console.error('La Web Speech API no está soportada en este entorno.')
}

// Eventos para los botones de iniciar y detener
document.getElementById('speechButton').addEventListener('click', () => {
  if (recognition) {
    recognition.start()
  }
})
