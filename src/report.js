// Guarda todos los resultados en archivos dentro de outputs/
// y genera outputs/datos.js para que public/index.html funcione sin servidor.

import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = "./outputs";

export async function generarReportes(datos) {
    const {
        entradas,
        contenido,
        diagnostico,
        transformacion,
        validacion,
        calendario,
        puntuacion
    } = datos;

    // Asegurar que exista la carpeta outputs/
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // 1. Guardar diagnóstico
    await guardarJSON("diagnostico.json", diagnostico);

    // 2. Guardar piezas derivadas (válidas y rechazadas)
    await guardarJSON("piezas_derivadas.json", {
        titulo_pieza_madre: transformacion.titulo_pieza_madre,
        total_generadas: transformacion.total_piezas,
        piezas_validas: validacion.piezas_validas,
        piezas_rechazadas: validacion.piezas_rechazadas
    });

    // 3. Guardar calendario con puntajes y piezas no ubicadas
    await guardarJSON("calendario.json", {
        ventana: entradas.ventana,
        programadas: puntuacion.piezas_puntuadas,
        no_ubicadas: puntuacion.no_ubicadas
    });

    // 4. Guardar anomalías y avisos del sistema (RNF-09)
    const avisos = {
        uso_respaldo: contenido.usoRespaldo,
        mensaje_fuente: contenido.mensaje,
        anomalias_entrada: entradas.anomalias || [],
        avisos_confianza: puntuacion.avisos_confianza || [],
        piezas_rechazadas: (validacion.piezas_rechazadas || []).map(p => ({
            id: p.id,
            formato: p.formato,
            motivos: p.motivos_rechazo
        }))
    };

    await guardarJSON("anomalias_y_avisos.json", avisos);

    // 5. Generar archivo JS para que public/index.html lea los datos sin servidor (RNF-11)
    const resumenWeb = {
        pieza_madre: {
            titulo: contenido.titulo,
            url: entradas.url,
            fuente: contenido.fuente,
            uso_respaldo: contenido.usoRespaldo
        },
        ventana: entradas.ventana,
        diagnostico,
        calendario_ocupado: entradas.calendarioOcupado || [],
        programadas: puntuacion.piezas_puntuadas,
        no_ubicadas: puntuacion.no_ubicadas,
        rechazadas: validacion.piezas_rechazadas,
        avisos
    };

    const contenidoJS = `window.RESULTADOS_SISTEMA = ${JSON.stringify(resumenWeb, null, 2)};\n`;
    await fs.writeFile(path.join(OUTPUT_DIR, "datos.js"), contenidoJS, "utf8");

    return {
        carpeta: OUTPUT_DIR,
        archivos: [
            "diagnostico.json",
            "piezas_derivadas.json",
            "calendario.json",
            "anomalias_y_avisos.json",
            "datos.js"
        ]
    };
}

async function guardarJSON(nombreArchivo, contenido) {
    const ruta = path.join(OUTPUT_DIR, nombreArchivo);
    await fs.writeFile(ruta, JSON.stringify(contenido, null, 2), "utf8");
}