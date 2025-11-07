const apiKey = "326567c1f194c7dda3df0f89e2749562";
let isCelsius = true;
let lastSearchedName = ""; // ✅ Stores user-entered or clicked name

// DOM refs
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const detectBtn = document.getElementById("detectBtn");
const unitToggle = document.getElementById("unitToggle");
const themeToggle = document.getElementById("themeToggle");
const addFavoriteBtn = document.getElementById("addFavoriteBtn");

const cityNameEl = document.getElementById("cityName");
const temperatureEl = document.getElementById("temperature");
const descriptionEl = document.getElementById("description");
const feelsLikeEl = document.getElementById("feelsLike");
const humidityEl = document.getElementById("humidity");
const pressureEl = document.getElementById("pressure");
const windEl = document.getElementById("wind");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");

const hourlyForecast = document.getElementById("hourlyForecast");
const weeklyForecast = document.getElementById("weeklyForecast");
const favoriteCitiesEl = document.getElementById("favoriteCities");

// listeners
detectBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    return;
  }
  showLoading(true);
  navigator.geolocation.getCurrentPosition(
    (pos) => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude, true),

    (err) => {
      showLoading(false);
      alert("Please allow location access.");
      console.error("Geolocation error:", err);
    }
  );
});

searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (!city) {
    alert("Please enter a city or village name.");
    return;
  }
  lastSearchedName = capitalizeWords(city); // ✅ store user search name
  getWeatherByName(city);
});

unitToggle.addEventListener("click", () => {
  isCelsius = !isCelsius;
  unitToggle.textContent = isCelsius ? "°C / °F" : "°F / °C";

  const displayedCity = cityNameEl.textContent;
  if (displayedCity && displayedCity !== "Your City") {
    const firstPart = displayedCity.split(",")[0];
    getWeatherByName(firstPart);
  }
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

addFavoriteBtn.addEventListener("click", () => {
  const city = cityNameEl.textContent;
  if (city && city !== "Your City") addFavorite(city);
});

// favorites
function addFavorite(city) {
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  if (!favorites.includes(city)) {
    favorites.push(city);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderFavorites();
  }
}

function renderFavorites() {
  favoriteCitiesEl.innerHTML = "";
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];

  favorites.forEach((city) => {
    // Create a row container
    const div = document.createElement("div");
    div.className = "favorite-item";

    // Left side: city name (clickable)
    const nameSpan = document.createElement("span");
    nameSpan.textContent = city;
    nameSpan.style.flex = "1";
    nameSpan.style.cursor = "pointer";
    nameSpan.style.fontWeight = "500";
    nameSpan.addEventListener("click", () => {
      lastSearchedName = city;
      getWeatherByName(city);
    });

    // Right side: ❌ remove button
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✖";
    removeBtn.title = "Remove from favorites";
    removeBtn.className = "remove-btn";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent triggering city click
      removeFavorite(city);
    });

    div.appendChild(nameSpan);
    div.appendChild(removeBtn);
    favoriteCitiesEl.appendChild(div);
  });
}


function removeFavorite(city) {
  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  favorites = favorites.filter((c) => c !== city);
  localStorage.setItem("favorites", JSON.stringify(favorites));
  renderFavorites();
}

// container where the choices will appear
function ensureGeoChoiceContainer() {
  let container = document.getElementById("geoChoices");
  if (!container) {
    container = document.createElement("div");
    container.id = "geoChoices";
    container.style.position = "relative";
    container.style.width = "100%";
    container.style.maxWidth = "600px";
    container.style.margin = "6px auto 0";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "6px";
    container.style.zIndex = "1001";
    const searchBar = document.querySelector(".search-bar");
    searchBar.insertAdjacentElement("afterend", container);
  }
  return container;
}

function clearGeoChoices() {
  const c = document.getElementById("geoChoices");
  if (c) c.innerHTML = "";
}

function renderGeoChoices(matches, originalQuery) {
  const container = ensureGeoChoiceContainer();
  container.innerHTML = "";

  const title = document.createElement("div");
  title.textContent = `Multiple places found for "${originalQuery}". Please choose the correct one:`;
  title.style.fontSize = "0.9rem";
  title.style.color = "var(--text)";
  title.style.padding = "6px 10px";
  container.appendChild(title);

  matches.forEach((g) => {
    const label = document.createElement("button");
    const pretty = `${g.name}${g.state ? ", " + g.state : ""}${g.country ? ", " + g.country : ""}`;
    label.textContent = pretty;
    label.className = "favorite-item";
    label.style.textAlign = "left";
    label.style.width = "100%";
    label.addEventListener("click", () => {
      clearGeoChoices();
      lastSearchedName = capitalizeWords(originalQuery); // ✅ remember chosen input name
      getWeatherByCoords(g.lat, g.lon);
    });
    container.appendChild(label);
  });

  const fallback = document.createElement("button");
  fallback.textContent = `Use first result (${matches[0].name}${matches[0].state ? ", " + matches[0].state : ""}, ${matches[0].country})`;
  fallback.className = "favorite-item";
  fallback.addEventListener("click", () => {
    clearGeoChoices();
    const g = matches[0];
    lastSearchedName = capitalizeWords(originalQuery);
    getWeatherByCoords(g.lat, g.lon);
  });
  container.appendChild(fallback);
}

async function getWeatherByName(query) {
  try {
    showLoading(true);
    clearGeoChoices();

    const q = query.trim();
    const queryLower = q.toLowerCase();

    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=10&appid=${apiKey}`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) throw new Error(`Geocode HTTP ${geoRes.status}`);
    const geoData = await geoRes.json();
    if (!geoData || geoData.length === 0) {
      alert("City or village not found. Try adding district/state (e.g., 'Koradi Nagpur').");
      return;
    }

    const exact = geoData.find((g) => {
      if (!g || !g.name) return false;
      if (g.name.toLowerCase() === queryLower) return true;
      if (g.local_names) {
        return Object.values(g.local_names).some(
          (v) => typeof v === "string" && v.toLowerCase() === queryLower
        );
      }
      return false;
    });

    if (exact) {
      getWeatherByCoords(exact.lat, exact.lon);
      return;
    }

    const inResults = geoData.filter((g) => g.country === "IN");
    if (inResults.length === 1) {
      getWeatherByCoords(inResults[0].lat, inResults[0].lon);
      return;
    } else if (inResults.length > 1) {
      renderGeoChoices(inResults, q);
      return;
    }

    if (geoData.length > 1) {
      renderGeoChoices(geoData, q);
      return;
    }

    const chosen = geoData[0];
    getWeatherByCoords(chosen.lat, chosen.lon);
  } catch (err) {
    console.error("getWeatherByName error:", err);
    alert("Unable to fetch location. Try searching with more detail (e.g., 'Koradi Nagpur').");
  } finally {
    showLoading(false);
  }
}

async function getWeatherByCoords(lat, lon, isFromDetection = false) {
  try {
    showLoading(true);
    const unit = isCelsius ? "metric" : "imperial";

    // 🌍 Step 1: Use BigDataCloud for more accurate locality name
    let placeName = "Unknown";
    try {
      const altGeoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
      const altGeoRes = await fetch(altGeoUrl);
      const altGeoData = await altGeoRes.json();
      if (altGeoData && altGeoData.city) {
        placeName = altGeoData.city;
      } else if (altGeoData.locality) {
        placeName = altGeoData.locality;
      } else if (altGeoData.principalSubdivision) {
        placeName = altGeoData.principalSubdivision;
      }
    } catch (geoErr) {
      console.warn("BigDataCloud reverse geocode failed, fallback to OWM:", geoErr);
    }

    // Step 2: Fallback if BigDataCloud fails
    if (placeName === "Unknown") {
      const reverseUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
      const reverseRes = await fetch(reverseUrl);
      const reverseData = reverseRes.ok ? await reverseRes.json() : null;
      if (reverseData && reverseData.length > 0) {
        const place = reverseData[0];
        placeName = place.name || "Your Location";
      }
    }

    // 🌤️ Step 3: Get weather using OpenWeatherMap
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${apiKey}`;
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) {
      const errText = await weatherRes.text().catch(() => "");
      throw new Error(`Weather HTTP ${weatherRes.status} ${errText}`);
    }
    const weatherData = await weatherRes.json();

    // ---------- REPLACED BLOCK (per your request) ----------
    // display current using your existing function
    // prefer lastSearchedName (what user typed/clicked). fallback to placeName.
    cityNameEl.textContent = lastSearchedName || placeName || "Your City";
    displayCurrent(weatherData);

    // --- NEW: determine day/night from API sunrise/sunset and update background
    // weatherData.dt is the timestamp of the weather data (in seconds)
    const nowTs = weatherData.dt || Math.floor(Date.now() / 1000);
    const sunriseTs = weatherData.sys?.sunrise || 0;
    const sunsetTs = weatherData.sys?.sunset || 0;
    const isDaytime = nowTs >= sunriseTs && nowTs <= sunsetTs;

    // description text from API (safe-guard)
    const desc = weatherData.weather && weatherData.weather[0] ? weatherData.weather[0].description : "";
    updateBackground(desc, isDaytime);

    // continue with forecast
    await getForecast(lat, lon, unit);
    // ---------- END REPLACED BLOCK ----------

  } catch (err) {
    console.error("getWeatherByCoords error:", err);
    alert("Unable to fetch accurate weather. Please check your internet or API key.");
  } finally {
    showLoading(false);
  }
}


// display current weather
function displayCurrent(data) {
  const unitSymbol = isCelsius ? "°C" : "°F";
  const temp = typeof data.main.temp === "number" ? data.main.temp.toFixed(1) : "--";
  const feels = typeof data.main.feels_like === "number" ? data.main.feels_like.toFixed(1) : "--";
  temperatureEl.textContent = `${temp}${unitSymbol}`;
  descriptionEl.textContent = data.weather && data.weather[0] ? data.weather[0].description : "--";
  feelsLikeEl.textContent = `${feels}${unitSymbol}`;
  humidityEl.textContent = `${data.main.humidity ?? "--"}%`;
  pressureEl.textContent = `${data.main.pressure ?? "--"} hPa`;

  let windSpeedRaw = data.wind && typeof data.wind.speed === "number" ? data.wind.speed : null;
  if (windSpeedRaw !== null) {
    if (isCelsius) {
      windEl.textContent = `${(windSpeedRaw * 3.6).toFixed(1)} km/h`;
    } else {
      windEl.textContent = `${windSpeedRaw.toFixed(1)} mph`;
    }
  } else {
    windEl.textContent = "--";
  }

  sunriseEl.textContent = data.sys && data.sys.sunrise ? new Date(data.sys.sunrise * 1000).toLocaleTimeString() : "--";
  sunsetEl.textContent = data.sys && data.sys.sunset ? new Date(data.sys.sunset * 1000).toLocaleTimeString() : "--";
}

// forecast
async function getForecast(lat, lon, unit) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Forecast HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !data.list) throw new Error("Invalid forecast response");

    displayHourly(data.list.slice(0, 8));
    displayWeeklyFrom3Hour(data.list);
  } catch (err) {
    console.error("getForecast error:", err);
  }
}

function displayHourly(list) {
  hourlyForecast.innerHTML = "";
  list.forEach((h) => {
    const date = new Date(h.dt * 1000);
    const hour = date.getHours().toString().padStart(2, "0") + ":00";
    const temp = typeof h.main.temp === "number" ? h.main.temp.toFixed(1) : "--";
    const desc = h.weather && h.weather[0] ? h.weather[0].main : "--";

    const item = document.createElement("div");
    item.className = "forecast-item";
    item.innerHTML = `
      <span>${hour}</span>
      <span>${temp}${isCelsius ? "°C" : "°F"}</span>
      <span>${desc}</span>
    `;
    hourlyForecast.appendChild(item);
  });
}

function displayWeeklyFrom3Hour(list) {
  const daily = {};
  list.forEach((entry) => {
    const dateStr = new Date(entry.dt * 1000).toLocaleDateString();
    if (!daily[dateStr]) daily[dateStr] = [];
    daily[dateStr].push(entry.main.temp);
  });

  weeklyForecast.innerHTML = "";
  Object.keys(daily)
    .slice(0, 7)
    .forEach((day) => {
      const temps = daily[day];
      const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
      const item = document.createElement("div");
      item.className = "forecast-item";
      item.innerHTML = `
        <span>${day}</span>
        <span>${avg.toFixed(1)}${isCelsius ? "°C" : "°F"}</span>
      `;
      weeklyForecast.appendChild(item);
    });
}

// loader toggle
function showLoading(show) {
  const loader = document.getElementById("loading");
  loader.style.display = show ? "flex" : "none";
}

// helper: capitalize each word
function capitalizeWords(str) {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// initialize
renderFavorites();
unitToggle.textContent = "°C / °F";

// -----------------------------
// Dynamic background updater
// -----------------------------
function updateBackground(weatherDescription, isDaytime) {
  const body = document.body;
  // remove old weather classes but keep dark theme if active
  body.classList.remove("sunny", "cloudy", "rainy", "snowy", "night");

  const desc = (weatherDescription || "").toLowerCase();

  if (!isDaytime) {
    body.classList.add("night");
  } else if (desc.includes("rain") || desc.includes("drizzle") || desc.includes("thunder")) {
    body.classList.add("rainy");
  } else if (desc.includes("cloud")) {
    body.classList.add("cloudy");
  } else if (desc.includes("snow")) {
    body.classList.add("snowy");
  } else {
    body.classList.add("sunny");
  }

  console.log("Background changed to:", body.className); // ✅ Add this to test
}


