
import React, { useState } from 'react';
import { AgendaItem, TimingStatus } from './types';
import AgendaSetup from './components/AgendaSetup';
import TimerDisplay from './components/TimerDisplay';
import ReportView from './components/ReportView';
import { FileText, LayoutList } from 'lucide-react';

// Branding Header
const Header = () => (
  <header className="bg-tm-navy text-white p-4 shadow-md flex justify-between items-center z-40 sticky top-0">
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

const App: React.FC = () => {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [appView, setAppView] = useState<AppView>(AppView.AGENDA);

  // Meeting Time State
  const [scheduledStart, setScheduledStart] = useState<string>('19:30'); // Default 7:30 PM
  const [actualStart, setActualStart] = useState<string>('');

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

  const resetMeeting = () => {
    if(window.confirm("Start a new meeting? All data will be cleared.")) {
        setItems([]);
        setActiveItemIndex(null);
        setAppView(AppView.AGENDA);
        setActualStart('');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Header />
      
      {/* Navigation Tabs (if needed) or simple logic */}
      <div className="flex justify-center bg-white border-b shadow-sm sticky top-[72px] z-30">
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
      
      <main className="flex-1 overflow-hidden relative">
        <div className={`h-full overflow-auto transition-opacity ${activeItemIndex !== null ? 'opacity-30 pointer-events-none select-none' : 'opacity-100'}`}>
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
                />
            )}

            {appView === AppView.REPORT && (
                <ReportView 
                    items={items} 
                    onReset={resetMeeting} 
                    scheduledStart={scheduledStart}
                    actualStart={actualStart}
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
