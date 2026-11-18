import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const INPUT_DIR = "./inputs";


//funcion principal para extraer el contenido de una url, si no se puede descargar el contenido de la url, se lee un respaldo local
export async function extraerContenido(url) {

    let html;
    let usoRespaldo = false;
    let nombreRespaldo = null;

    try {

        html = await descargarHTML(url);

    } catch {

        const respaldo =
            await leerHTMLRespaldo();

        html = respaldo.html;
        nombreRespaldo = respaldo.nombre;
        usoRespaldo = true;
    }

    const $ = cheerio.load(html);

    limpiarHTML($);

    const titulo =
        obtenerTitulo($);

    const subtitulos =
        obtenerSubtitulos($);

    const parrafos =
        obtenerParrafos($);

    const listas =
        obtenerListas($);

    const enlaces =
        obtenerEnlaces($);

    const cifras =
        obtenerCifras([
            titulo,
            ...subtitulos,
            ...parrafos
        ]);

    return {

    htmlFuente: html,

    usoRespaldo,

    fuente: usoRespaldo
        ? "HTML_RESPALDO"
        : "URL",

    nombreRespaldo,

    mensaje: usoRespaldo
        ? `Se utilizó el HTML de respaldo: ${nombreRespaldo}`
        : "Se descargó correctamente la pieza madre desde la URL.",

    titulo,

    subtitulos,

    parrafos,

    listas,

    enlaces,

    cifras

};
}
//funcion para descargar el contenido html de una url

async function descargarHTML(url) {

    const respuesta =
        await fetch(url);

    if (!respuesta.ok) {

        throw new Error(
            `HTTP ${respuesta.status}`
        );
    }

    return await respuesta.text();
}
//funcion para leer un archivo html de respaldo en caso de que no se pueda descargar el contenido de la url

async function leerHTMLRespaldo() {

    const archivos =
        await fs.readdir(INPUT_DIR);

    const archivoHTML =
        archivos.find(
            archivo =>
                archivo.endsWith(".html")
        );

    if (!archivoHTML) {

        throw new Error(
            "No se encontró HTML de respaldo"
        );
    }

    const ruta =
        path.join(
            INPUT_DIR,
            archivoHTML
        );

    const html =
        await fs.readFile(
            ruta,
            "utf8"
        );

    return {
        html,
        nombre: archivoHTML
    };
}
//funcion para limpiar el contenido html eliminando etiquetas que no son necesarias para la extracción de información

function limpiarHTML($) {

    $("script").remove();

    $("style").remove();

    $("noscript").remove();

    $("footer").remove();
}
//funcion para obtener el titulo del contenido html
function obtenerTitulo($) {

    return $("h1")
        .first()
        .text()
        .trim();
}
//funcion para obtener los subtitulos del contenido html
function obtenerSubtitulos($) {

    const subtitulos = [];

    $("h2,h3").each(
        (_, elemento) => {

            subtitulos.push(
                $(elemento)
                .text()
                .trim()
            );
        }
    );

    return subtitulos;
}
//funcion para obtener los parrafos del contenido html
function obtenerParrafos($) {

    const parrafos = [];

    $("p").each(
        (_, elemento) => {

            const texto =
                $(elemento)
                .text()
                .trim();

            if (texto) {
                parrafos.push(texto);
            }
        }
    );

    return parrafos;
}
//funcion para obtener las listas del contenido html

function obtenerListas($) {

    const listas = [];

    $("ul").each(
        (_, lista) => {

            const items = [];

            $(lista)
                .find("li")
                .each((_, item) => {

                    items.push(
                        $(item)
                        .text()
                        .trim()
                    );
                });

            if (items.length) {
                listas.push(items);
            }
        }
    );

    return listas;
}
//funcion para obtener los enlaces del contenido html
function obtenerEnlaces($) {

    const enlaces = [];

    $("a").each(
        (_, enlace) => {

            const href =
                $(enlace)
                .attr("href");

            if (href) {
                enlaces.push(href);
            }
        }
    );

    return enlaces;
}
//funcion para obtener las cifras del contenido html
function obtenerCifras(textos) {

    const contenido =
        textos.join(" ");

    return (
        contenido.match(
            /\d+(?:[.,]\d+)?%?/g
        ) || []
    );
}


