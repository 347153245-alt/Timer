
import React, { useState, useEffect, useCallback } from 'react';
import { AgendaItem, TimingStatus, SavedMeetingState, RoleType } from './types';
import AgendaSetup from './components/AgendaSetup';
import TimerDisplay from './components/TimerDisplay';
import ReportView from './components/ReportView';
import { FileText, LayoutList } from 'lucide-react';
import { DEFAULT_AGENDA_ITEMS } from './constants';

// Branding Header
const Header = () => (
  <header className="bg-tm-navy text-white p-4 shadow-md flex justify-between items-center z-40 sticky top-0 print:hidden">
    <div className="flex items-center gap-3">
        {/* Simple TM Logo Representation */}
        <div className="w-10 h-10 bg-gradient-to-br from-tm-burgundy to-red-800 rounded-full border-2 border-tm-yellow flex items-center justify-center font-serif font-bold text-lg shadow-lg">
            T
        </div>
        <div>
            <h1 className="text-xl font-bold leading-tight">Shantou Toastmasters</h1>
            <p className="text-xs text-tm-grey uppercase tracking-wider">Official Timer</p>
        </div>
    </div>
  </header>
);

enum AppView {
    AGENDA,
    REPORT
}

const STORAGE_KEY_LATEST = 'tm_timer_latest';
const STORAGE_KEY_HISTORY = 'tm_timer_history';

const App: React.FC = () => {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [appView, setAppView] = useState<AppView>(AppView.AGENDA);

  // Meeting Details State
  const [scheduledStart, setScheduledStart] = useState<string>('15:00'); // Default 15:00
  const [actualStart, setActualStart] = useState<string>('');
  const [meetingNumber, setMeetingNumber] = useState<string>('');
  const [meetingTheme, setMeetingTheme] = useState<string>('');

  // History State
  const [savedHistory, setSavedHistory] = useState<SavedMeetingState[]>([]);

  // 1. Load Data on Mount
  useEffect(() => {
    try {
        // Load latest state
        const savedLatest = localStorage.getItem(STORAGE_KEY_LATEST);
        if (savedLatest) {
            const data: SavedMeetingState = JSON.parse(savedLatest);
            restoreState(data);
        } else {
            // Requirement: Default to Template if no data exists
            loadTemplate();
        }

        // Load history list
        const historyJson = localStorage.getItem(STORAGE_KEY_HISTORY);
        if (historyJson) {
            setSavedHistory(JSON.parse(historyJson));
        }
    } catch (e) {
        console.error("Failed to load saved data", e);
        // Fallback to template on error
        loadTemplate();
    }
  }, []);

  // Requirement: Confirm before closing window
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (items.length > 0) {
            e.preventDefault();
            e.returnValue = ''; // Chrome requires this to be set
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [items]);

  const loadTemplate = () => {
      const presetItems = DEFAULT_AGENDA_ITEMS.map(i => ({
        ...i,
        id: crypto.randomUUID(),
        speakerName: '',
        actualTimeSeconds: 0,
        status: TimingStatus.PENDING,
        isRunning: false
    }));
    setItems(presetItems);
  };

  const restoreState = (data: SavedMeetingState) => {
      setItems(data.items || []);
      setScheduledStart(data.scheduledStart || '15:00');
      setActualStart(data.actualStart || '');
      setMeetingNumber(data.meetingNumber || '');
      setMeetingTheme(data.meetingTheme || '');
  };

  const handleSaveData = useCallback(() => {
    const currentState: SavedMeetingState = {
        timestamp: Date.now(),
        items,
        scheduledStart,
        actualStart,
        meetingNumber,
        meetingTheme
    };

    // 1. Save as 'Latest' for auto-restore
    localStorage.setItem(STORAGE_KEY_LATEST, JSON.stringify(currentState));

    // 2. Update History (Max 3)
    const newHistory = [currentState, ...savedHistory].slice(0, 3);
    setSavedHistory(newHistory);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory));
    
    alert('Meeting data saved successfully!');
  }, [items, scheduledStart, actualStart, meetingNumber, meetingTheme, savedHistory]);

  const startRole = (index: number) => {
    // If this is the first item being started and actual start is empty, fill it
    if (!actualStart) {
        const now = new Date();
        const timeString = now.toTimeString().substring(0, 5);
        setActualStart(timeString);
    }
    setActiveItemIndex(index);
  };

  const handleRoleComplete = (elapsedSeconds: number, status: TimingStatus, logs: string[]) => {
    if (activeItemIndex === null) return;

    const updatedItems = [...items];
    updatedItems[activeItemIndex] = {
        ...updatedItems[activeItemIndex],
        actualTimeSeconds: elapsedSeconds,
        status: status,
        logs: logs
    };
    setItems(updatedItems);
    setActiveItemIndex(null); // Close timer
  };

  const cancelTimer = () => {
      setActiveItemIndex(null);
  };

  // Requirement: Blank state via button with prompt
  const clearAllData = () => {
    if(window.confirm("WARNING: This will delete all agenda items and clear the screen. \n\nAre you sure? Data will be lost.")) {
        setItems([]);
        setActiveItemIndex(null);
        setAppView(AppView.AGENDA);
        setActualStart('');
        setMeetingNumber('');
        setMeetingTheme('');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 print:bg-white print:h-auto">
      <Header />
      
      {/* Navigation Tabs */}
      <div className="flex justify-center bg-white border-b shadow-sm sticky top-[72px] z-30 print:hidden">
          <button 
            onClick={() => setAppView(AppView.AGENDA)}
            className={`px-6 py-3 flex items-center gap-2 font-semibold border-b-2 transition-colors ${appView === AppView.AGENDA ? 'border-tm-burgundy text-tm-burgundy' : 'border-transparent text-gray-500 hover:text-tm-navy'}`}
          >
            <LayoutList className="w-5 h-5" /> Agenda
          </button>
          <button 
            onClick={() => setAppView(AppView.REPORT)}
            className={`px-6 py-3 flex items-center gap-2 font-semibold border-b-2 transition-colors ${appView === AppView.REPORT ? 'border-tm-burgundy text-tm-burgundy' : 'border-transparent text-gray-500 hover:text-tm-navy'}`}
          >
            <FileText className="w-5 h-5" /> Report
          </button>
      </div>
      
      <main className="flex-1 overflow-hidden relative print:overflow-visible print:h-auto">
        <div className={`h-full overflow-auto transition-opacity print:overflow-visible print:h-auto ${activeItemIndex !== null ? 'opacity-30 pointer-events-none select-none' : 'opacity-100'}`}>
            {appView === AppView.AGENDA && (
                <AgendaSetup 
                    items={items} 
                    setItems={setItems} 
                    onStartRole={startRole} 
                    isTimerActive={activeItemIndex !== null}
                    scheduledStart={scheduledStart}
                    setScheduledStart={setScheduledStart}
                    actualStart={actualStart}
                    setActualStart={setActualStart}
                    meetingNumber={meetingNumber}
                    setMeetingNumber={setMeetingNumber}
                    meetingTheme={meetingTheme}
                    setMeetingTheme={setMeetingTheme}
                    onSave={handleSaveData}
                    savedHistory={savedHistory}
                    onRestore={restoreState}
                    onClearAll={clearAllData}
                    onResetToTemplate={loadTemplate}
                />
            )}

            {appView === AppView.REPORT && (
                <ReportView 
                    items={items} 
                    onReset={loadTemplate} 
                    scheduledStart={scheduledStart}
                    actualStart={actualStart}
                    meetingNumber={meetingNumber}
                    meetingTheme={meetingTheme}
                />
            )}
        </div>

        {/* Timer Overlay */}
        {activeItemIndex !== null && items[activeItemIndex] && (
            <TimerDisplay 
                item={items[activeItemIndex]}
                onComplete={handleRoleComplete}
                onCancel={cancelTimer}
            />
        )}
      </main>
    </div>
  );
};

export default App;
