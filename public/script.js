// Lee window.RESULTADOS_SISTEMA (cargado desde outputs/datos.js) y dibuja la vista semanal.

const datos = window.RESULTADOS_SISTEMA;

if (!datos) {
    document.getElementById("info-pieza-madre").textContent =
        "No se encontraron resultados. Ejecuta primero: node src/index.js <URL>";
} else {
    mostrarEncabezado();
    mostrarCalendarioSemanal();
    mostrarNoUbicadas();
    mostrarRechazadas();
    mostrarAvisos();
}

function mostrarEncabezado() {
    const info = document.getElementById("info-pieza-madre");
    info.textContent = `Pieza madre: ${datos.pieza_madre.titulo || "Sin título"} | Ventana: ${datos.ventana.inicio} a ${datos.ventana.fin}`;

    if (datos.pieza_madre.uso_respaldo) {
        const alerta = document.getElementById("alerta-respaldo");
        alerta.textContent = datos.avisos.mensaje_fuente || "Se utilizó el HTML de respaldo.";
        alerta.classList.remove("oculto");
    }
}

function mostrarCalendarioSemanal() {
    const contenedor = document.getElementById("calendario-semanal");
    contenedor.innerHTML = "";

    const filtroFormato = document.getElementById("filtro-formato").value;
    const filtroEstado = document.getElementById("filtro-estado").value;

    const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    // Crear las 7 columnas de la semana
    const columnas = [];
    for (const nombreDia of diasSemana) {
        const div = document.createElement("div");
        div.className = "columna-dia";
        div.innerHTML = `<h3>${nombreDia}</h3>`;
        contenedor.appendChild(div);
        columnas.push(div);
    }

    // Mostrar horarios ya ocupados del calendario_ocupado.csv según el filtro
    if (filtroFormato === "todos" && (filtroEstado === "todos" || filtroEstado === "ocupado")) {
        for (const ocupado of datos.calendario_ocupado || []) {
            const idx = obtenerIndiceDia(ocupado.fecha);
            if (idx === -1) continue;

            const tarjeta = document.createElement("div");
            tarjeta.className = "tarjeta tarjeta-ocupado";
            tarjeta.innerHTML = `
                <strong>Ocupado (${ocupado.hora || ""})</strong><br>
                <span>${ocupado.tema || "Sin tema"}</span><br>
                <small>${ocupado.fecha}</small>
            `;
            columnas[idx].appendChild(tarjeta);
        }
    }

    // Mostrar piezas programadas filtradas por formato y estado (RF-15 y RF-16)
    for (const pieza of datos.programadas || []) {
        if (filtroFormato !== "todos" && pieza.formato !== filtroFormato) continue;
        if (filtroEstado !== "todos" && pieza.estado !== filtroEstado) continue;

        const idx = obtenerIndiceDia(pieza.fecha_programada);
        if (idx === -1) continue;

        const yaAprobada = pieza.estado === "aprobada por LC/DM";

        const tarjeta = document.createElement("div");
        tarjeta.className = `tarjeta tarjeta-clickeable borde-${pieza.formato}`;
        tarjeta.innerHTML = `
            <strong>${pieza.formato}</strong> (${pieza.hora_programada})<br>
            <div><strong>Fecha:</strong> ${pieza.fecha_programada}</div>
            <div><strong>Tema:</strong> ${pieza.tema}</div>
            <div><strong>Puntaje:</strong> ${pieza.puntaje}/100 (${pieza.nivel_confianza})</div>
            <span class="estado ${yaAprobada ? "aprobada" : ""}">${pieza.estado}</span><br>
            <button class="btn-aprobar" ${yaAprobada ? "disabled" : ""}>
                ${yaAprobada ? "Aprobada" : "Aprobar (LC / DM)"}
            </button>
        `;

        // Al hacer clic en la tarjeta se abre el detalle completo de la pieza
        tarjeta.addEventListener("click", () => abrirDetallePieza(pieza));

        // Aprobación humana local (RF-16: no publica en LinkedIn)
        const boton = tarjeta.querySelector(".btn-aprobar");
        boton.addEventListener("click", (evento) => {
            evento.stopPropagation();
            pieza.estado = "aprobada por LC/DM";
            mostrarCalendarioSemanal();
        });

        columnas[idx].appendChild(tarjeta);
    }
}

document.getElementById("filtro-formato").addEventListener("change", mostrarCalendarioSemanal);
document.getElementById("filtro-estado").addEventListener("change", mostrarCalendarioSemanal);

function abrirDetallePieza(pieza) {
    const modal = document.getElementById("modal-pieza");
    const titulo = document.getElementById("modal-titulo");
    const cuerpo = document.getElementById("modal-cuerpo");
    const enlace = document.getElementById("modal-enlace-utm");
    const btnCopiar = document.getElementById("modal-copiar");

    titulo.textContent = `${pieza.formato} — ${pieza.tema}`;
    cuerpo.innerHTML = "";

    const estructura = pieza.estructura || {};
    for (const [parte, valor] of Object.entries(estructura)) {
        const div = document.createElement("div");
        div.className = "bloque-parte";

        let contenidoTexto = "";
        if (Array.isArray(valor)) {
            contenidoTexto = valor.map((item, i) =>
                typeof item === "object"
                    ? `${i + 1}. ${item.titulo || ""}: ${item.contenido || ""}`
                    : `${i + 1}. ${item}`
            ).join("\n");
        } else {
            contenidoTexto = String(valor || "");
        }

        div.innerHTML = `<strong>${parte.toUpperCase()}:</strong>\n${contenidoTexto}`;
        cuerpo.appendChild(div);
    }

    enlace.href = pieza.enlace_utm || "#";
    enlace.style.display = pieza.enlace_utm ? "inline-block" : "none";

    btnCopiar.onclick = () => {
        navigator.clipboard.writeText(cuerpo.innerText);
        btnCopiar.textContent = "¡Copiado!";
        setTimeout(() => { btnCopiar.textContent = "Copiar texto"; }, 1500);
    };

    modal.classList.remove("oculto");
}

document.getElementById("cerrar-modal").addEventListener("click", () => {
    document.getElementById("modal-pieza").classList.add("oculto");
});

function mostrarNoUbicadas() {
    const contenedor = document.getElementById("lista-no-ubicadas");
    const lista = datos.no_ubicadas || [];

    if (lista.length === 0) {
        contenedor.innerHTML = "<p>Todas las piezas válidas fueron ubicadas sin conflictos.</p>";
        return;
    }

    for (const pieza of lista) {
        const tarjeta = document.createElement("div");
        tarjeta.className = "tarjeta tarjeta-conflicto";
        tarjeta.innerHTML = `
            <strong>${pieza.formato}</strong> - ${pieza.tema}<br>
            <div><strong>Estado:</strong> ${pieza.estado}</div>
            <div><strong>Motivo:</strong> ${pieza.motivo_no_ubicada}</div>
        `;
        contenedor.appendChild(tarjeta);
    }
}

function mostrarRechazadas() {
    const contenedor = document.getElementById("lista-rechazadas");
    const lista = datos.rechazadas || [];

    if (lista.length === 0) {
        contenedor.innerHTML = "<p>No hubo piezas rechazadas por reglas.</p>";
        return;
    }

    for (const pieza of lista) {
        const tarjeta = document.createElement("div");
        tarjeta.className = "tarjeta tarjeta-conflicto";
        tarjeta.innerHTML = `
            <strong>${pieza.formato}</strong> (${pieza.id})<br>
            <div><strong>Motivos:</strong> ${(pieza.motivos_rechazo || []).join("; ")}</div>
        `;
        contenedor.appendChild(tarjeta);
    }
}

function mostrarAvisos() {
    const lista = document.getElementById("lista-avisos");
    const avisos = [];

    for (const anomalia of datos.avisos.anomalias_entrada || []) {
        avisos.push(`[${anomalia.archivo}] ${anomalia.tipo}: ${anomalia.detalle}`);
    }
    for (const conf of datos.avisos.avisos_confianza || []) {
        avisos.push(`[Confianza] ${conf}`);
    }

    if (avisos.length === 0) {
        lista.innerHTML = "<li>No se registraron anomalías ni avisos.</li>";
        return;
    }

    for (const texto of avisos) {
        const li = document.createElement("li");
        li.textContent = texto;
        lista.appendChild(li);
    }
}

// Devuelve 0 para Lunes ... 6 para Domingo
function obtenerIndiceDia(fechaTexto) {
    if (!fechaTexto) return -1;

    let iso = fechaTexto.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) {
        const [d, m, a] = iso.split("/");
        iso = `${a}-${m}-${d}`;
    }

    const fecha = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(fecha.getTime())) return -1;

    const diaUTC = fecha.getUTCDay(); // 0=Dom, 1=Lun ... 6=Sab
    return diaUTC === 0 ? 6 : diaUTC - 1;
}