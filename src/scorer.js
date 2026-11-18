// Calcula un puntaje de 0 a 100 y el nivel de confianza para cada pieza programada
// apoyándose en los datos de historial_publicaciones.csv.

export function calcularPuntuaciones(resultadoCalendario, historial = []) {
    const programadas = resultadoCalendario.programadas || [];

    // 1. Filtrar filas del historial que tengan tasa de interacción válida
    const filasValidas = [];
    for (const fila of historial) {
        const tasa = convertirNumero(fila.tasa_interaccion);
        if (tasa !== null) {
            filasValidas.push({
                formato: normalizarTexto(fila.formato),
                tasa
            });
        }
    }

    // Calcular la tasa máxima del historial para escalar el puntaje de 0 a 100
    let tasaMaxima = 0;
    for (const fila of filasValidas) {
        if (fila.tasa > tasaMaxima) {
            tasaMaxima = fila.tasa;
        }
    }

    const avisos = [];
    const piezasPuntuadas = [];

    // 2. Calcular puntaje y confianza para cada pieza programada
    for (const pieza of programadas) {
        const formatoPieza = normalizarTexto(pieza.formato);
        const coincidencias = filasValidas.filter(f => f.formato === formatoPieza);

        let puntaje = 50; // Valor base si no hay historial suficiente
        let nivelConfianza = "baja";
        let motivoConfianza = "";

        if (filasValidas.length === 0 || tasaMaxima === 0) {
            motivoConfianza = "No hay datos numéricos válidos en el historial; se asignó puntaje base.";
            avisos.push(`${pieza.id}: ${motivoConfianza}`);
        } else if (coincidencias.length === 0) {
            const promedioGeneral = calcularPromedio(filasValidas);
            puntaje = Math.round((promedioGeneral / tasaMaxima) * 100);
            motivoConfianza = `Sin registros previos para "${pieza.formato}"; se usó el promedio general del historial.`;
            avisos.push(`${pieza.id}: ${motivoConfianza}`);
        } else {
            const promedioFormato = calcularPromedio(coincidencias);
            puntaje = Math.round((promedioFormato / tasaMaxima) * 100);

            if (coincidencias.length >= 5) {
                nivelConfianza = "alta";
                motivoConfianza = `Basado en ${coincidencias.length} publicaciones previas del mismo formato.`;
            } else if (coincidencias.length >= 2) {
                nivelConfianza = "media";
                motivoConfianza = `Basado en ${coincidencias.length} publicaciones previas del mismo formato.`;
            } else {
                nivelConfianza = "baja";
                motivoConfianza = "Solo hay 1 publicación previa de este formato en el historial.";
                avisos.push(`${pieza.id}: Baja confianza (${motivoConfianza})`);
            }
        }

        // Asegurar que el puntaje siempre quede entre 0 y 100
        puntaje = Math.max(0, Math.min(100, puntaje));

        piezasPuntuadas.push({
            ...pieza,
            puntaje,
            nivel_confianza: nivelConfianza,
            motivo_confianza: motivoConfianza
        });
    }

    return {
        total_puntuadas: piezasPuntuadas.length,
        piezas_puntuadas: piezasPuntuadas,
        no_ubicadas: resultadoCalendario.no_ubicadas || [],
        avisos_confianza: avisos
    };
}

/* =====================================================
   FUNCIONES DE APOYO
===================================================== */

function calcularPromedio(lista) {
    let suma = 0;
    for (const item of lista) {
        suma += item.tasa;
    }
    return suma / lista.length;
}

function convertirNumero(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    const limpio = String(valor).replace("%", "").replace(",", ".").trim();
    const numero = Number(limpio);
    return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function normalizarTexto(texto) {
    return String(texto || "").toLowerCase().trim();
}