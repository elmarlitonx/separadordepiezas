import { cargarEntradas } from "./input.js";
import { extraerContenido } from "./extractor.js";

async function main() {

    const entradas =
        await cargarEntradas(
            "https://cliente.com/blog/rpa"
        );

    const piezaMadre =
        await extraerContenido(
            entradas.url
        );

    console.log(piezaMadre);
}

main();