const HOURS = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
const forecastContainer = document.getElementById("forecast");

function getTodayDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

function getCurrentHourSlot() {
  const hour = new Date().getHours();
  const nextSlot = HOURS.find(h => parseInt(h.split(":")[0]) >= hour);
  return nextSlot || HOURS[HOURS.length - 1];
}

function buildForm() {
  forecastContainer.innerHTML = "";
  const today = getTodayDate();
  const currentHour = getCurrentHourSlot();

  // DAY 1 - Hourly forecast
  const block1 = document.createElement("div");
  block1.className = "day-block";
  block1.innerHTML = `<h2>${today} - 3 Hour Intervals (starting from ${currentHour})</h2>`;
  HOURS.forEach(hour => {
    if (parseInt(hour.split(":")[0]) >= parseInt(currentHour.split(":")[0])) {
      block1.innerHTML += `
        <label>${hour}</label>
        <input type="number" id="${today}_${hour}" placeholder="Temp °C" />°C<br/>
      `;
    }
  });
  forecastContainer.appendChild(block1);

  // DAYS 2–7 - Daily high/low
  for (let i = 1; i <= 6; i++) {
    const day = getTodayDate(i);
    const block = document.createElement("div");
    block.className = "day-block";
    block.innerHTML = `
      <h2>${day} - High/Low</h2>
      <label>Low</label><input type="number" id="${day}_low" placeholder="Low °C"/>°C<br/>
      <label>High</label><input type="number" id="${day}_high" placeholder="High °C"/>°C
    `;
    forecastContainer.appendChild(block);
  }
}

async function saveForecast() {
  const today = getTodayDate();
  const currentHour = getCurrentHourSlot();

  const day1Temps = {};
  HOURS.forEach(hour => {
    if (parseInt(hour.split(":")[0]) >= parseInt(currentHour.split(":")[0])) {
      const val = document.getElementById(`${today}_${hour}`)?.value;
      if (val !== undefined && val !== "") {
        day1Temps[hour] = parseFloat(val);
      }
    }
  });

  const restDays = [];
  for (let i = 1; i <= 6; i++) {
    const day = getTodayDate(i);
    const low = document.getElementById(`${day}_low`)?.value;
    const high = document.getElementById(`${day}_high`)?.value;
    if (low || high) {
      restDays.push({
        date: day,
        low: parseFloat(low || 0),
        high: parseFloat(high || 0)
      });
    }
  }

  const payload = {
    day1: { date: today, temps: day1Temps },
    restDays: restDays
  };

  const url = "https://script.google.com/macros/s/AKfycbw56906FLJQJeVMQiXaL8EsxueP1eggQrVu6IYTLJKDeK9ib_hxjEZrhj-smWwggYDT/exec";  // Replace this with your Google Apps Script URL

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const resultText = await res.text();

    if (res.ok && resultText.includes("Success")) {
      document.getElementById("status").textContent = "✅ Forecast synced to Google Sheets!";
      renderSevenDayGraphic(payload);
    } else {
      document.getElementById("status").textContent = `❌ Sync failed: ${resultText}`;
      console.error("Unexpected response:", resultText);
    }
  } catch (err) {
    console.error("Network error:", err);
    document.getElementById("status").textContent = "❌ Network error syncing forecast.";
  }
}

function renderSevenDayGraphic(data) {
  const container = document.getElementById("seven-day-container");
  container.innerHTML = "";

  const combined = {};
  const today = data.day1.date;

  Object.entries(data.day1.temps).forEach(([hour, temp]) => {
    if (!combined[today]) combined[today] = { high: temp, low: temp };
    if (temp > combined[today].high) combined[today].high = temp;
    if (temp < combined[today].low) combined[today].low = temp;
  });

  data.restDays.forEach(day => {
    combined[day.date] = {
      high: day.high,
      low: day.low
    };
  });

  for (let i = 0; i < 7; i++) {
    const date = getTodayDate(i);
    const d = new Date(date);
    const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const style = isWeekend ? "seven-day-block weekend-highlight" : "seven-day-block";
    const { high = "--", low = "--" } = combined[date] || {};

    const block = document.createElement("div");
    block.className = style;
    block.innerHTML = `
      <div class="day-name">${dayName}</div>
      <img src="./icons/32.png" alt="Icon" class="small-icon">
      <div class="temps">${high}° / ${low}°</div>
    `;
    container.appendChild(block);
  }
}

// Initialize the form on page load
document.addEventListener("DOMContentLoaded", () => {
  buildForm();
});
