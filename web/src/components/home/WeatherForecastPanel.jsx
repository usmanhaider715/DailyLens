import { CloudRain, CloudSun, Sun, Wind } from 'lucide-react';
import { formatUsTime, US_TIMEZONE } from '@/utils/formatDate';

function WeatherIcon({ code, className = 'h-8 w-8' }) {
  if (code === 0 || code === 1) return <Sun className={`${className} text-amber-300`} />;
  if (code >= 61 && code <= 67) return <CloudRain className={`${className} text-sky-300`} />;
  if (code >= 80) return <CloudRain className={`${className} text-sky-400`} />;
  if (code === 95) return <CloudRain className={`${className} text-violet-300`} />;
  return <CloudSun className={`${className} text-sky-200`} />;
}

function formatDay(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: US_TIMEZONE }).format(d);
}

export function WeatherForecastPanel({ forecast, size = 'default' }) {
  if (!forecast?.cities?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-sky-400/30 p-8 text-center text-sm text-white/60">
        Weather forecast unavailable.
      </div>
    );
  }

  const isHero = size === 'hero';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950 via-slate-900 to-primary-950 shadow-xl ${
        isHero ? 'min-h-[380px]' : ''
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(56,189,248,0.2),_transparent_55%)]" />
      <div className={`relative ${isHero ? 'p-6 sm:p-8' : 'p-4'}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-sky-200/80">Weather forecast</p>
            <h2 className={`font-display font-bold text-white ${isHero ? 'text-2xl sm:text-3xl' : 'text-lg'}`}>
              {forecast.label}
            </h2>
          </div>
          {forecast.updatedAt && (
            <p className="text-[10px] text-white/40">
              Updated {formatUsTime(forecast.updatedAt)} ET
            </p>
          )}
        </div>

        <div className={`grid gap-4 ${isHero ? 'lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {forecast.cities.map((city) => (
            <div
              key={city.name}
              className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{city.name}</p>
                  <p className="text-xs text-sky-200/70">{city.current?.condition}</p>
                </div>
                <WeatherIcon code={city.current?.code} />
              </div>
              <p className={`mt-2 font-display font-bold text-white ${isHero ? 'text-5xl' : 'text-4xl'}`}>
                {city.current?.temp}°
                <span className="ml-1 text-lg font-normal text-white/50">C</span>
              </p>
              <p className="text-xs text-white/50">
                Feels {city.current?.feelsLike}° · Humidity {city.current?.humidity}% · Wind{' '}
                {city.current?.windKph} km/h
              </p>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {city.daily?.slice(0, 5).map((day) => (
                  <div
                    key={day.date}
                    className="min-w-[72px] shrink-0 rounded-lg bg-white/5 px-2 py-2 text-center"
                  >
                    <p className="text-[10px] font-semibold uppercase text-white/60">{formatDay(day.date)}</p>
                    <p className="text-sm font-bold text-white">
                      {day.high}°<span className="text-white/40">/{day.low}°</span>
                    </p>
                    {day.precipChance != null && (
                      <p className="text-[10px] text-sky-200/70">{day.precipChance}% rain</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 flex items-center gap-1 text-[10px] text-white/40">
          <Wind className="h-3 w-3" />
          Data from Open-Meteo · 5-day outlook
        </p>
      </div>
    </div>
  );
}

