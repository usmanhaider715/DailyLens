'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

function rainClass(pct) {
  if (pct == null) return '';
  if (pct >= 70) return 'text-sky-700 font-semibold dark:text-sky-300';
  if (pct >= 40) return 'text-sky-600 dark:text-sky-400';
  return 'text-gray-500 dark:text-gray-400';
}

function HourTable({ day, compact = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700">
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">Temp</th>
            <th className="px-3 py-2">Feels</th>
            <th className="px-3 py-2">Conditions</th>
            <th className="px-3 py-2">Rain %</th>
            {!compact && <th className="px-3 py-2">Rain mm</th>}
            <th className="px-3 py-2">Wind</th>
            {!compact && <th className="px-3 py-2">Humidity</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {day.hours.map((h) => (
            <tr
              key={h.time}
              className={
                h.isNow
                  ? 'bg-cyan-50/80 dark:bg-cyan-950/30'
                  : h.isPast
                    ? 'opacity-60'
                    : undefined
              }
            >
              <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                {h.hourLabel}
                {h.isNow && (
                  <span className="ml-1.5 rounded bg-cyan-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                    Now
                  </span>
                )}
              </td>
              <td className="px-3 py-2 font-semibold">{h.temp}°</td>
              <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{h.feelsLike}°</td>
              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{h.condition}</td>
              <td className={`px-3 py-2 ${rainClass(h.precipChance)}`}>
                {h.precipChance != null ? `${h.precipChance}%` : '—'}
              </td>
              {!compact && (
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                  {h.precipMm != null ? h.precipMm.toFixed(1) : '—'}
                </td>
              )}
              <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{h.windKph} km/h</td>
              {!compact && (
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                  {h.humidity != null ? `${h.humidity}%` : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HourlyForecast({ hourlyByDay = [], compact = false, defaultOpen = true }) {
  const [openDays, setOpenDays] = useState(() =>
    hourlyByDay.reduce((acc, day, i) => {
      acc[day.date] = defaultOpen && i === 0;
      return acc;
    }, {}),
  );
  const [activeDay, setActiveDay] = useState(hourlyByDay[0]?.date || '');

  useEffect(() => {
    if (hourlyByDay[0]?.date) setActiveDay(hourlyByDay[0].date);
  }, [hourlyByDay]);

  const active = useMemo(
    () => hourlyByDay.find((d) => d.date === activeDay) || hourlyByDay[0],
    [hourlyByDay, activeDay],
  );

  if (!hourlyByDay.length) return null;

  const toggleDay = (date) => {
    setOpenDays((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  if (compact) {
    return (
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Hour-by-hour forecast</p>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {hourlyByDay.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() => setActiveDay(day.date)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeDay === day.date
                  ? 'bg-sky-600 text-white'
                  : 'bg-white/80 text-gray-700 hover:bg-white dark:bg-gray-800/80 dark:text-gray-200'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
        {active && (
          <div className="mt-2 rounded-lg bg-white/80 dark:bg-gray-800/80">
            <HourTable day={active} compact />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Hour-by-hour forecast</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        All 24 hours for today and the next {hourlyByDay.length - 1} days — local time at this location.
      </p>
      {hourlyByDay.map((day) => {
        const isOpen = openDays[day.date] ?? day.dayIndex === 0;
        return (
          <div
            key={day.date}
            className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
          >
            <button
              type="button"
              onClick={() => toggleDay(day.date)}
              className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left dark:bg-gray-900"
            >
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">{day.label}</span>
                <span className="ml-2 text-sm text-gray-500">
                  {day.high}° / {day.low}° · {day.condition}
                  {day.rainChance != null ? ` · ${day.rainChance}% rain` : ''}
                </span>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
              )}
            </button>
            {isOpen && (
              <div className="border-t border-gray-200 dark:border-gray-800">
                <HourTable day={day} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
