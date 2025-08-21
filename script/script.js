import { fetchLocation, fetchCurrentWeather, fetchForecast } from './api.js';


class WeatherApp {
    constructor() {
        this.currentLocation = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDefaultLocation();
    }

    setupEventListeners() {
        document.getElementById('searchBtn').addEventListener('click', () => this.handleSearch());
        document.getElementById('locationBtn').addEventListener('click', () => this.getUserLocation());
        document.getElementById('locationInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
    }

    async loadDefaultLocation() {
        // Madrid por defecto
        await this.loadWeatherData(40.4168, -3.7038, 'Madrid, España');
    }

    async handleSearch() {
        const query = document.getElementById('locationInput').value.trim();
        if (!query) return;

        const coordMatch = query.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        if (coordMatch) {
            const lat = parseFloat(coordMatch[1]);
            const lon = parseFloat(coordMatch[2]);
            await this.loadWeatherData(lat, lon, `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        } else {
            await this.searchLocation(query);
        }
    }

    async searchLocation(query) {
        try {
            const location = await fetchLocation(query);
            if (location) {
                const locationName = `${location.name}${location.admin1 ? ', ' + location.admin1 : ''}${location.country ? ', ' + location.country : ''}`;
                await this.loadWeatherData(location.latitude, location.longitude, locationName);
            } else {
                this.showError('No se encontró la ubicación. Intenta con otra ciudad o usa coordenadas.');
            }
        } catch (error) {
            console.error('Error searching location:', error);
            this.showError('Error al buscar la ubicación. Inténtalo de nuevo.');
        }
    }

    async getUserLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocalización no disponible en este navegador.');
            return;
        }

        const btn = document.getElementById('locationBtn');
        btn.innerHTML = '<span>🔄</span>Obteniendo...';
        btn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await this.loadWeatherData(latitude, longitude, 'Tu ubicación');
                btn.innerHTML = '<span>📍</span>Mi ubicación';
                btn.disabled = false;
            },
            (error) => {
                console.error('Geolocation error:', error);
                this.showError('No se pudo obtener tu ubicación. Verifica los permisos.');
                btn.innerHTML = '<span>📍</span>Mi ubicación';
                btn.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }

    async loadWeatherData(lat, lon, locationName) {
        this.currentLocation = { lat, lon, name: locationName };
        this.showLoading();

        try {
            const [currentWeather, forecast] = await Promise.all([
                fetchCurrentWeather(lat, lon),
                fetchForecast(lat, lon)
            ]);

            this.renderCurrentWeather(currentWeather, locationName);
            this.renderHourlyForecast(forecast);
            this.renderDailyForecast(forecast);

        } catch (error) {
            console.error('Error loading weather data:', error);
            this.showError('Error al cargar los datos meteorológicos. Inténtalo de nuevo.');
        }
    }

    showLoading() {
        const loadingHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Cargando datos meteorológicos...</p>
            </div>
        `;
        document.getElementById('currentWeather').innerHTML = loadingHTML;
        document.getElementById('hourlyForecast').innerHTML = loadingHTML;
        document.getElementById('dailyForecast').innerHTML = loadingHTML;
    }

    showError(message) {
        const errorHTML = `
            <div class="error">
                <div class="error-icon">⚠️</div>
                <p>${message}</p>
            </div>
        `;
        document.getElementById('currentWeather').innerHTML = errorHTML;
        document.getElementById('hourlyForecast').innerHTML = errorHTML;
        document.getElementById('dailyForecast').innerHTML = errorHTML;
    }

    renderCurrentWeather(data, locationName) {
        const current = data.current;
        const weatherIcon = this.getWeatherIcon(current.weather_code, current.is_day);
        const weatherDescription = this.getWeatherDescription(current.weather_code);

        const html = `
            <div class="current-weather fade-in">
                <div class="temp-display">
                    <div class="current-temp">${Math.round(current.temperature_2m)}°</div>
                    <div class="weather-icon">${weatherIcon}</div>
                </div>
                <div class="weather-info">
                    <div class="location">${locationName}</div>
                    <div class="description">${weatherDescription}</div>
                    <div class="feels-like">Sensación térmica: ${Math.round(current.apparent_temperature)}°C</div>
                </div>
            </div>
            <div class="stats-grid">
                <div class="stat-item slide-up"><div class="stat-value">${current.relative_humidity_2m}%</div><div class="stat-label">Humedad</div></div>
                <div class="stat-item slide-up"><div class="stat-value">${Math.round(current.wind_speed_10m)} km/h</div><div class="stat-label">Viento</div></div>
                <div class="stat-item slide-up"><div class="stat-value">${Math.round(current.pressure_msl)} hPa</div><div class="stat-label">Presión</div></div>
                <div class="stat-item slide-up"><div class="stat-value">${current.cloud_cover}%</div><div class="stat-label">Nubosidad</div></div>
                <div class="stat-item slide-up"><div class="stat-value">${current.precipitation} mm</div><div class="stat-label">Precipitación</div></div>
                <div class="stat-item slide-up"><div class="stat-value">${Math.round(current.wind_gusts_10m)} km/h</div><div class="stat-label">Ráfagas</div></div>
            </div>
        `;
        document.getElementById('currentWeather').innerHTML = html;
    }

    renderHourlyForecast(data) {
        const hourly = data.hourly;
        const now = new Date();
        const nextHours = [];

        for (let i = 0; i < hourly.time.length; i++) {
            const time = new Date(hourly.time[i]);
            if (time >= now) {
                nextHours.push({
                    time,
                    temperature: hourly.temperature_2m[i],
                    weather_code: hourly.weather_code[i],
                    precipitation_probability: hourly.precipitation_probability[i],
                    is_day: hourly.is_day[i]
                });
            }
            if (nextHours.length >= 12) break;
        }

        const html = `
            <div class="hourly-scroll">
                ${nextHours.map(hour => `
                    <div class="hourly-item slide-up">
                        <div class="hourly-time">${hour.time.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</div>
                        <div class="hourly-icon">${this.getWeatherIcon(hour.weather_code,hour.is_day)}</div>
                        <div class="hourly-temp">${Math.round(hour.temperature)}°</div>
                        <div class="hourly-desc">${hour.precipitation_probability}% 🌧️</div>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('hourlyForecast').innerHTML = html;
    }

    renderDailyForecast(data) {
        const daily = data.daily;
        const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

        const html = `
            <div class="daily-forecast">
                ${daily.time.slice(0,7).map((dateStr,index)=>{
                    const date=new Date(dateStr);
                    const dayName=index===0?'Hoy':days[date.getDay()];
                    const weatherIcon=this.getWeatherIcon(daily.weather_code[index],true);
                    const weatherDesc=this.getWeatherDescription(daily.weather_code[index]);

                    return `
                        <div class="daily-item slide-up">
                            <div class="daily-date">${dayName}</div>
                            <div class="daily-weather"><span style="font-size:24px;">${weatherIcon}</span><span>${weatherDesc}</span></div>
                            <div class="daily-temps"><span class="temp-high">${Math.round(daily.temperature_2m_max[index])}°</span>/<span class="temp-low">${Math.round(daily.temperature_2m_min[index])}°</span></div>
                            <div>${daily.precipitation_probability_max[index]}% 🌧️</div>
                            <div>${Math.round(daily.wind_speed_10m_max[index])} km/h 💨</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        document.getElementById('dailyForecast').innerHTML=html;
    }

    getWeatherIcon(code,isDay){
        const icons={0:isDay?'☀️':'🌙',1:isDay?'🌤️':'🌙',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌦️',56:'🌨️',57:'🌨️',61:'🌧️',63:'🌧️',65:'🌧️',66:'🌨️',67:'🌨️',71:'🌨️',73:'❄️',75:'❄️',77:'🌨️',80:'🌦️',81:'🌧️',82:'⛈️',85:'🌨️',86:'❄️',95:'⛈️',96:'⛈️',99:'⛈️'};
        return icons[code]||'❓';
    }

    getWeatherDescription(code){
        const desc={0:'Cielo despejado',1:'Principalmente despejado',2:'Parcialmente nublado',3:'Nublado',45:'Niebla',48:'Niebla con escarcha',51:'Llovizna ligera',53:'Llovizna moderada',55:'Llovizna intensa',56:'Llovizna helada ligera',57:'Llovizna helada intensa',61:'Lluvia ligera',63:'Lluvia moderada',65:'Lluvia intensa',66:'Lluvia helada ligera',67:'Lluvia helada intensa',71:'Nevada ligera',73:'Nevada moderada',75:'Nevada intensa',77:'Granos de nieve',80:'Chubascos ligeros',81:'Chubascos moderados',82:'Chubascos violentos',85:'Chubascos de nieve ligeros',86:'Chubascos de nieve intensos',95:'Tormenta',96:'Tormenta con granizo ligero',99:'Tormenta con granizo intenso'};
        return desc[code]||'Desconocido';
    }
}

document.addEventListener('DOMContentLoaded',()=>new WeatherApp());
export { fetchLocation, fetchCurrentWeather, fetchForecast };
export default WeatherApp;