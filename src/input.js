import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

const INPUT_DIR = "./inputs";

/**
 * Punto de entrada principal
 */
export async function cargarEntradas(url) {
    const anomalias = [];

    const config = await cargarConfig(anomalias);
    const ventana = await cargarVentana(anomalias);
    const calendarioOcupado = await cargarCalendario(anomalias);
    const historial = await cargarHistorial(anomalias);

    return {
        url,
        config,
        ventana,
        calendarioOcupado,
        historial,
        anomalias
    };
}

/* =====================================================
   CONFIG.JSON
===================================================== */

async function cargarConfig(anomalias) {
    const archivo = "config.json";

    try {

        const datos = await leerJSON(archivo);

        // Campos principales
        validarCamposRequeridos(
            datos,
            [
                "productos_vigentes",
                "terminos_prohibidos",
                "nombres_confidenciales",
                "utm",
                "matriz_formatos",
                "calendario"
            ],
            archivo,
            anomalias
        );

        // Validación de UTM
        if (datos.utm) {

            validarCamposRequeridos(
                datos.utm,
                [
                    "utm_source",
                    "utm_medium",
                    "utm_campaign",
                    "utm_content"
                ],
                archivo,
                anomalias
            );
        }

        // Validación de calendario
        if (datos.calendario) {

            validarCamposRequeridos(
                datos.calendario,
                [
                    "zona_horaria",
                    "dias_habiles",
                    "franjas_de_publicacion",
                    "capacidad_max_por_dia",
                    "capacidad_max_por_semana",
                    "separacion_minima_mismo_tema_horas",
                    "festivos"
                ],
                archivo,
                anomalias
            );
        }

        return datos;

    } catch (error) {

        registrarAnomalia(
            anomalias,
            archivo,
            "ERROR_LECTURA",
            error.message
        );

        return {};
    }
}

/* =====================================================
   VENTANA.JSON
===================================================== */

async function cargarVentana(anomalias) {
    const archivo = "ventana.json";

    try {
        const datos = await leerJSON(archivo);

        validarCamposRequeridos(
            datos,
            ["inicio", "fin"],
            archivo,
            anomalias
        );

        validarVentanaCronologica(
        datos,
        archivo,
        anomalias
        );

        return datos;
    } catch (error) {
        registrarAnomalia(
            anomalias,
            archivo,
            "ERROR_LECTURA",
            error.message
        );

        return {};
    }
}

/* =====================================================
   CALENDARIO OCUPADO
===================================================== */

async function cargarCalendario(anomalias) {
    const archivo = "calendario_ocupado.csv";

    try {
        const registros = await leerCSV(archivo);

        validarColumnas(
            registros,
            ["fecha", "hora", "tema"],
            archivo,
            anomalias
        );

        detectarVacios(
            registros,
            archivo,
            anomalias
        );

        detectarDuplicados(
            registros,
            ["fecha", "hora"],
            archivo,
            anomalias
        );
        validarEstadosCalendario(
            registros,
            archivo,
            anomalias
        ); 

        return registros;

    } catch (error) {

        registrarAnomalia(
            anomalias,
            archivo,
            "ERROR_LECTURA",
            error.message
        );

        return [];
    }
}

/* =====================================================
   HISTORIAL
===================================================== */

async function cargarHistorial(anomalias) {
    const archivo = "historial_publicaciones.csv";

    try {

        const registros = await leerCSV(archivo);

        validarColumnas(
    registros,
    [
        "fecha",
        "canal",
        "formato",
        "tema",
        "impresiones",
        "reacciones",
        "comentarios",
        "clics",
        "tasa_interaccion"
    ],
    archivo,
    anomalias
);

        detectarVacios(
            registros,
            archivo,
            anomalias
        );

         detectarDuplicados(
          registros,
         ["id_publicacion"],
         archivo,
         anomalias
         );
         detectarFormatosFecha(
         registros,
         archivo,
         anomalias
          );

        return registros;

    } catch (error) {

        registrarAnomalia(
            anomalias,
            archivo,
            "ERROR_LECTURA",
            error.message
        );

        return [];
    }
}

/* =====================================================
   LECTURA DE ARCHIVOS
===================================================== */

async function leerJSON(nombreArchivo) {

    const ruta = path.join(
        INPUT_DIR,
        nombreArchivo
    );

    const contenido =
        await fs.readFile(
            ruta,
            "utf8"
        );

    return JSON.parse(contenido);
}

async function leerCSV(nombreArchivo) {

    const ruta = path.join(
        INPUT_DIR,
        nombreArchivo
    );

    const contenido =
        await fs.readFile(
            ruta,
            "utf8"
        );

    return parse(contenido, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });
}

/* =====================================================
   VALIDACIONES
===================================================== */

function validarCamposRequeridos(
    objeto,
    requeridos,
    archivo,
    anomalias
) {
    for (const campo of requeridos) {

        if (!(campo in objeto)) {

            registrarAnomalia(
                anomalias,
                archivo,
                "CAMPO_REQUERIDO_FALTANTE",
                campo
            );
        }
    }
}

function validarColumnas(
    registros,
    requeridas,
    archivo,
    anomalias
) {

    if (!registros.length) {

        registrarAnomalia(
            anomalias,
            archivo,
            "ARCHIVO_VACIO",
            "Sin registros"
        );

        return;
    }

    const columnas =
        Object.keys(registros[0]);

    for (const columna of requeridas) {

        if (!columnas.includes(columna)) {

            registrarAnomalia(
                anomalias,
                archivo,
                "COLUMNA_FALTANTE",
                columna
            );
        }
    }
}

function detectarVacios(
    registros,
    archivo,
    anomalias
) {

    registros.forEach((fila, indice) => {

        Object.entries(fila)
            .forEach(([campo, valor]) => {

                if (
                    valor === null ||
                    valor === undefined ||
                    valor === ""
                ) {

                    registrarAnomalia(
                        anomalias,
                        archivo,
                        "CAMPO_VACIO",
                        `Fila ${indice + 2} - ${campo}`
                    );
                }
            });
    });
}

function detectarDuplicados(
    registros,
    campos,
    archivo,
    anomalias
) {

    const vistos = new Set();

    registros.forEach((fila, indice) => {

        const clave = campos
            .map(campo => fila[campo])
            .join("|");

        if (vistos.has(clave)) {

            registrarAnomalia(
                anomalias,
                archivo,
                "REGISTRO_DUPLICADO",
                `Fila ${indice + 2}`
            );

        } else {
            vistos.add(clave);
        }
    });
}

function validarVentanaCronologica(
    ventana,
    archivo,
    anomalias
) {

    if (
        ventana.inicio &&
        ventana.fin &&
        ventana.inicio > ventana.fin
    ) {

        registrarAnomalia(
            anomalias,
            archivo,
            "VENTANA_INVALIDA",
            "La fecha de inicio es posterior a la fecha fin"
        );
    }
}
function validarEstadosCalendario(
    registros,
    archivo,
    anomalias
) {

    const estadosPermitidos = [
        "programada"
    ];

    registros.forEach((fila, indice) => {

        if (
            fila.estado &&
            !estadosPermitidos.includes(
                fila.estado.toLowerCase()
            )
        ) {

            registrarAnomalia(
                anomalias,
                archivo,
                "ESTADO_INVALIDO",
                `Fila ${indice + 2} - ${fila.estado}`
            );
        }
    });
}
function detectarFormatosFecha(
    registros,
    archivo,
    anomalias
) {

    const formatosDetectados = new Set();

    registros.forEach(fila => {

        const fecha = fila.fecha;

        if (!fecha) return;

        if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            formatosDetectados.add("AAAA-MM-DD");
        }

        else if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
            formatosDetectados.add("DD/MM/AAAA");
        }

        else if (/^\d{1,2}-[a-zA-Z]{3}-\d{4}$/.test(fecha)) {
            formatosDetectados.add("DD-MES-AAAA");
        }
    });

    if (formatosDetectados.size > 1) {

        registrarAnomalia(
            anomalias,
            archivo,
            "FORMATO_FECHA_VARIADO",
            Array.from(formatosDetectados).join(", ")
        );
    }
}
/* =====================================================
   ANOMALIAS
===================================================== */

function registrarAnomalia(
    anomalias,
    archivo,
    tipo,
    detalle
) {

    anomalias.push({
        fecha: new Date().toISOString(),
        archivo,
        tipo,
        detalle
    });
}