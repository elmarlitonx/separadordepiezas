import test from "node:test";
import assert from "node:assert/strict";
import { transformarContenido } from "../src/transformer.js";

test("Genera al menos 2 piezas con UTM y estado pendiente de aprobación", () => {
    const contenido = {
        titulo: "Guía práctica de hábitos",
        subtitulos: ["Paso 1", "Paso 2", "Paso 3"],
        parrafos: ["Párrafo inicial.", "Segundo párrafo.", "Tercer párrafo.", "Cuarto párrafo."],
        listas: [["Punto A", "Punto B", "Punto C", "Punto D", "Punto E"]],
        enlaces: [],
        cifras: ["45%"]
    };

    const diagnostico = {
        formatosRecomendados: ["post_linkedin", "carrusel_linkedin"]
    };

    const config = {
        utm: {
            utm_source: "linkedin",
            utm_medium: "organico",
            utm_campaign: "campana_test",
            utm_content: ""
        },
        matriz_formatos: [
            { id: "post_linkedin", canal: "LinkedIn" },
            { id: "carrusel_linkedin", canal: "LinkedIn" },
            { id: "newsletter", canal: "Email" }
        ]
    };

    const resultado = transformarContenido(
        contenido,
        diagnostico,
        config,
        "https://sitio.com/guia"
    );

    assert.equal(resultado.total_piezas, 2);
    assert.equal(resultado.piezas[0].estado, "pendiente de aprobación");
    assert.match(resultado.piezas[0].enlace_utm, /utm_source=linkedin/);
    assert.equal(resultado.piezas[1].estructura.laminas.length, 5);
});