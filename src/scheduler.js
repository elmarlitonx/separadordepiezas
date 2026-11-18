// Programa las piezas válidas dentro de la ventana de calendario
// priorizando los días y franjas con mejores interacciones en el historial,
// y respetando festivos, días hábiles, capacidades y separación por tema.

export function programarCalendario(resultadoValidacion, entradas) {
    const piezas = resultadoValidacion.piezas_validas || [];
    const ventana = entradas.ventana || {};
    const reglas = entradas.config?.calendario || {};
    const ocupado = entradas.calendarioOcupado || [];
    const historial = entradas.historial || [];

    const diasHabiles = (reglas.dias_habiles || []).map(normalizarTexto);
    const franjas = (reglas.franjas_de_publicacion || []).map(normalizarHora).filter(Boolean);
    const festivos = new Set((reglas.festivos || []).map(normalizarFecha));
    const maxPorDia = reglas.capacidad_max_por_dia ?? 1;
    const maxPorSemana = reglas.capacidad_max_por_semana ?? 5;
    const separacionHoras = reglas.separacion_minima_mismo_tema_horas ?? 24;

    // 1. Cargar lo ya ocupado en el calendario
    const slotsOcupados = new Set();
    const conteoPorDia = {};
    const conteoPorSemana = {};
    const historialTemas = [];

    for (const fila of ocupado) {
        const fecha = normalizarFecha(fila.fecha);
        const hora = normalizarHora(fila.hora);
        if (!fecha || !hora) continue;

        slotsOcupados.add(`${fecha}|${hora}`);
        conteoPorDia[fecha] = (conteoPorDia[fecha] || 0) + 1;

        const semana = obtenerClaveSemana(fecha);
        conteoPorSemana[semana] = (conteoPorSemana[semana] || 0) + 1;

        if (fila.tema) {
            historialTemas.push({
                tema: normalizarTexto(fila.tema),
                fechaHoraMs: convertirAMilisegundos(fecha, hora)
            });
        }
    }

    // 2. Preparar los registros del historial con su día de la semana y rendimiento
    const datosHistorial = prepararHistorial(historial);

    // 3. Generar todos los espacios (fecha + franja) válidos de la ventana
    const diasVentana = generarDiasEnVentana(ventana.inicio, ventana.fin);
    const espaciosCandidatos = [];

    for (const fecha of diasVentana) {
        if (festivos.has(fecha)) continue;
        if (!esDiaHabil(fecha, diasHabiles)) continue;

        const semana = obtenerClaveSemana(fecha);
        const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();

        for (const hora of franjas) {
            espaciosCandidatos.push({ fecha, hora, semana, diaSemana });
        }
    }

    const programadas = [];
    const noUbicadas = [];

    // 4. Para cada pieza, ordenar los espacios del mejor al peor según el historial
    for (const pieza of piezas) {
        const temaNormalizado = normalizarTexto(pieza.tema);
        const formatoNormalizado = normalizarTexto(pieza.formato);

        const espaciosOrdenados = [...espaciosCandidatos].sort((a, b) => {
            const puntajeB = puntuarEspacio(b, formatoNormalizado, temaNormalizado, datosHistorial);
            const puntajeA = puntuarEspacio(a, formatoNormalizado, temaNormalizado, datosHistorial);
            if (puntajeB !== puntajeA) return puntajeB - puntajeA;
            return `${a.fecha}|${a.hora}`.localeCompare(`${b.fecha}|${b.hora}`);
        });

        let ubicada = false;

        for (const espacio of espaciosOrdenados) {
            const { fecha, hora, semana } = espacio;
            const claveSlot = `${fecha}|${hora}`;

            if (slotsOcupados.has(claveSlot)) continue;
            if ((conteoPorDia[fecha] || 0) >= maxPorDia) continue;
            if ((conteoPorSemana[semana] || 0) >= maxPorSemana) continue;

            const fechaHoraMs = convertirAMilisegundos(fecha, hora);
            if (!cumpleSeparacionTema(temaNormalizado, fechaHoraMs, historialTemas, separacionHoras)) {
                continue;
            }

            // Reservar el mejor espacio disponible que cumple todas las reglas
            slotsOcupados.add(claveSlot);
            conteoPorDia[fecha] = (conteoPorDia[fecha] || 0) + 1;
            conteoPorSemana[semana] = (conteoPorSemana[semana] || 0) + 1;
            historialTemas.push({ tema: temaNormalizado, fechaHoraMs });

            programadas.push({
                ...pieza,
                fecha_programada: fecha,
                hora_programada: hora,
                semana,
                ubicada: true,
                estado: "pendiente de aprobación"
            });

            ubicada = true;
            break;
        }

        if (!ubicada) {
            noUbicadas.push({
                ...pieza,
                fecha_programada: null,
                hora_programada: null,
                ubicada: false,
                estado: "no se pudo ubicar",
                motivo_no_ubicada: "No hay espacios disponibles dentro de la ventana sin romper las reglas."
            });
        }
    }

    return {
        total_recibidas: piezas.length,
        total_programadas: programadas.length,
        total_no_ubicadas: noUbicadas.length,
        programadas,
        no_ubicadas: noUbicadas
    };
}

/* =====================================================
   CÁLCULO DE MEJOR DÍA Y FRANJA SEGÚN HISTORIAL
===================================================== */

function prepararHistorial(historial) {
    const lista = [];

    for (const fila of historial) {
        const fecha = normalizarFecha(fila.fecha);
        if (!fecha) continue;

        const reacciones = Number(fila.reacciones) || 0;
        const comentarios = Number(fila.comentarios) || 0;
        const clics = Number(fila.clics) || 0;
        const interacciones = reacciones + comentarios + clics;

        lista.push({
            diaSemana: new Date(`${fecha}T00:00:00Z`).getUTCDay(),
            hora: normalizarHora(fila.hora),
            formato: normalizarTexto(fila.formato),
            tema: normalizarTexto(fila.tema),
            interacciones
        });
    }

    return lista;
}

function puntuarEspacio(espacio, formato, tema, datosHistorial) {
    // 1. Filtrar primero solo las publicaciones del MISMO formato
    const delFormato = datosHistorial.filter(reg => reg.formato === formato);
    const base = delFormato.length > 0 ? delFormato : datosHistorial;

    // 2. Buscar coincidencia exacta de día + hora para ese formato
    const exactos = base.filter(
        reg => reg.diaSemana === espacio.diaSemana && reg.hora === espacio.hora
    );
    if (exactos.length > 0) {
        return promedioInteracciones(exactos, tema);
    }

    // 3. Si no hay combinación exacta, promediar el rendimiento del día y de la hora por separado
    const mismoDia = base.filter(reg => reg.diaSemana === espacio.diaSemana);
    const mismaHora = base.filter(reg => reg.hora === espacio.hora);
    const combinados = [...mismoDia, ...mismaHora];

    if (combinados.length > 0) {
        return promedioInteracciones(combinados, tema);
    }

    return 0;
}

function promedioInteracciones(lista, tema) {
    let suma = 0;
    for (const reg of lista) {
        const bonoTema = reg.tema && tema.includes(reg.tema) ? 1.2 : 1;
        suma += reg.interacciones * bonoTema;
    }
    return suma / lista.length;
}

/* =====================================================
   FUNCIONES DE APOYO
===================================================== */

function generarDiasEnVentana(inicio, fin) {
    const fechaInicio = normalizarFecha(inicio);
    const fechaFin = normalizarFecha(fin);
    if (!fechaInicio || !fechaFin || fechaInicio > fechaFin) return [];

    const dias = [];
    const actual = new Date(`${fechaInicio}T00:00:00Z`);
    const limite = new Date(`${fechaFin}T00:00:00Z`);

    while (actual <= limite) {
        dias.push(actual.toISOString().slice(0, 10));
        actual.setUTCDate(actual.getUTCDate() + 1);
    }

    return dias;
}

function esDiaHabil(fecha, diasHabiles) {
    if (diasHabiles.length === 0) return true;
    const nombres = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();
    return diasHabiles.includes(nombres[diaSemana]);
}

function cumpleSeparacionTema(tema, fechaHoraMs, historialTemas, separacionHoras) {
    const separacionMs = separacionHoras * 60 * 60 * 1000;

    for (const registro of historialTemas) {
        if (registro.tema === tema) {
            const diferencia = Math.abs(fechaHoraMs - registro.fechaHoraMs);
            if (diferencia < separacionMs) {
                return false;
            }
        }
    }

    return true;
}

function obtenerClaveSemana(fecha) {
    const d = new Date(`${fecha}T00:00:00Z`);
    const dia = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 1 - dia);
    return `semana_${d.toISOString().slice(0, 10)}`;
}

function convertirAMilisegundos(fecha, hora) {
    return new Date(`${fecha}T${hora}:00Z`).getTime();
}

function normalizarFecha(valor) {
    if (!valor || typeof valor !== "string") return "";
    const texto = valor.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
        const [dia, mes, anio] = texto.split("/");
        return `${anio}-${mes}-${dia}`;
    }

    const matchMes = texto.match(/^(\d{1,2})-([a-zA-Z]{3})-(\d{4})$/);
    if (matchMes) {
        const meses = {
            ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06",
            jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12",
            jan: "01", apr: "04", aug: "08", dec: "12"
        };
        const dia = matchMes[1].padStart(2, "0");
        const mes = meses[matchMes[2].toLowerCase()];
        const anio = matchMes[3];
        if (mes) return `${anio}-${mes}-${dia}`;
    }

    return "";
}

function normalizarHora(valor) {
    if (!valor || typeof valor !== "string") return "";
    const [h, m] = valor.trim().split(":");
    if (!h || !m) return "";
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function normalizarTexto(texto) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}