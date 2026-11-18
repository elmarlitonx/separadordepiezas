
import { cargarEntradas } from "../src/input.js";
import { extraerContenido } from "../src/extractor.js";
import { diagnosticarContenido } from "../src/diagnostic.js";

const entradas = await cargarEntradas(
    "https://example.com"
);

const contenido = await extraerContenido(
    entradas.url
);

const resultado = diagnosticarContenido(
    contenido,
    entradas.config
);

console.log(resultado);
