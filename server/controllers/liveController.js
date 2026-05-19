import Parser from 'rss-parser';
import { getLiveScores } from '../services/liveScoresService.js';

const parser = new Parser({ timeout: 15000 });

export async function getScores(req, res, next) {
  try {
    const league = req.query.league || 'all';
    const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const data = await getLiveScores(league, { refresh });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function liveSports(req, res, next) {
  try {
    const league = req.query.league;
    if (league && league !== 'headlines') {
      const data = await getLiveScores(league);
      const games = data.games || data.boards?.find((b) => b.leagueId === league)?.games || [];
      return res.json({ items: games, scores: games });
    }

    const url = 'https://www.espn.com/espn/rss/news';
    const parsed = await parser.parseURL(url);
    const items = (parsed.items || []).slice(0, 6).map((i) => ({
      title: i.title,
      link: i.link,
      pubDate: i.pubDate,
    }));
    res.json({ items });
  } catch (e) {
    try {
      const data = await getLiveScores('nba');
      res.json({ items: data.games || [], scores: data.games || [] });
    } catch (e2) {
      next(e2);
    }
  }
}
