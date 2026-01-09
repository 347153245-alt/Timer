
import React, { useEffect, useState, useRef } from 'react';
import { AgendaItem, TimingStatus } from '../types';
import { getTimerConfig } from '../constants';
import { Play, Pause, Square, AlertCircle, X } from 'lucide-react';
import { playSound } from '../utils/audio';

interface TimerDisplayProps {
  item: AgendaItem;
  onComplete: (elapsedSeconds: number, status: TimingStatus, logs: string[]) => void;
  onCancel: () => void;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ item, onComplete, onCancel }) => {
  const [elapsed, setElapsed] = useState(0); // Start at 0 for tracking total duration
  const [isRunning, setIsRunning] = useState(false);
  const [bgColor, setBgColor] = useState('bg-white');
  const [textColor, setTextColor] = useState('text-slate-900');
  const [instruction, setInstruction] = useState('Ready');
  const [confirmStop, setConfirmStop] = useState(false);
  
  // Track played sounds
  const [playedThresholds, setPlayedThresholds] = useState({
    green: false,
    yellow: false,
    red: false,
    bell: false
  });

  const [logs, setLogs] = useState<string[]>([]);
  const timerRef = useRef<number | null>(null);
  
  const config = getTimerConfig(item.type, item.targetTimeMinutes);

  useEffect(() => {
    let newBg = 'bg-white';
    let newText = 'text-slate-900';
    let newInst = 'Timing...';

    // Logic cues based on ELAPSED time
    if (elapsed >= config.bellTime) {
        if (!playedThresholds.bell && isRunning) {
            playSound('bell');
            setPlayedThresholds(p => ({ ...p, bell: true }));
        }
        newBg = 'bg-tm-burgundy';
        newText = 'text-white';
        newInst = 'BELL RUNG';
    } else if (elapsed >= config.redTime) {
        if (!playedThresholds.red && isRunning) {
            playSound('red');
            setPlayedThresholds(p => ({ ...p, red: true }));
        }
        newBg = 'bg-red-600';
        newText = 'text-white';
        newInst = 'RED CARD';
    } else if (elapsed >= config.yellowTime) {
        if (!playedThresholds.yellow && isRunning) {
            playSound('yellow');
            setPlayedThresholds(p => ({ ...p, yellow: true }));
        }
        newBg = 'bg-tm-yellow';
        newText = 'text-tm-navy';
        newInst = 'YELLOW CARD';
    } else if (elapsed >= config.greenTime) {
        if (!playedThresholds.green && isRunning) {
            playSound('green');
            setPlayedThresholds(p => ({ ...p, green: true }));
        }
        newBg = 'bg-green-600';
        newText = 'text-white';
        newInst = 'GREEN CARD';
    }

    setBgColor(newBg);
    setTextColor(newText);
    setInstruction(newInst);
  }, [elapsed, config, isRunning, playedThresholds]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const formatCountdown = () => {
    // Target is Red Time
    const target = config.redTime;
    const diff = target - elapsed;
    const isOvertime = diff < 0;
    
    const absDiff = Math.abs(diff);
    const m = Math.floor(absDiff / 60);
    const s = absDiff % 60;
    const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    
    return {
        text: timeStr,
        label: isOvertime ? 'OVERTIME' : 'REMAINING'
    };
  };

  const handleStopRequest = () => {
      setIsRunning(false);
      setConfirmStop(true);
  };

  const confirmStopAction = () => {
    let status = TimingStatus.QUALIFIED;
    
    // Status Logic:
    // >= Bell Time (Red + 30s) -> Overtime
    // < Green Time -> Undertime
    // Else (Green, Yellow, Red) -> Qualified

    if (elapsed >= config.bellTime) {
        status = TimingStatus.OVERTIME;
    } else if (elapsed < config.greenTime) {
        status = TimingStatus.UNDERTIME;
    }
    
    onComplete(elapsed, status, logs);
  };

  const cancelStop = () => {
      setConfirmStop(false);
  };

  const countdown = formatCountdown();

  return (
    // Fixed bottom half sheet
    <div className="fixed bottom-0 left-0 right-0 h-[50vh] z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
      <div className={`w-full h-full transition-colors duration-500 ease-in-out ${bgColor} ${textColor} flex flex-col relative`}>
        
        {/* Header Bar */}
        <div className="flex justify-between items-center p-3 bg-black/10">
            <div className="flex items-center gap-2">
                 <h2 className="font-bold text-lg leading-none">{item.roleName}</h2>
                 <span className="opacity-70 text-sm">Target: {item.targetTimeMinutes}m</span>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-black/10 rounded-full" title="Close">
                <X className="w-5 h-5" />
            </button>
        </div>

        {confirmStop ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-tm-navy animate-in fade-in">
                <AlertCircle className="w-16 h-16 text-tm-burgundy mb-4" />
                <h3 className="text-2xl font-bold mb-2">Stop Timer?</h3>
                <p className="text-gray-500 mb-8">Final Time: {Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')}</p>
                <div className="flex gap-4">
                    <button 
                        onClick={cancelStop}
                        className="px-6 py-3 rounded-lg font-bold border border-gray-300 hover:bg-gray-100"
                    >
                        Resume
                    </button>
                    <button 
                        onClick={confirmStopAction}
                        className="px-6 py-3 rounded-lg font-bold bg-tm-burgundy text-white hover:bg-opacity-90"
                    >
                        Confirm Stop
                    </button>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                
                <h1 className="text-2xl font-bold mb-2 opacity-90">{item.speakerName || 'Speaker'}</h1>
                
                {/* Countdown Display */}
                <div className="flex flex-col items-center my-2">
                    <div className="text-xl font-bold uppercase tracking-widest opacity-60">{countdown.label}</div>
                    <div className="text-[100px] md:text-[140px] font-bold leading-none tracking-tighter font-mono select-none tabular-nums">
                        {countdown.text}
                    </div>
                </div>

                {/* Instruction Badge */}
                <div className={`px-6 py-2 rounded-full backdrop-blur-md bg-black/20 text-lg font-bold mb-8 animate-pulse ${elapsed === 0 ? 'invisible' : ''}`}>
                    {instruction}
                </div>

                {/* Main Controls */}
                <div className="flex items-center gap-6">
                    <button 
                        onClick={toggleTimer}
                        className={`flex items-center gap-3 px-10 py-5 rounded-full text-2xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                            isRunning 
                            ? 'bg-tm-yellow text-tm-navy' 
                            : 'bg-tm-navy text-white'
                        }`}
                    >
                        {isRunning ? <><Pause className="w-8 h-8 fill-current" /> PAUSE</> : <><Play className="w-8 h-8 fill-current" /> {elapsed === 0 ? 'START' : 'RESUME'}</>}
                    </button>

                    <button 
                        onClick={handleStopRequest}
                        className="flex items-center gap-3 bg-white text-tm-burgundy border-2 border-tm-burgundy px-10 py-5 rounded-full text-2xl font-bold shadow-lg hover:bg-gray-50"
                    >
                        <Square className="w-8 h-8 fill-current" />
                        STOP
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default TimerDisplay;
