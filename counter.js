// ==========================================
// counter.js : 座席入力・カウンター操作・潮時アラートバー
// ==========================================

const ResetButton = ({ onReset, counterMode, setCounterMode }) => {
    const [confirming, setConfirming] = React.useState(false);

    return (
        <div className="mt-4 pt-1">
            {confirming && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="w-full max-w-sm p-6 bg-sky-50 dark:bg-slate-800 border-2 border-sky-200 dark:border-sky-900 rounded-2xl flex flex-col justify-center space-y-5 shadow-2xl">
                        <span className="text-sm sm:text-base font-black text-sky-700 dark:text-sky-400 text-center leading-relaxed">
                            釣果(数)をリセットしますか？<br/>
                            <span className="text-xs text-gray-500 dark:text-slate-400 font-normal">※お名前とサイズは残ります</span>
                        </span>
                        <div className="flex space-x-3">
                            <button onClick={() => { onReset(); setConfirming(false); }} className="flex-1 bg-sky-500 dark:bg-sky-600 text-white py-3 rounded-xl font-black text-base shadow-md active:bg-sky-600">はい</button>
                            <button onClick={() => setConfirming(false)} className="flex-1 bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 py-3 rounded-xl font-black text-base shadow-sm active:bg-gray-100 dark:active:bg-slate-600">いいえ</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex space-x-2 items-stretch h-11">
                <div className="w-2/3 border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-900/60 rounded-lg flex relative overflow-hidden p-0.5 select-none shadow-inner">
                    <div 
                        className="absolute top-0.5 bottom-0.5 w-[calc(33.33%-2px)] rounded-md transition-all duration-300 shadow-sm bg-sky-500 dark:bg-slate-700"
                        style={{ left: counterMode === 'tap' ? '2px' : counterMode === 'slide' ? 'calc(33.33% + 1px)' : 'calc(66.66%)' }}
                    />
                    <button onClick={() => setCounterMode('tap')} className={`flex-1 flex items-center justify-center font-black text-[11px] sm:text-xs z-10 transition-colors duration-200 ${counterMode === 'tap' ? 'text-white' : 'text-gray-400 dark:text-slate-500'}`}>タップ</button>
                    <button onClick={() => setCounterMode('slide')} className={`flex-1 flex items-center justify-center font-black text-[11px] sm:text-xs z-10 transition-colors duration-200 ${counterMode === 'slide' ? 'text-white' : 'text-gray-400 dark:text-slate-500'}`}><IconSwipe className="w-3.5 h-3.5 mr-0.5 sm:mr-1" />スライド</button>
                    <button onClick={() => setCounterMode('keypad')} className={`flex-1 flex items-center justify-center font-black text-[11px] sm:text-xs z-10 transition-colors duration-200 ${counterMode === 'keypad' ? 'text-white' : 'text-gray-400 dark:text-slate-500'}`}><IconKeyboard className="w-3.5 h-3.5 mr-0.5 sm:mr-1" />テンキー</button>
                </div>
                <button onClick={() => setConfirming(true)} className="w-1/3 border border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center active:bg-gray-50 dark:active:bg-slate-700 transition-colors shadow-sm px-0.5 pt-0.5">
                    <span className="text-sky-500 mb-0.5"><IconRefresh className="w-4 h-4" /></span> 
                    <span className="text-[11px] sm:text-xs font-black leading-none tracking-tighter">釣果リセット</span>
                </button>
            </div>
        </div>
    );
};

const SeatInput = ({ side, seat, index, onSeatChange, onCountDelta, viewMode, onToggleVisibility }) => {
    const isPort = side === 'port';
    const isSingle = viewMode !== 'both';
    if (seat.isVisible === false) {
        return (
            <div className={`flex items-center justify-center mb-1.5 bg-gray-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-dashed border-gray-200 dark:border-slate-700 cursor-pointer ${isSingle ? 'h-16' : 'h-12'}`} onClick={() => onToggleVisibility(side, index)}>
                <span className="text-gray-400 font-black text-xs">＋ {seat.id}番を表示</span>
            </div>
        );
    }
    const countBoxBg = isPort ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
    return (
        <div className="flex flex-col mb-1.5 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center space-x-1.5">
                <span className={`w-6 text-center font-black shrink-0 text-base cursor-pointer ${isPort ? 'text-red-500' : 'text-emerald-500'}`} onClick={() => onToggleVisibility(side, index)}>{seat.id}</span>
                <input type="text" className="flex-1 min-w-0 border rounded px-2 py-1 text-sm bg-gray-50 dark:bg-slate-900 font-bold focus:bg-white text-gray-800 dark:text-slate-100" value={seat.name} onChange={(e) => onSeatChange(side, index, 'name', e.target.value)} onKeyDown={handleEnterKey} placeholder="名前" />
                <div className={`w-12 h-8 shrink-0 flex items-center justify-center rounded border font-black text-lg ${countBoxBg}`}>{seat.count || '0'}</div>
            </div>
            <div className="relative flex items-center ml-7 mt-1">
                <span className="text-[10px] text-gray-400 mr-1">📝</span>
                <input type="text" className="flex-1 min-w-0 border rounded px-1.5 py-0.5 text-xs bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-slate-300" value={seat.memo || ''} onChange={(e) => onSeatChange(side, index, 'memo', e.target.value)} placeholder="MEMO" />
            </div>
        </div>
    );
};

const CounterCardTap = ({ side, seat, index, onCountDelta, onClear, totalSeats }) => {
    const minH = (totalSeats > 0 && totalSeats <= 6) ? `max(7.5rem, calc((100dvh - 240px) / ${totalSeats}))` : '6.5rem';
    if (seat.isVisible === false) return <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30 flex-1 flex items-center justify-center" style={{ minHeight: minH }}><span className="text-gray-300 font-black text-xl">{seat.id}</span></div>;
    
    const [isFlashing, setIsFlashing] = React.useState(false);
    const timerRef = React.useRef(null);
    const isLongPress = React.useRef(false);
    const isPort = side === 'port';

    const normalCardBg = isPort 
        ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-300' 
        : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300';

    const nameColor = isPort
        ? 'text-red-300/80 dark:text-red-300/40'
        : 'text-emerald-400/80 dark:text-emerald-400/40';

    const handleCardTap = () => {
        onCountDelta(side, index, 1);
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 150);
        if (navigator.vibrate) navigator.vibrate(25);
    };

    const handlePointerDown = (e) => {
        e.stopPropagation();
        isLongPress.current = false;
        timerRef.current = setTimeout(() => {
            isLongPress.current = true;
            onClear(side, index);
            if (navigator.vibrate) navigator.vibrate(40);
        }, 1000);
    };

    const handlePointerUp = (e) => {
        e.stopPropagation();
        if (timerRef.current) clearTimeout(timerRef.current);
        if (!isLongPress.current) onCountDelta(side, index, -1);
    };

    const flashClass = isFlashing 
        ? (isPort ? 'bg-red-500 text-white scale-[0.98]' : 'bg-emerald-500 text-white scale-[0.98]') 
        : normalCardBg;

    return (
        <div className={`relative rounded-lg shadow-sm border overflow-hidden flex-1 flex flex-col tap-none select-none transition-all duration-150 ${flashClass}`} style={{ minHeight: minH }}>
            <div className="flex-1 flex flex-col items-center justify-center cursor-pointer pt-2" onClick={handleCardTap}>
                <div className="absolute top-2 left-2 right-2 flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black shrink-0">{seat.id}</span>
                    <span className={`text-lg font-bold truncate ${isFlashing ? 'text-white/90' : nameColor}`}>{seat.name || '-'} {seat.memo && `(${seat.memo})`}</span>
                </div>
                <div className={`text-4xl sm:text-5xl font-black mt-3 transition-transform duration-100 ${isFlashing ? 'scale-110' : 'scale-100'}`}>
                    {seat.count === '' ? '0' : seat.count}
                </div>
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 flex items-center justify-center border-l border-t rounded-tl-lg bg-white/70 dark:bg-slate-800/70 font-black text-base text-gray-800 dark:text-slate-100 active:bg-gray-200" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>−</button>
        </div>
    );
};

const CounterCardSlide = ({ side, seat, index, onCountDelta, totalSeats }) => {
    const minH = (totalSeats > 0 && totalSeats <= 6) ? `max(7.5rem, calc((100dvh - 240px) / ${totalSeats}))` : '6.5rem';
    if (seat.isVisible === false) return <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30 flex-1 flex items-center justify-center" style={{ minHeight: minH }}><span className="text-gray-300 dark:text-slate-600 font-black text-xl">{seat.id}</span></div>;
    
    const [startX, setStartX] = React.useState(0);
    const [curX, setCurX] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    const isPort = side === 'port';

    const handleStart = (cx) => { setStartX(cx); setIsDragging(true); };
    const handleMove = (cx) => { if (isDragging) setCurX(Math.max(-120, Math.min(120, cx - startX))); };
    const handleEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        if (curX > 40) {
            onCountDelta(side, index, 1);
            if (navigator.vibrate) navigator.vibrate(25); // タップと同じ小気味よい振動
        } else if (curX < -40) {
            onCountDelta(side, index, -1);
            if (navigator.vibrate) navigator.vibrate(25); // タップと同じ小気味よい振動
        }
        setCurX(0);
    };

    const cardBg = isPort 
        ? 'bg-red-50 dark:bg-[#1a0f12] text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60' 
        : 'bg-emerald-50 dark:bg-[#0d1c16] text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60';

    const nameColor = isPort
        ? 'text-red-300/80 dark:text-red-300/40'
        : 'text-emerald-400/80 dark:text-emerald-400/40';

    return (
        <div className="relative rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col tap-none select-none bg-gray-200 dark:bg-slate-950" style={{ minHeight: minH }}
            onTouchStart={(e) => handleStart(e.touches[0].clientX)} onTouchMove={(e) => handleMove(e.touches[0].clientX)} onTouchEnd={handleEnd}
            onMouseDown={(e) => handleStart(e.clientX)} onMouseMove={(e) => handleMove(e.clientX)} onMouseUp={handleEnd} onMouseLeave={() => isDragging && handleEnd()}>
            
            <div className={`absolute inset-0 flex items-center justify-between px-5 font-black text-lg transition-colors ${
                curX > 15 ? 'bg-emerald-600 text-white' : curX < -15 ? 'bg-red-600 text-white' : 'bg-transparent text-transparent'
            }`}>
                <span>{curX > 15 ? '＋ 1' : ''}</span>
                <span>{curX < -15 ? '− 1' : ''}</span>
            </div>

            <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center border rounded-lg shadow-sm ${cardBg}`} style={{ transform: `translateX(${curX}px)` }}>
                <div className="absolute top-2 left-2 right-2 flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black shrink-0">{seat.id}</span>
                    <span className={`text-lg font-bold truncate ${nameColor}`}>{seat.name || '-'} {seat.memo && `(${seat.memo})`}</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black mt-3">{seat.count || '0'}</div>
            </div>
        </div>
    );
};

const CounterKeypadCard = ({ side, seat, index, onSeatChange, totalSeats }) => {
    const minH = (totalSeats > 0 && totalSeats <= 6) ? `max(7.5rem, calc((100dvh - 240px) / ${totalSeats}))` : '6.5rem';
    if (seat.isVisible === false) return <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30 flex-1 flex items-center justify-center" style={{ minHeight: minH }}><span className="text-gray-300 font-black text-xl">{seat.id}</span></div>;
    const isPort = side === 'port';
    const cardBg = isPort 
        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/40' 
        : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40';

    const nameColor = isPort
        ? 'text-red-300/80 dark:text-red-300/40'
        : 'text-emerald-400/80 dark:text-emerald-400/40';

    return (
        <div className={`relative rounded-lg shadow-sm border overflow-hidden flex-1 flex flex-col ${cardBg}`} style={{ minHeight: minH }}>
            <div className="absolute top-2 left-2 right-2 flex items-baseline space-x-1.5 z-10">
                <span className="text-2xl font-black shrink-0">{seat.id}</span>
                <span className={`text-lg font-bold truncate ${nameColor}`}>{seat.name || '-'} {seat.memo && `(${seat.memo})`}</span>
            </div>
            <input type="number" pattern="[0-9]*" inputMode="numeric" className="w-full h-full text-center text-4xl font-black bg-transparent focus:outline-none pt-5 text-current" value={seat.count} onChange={(e) => onSeatChange(side, index, 'count', e.target.value)} />
        </div>
    );
};

const TideAlertBanner = ({ tideState, highTide1, highTide2, lowTide1, lowTide2 }) => {
    const [now, setNow] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 10000);
        return () => clearInterval(timer);
    }, []);

    const events = [];
    if (highTide1) events.push({ type: '満潮', timeStr: highTide1, isHigh: true });
    if (highTide2) events.push({ type: '満潮', timeStr: highTide2, isHigh: true });
    if (lowTide1) events.push({ type: '干潮', timeStr: lowTide1, isHigh: false });
    if (lowTide2) events.push({ type: '干潮', timeStr: lowTide2, isHigh: false });

    if (events.length === 0) return null;

    const parseMinutes = (tStr) => {
        const [h, m] = tStr.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };

    const sortedEvents = events.map(e => ({ ...e, minutes: parseMinutes(e.timeStr) }))
                              .sort((a, b) => a.minutes - b.minutes);

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const futureEvents = sortedEvents.filter(e => e.minutes > nowMinutes);
    const pastEvents = sortedEvents.filter(e => e.minutes <= nowMinutes);

    const nextEvent = futureEvents[0] || null;
    const prevEvent = pastEvents[pastEvents.length - 1] || null;

    let currentFlow = '';
    let flowIcon = '';
    if (nextEvent) {
        if (nextEvent.isHigh) {
            currentFlow = '上げ潮（満ち潮）';
            flowIcon = '↗';
        } else {
            currentFlow = '下げ潮（引き潮）';
            flowIcon = '↘';
        }
    } else if (prevEvent) {
        if (prevEvent.isHigh) {
            currentFlow = '下げ潮傾向';
            flowIcon = '↘';
        } else {
            currentFlow = '上げ潮傾向';
            flowIcon = '↗';
        }
    }

    let remainingText = '';
    let diffMins = 0;
    if (nextEvent) {
        diffMins = nextEvent.minutes - nowMinutes;
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        if (hours > 0) {
            remainingText = `${hours}時間${mins}分`;
        } else {
            remainingText = `${mins}分`;
        }
    }

    const isNearNextSlack = nextEvent && diffMins <= 30;
    const isNearPrevSlack = prevEvent && (nowMinutes - prevEvent.minutes) <= 30;
    const isSlackWater = isNearNextSlack || isNearPrevSlack;

    return (
        <div className={`rounded-xl px-3 py-2 border shadow-sm transition-all duration-300 flex flex-col gap-1 shrink-0 ${
            isSlackWater 
                ? 'bg-gradient-to-r from-sky-100 via-cyan-100 to-sky-50 dark:from-sky-950/70 dark:via-cyan-950/60 dark:to-slate-800 border-cyan-400 dark:border-cyan-500' 
                : 'bg-sky-50/90 dark:bg-slate-800/90 border-sky-200 dark:border-sky-900/60'
        }`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {tideState && (
                        <span className="bg-sky-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded shadow-sm">
                            {tideState}
                        </span>
                    )}
                    <span className="text-xs font-black text-sky-700 dark:text-sky-300 flex items-center">
                        <span className="text-sm font-black mr-0.5 text-cyan-600 dark:text-cyan-400">{flowIcon}</span>
                        {currentFlow}
                    </span>
                </div>

                {isSlackWater && (
                    <span className="flex items-center text-[10px] font-black bg-cyan-500 text-white px-2 py-0.5 rounded-full shadow animate-pulse">
                        ⚡ 潮止まり・時合い注意
                    </span>
                )}
            </div>

            <div className="flex items-baseline justify-between pt-0.5">
                {nextEvent ? (
                    <div className="text-xs sm:text-sm font-bold text-sky-800 dark:text-sky-200">
                        次の<span className="font-black text-sky-600 dark:text-sky-400 mx-0.5">【{nextEvent.type} {nextEvent.timeStr}】</span>まで
                    </div>
                ) : (
                    <div className="text-xs font-bold text-sky-700 dark:text-sky-300">
                        本日の満干潮スケジュール完了
                    </div>
                )}

                {nextEvent && (
                    <div className="text-xs sm:text-sm font-black text-cyan-600 dark:text-cyan-300 flex items-baseline">
                        <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 mr-1">あと</span>
                        <span className="text-base sm:text-lg font-black tracking-tight text-blue-600 dark:text-cyan-300">
                            {remainingText}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

window.ResetButton = ResetButton;
window.SeatInput = SeatInput;
window.CounterCardTap = CounterCardTap;
window.CounterCardSlide = CounterCardSlide;
window.CounterKeypadCard = CounterKeypadCard;
window.TideAlertBanner = TideAlertBanner;