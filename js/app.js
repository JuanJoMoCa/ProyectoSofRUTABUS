

// Icono para paradas
const iconParada = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61205.png",
  iconSize: [20, 20]
});

// Inicializar mapa centrado en Xalapa
const map = L.map("map").setView([19.5438, -96.9103], 13);

// Capa base OSM
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
}).addTo(map);

// Capas activas por ruta: { ruta: Layer|null, paradas: Layer|null, button: HTMLElement }
const capas = {};

// Helpers
function safeRemove(layer) {
  if (layer && map.hasLayer(layer)) {
    map.removeLayer(layer);
  }
}

function hasFeatures(geojson) {
  return geojson && Array.isArray(geojson.features) && geojson.features.length > 0;
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) {
    return null;
  }
  try {
    return await res.json();
  } catch (_e) {
    console.warn("Respuesta no JSON para", url);
    return null;
  }
}

// Mostrar/ocultar una ruta
async function mostrarRuta(numRuta, idStops, buttonEl) {
  // Toggle: si ya está activa, quitar y salir
  if (capas[numRuta]) {
    safeRemove(capas[numRuta].ruta);
    safeRemove(capas[numRuta].paradas);
    capas[numRuta].button?.classList.remove("active");
    delete capas[numRuta];
    return;
  }

  // Marcar el botón como activo
  buttonEl.classList.add("active");
  capas[numRuta] = { ruta: null, paradas: null, button: buttonEl };

  // 1) Cargar la línea
  const rutaUrl = `./data/${numRuta}/route.json`;
  const geoRuta = await fetchJSON(rutaUrl);

  if (geoRuta && hasFeatures(geoRuta)) {
    const capaRuta = L.geoJSON(geoRuta, {
      style: { color: "green", weight: 4 }
    }).addTo(map);
    capas[numRuta].ruta = capaRuta;

    // fitBounds seguro
    const bounds = capaRuta.getBounds();
    if (bounds && bounds.isValid && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  } else {
    console.warn(`No se pudo cargar la línea de la ruta ${numRuta} (${rutaUrl}).`);
  }

  // 2) Cargar paradas (si existe archivo)
  const stopsUrl = `./data/${numRuta}/route_${idStops}_stops.geojson`;
  const geoStops = await fetchJSON(stopsUrl);

  if (geoStops && hasFeatures(geoStops)) {
    const capaParadas = L.geoJSON(geoStops, {
      pointToLayer: (feature, latlng) =>
        L.marker(latlng, { icon: iconParada }).bindPopup(
          `<b>Parada:</b> ${feature?.properties?.name || "Sin nombre"}`
        )
    }).addTo(map);
    capas[numRuta].paradas = capaParadas;
  } else {
    console.info(
      `Sin paradas para ruta ${numRuta} o archivo ausente (${stopsUrl}).`
    );
  }

  // Si no se cargó nada, limpiar el registro para no dejar un toggle “muerto”
  if (!capas[numRuta].ruta && !capas[numRuta].paradas) {
    buttonEl.classList.remove("active");
    delete capas[numRuta];
    alert(
      `No se pudo mostrar la ruta ${numRuta}. Verifica que existan los archivos en /data/${numRuta}/`
    );
  }
}

// Delegación de eventos (mejor performance con listas largas)
document.addEventListener("click", (ev) => {
  const btn = ev.target.closest(".ruta-btn");
  if (!btn) return;
  const numRuta = btn.getAttribute("data-ruta");
  const idStops = btn.getAttribute("data-stop");
  mostrarRuta(numRuta, idStops, btn);
});

// --- Filtro en vivo de rutas ---
(function () {
  const input = document.getElementById('buscadorRutas');
  const lista = document.getElementById('rutasLista');
  const emptyMsg = document.getElementById('sinResultados');
  if (!input || !lista) return;

  const items = Array.from(lista.querySelectorAll('.list-group-item'));

  const normalize = (str) =>
    (str || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // quita acentos

  const filtrar = (q) => {
    const nq = normalize(q);
    let visibles = 0;

    for (const li of items) {
      const btn = li.querySelector('.ruta-btn');
      const texto = normalize(btn?.textContent || '');
      const coincide = !nq || texto.includes(nq);

      li.style.display = coincide ? '' : 'none';
      if (coincide) visibles++;
    }

    if (emptyMsg) emptyMsg.style.display = visibles === 0 ? 'block' : 'none';
  };

  // Filtro en vivo
  input.addEventListener('input', (e) => filtrar(e.target.value));

  // (Opcional) limpiar filtro con Esc
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      filtrar('');
      input.blur();
    }
  });
})();
