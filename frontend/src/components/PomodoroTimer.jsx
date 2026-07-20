import { useEffect, useRef, useState } from 'react';

const PRESETS = { work: 25, short: 5, long: 15 };

function beep(freq = 880, dur = 0.3, vol = 0.4) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
    ctx.close();
  } catch { /* AudioContext not available */ }
}

function chime() {
  beep(880, 0.2, 0.3);
  setTimeout(() => beep(1100, 0.2, 0.3), 250);
  setTimeout(() => beep(1320, 0.4, 0.4), 500);
}

export default function PomodoroTimer({ onClose }) {
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [intervalMin, setIntervalMin] = useState(5);
  const [soundOn, setSoundOn] = useState(true);
  const [phase, setPhase] = useState('work'); // 'work' | 'break'
  const [secondsLeft, setSecondsLeft] = useState(workMin * 60);
  const [running, setRunning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tickRef = useRef(null);
  const nextSoundRef = useRef(intervalMin * 60);

  const total = phase === 'work' ? workMin * 60 : breakMin * 60;
  const pct = ((total - secondsLeft) / total) * 100;
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  useEffect(() => {
    setSecondsLeft(workMin * 60);
    nextSoundRef.current = intervalMin * 60;
    setRunning(false);
  }, [workMin, breakMin]);

  useEffect(() => {
    if (!running) { clearInterval(tickRef.current); return; }
    tickRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;

        // Interval sound
        if (soundOn && intervalMin > 0 && next === nextSoundRef.current) {
          beep(660, 0.2, 0.3);
          nextSoundRef.current -= intervalMin * 60;
        }

        if (next <= 0) {
          clearInterval(tickRef.current);
          if (soundOn) chime();
          setPhase((p) => {
            const nextPhase = p === 'work' ? 'break' : 'work';
            const nextTotal = nextPhase === 'work' ? workMin * 60 : breakMin * 60;
            setSecondsLeft(nextTotal);
            nextSoundRef.current = intervalMin * 60;
            return nextPhase;
          });
          setRunning(false);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running, soundOn, intervalMin, workMin, breakMin]);

  function reset() {
    setRunning(false);
    setPhase('work');
    setSecondsLeft(workMin * 60);
    nextSoundRef.current = intervalMin * 60;
  }

  const phaseColor = phase === 'work' ? 'text-red-500' : 'text-green-500';
  const barColor = phase === 'work' ? 'bg-red-500' : 'bg-green-500';

  return (
    <div className="fixed bottom-24 right-6 z-50 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-base">🍅</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pomodoro</span>
          <span className={`text-xs font-medium ${phaseColor}`}>
            {phase === 'work' ? 'Focustijd' : 'Pauze'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-1 text-sm"
            title="Instellingen"
          >
            ⚙
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700 space-y-2 text-sm">
          {[
            { label: 'Focustijd (min)', val: workMin, set: setWorkMin },
            { label: 'Pauze (min)', val: breakMin, set: setBreakMin },
            { label: 'Geluid interval (min, 0=uit)', val: intervalMin, set: setIntervalMin },
          ].map(({ label, val, set }) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-gray-600 dark:text-gray-300 text-xs">{label}</span>
              <input
                type="number" min="0" max="120"
                value={val}
                onChange={(e) => set(Math.max(0, Math.min(120, +e.target.value)))}
                className="w-16 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-right"
              />
            </div>
          ))}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-300 text-xs">Geluid aan</span>
            <button
              onClick={() => setSoundOn((o) => !o)}
              className={`w-10 h-5 rounded-full transition-colors ${soundOn ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white shadow mx-0.5 transition-transform ${soundOn ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Timer display */}
      <div className="px-4 pt-5 pb-2 text-center">
        <p className={`text-5xl font-mono font-bold tracking-tight ${phaseColor}`}>
          {mins}:{secs}
        </p>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 pb-4 pt-2">
        <button
          onClick={reset}
          className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          ↺ Reset
        </button>
        <button
          onClick={() => setRunning((r) => !r)}
          className={`text-sm px-5 py-1.5 rounded-lg font-medium text-white ${
            running ? 'bg-gray-500 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {running ? '⏸ Pauze' : '▶ Start'}
        </button>
        <button
          onClick={() => {
            setPhase((p) => p === 'work' ? 'break' : 'work');
            setSecondsLeft(phase === 'work' ? breakMin * 60 : workMin * 60);
            setRunning(false);
          }}
          className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          ⇄ Wissel
        </button>
      </div>
    </div>
  );
}
