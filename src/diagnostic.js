
// Analiza el contenido de la pieza madre y genera un diagnóstico.

export function diagnosticarContenido(contenido, config) {

    // Unimos el texto para poder calcular las palabras.
    const textos = [
        contenido.titulo,
        ...contenido.subtitulos,
        ...contenido.parrafos,
        ...contenido.listas.flat()
    ].filter(Boolean);

    const textoCompleto = textos.join(" ");
    const palabras = textoCompleto.split(/\s+/).filter(Boolean);

    // Indicadores generales del contenido.
    const indicadores = {
        total_palabras: palabras.length,
        total_parrafos: contenido.parrafos.length,
        total_subtitulos: contenido.subtitulos.length,
        total_listas: contenido.listas.length,
        total_elementos_lista: contenido.listas.flat().length,
        total_cifras: contenido.cifras.length,
        total_enlaces: contenido.enlaces.length
    };

    // Alertas sobre posibles carencias.
    const alertas = [];

    if (!contenido.titulo) {
        alertas.push("La pieza madre no tiene título.");
    }

    if (contenido.parrafos.length === 0) {
        alertas.push("No se encontraron párrafos.");
    }

    if (contenido.subtitulos.length === 0) {
        alertas.push("No se encontraron subtítulos.");
    }

    if (contenido.cifras.length === 0) {
        alertas.push("No se encontraron cifras.");
    }

    if (contenido.listas.length === 0) {
        alertas.push("No se encontraron listas.");
    }

    // Evaluamos los formatos definidos en config.json.
    const formatos = config.matriz_formatos.map(formato => {

        const requisitos = formato.requiere_de_pieza_madre;
        let disponible = false;
        let motivo = "";

        switch (formato.id) {

            case "post_linkedin":
                disponible = contenido.parrafos.length >= 2;
                motivo = disponible
                    ? "Tiene contenido para desarrollar una idea."
                    : "Se necesita más contenido para desarrollar una idea.";
                break;

            case "carrusel_linkedin":
                disponible = indicadores.total_elementos_lista >= 5;
                motivo = disponible
                    ? "Se encontró una lista con suficientes elementos."
                    : requisitos.join(". ");
                break;

            case "newsletter":
                disponible = contenido.subtitulos.length >= 3;
                motivo = disponible
                    ? "Se encontraron al menos tres temas posibles."
                    : requisitos.join(". ");
                break;

            case "guion_video_corto":
                disponible =
                    contenido.subtitulos.length +
                    indicadores.total_elementos_lista >= 3;

                motivo = disponible
                    ? "Se encontraron al menos tres puntos posibles."
                    : requisitos.join(". ");
                break;

            case "caso_de_exito":
                disponible = false;
                motivo = "Se debe verificar manualmente el testimonio, el nombre, el cargo y los resultados medibles del cliente.";
                break;

            case "infografia":
                disponible = indicadores.total_elementos_lista >= 5;
                motivo = disponible
                    ? "Se encontraron suficientes elementos para evaluar una infografía. Falta verificar las fuentes."
                    : requisitos.join(". ");
                break;

            default:
                motivo = "Formato pendiente de evaluación.";
        }

        return {
            id: formato.id,
            canal: formato.canal,
            disponible,
            motivo
        };
    });

    // Identificamos los formatos que podrían utilizarse.
    const formatosRecomendados = formatos
        .filter(formato => formato.disponible)
        .map(formato => formato.id);

    // Información que falta para formatos no disponibles.
    const informacionFaltante = formatos
        .filter(formato => !formato.disponible)
        .map(formato => ({
            formato: formato.id,
            motivo: formato.motivo
        }));

    return {
        titulo: contenido.titulo,
        fuente: contenido.fuente,
        usoRespaldo: contenido.usoRespaldo,
        indicadores,
        alertas,
        formatos,
        formatosRecomendados,
        informacionFaltante
    };
}
