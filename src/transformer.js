// Transforma el contenido de la pieza madre en piezas derivadas
// usando los formatos recomendados por el diagnóstico y config.json.

export function transformarContenido(contenido, diagnostico, config, urlFuente = "") {
    const piezas = [];
    const tema = contenido.titulo || contenido.subtitulos[0] || "Sin título";
    const itemsLista = contenido.listas.flat();

    let numero = 1;

    for (const formato of config.matriz_formatos) {
        // Solo genera piezas para los formatos que el diagnóstico aprobó
        if (!diagnostico.formatosRecomendados.includes(formato.id)) {
            continue;
        }

        const enlaceUTM = agregarUTM(urlFuente, config.utm, formato.id);
        let estructura = {};

        switch (formato.id) {
            case "post_linkedin":
                estructura = {
                    gancho: tema,
                    desarrollo: contenido.parrafos.slice(0, 2).join("\n\n"),
                    dato_clave: contenido.cifras[0] || "No disponible en la pieza madre",
                    llamado_a_la_accion: `Lee más aquí: ${enlaceUTM}`
                };
                break;

            case "carrusel_linkedin":
                estructura = {
                    portada: tema,
                    laminas: itemsLista.slice(0, 5),
                    cierre: `Consulta la guía completa: ${enlaceUTM}`
                };
                break;

            case "newsletter":
                estructura = {
                    asunto: tema,
                    introduccion: contenido.parrafos[0] || "",
                    secciones: contenido.subtitulos.slice(0, 3).map((subtitulo, i) => ({
                        titulo: subtitulo,
                        contenido: contenido.parrafos[i + 1] || ""
                    })),
                    llamado_a_la_accion: `Ver contenido completo: ${enlaceUTM}`
                };
                break;

            case "guion_video_corto":
                estructura = {
                    gancho: tema,
                    puntos_clave: [...contenido.subtitulos, ...itemsLista].slice(0, 4),
                    cierre: `Más detalles en: ${enlaceUTM}`
                };
                break;

            case "infografia":
                estructura = {
                    titulo: tema,
                    bloques: itemsLista.slice(0, 5),
                    cifras: contenido.cifras.slice(0, 3),
                    enlace: enlaceUTM
                };
                break;

            default:
                estructura = {
                    titulo: tema,
                    contenido: contenido.parrafos[0] || "",
                    enlace: enlaceUTM
                };
        }

        const textoCompleto = JSON.stringify(estructura, null, 2);

        piezas.push({
            id: `pieza_${numero}`,
            formato: formato.id,
            canal: formato.canal,
            tema,
            estado: "pendiente de aprobación",
            enlace_utm: enlaceUTM,
            estructura,
            texto_completo: textoCompleto
        });

        numero++;
    }

    return {
        titulo_pieza_madre: tema,
        total_piezas: piezas.length,
        piezas
    };
}

// Agrega los parámetros UTM de config.json al enlace de origen.
function agregarUTM(urlBase, utm, formatoId) {
    if (!urlBase || !utm) return urlBase;

    try {
        const url = new URL(urlBase);
        url.searchParams.set("utm_source", utm.utm_source);
        url.searchParams.set("utm_medium", utm.utm_medium);
        url.searchParams.set("utm_campaign", utm.utm_campaign);
        url.searchParams.set("utm_content", utm.utm_content || formatoId);
        return url.toString();
    } catch {
        return urlBase;
    }
}