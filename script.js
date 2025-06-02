let map;
let marker;
let infoDiv = document.getElementById('info');
let loadingSpinner = document.getElementById('loadingSpinner');
let searchInput = document.getElementById('searchInput');

function initMap() {
  map = L.map('map').setView([0, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

function mostrarLoading(show) {
  loadingSpinner.style.display = show ? 'block' : 'none';
}

function procurarPais(nome) {
  const pais = typeof nome === "string" ? nome : searchInput.value.trim();
  if (!pais) {
    alert("Digite o nome do país.");
    return;
  }
  buscarInfoREST(pais);
  centralizarNoGlobo(pais);
}

function buscarInfoREST(pais) {
  mostrarLoading(true);
  fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(pais)}?fullText=true`)
    .then(res => res.json())
    .then(async data => {
      mostrarLoading(false);
      if (!Array.isArray(data) || data.status === 404) {
        infoDiv.innerHTML = `<p>País não encontrado.</p>`;
        return;
      }

      const country = data[0];
      const name = country.name.common;
      const population = country.population;
      const area = country.area;
      const languages = Object.values(country.languages || {}).join(", ");
      const capital = country.capital ? country.capital[0] : "Desconhecida";
      const flag = country.flags?.svg;

      await fetch('/add-visited', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: name })
      });

      const weather = await fetch(`/weather?city=${encodeURIComponent(capital)}`).then(res => res.json()).catch(() => null);
      const wiki = await fetch(`/wiki?country=${encodeURIComponent(name)}`).then(res => res.json()).catch(() => null);

      infoDiv.innerHTML = `
        <h2>${name}</h2>
        ${flag ? `<img src="${flag}" width="100"/>` : ""}
        <p><strong>Capital:</strong> ${capital}</p>
        <p><strong>População:</strong> ${population.toLocaleString()}</p>
        <p><strong>Área:</strong> ${area.toLocaleString()} km²</p>
        <p><strong>Língua(s):</strong> ${languages}</p>
        ${weather?.main ? `<p><strong>Clima:</strong> ${weather.weather[0].description}, ${weather.main.temp}°C</p>` : ""}
        ${wiki?.extract ? `<p><strong>Wikipedia:</strong> ${wiki.extract}</p>` : ""}
      `;

      geocodeCountry(name);
    })
    .catch(() => {
      mostrarLoading(false);
      alert("Erro ao buscar informações.");
    });
}

function geocodeCountry(countryName) {
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(countryName)}`)
    .then(res => res.json())
    .then(results => {
      if (results.length > 0) {
        const { lat, lon } = results[0];
        const latLng = [parseFloat(lat), parseFloat(lon)];
        map.setView(latLng, 5);
        if (marker) marker.setLatLng(latLng);
        else marker = L.marker(latLng).addTo(map);
      }
    });
}

function centralizarNoGlobo(pais) {
  fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
    .then(res => res.json())
    .then(countries => {
      const match = countries.features.find(f => f.properties.name.toLowerCase() === pais.toLowerCase());
      if (match && window.world) {
        let lat = 0, lng = 0;
        try {
          if (match.geometry.type === "Polygon") {
            [lng, lat] = match.geometry.coordinates[0][0];
          } else if (match.geometry.type === "MultiPolygon") {
            [lng, lat] = match.geometry.coordinates[0][0][0];
          }
        } catch (e) {
          console.warn("Erro ao obter coordenadas");
        }
        window.world.pointOfView({ lat, lng, altitude: 2 }, 2000);
      }
    });
}

function mostrarRota() {
  fetch('/rota')
    .then(res => res.json())
    .then(data => {
      alert("Rota: " + data.rota.join(" → "));
    });
}

function mostrarEstatisticas() {
  fetch('/estatisticas')
    .then(res => res.json())
    .then(data => {
      alert(`Países visitados: ${data.total_visitados}\n\n${data.paises.join(", ")}`);
    });
}

fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
  .then(res => res.json())
  .then(countries => {
    window.world = Globe()
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundColor('#000011')
      .polygonsData(countries.features)
      .polygonAltitude(0.01)
      .polygonCapColor(() => 'rgba(0, 200, 150, 0.3)')
      .polygonSideColor(() => 'rgba(255, 255, 255, 0.1)')
      .onPolygonClick(feature => {
        const countryName = feature.properties.name;
        procurarPais(countryName);
      });

    window.world(document.getElementById('globeViz'));
  });

window.onload = initMap;


