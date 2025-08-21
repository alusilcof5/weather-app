const apiBase = 'https://api.open-meteo.com/v1';
const geocodingBase = 'https://geocoding-api.open-meteo.com/v1';

async function fetchLocation(query) {
    const response = await fetch(`${geocodingBase}/search?name=${encodeURIComponent(query)}&count=1&language=es&format=json`);
    const data = await response.json();
    return data.results && data.results.length > 0 ? data.results[0] : null;
}

async function fetchCurrentWeather(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
        timezone: 'auto'
    });
    const response = await fetch(`${apiBase}/forecast?${params}`);
    if (!response.ok) throw new Error('Failed to fetch current weather');
    return await response.json();
}

async function fetchForecast(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        hourly: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,rain,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,precipitation_sum,rain_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant',
        timezone: 'auto'
    });
    const response = await fetch(`${apiBase}/forecast?${params}`);
    if (!response.ok) throw new Error('Failed to fetch forecast');
    return await response.json();
}
export { fetchLocation, fetchCurrentWeather, fetchForecast };