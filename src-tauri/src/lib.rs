// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use base64::engine::general_purpose::STANDARD;
// Importaciones básicas y de dependencias
use base64::Engine;

use chrono::Utc;
use once_cell::sync::Lazy;
use serde::Deserialize;
use serde::Serialize;
use serde_json::json;
use std::fs;
use std::thread;
use std::time::Duration;
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_printer;
use uuid::Uuid;
use std::sync::{Arc, Mutex};
#[derive(Deserialize)]
struct FacturaDatos {
    numero: String,
    card: String,
    auth: String,
    nombre: String,
    monto: f64,
}

#[derive(Serialize)]
struct Transaction {
    TipoMensaje: String,
    CodigoRespuesta: String,
    MensajeRespuestaAut: String,
    Autorizacion: String,
    Lote: String,
    CodigoRespuestaAut: String,
    RedAdquirente: String,
    Publicidad: String,
    TID: String,
    MID: String,
    Trama: String,
    ModoLectura: String,
    PIN: String,
    NombreGrupoTarjeta: String,
}
// Define una estructura para almacenar el puerto serie compartido
pub struct ArduinoPort {
    pub port: Arc<Mutex<Box<dyn serialport::SerialPort + Send>>>,
}
extern crate winapi;
use chrono::Local;
use std::ffi::CString;
use std::ptr;
use winapi::um::winspool::DOC_INFO_1A;
use serde_json::Value;
use tauri::Window;
use winapi::um::winspool::{
    ClosePrinter, EndDocPrinter, EndPagePrinter, OpenPrinterA, StartDocPrinterA, StartPagePrinter,
    WritePrinter,
};

static DEVICE_ID: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));

/// Obtiene o genera un ID de dispositivo.
#[tauri::command]
fn obtener_id() -> String {
    let mut id_lock = DEVICE_ID.lock().unwrap();
    if id_lock.is_none() {
        *id_lock = Some(Uuid::new_v4().to_string());
    }
    id_lock.clone().unwrap()
}

/// Genera un QR. (Aquí se simula devolviendo un string en base64).
#[tauri::command]
async fn generar_qr(data: String) -> Result<String, String> {
    // En producción, podrías usar el crate `qrcode` para generar la imagen y luego codificarla.
    Ok(format!("data:image/png;base64,{}", STANDARD.encode(data)))
}

/// Llama a un endpoint para marcar un QR como usado.
#[tauri::command]
async fn marcar_qr_usado(qr_data: String) -> Result<serde_json::Value, String> {
    let url = format!("http://localhost:3000/validate?token={}", qr_data);
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let json_response = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| e.to_string())?;
    Ok(json_response)
}

/// Inicializa la comunicación con Arduino utilizando el crate `serialport`.
#[tauri::command]
fn initialize_arduino_communication(window: tauri::Window, state: tauri::State<ArduinoPort>) -> Result<(), String> {
    let port_clone = state.port.clone();
    thread::spawn(move || {
        let mut buffer: Vec<u8> = vec![0; 1024];
        let mut accumulated = String::new();
        loop {
            let mut port = port_clone.lock().unwrap();
            match port.read(buffer.as_mut_slice()) {
                Ok(bytes_read) => {
                    if bytes_read > 0 {
                        let chunk = String::from_utf8_lossy(&buffer[..bytes_read]).to_string();
                        accumulated.push_str(&chunk);
                        // Si el mensaje termina en salto de línea, consideramos la línea completa
                        if accumulated.contains("\n") {
                            println!("Data from Arduino: {}", accumulated.trim());
                            let _ = window.emit("arduino-data", accumulated.trim());
                            accumulated.clear();
                        }
                    }
                },
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => continue,
                Err(e) => {
                    eprintln!("Error leyendo el puerto serie: {:?}", e);
                    break;
                }
            }
            drop(port);
            thread::sleep(Duration::from_millis(100));
        }
    });
    Ok(())
}


#[tauri::command]
fn send_to_arduino(data: String, state: tauri::State<ArduinoPort>) -> Result<(), String> {
    let mut port = state.port.lock().unwrap();
    match port.write(data.as_bytes()) {
        Ok(_) => {
            println!("Enviando a Arduino: {}", data);
            Ok(())
        },
        Err(e) => Err(format!("Error escribiendo en el puerto serie: {:?}", e)),
    }
}

/// Inserta un pago en Supabase. Aquí se simula la inserción usando una llamada (podrías usar el REST API de Supabase).
#[tauri::command]
async fn insertar_pago(
    id_dispositivo: String,
    monto: f64,
    numero: String,
) -> Result<String, String> {
    println!(
        "Insertando pago para {} con monto {} y número {}",
        id_dispositivo, monto, numero
    );
    // En producción, realiza una petición POST al endpoint de Supabase.
    Ok("success".to_string())
}

/// Verifica y envía el ID del dispositivo a Supabase (simulado).
#[tauri::command]
async fn verificar_y_enviar_id_dispositivo() -> Result<(), String> {
    let id = obtener_id();
    println!("Verificando y enviando ID: {}", id);
    // En producción, consulta e inserta a la tabla "maquina" de Supabase.
    Ok(())
}

fn generar_ticket_escpos(datos: &FacturaDatos) -> String {
    // Comandos ESC/POS
    let esc_reset = "\x1B\x40"; // Reinicia la impresora.
    let esc_doble = "\x1D\x21\x11"; // Activa texto de doble ancho y alto (para títulos).
    let esc_normal = "\x1D\x21\x00"; // Vuelve a tamaño normal.
    let align_center = "\x1B\x61\x01"; // Alinea al centro.
    let align_left = "\x1B\x61\x00"; // Alinea a la izquierda.
    let corte = "\x1D\x56\x00"; // Comando para corte total.

    // Fecha actual formateada
    let fecha = Local::now().format("%d/%m/%Y %H:%M:%S").to_string();

    // Se arma el ticket:
    // Primero se reinicia la impresora, se centra y se usa texto doble para los títulos.
    // Luego se vuelve a la alineación izquierda y se usan textos en tamaño normal.
    // Al final se agrega el comando de corte.
    let ticket = format!(
        "{esc_reset}{align_center}{esc_doble}FACTURA\nAUTOLAVAGGIO\n\
         {esc_normal}\n\
         {align_left}Cliente: {numero}\nProducto: {nombre}\nPrecio: ${monto:.2}\ncard: {card}\nAutorización: {auth}\nFecha: {fecha}\n\n\n\
         {esc_normal}-----------------------------\n\
         Este documento no tiene ninguna validez tributaria. Su factura electronica llegara a su correo electronico.\n\
         Gracias por su compra!\n{corte}",
        esc_reset = esc_reset,
        align_center = align_center,
        esc_doble = esc_doble,
        esc_normal = esc_normal,
        align_left = align_left,
        numero = datos.numero,
        nombre = datos.nombre,
        monto = datos.monto,
        card = datos.card,
        auth = datos.auth,
        fecha = fecha,
        corte = corte
    );
    ticket
}

fn imprimir_con_winapi(ticket: &str) -> Result<(), String> {
    unsafe {
        // Reemplaza "NombreDeTuImpresora" por el nombre de tu impresora instalada.
        let printer_name = CString::new("POS-80").map_err(|e| e.to_string())?;
        let mut printer_handle = ptr::null_mut();

        if OpenPrinterA(
            printer_name.as_ptr() as *mut i8,
            &mut printer_handle,
            ptr::null_mut(),
        ) == 0
        {
            return Err("No se pudo abrir la impresora.".into());
        }

        let doc_name = CString::new("Ticket de Compra").unwrap();
        let data_type = CString::new("RAW").unwrap();
        let mut doc_info = DOC_INFO_1A {
            pDocName: doc_name.as_ptr() as *mut i8,
            pOutputFile: ptr::null_mut(),
            pDatatype: data_type.as_ptr() as *mut i8,
        };

        if StartDocPrinterA(
            printer_handle,
            1,
            &mut doc_info as *mut DOC_INFO_1A as *mut _,
        ) == 0
        {
            ClosePrinter(printer_handle);
            return Err("No se pudo iniciar el documento.".into());
        }

        if StartPagePrinter(printer_handle) == 0 {
            EndDocPrinter(printer_handle);
            ClosePrinter(printer_handle);
            return Err("No se pudo iniciar la página.".into());
        }

        let data = ticket.as_bytes();
        let mut bytes_written = 0;

        if WritePrinter(
            printer_handle,
            data.as_ptr() as *mut _,
            data.len() as u32,
            &mut bytes_written,
        ) == 0
        {
            EndPagePrinter(printer_handle);
            EndDocPrinter(printer_handle);
            ClosePrinter(printer_handle);
            return Err("Error al escribir en la impresora.".into());
        }

        EndPagePrinter(printer_handle);
        EndDocPrinter(printer_handle);
        ClosePrinter(printer_handle);
    }
    Ok(())
}

#[tauri::command]
#[cfg(target_os = "windows")]
fn imprimir_ticket(datos: String) -> Result<String, String> {
    let factura: FacturaDatos =
        serde_json::from_str(&datos).map_err(|e| format!("Error al parsear JSON: {}", e))?;

    // Genera el contenido del ticket.
    let ticket = generar_ticket_escpos(&factura);
    match imprimir_con_winapi(&ticket) {
        Ok(()) => Ok("Ticket impreso correctamente.".into()),
        Err(e) => Err(e),
    }
}

// Función para extraer el valor de la salida dado un prefijo.
fn extract_value(output: &str, key: &str) -> String {
    if let Some(start) = output.find(key) {
        let after = &output[start + key.len()..];
        if let Some(end) = after.find('\n') {
            after[..end].trim().to_string()
        } else {
            after.trim().to_string()
        }
    } else {
        "".to_string()
    }
}

// Función que parsea la salida y crea el objeto Transaction.
fn parse_transaction_output(output: &str) -> Transaction {
    Transaction {
        TipoMensaje: extract_value(output, "Tipo de mensaje: "),
        CodigoRespuesta: extract_value(output, "Código de Respuesta: "),
        MensajeRespuestaAut: extract_value(output, "Mensaje de Respuesta: "),
        Autorizacion: extract_value(output, "Autorizacion: "),
        Lote: extract_value(output, "Lote: "),
        CodigoRespuestaAut: extract_value(output, "Código respuesta Aut: "),
        RedAdquirente: extract_value(output, "Red adquiriente: "),
        Publicidad: extract_value(output, "Publicidad: "),
        TID: extract_value(output, "TID: "),
        MID: extract_value(output, "MID: "),
        Trama: extract_value(output, "Trama: "),
        ModoLectura: extract_value(output, "Modo lectura: "),
        PIN: extract_value(output, "PIN: "),
        NombreGrupoTarjeta: extract_value(output, "Grupo tarjeta: "),
    }
}

/// Ejecuta el proceso de pago invocando "dotnet run" y procesa la salida para generar un JSON
// fn realizar_pago_desde_consola(_ip: &str, monto: &str) -> String {
//     // Nota: el parámetro ip se recibe pero no se utiliza, como en el original C#.
//     let project_path = "C:/Users/USUARIO/Desktop/data/DatafastConnection/DatafastConnection.csproj";

//     // Se construye y ejecuta el comando.
//     let output_result = Command::new("dotnet")
//         .args(&["run", "--project", project_path, "pago", monto])
//         .output();

//     match output_result {
//         Ok(output) => {
//             let stdout = String::from_utf8_lossy(&output.stdout).to_string();
//             let stderr = String::from_utf8_lossy(&output.stderr).to_string();

//             println!("se hizo la llamada");
//             println!("salida: {}", stdout);

//             if !stderr.trim().is_empty() {
//                 println!("Error: {}", stderr);
//                 return "error".to_string();
//             }

//             if stdout.contains("Codigo de Respuesta: 00") && stdout.contains("APROBADA TRANS.") {
//                 println!("Devolvió success");
//                 let transaction = parse_transaction_output(&stdout);
//                 json!({
//                     "status": "success",
//                     "transaction": transaction,
//                 })
//                 .to_string()
//             } else if stdout.contains("TRANS CANCELADA") {
//                 let transaction = parse_transaction_output(&stdout);
//                 json!({
//                     "status": "cancelled",
//                     "transaction": transaction,
//                 })
//                 .to_string()
//             } else if stdout.contains("RESULTADO: ERROR") {
//                 if let Some(pos) = stdout.find("MENSAJE:") {
//                     let msg = stdout[pos + "MENSAJE:".len()..].trim().to_string();
//                     println!("Devolvió error");
//                     json!({
//                         "status": "error",
//                         "message": msg,
//                     })
//                     .to_string()
//                 } else {
//                     println!("Devolvió error (sin mensaje)");
//                     json!({
//                         "status": "error",
//                     })
//                     .to_string()
//                 }
//             } else {
//                 println!("Devolvió error2");
//                 json!({
//                     "status": "error",
//                 })
//                 .to_string()
//             }
//         }
//         Err(e) => {
//             println!("Error al ejecutar la aplicación de consola: {}", e);
//             "error".to_string()
//         }
//     }
// }

fn realizar_pago_desde_consola(ip: &str, monto: &str) -> String {
    // Aquí iría la lógica real para invocar el proceso "dotnet run ..." y procesar la salida.
    // Para efectos del ejemplo, simulamos la respuesta.
    if monto == "000000000100" {
        json!({
            "status": "success",
            "transaction": {
                "ip": "192.168.0.102",
                "amount": "000000000100",
                "NombreGrupoTarjeta": "Visa",
                "auth": "1234567890123456"
            }
        })
        .to_string()
    }
     else {
        json!({
            "status": "error",
            
            "nombreGrupoTarjeta": "",
            "auth": ""
        })
        .to_string()
    }
}


#[tauri::command]
async fn realizar_pago(window: Window) -> Result<Value, String> {
    println!("Evento nuevoPago recibido.");

    // Llamamos a la función de pago (ejemplo con monto fijo).
    let resultado = realizar_pago_desde_consola("192.168.0.105", "000000000100");

    // Parseamos el string JSON que retorna la función.
    let parsed: Value = serde_json::from_str(&resultado)
        .map_err(|e| format!("Error al parsear resultado: {}", e))?;

    // Revisamos el campo "status" del JSON.
    let response = if parsed.get("status").and_then(|v| v.as_str()) == Some("success") {
        println!("Pago procesado exitosamente.");
        parsed
    } else {
        println!("Error durante el procesamiento del pago.");
        // Si se espera que en caso de error se incluya un mensaje en el JSON,
        // se puede construir uno a partir del campo "message", o establecer uno por defecto.
        json!({
            "status": "error",
            "message": parsed.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Error durante el procesamiento del pago")
        })
    };

    // Se emite el evento "pagoInsertado" con la respuesta.
    window.emit("pagoInsertado", response.clone())
        .map_err(|e| e.to_string())?;

    // Retornamos el objeto JSON para que el frontend lo reciba.
    Ok(response)
}
/// Guarda una imagen (en base64) en el directorio de datos de la app.
#[tauri::command]
async fn save_image(image_data: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    // Remover el prefijo base64 de la imagen
    let base64_data = image_data
        .strip_prefix("data:image/png;base64,")
        .ok_or("Datos de imagen inválidos")?;

    // Decodificar la imagen
    let buffer = STANDARD.decode(base64_data).map_err(|e| e.to_string())?;

    // Generar un nombre de archivo basado en el timestamp actual
    let timestamp = Utc::now().timestamp();
    let filename = format!("captura-{}.png", timestamp);

    // Obtener el directorio de datos de la aplicación usando el path resolver
    let app_dir = app_handle.path().app_data_dir().map_err(|_error| {
        "No se pudo obtener el directorio de datos de la aplicación".to_string()
    })?;

    // Crear el subdirectorio para las fotos
    let photos_dir = app_dir.join("fotosWashers");
    fs::create_dir_all(&photos_dir).map_err(|e| e.to_string())?;

    // Escribir el archivo en disco
    let file_path = photos_dir.join(filename);
    fs::write(&file_path, buffer).map_err(|e| e.to_string())?;

    println!("Imagen guardada en: {:?}", file_path);
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Abre el puerto COM7 a 9600 baudios con timeout de 2 segundos
    let port = serialport::new("COM7", 9600)
        .timeout(Duration::from_secs(2))
        .open()
        .expect("No se pudo abrir el puerto serie");
    
    let arduino_port = ArduinoPort {
        port: Arc::new(Mutex::new(port)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_printer::init())
        .manage(arduino_port)
        .invoke_handler(tauri::generate_handler![
            greet,
            obtener_id,
            generar_qr,
            marcar_qr_usado,
            realizar_pago,
            initialize_arduino_communication,
            send_to_arduino,
            insertar_pago,
            verificar_y_enviar_id_dispositivo,
            imprimir_ticket,
            save_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
