// Valida cada pieza derivada contra las reglas de config.json
// y verifica que no contenga cifras inventadas fuera de la pieza madre.

export function validarPiezas(resultadoTransformacion, contenido, config) {
    const piezas = resultadoTransformacion.piezas || [];

    // Unimos las cifras extraídas + las cifras que vengan dentro de las listas de la pieza madre
    const cifrasEnListas = (contenido.listas || []).flat().join(" ").match(/\d+(?:[.,]\d+)?%?/g) || [];
    const cifrasMadre = new Set([...(contenido.cifras || []), ...cifrasEnListas]);

    const terminosProhibidos = Array.isArray(config.terminos_prohibidos) ? config.terminos_prohibidos : [];
    const nombresConfidenciales = Array.isArray(config.nombres_confidenciales) ? config.nombres_confidenciales : [];
    const productosNoVigentes = Array.isArray(config.productos_no_vigentes) ? config.productos_no_vigentes : [];

    const piezasValidas = [];
    const piezasRechazadas = [];

    for (const pieza of piezas) {
        const motivos = [];
        let requiereRevision = false;

        // Quitamos el enlace UTM para no confundir números de la URL con cifras del texto
        const textoSinUrl = (pieza.texto_completo || "").replaceAll(pieza.enlace_utm || "", "");
        const textoMinusculas = textoSinUrl.toLowerCase();

        // 1. Validar términos prohibidos
        for (const item of terminosProhibidos) {
            const termino = obtenerTexto(item);
            if (termino && textoMinusculas.includes(termino.toLowerCase())) {
                motivos.push(`Contiene término prohibido: "${termino}"`);
            }
        }

        // 2. Validar nombres confidenciales
        for (const item of nombresConfidenciales) {
            const nombre = obtenerTexto(item);
            if (nombre && textoMinusculas.includes(nombre.toLowerCase())) {
                motivos.push(`Contiene nombre confidencial: "${nombre}"`);
            }
        }

        // 3. Validar que no mencione productos no vigentes o descontinuados
        for (const item of productosNoVigentes) {
            const producto = obtenerTexto(item);
            if (producto && textoMinusculas.includes(producto.toLowerCase())) {
                motivos.push(`Menciona un producto no vigente: "${producto}"`);
            }
        }

        // 4. Validar que todas las cifras existan en la pieza madre (RF-11)
        const cifrasEnPieza = textoSinUrl.match(/\d+(?:[.,]\d+)?%?/g) || [];
        for (const cifra of cifrasEnPieza) {
            if (!cifrasMadre.has(cifra)) {
                requiereRevision = true;
                motivos.push(`Cifra sin fuente en la pieza madre (marcar para revisión): ${cifra}`);
            }
        }

        const esValida = motivos.length === 0;

        const piezaEvaluada = {
            ...pieza,
            valida: esValida,
            requiere_revision: requiereRevision,
            motivos_rechazo: motivos,
            estado: esValida ? "pendiente de aprobación" : "rechazada"
        };

        if (esValida) {
            piezasValidas.push(piezaEvaluada);
        } else {
            piezasRechazadas.push(piezaEvaluada);
        }
    }

    return {
        total_evaluadas: piezas.length,
        total_validas: piezasValidas.length,
        total_rechazadas: piezasRechazadas.length,
        piezas_validas: piezasValidas,
        piezas_rechazadas: piezasRechazadas
    };
}

function obtenerTexto(item) {
    if (typeof item === "string") return item.trim();
    if (item && typeof item === "object") {
        const valor = item.termino || item.nombre || item.producto || item.palabra || item.valor;
        if (typeof valor === "string") return valor.trim();
        const primerTexto = Object.values(item).find(v => typeof v === "string");
        return primerTexto ? primerTexto.trim() : "";
    }
    return "";
}