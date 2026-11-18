// API REST con Express que expone el flujo completo del sistema.

import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { cargarEntradas } from "./input.js";
import { extraerContenido } from "./extractor.js";
import { diagnosticarContenido } from "./diagnostic.js";
import { transformarContenido } from "./transformer.js";
import { validarPiezas } from "./validator.js";
import { programarCalendario } from "./scheduler.js";
import { calcularPuntuaciones } from "./scorer.js";
import { generarReportes } from "./report.js";

const app = express();
const PUERTO = 3001;

app.use(express.json());

// Ruta 1: Verificar que la API responde
app.get("/", (req, res) => {
    res.json({
        mensaje: "API del Separador de Piezas funcionando",
        rutas: {
            estado: "GET /api/estado",
            resultados: "GET /api/resultados",
            procesar: "POST /api/procesar"
        }
    });
});
app.get("/api/estado", (req, res) => {
    res.json({ ok: true, mensaje: "API del separador de piezas activa" });
});

// Ruta 2: Ejecutar todo el proceso enviando una URL
app.post("/api/procesar", async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: "Debes enviar una 'url' en el body." });
        }

        const entradas = await cargarEntradas(url);
        const contenido = await extraerContenido(entradas.url);
        const diagnostico = diagnosticarContenido(contenido, entradas.config);
        const transformacion = transformarContenido(contenido, diagnostico, entradas.config, entradas.url);
        const validacion = validarPiezas(transformacion, contenido, entradas.config);
        const calendario = programarCalendario(validacion, entradas);
        const puntuacion = calcularPuntuaciones(calendario, entradas.historial);

        const reporte = await generarReportes({
            entradas,
            contenido,
            diagnostico,
            transformacion,
            validacion,
            calendario,
            puntuacion
        });

        res.json({
            ok: true,
            fuente: contenido.mensaje,
            resumen: {
                piezas_generadas: transformacion.total_piezas,
                piezas_validas: validacion.total_validas,
                piezas_rechazadas: validacion.total_rechazadas,
                piezas_programadas: calendario.total_programadas,
                piezas_no_ubicadas: calendario.total_no_ubicadas
            },
            archivos: reporte.archivos,
            programadas: puntuacion.piezas_puntuadas,
            no_ubicadas: puntuacion.no_ubicadas
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta 3: Consultar los últimos resultados guardados en outputs/
app.get("/api/resultados", async (req, res) => {
    try {
        const leer = async (archivo) => {
            const texto = await fs.readFile(path.join("./outputs", archivo), "utf8");
            return JSON.parse(texto);
        };

        const [diagnostico, piezas, calendario, avisos] = await Promise.all([
            leer("diagnostico.json"),
            leer("piezas_derivadas.json"),
            leer("calendario.json"),
            leer("anomalias_y_avisos.json")
        ]);

        res.json({ diagnostico, piezas, calendario, avisos });
    } catch {
        res.status(404).json({ error: "Aún no hay resultados. Ejecuta primero POST /api/procesar." });
    }
});

app.listen(PUERTO, () => {
    console.log(`API escuchando en http://localhost:${PUERTO}`);
});