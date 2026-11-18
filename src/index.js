// Punto de entrada único del programa.
// Conecta lectura, extracción, diagnóstico, transformación, validación,
// programación de calendario, puntuación y generación de archivos.

import { cargarEntradas } from "./input.js";
import { extraerContenido } from "./extractor.js";
import { diagnosticarContenido } from "./diagnostic.js";
import { transformarContenido } from "./transformer.js";
import { validarPiezas } from "./validator.js";
import { programarCalendario } from "./scheduler.js";
import { calcularPuntuaciones } from "./scorer.js";
import { generarReportes } from "./report.js";

async function ejecutar() {
    const url = process.argv[2];

    if (!url) {
        console.log("Falta la URL de la pieza madre.");
        console.log("Uso: node src/index.js <URL>");
        process.exit(1);
    }

    console.log("1. Leyendo archivos de entrada...");
    const entradas = await cargarEntradas(url);

    console.log("2. Descargando y extrayendo contenido HTML...");
    const contenido = await extraerContenido(entradas.url);

    console.log("3. Generando diagnóstico de la pieza madre...");
    const diagnostico = diagnosticarContenido(contenido, entradas.config);

    console.log("4. Transformando contenido en piezas derivadas...");
    const transformacion = transformarContenido(
        contenido,
        diagnostico,
        entradas.config,
        entradas.url
    );

    console.log("5. Validando reglas de negocio y cifras...");
    const validacion = validarPiezas(transformacion, contenido, entradas.config);

    console.log("6. Programando calendario...");
    const calendario = programarCalendario(validacion, entradas);

    console.log("7. Calculando puntajes y nivel de confianza...");
    const puntuacion = calcularPuntuaciones(calendario, entradas.historial);

    console.log("8. Guardando archivos de salida...");
    const reporte = await generarReportes({
        entradas,
        contenido,
        diagnostico,
        transformacion,
        validacion,
        calendario,
        puntuacion
    });

    console.log("\n--- PROCESO FINALIZADO ---");
    console.log(`Fuente usada: ${contenido.mensaje}`);
    console.log(`Anomalías de entrada: ${entradas.anomalias.length}`);
    console.log(`Piezas generadas: ${transformacion.total_piezas}`);
    console.log(`Piezas válidas: ${validacion.total_validas}`);
    console.log(`Piezas rechazadas: ${validacion.total_rechazadas}`);
    console.log(`Piezas programadas: ${calendario.total_programadas}`);
    console.log(`Piezas no ubicadas: ${calendario.total_no_ubicadas}`);
    console.log(`Archivos generados en ${reporte.carpeta}: ${reporte.archivos.join(", ")}`);
    console.log("Abre public/index.html en tu navegador para ver el calendario semanal.");
}

ejecutar().catch(error => {
    console.error("Error al ejecutar el proceso:", error.message);
    process.exit(1);
});