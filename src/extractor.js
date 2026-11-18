import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const INPUT_DIR = "./inputs";

// Función principal para extraer el contenido de una URL.
// Si falla la descarga o llega un HTML vacío, usa el respaldo local.
export async function extraerContenido(url) {
    let html;
    let usoRespaldo = false;
    let nombreRespaldo = null;

    try {
        html = await descargarHTML(url);
    } catch {
        const respaldo = await leerHTMLRespaldo();
        html = respaldo.html;
        nombreRespaldo = respaldo.nombre;
        usoRespaldo = true;
    }

    let datos = procesarHTML(html);

    // Si la URL devolvió un HTML vacío (ej. página bloqueada o hecha en JS), usar el respaldo
    if (!usoRespaldo && !datos.titulo && datos.parrafos.length === 0 && datos.listas.length === 0) {
        const respaldo = await leerHTMLRespaldo();
        html = respaldo.html;
        nombreRespaldo = respaldo.nombre;
        usoRespaldo = true;
        datos = procesarHTML(html);
    }

    return {
        htmlFuente: html,
        usoRespaldo,
        fuente: usoRespaldo ? "HTML_RESPALDO" : "URL",
        nombreRespaldo,
        mensaje: usoRespaldo
            ? `Se utilizó el HTML de respaldo: ${nombreRespaldo}`
            : "Se descargó correctamente la pieza madre desde la URL.",
        ...datos
    };
}

function procesarHTML(html) {
    const $ = cheerio.load(html);
    limpiarHTML($);

    const titulo = obtenerTitulo($);
    const subtitulos = obtenerSubtitulos($);
    const parrafos = obtenerParrafos($);
    const listas = obtenerListas($);
    const enlaces = obtenerEnlaces($);
    const cifras = obtenerCifras([titulo, ...subtitulos, ...parrafos]);

    return { titulo, subtitulos, parrafos, listas, enlaces, cifras };
}

async function descargarHTML(url) {
    const respuesta = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml"
        }
    });

    if (!respuesta.ok) {
        throw new Error(`HTTP ${respuesta.status}`);
    }

    return await respuesta.text();
}

async function leerHTMLRespaldo() {
    const archivos = await fs.readdir(INPUT_DIR);
    const archivoHTML = archivos.find(archivo => archivo.endsWith(".html"));

    if (!archivoHTML) {
        throw new Error("No se encontró HTML de respaldo");
    }

    const ruta = path.join(INPUT_DIR, archivoHTML);
    const html = await fs.readFile(ruta, "utf8");

    return {
        html,
        nombre: archivoHTML
    };
}

function limpiarHTML($) {
    $("script").remove();
    $("style").remove();
    $("noscript").remove();
    $("footer").remove();
}

function obtenerTitulo($) {
    return $("h1").first().text().trim();
}

function obtenerSubtitulos($) {
    const subtitulos = [];
    $("h2,h3").each((_, elemento) => {
        subtitulos.push($(elemento).text().trim());
    });
    return subtitulos;
}

function obtenerParrafos($) {
    const parrafos = [];
    $("p").each((_, elemento) => {
        const texto = $(elemento).text().trim();
        if (texto) {
            parrafos.push(texto);
        }
    });
    return parrafos;
}

function obtenerListas($) {
    const listas = [];
    $("ul").each((_, lista) => {
        const items = [];
        $(lista).find("li").each((_, item) => {
            items.push($(item).text().trim());
        });
        if (items.length) {
            listas.push(items);
        }
    });
    return listas;
}

function obtenerEnlaces($) {
    const enlaces = [];
    $("a").each((_, enlace) => {
        const href = $(enlace).attr("href");
        if (href) {
            enlaces.push(href);
        }
    });
    return enlaces;
}

function obtenerCifras(textos) {
    const contenido = textos.join(" ");
    return contenido.match(/\d+(?:[.,]\d+)?%?/g) || [];
}