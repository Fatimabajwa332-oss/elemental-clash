const ELEMENT_STYLE = {
  fire: { label: 'Fire', color: '#ff6b6b', symbol: '🔥' },
  water: { label: 'Water', color: '#4dabf7', symbol: '💧' },
  earth: { label: 'Earth', color: '#69db7c', symbol: '🌱' },
};

function Card({ card, selected, disabled, onClick }) {
  const style = ELEMENT_STYLE[card.element];
  return (
    <button
      className={`card-btn ${selected ? 'selected' : ''}`}
      style={{ '--card-color': style.color }}
      disabled={disabled}
      onClick={onClick}
    >
      <div className="card-symbol">{style.symbol}</div>
      <div className="card-element">{style.label}</div>
      <div className="card-power">PWR {card.power}</div>
    </button>
  );
}

function HpBar({ label, hp, align }) {
  const pct = Math.max(0, Math.min(100, (hp / 20) * 100));
  return (
    <div className={`hp-block ${align}`}>
      <div className="hp-label">
        <span>{label}</span>
        <span className="hp-value">{hp} HP</span>
      </div>
      <div className="hp-track">
        <div className="hp-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Match({ status, hand, selectedIndex, yourHp, opponentHp, onPickCard }) {
  return (
    <div>
      <div className="hp-row">
        <HpBar label="You" hp={yourHp} align="left" />
        <HpBar label="Opponent" hp={opponentHp} align="right" />
      </div>

      <div className="match-header">{status}</div>

      <div className="hand">
        {hand.map((card, i) => (
          <Card
            key={i}
            card={card}
            selected={selectedIndex === i}
            disabled={selectedIndex !== null}
            onClick={() => onPickCard(i)}
          />
        ))}
      </div>
    </div>
  );
}