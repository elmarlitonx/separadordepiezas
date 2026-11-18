import { extraerContenido } from "../src/extractor.js";

const resultado = await extraerContenido(
    "https://vidasaludable.gob.mx/alimentacion-saludable"
);

console.log(resultado);