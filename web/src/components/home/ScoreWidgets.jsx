import { motion } from 'framer-motion';
import { Bell, BellOff } from 'lucide-react';
import { formatMatchTimeLocal } from '@/utils/matchTime';

export function TeamRow({ team, highlight, useFullName, scoreClassName = 'text-2xl' }) {
  if (!team) return null;
  const label = useFullName ? team.name : team.abbr;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {team.logo && (
          <img src={team.logo} alt="" className="h-7 w-7 object-contain" loading="lazy" />
        )}
        <span
          className={`truncate text-sm font-semibold ${highlight ? 'text-white' : 'text-white/90'}`}
          title={team.name}
        >
          {label}
        </span>
      </div>
      <span
        className={`font-display font-bold tabular-nums ${scoreClassName} ${
          highlight ? 'text-primary-300' : 'text-white'
        }`}
      >
        {team.score}
      </span>
    </div>
  );
}

export function ScoreCard({ game, size = 'default', timezone, isPinned, onTogglePin }) {
  const live = game.isLive;
  const final = game.isFinal;
  const isCricket = game.leagueId === 'cricket';
  const isSoccer = game.leagueId === 'soccer';
  const wideCard = isCricket || isSoccer;
  const isHero = size === 'hero';
  const localStart = game.startsAt || game.eventDate;

  const className = `group relative flex shrink-0 flex-col rounded-xl border transition ${
    isHero
      ? 'w-full min-w-0 rounded-2xl px-6 py-6 sm:px-8 sm:py-8'
      : wideCard
        ? 'min-w-[280px] px-4 py-3 sm:min-w-[320px]'
        : 'min-w-[220px] px-4 py-3 sm:min-w-[260px]'
  } ${
    live
      ? 'border-red-500/50 bg-gradient-to-br from-red-950/50 via-primary-950 to-gray-900 shadow-lg shadow-red-900/25'
      : final
        ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-primary-950 to-gray-900'
        : 'border-white/10 bg-white/5 hover:border-primary-400/40 hover:bg-white/10'
  }`;

  const inner = (
    <>
      {onTogglePin && !isHero && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePin(game);
          }}
          title={isPinned ? 'Unpin score alerts' : 'Pin for live score notifications'}
          className={`absolute left-3 top-3 z-10 rounded-full p-1.5 transition ${
            isPinned
              ? 'bg-amber-400/90 text-amber-950 shadow'
              : 'bg-black/30 text-white/70 opacity-0 hover:bg-black/50 group-hover:opacity-100'
          }`}
          aria-label={isPinned ? 'Unpin match' : 'Pin match for notifications'}
        >
          {isPinned ? <Bell className="h-3.5 w-3.5 fill-current" /> : <BellOff className="h-3.5 w-3.5" />}
        </button>
      )}
      {live && (
        <span
          className={`absolute flex items-center gap-1 rounded-full bg-breaking font-bold uppercase tracking-wider text-white shadow animate-pulseFlash ${
            isHero ? '-top-3 right-6 px-3 py-1 text-xs' : '-top-2 right-3 px-2 py-0.5 text-[10px]'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          Live
        </span>
      )}
      {!live && final && (
        <span
          className={`absolute rounded-full bg-emerald-600/90 font-bold uppercase tracking-wider text-white ${
            isHero ? '-top-3 right-6 px-3 py-1 text-xs' : '-top-2 right-3 px-2 py-0.5 text-[10px]'
          }`}
        >
          Final
        </span>
      )}
      <div
        className={`mb-2 flex items-center justify-between gap-2 font-semibold uppercase tracking-wide text-white/50 ${
          isHero ? 'text-xs sm:text-sm' : 'text-[10px]'
        }`}
      >
        <span className="truncate">{game.competition || game.league}</span>
        <span className="shrink-0">{game.statusText || (final ? 'Final' : game.clock || '')}</span>
      </div>
      {isCricket && game.venue && (
        <p className={`mb-2 truncate text-white/40 ${isHero ? 'text-sm' : 'text-[10px]'}`}>{game.venue}</p>
      )}
      {localStart && !live && (
        <p
          className={`mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-center text-white/70 ${
            isHero ? 'text-sm' : 'text-[10px]'
          }`}
        >
          {game.status === 'pre' && game.statusText ? `${game.statusText} · ` : ''}
          {formatMatchTimeLocal(localStart, timezone)}
        </p>
      )}
      <div className={`space-y-2 ${isHero ? 'space-y-4 sm:space-y-5' : ''}`}>
        <TeamRow
          team={game.away}
          highlight={game.away?.winner}
          useFullName={wideCard || isHero}
          scoreClassName={isHero ? 'text-4xl sm:text-5xl' : 'text-2xl'}
        />
        <TeamRow
          team={game.home}
          highlight={game.home?.winner}
          useFullName={wideCard || isHero}
          scoreClassName={isHero ? 'text-4xl sm:text-5xl' : 'text-2xl'}
        />
      </div>
    </>
  );

  if (game.link && !isHero) {
    return (
      <motion.a
        href={game.link}
        target="_blank"
        rel="noreferrer"
        whileHover={{ y: -2 }}
        className={className}
      >
        {inner}
      </motion.a>
    );
  }

  return (
    <motion.div whileHover={isHero ? undefined : { y: -2 }} className={className}>
      {inner}
    </motion.div>
  );
}
