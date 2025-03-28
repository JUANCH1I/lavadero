import DF.LANConfig;
import DF.LAN;
import DF.EnvioProcesoPago;
import DF.RespuestaProcesoPago;

public class PinPadPayment {
    private LANConfig config;
    private LAN lan;

    public PinPadPayment(String ip, int port, int timeout, String mid, String tid, String cid) {
        this.config = new LANConfig(ip, port, timeout, mid, tid, cid, 2, 2);
        this.lan = new LAN(config);
    }

    public RespuestaProcesoPago sendPayment(int tipoTransaccion, int redAdquirente, String codigoDiferido, 
                                            String base0, String baseImponible, String iva, String montoTotal) {
        EnvioProcesoPago envio = new EnvioProcesoPago();
        
        envio.TipoTransaccion = tipoTransaccion;
        envio.RedAdquirente = redAdquirente;
        envio.CodigoDiferido = codigoDiferido;
        envio.Base0 = base0;
        envio.BaseImponible = baseImponible;
        envio.IVA = iva;
        envio.MontoTotal = montoTotal;

        return lan.ProcesoPago(envio);
    }

    public static void main(String[] args) {
        // Ejemplo de uso
        PinPadPayment payment = new PinPadPayment("192.168.250.10", 9999, 90000, "MID123456", "TID123456", "CID123456");
        RespuestaProcesoPago response = payment.sendPayment(1, 1, "00", "1.00", "1.00", "0.12", "2.12");

       // Utilizando las propiedades correctas de la respuesta
       System.out.println("Código de Respuesta: " + response.CodigoRespuesta);
       System.out.println("Lote: " + response.Lote);
       System.out.println("Referencia: " + response.Referencia);
       System.out.println("Autorización: " + response.Autorizacion);
       System.out.println("Código del Adquirente: " + response.CodigoAdquirente);
       System.out.println("Tarjeta Habiente: " + response.TarjetaHabiente);
       System.out.println("Número de Tarjeta: " + response.NumeroTajeta);
    }
}
