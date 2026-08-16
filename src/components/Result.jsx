const OUTCOME_MAP = {
  win: { text: 'Clash Won!', emoji: '⚔️', cls: 'win' },
  lose: { text: 'Clash Lost', emoji: '💥', cls: 'lose' },
  draw: { text: 'Clash Draw', emoji: '🤝', cls: 'draw' },
};

const ELEMENT_LABEL = { fire: 'Fire', water: 'Water', earth: 'Earth' };

export default function Result({ result, onNextRound, onRematch }) {
  const r = OUTCOME_MAP[result.outcome];

  if (result.gameOver) {
    const wonMatch = result.yourHp > result.opponentHp;
    const drewMatch = result.yourHp === result.opponentHp;
    const title = wonMatch ? 'Victory!' : drewMatch ? 'Match Draw' : 'Defeated';
    const emoji = wonMatch ? '🏆' : drewMatch ? '🤝' : '☠️';
    const cls = wonMatch ? 'win' : drewMatch ? 'draw' : 'lose';

    return (
      <div>
        <div className="result-hero">
          <div className="emoji">{emoji}</div>
          <div className={`big ${cls}`}>{title}</div>
          <div className="detail">
            Final HP — You: {result.yourHp} · Opponent: {result.opponentHp}
          </div>
        </div>
        <button className="btn-primary btn-full" style={{ marginTop: '16px' }} onClick={onRematch}>
          Rematch →
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="result-hero">
        <div className="emoji">{r.emoji}</div>
        <div className={`big ${r.cls}`}>{r.text}</div>
        <div className="detail">
          {ELEMENT_LABEL[result.yourCard.element]} ({result.yourCard.power}) vs{' '}
          {ELEMENT_LABEL[result.opponentCard.element]} ({result.opponentCard.power})
        </div>
        {result.damage > 0 && (
          <div className="detail" style={{ marginTop: '4px' }}>
            {result.damage} damage dealt
          </div>
        )}
      </div>

      <div className="scoreboard">
        <div className="side you">
          You
          <b>{result.yourHp} HP</b>
        </div>
        <div className="vs">VS</div>
        <div className="side opp">
          Opponent
          <b>{result.opponentHp} HP</b>
        </div>
      </div>

      <button className="btn-primary btn-full" style={{ marginTop: '16px' }} onClick={onNextRound}>
        Next Clash →
      </button>
    </div>
  );
}