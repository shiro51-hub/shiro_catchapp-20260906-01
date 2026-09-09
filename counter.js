// ==========================================
// counter.js : カウンター画面専用コンポーネント群（完全版）
// ==========================================

// 共通ハプティクス（振動）発動ヘルパー（Brave / Chrome両対応）
const triggerVibration = (ms = 20) => {
    try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(ms);
        }
    } catch (e) {}
};

// ==========================================
// 1. スライド式カウンターカード（スライド確定時に確実に指先へ振動）
// ==========================================
function CounterCardSlide({ side, seat, index, onCountDelta, totalSeats }) {
    const [startX, setStartX] = React.useState(null);
    const [currentDeltaX, setCurrentDeltaX] = React.useState(0);
    const hasVibratedRef = React.useRef(false); // スワイプ中に1回だけ鳴らすためのフラグ
    const isPort = side === 'port';
    const isCrowded = (totalSeats || 0) >= 8;

    if (seat.isVisible === false) return null;

    const handleTouchStart = (e) => {
        setStartX(e.touches[0].clientX);
        setCurrentDeltaX(0);
        hasVibratedRef.current = false;
    };

    const handleTouchMove = (e) => {
        if (startX === null) return;
        const diff = e.touches[0].clientX - startX;
        
        // 横揺れ幅を制限
        if (Math.abs(diff) < 80) {
            setCurrentDeltaX(diff);
        }

        // 指が画面に触れている間に閾値を超えた瞬間に「カチッ」と振動
        const threshold = 35;
        if (!hasVibratedRef.current) {
            if (diff > threshold) {
                triggerVibration(25); // 右スライド確定（プラス）
                hasVibratedRef.current = true;
            } else if (diff < -threshold) {
                triggerVibration(20); // 左スライド確定（マイナス）
                hasVibratedRef.current = true;
            }
        }
    };

    const handleTouchEnd = () => {
        const threshold = 35; // スライド判定のしきい値
        if (currentDeltaX > threshold) {
            onCountDelta(side, index, 1);
        } else if (currentDeltaX < -threshold) {
            onCountDelta(side, index, -1);
        }
        setStartX(null);
        setCurrentDeltaX(0);
        hasVibratedRef.current = false;
    };

    const countVal = parseInt(seat.count, 10) || 0;

    return (
        <div 
            className={`relative rounded-xl border select-none overflow-hidden touch-pan-y ${isCrowded ? 'p-2' : 'p-2.5 sm:p-3'} ${
                isPort 
                    ? 'bg-red-50/80 dark:bg-slate-800/90 border-red-200 dark:border-red-900/50' 
                    : 'bg-emerald-50/80 dark:bg-slate-800/90 border-emerald-200 dark:border-emerald-900/50'
            }`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* スライド時の背景インジケーター */}
            <div className={`absolute inset-0 flex items-center justify-between px-3 pointer-events-none transition-opacity duration-150 ${currentDeltaX !== 0 ? 'opacity-100' : 'opacity-0'}`}>
                <span className={`text-xs font-black px-2 py-0.5 rounded ${currentDeltaX < -20 ? 'bg-red-500 text-white shadow' : 'text-gray-400'}`}>−1</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded ${currentDeltaX > 20 ? 'bg-emerald-500 text-white shadow' : 'text-gray-400'}`}>＋1</span>
            </div>

            {/* スワイプで動くカード本体 */}
            <div 
                className="relative z-10 flex items-center justify-between transition-transform duration-75"
                style={{ 
                    transform: `translateX(${Math.max(-45, Math.min(45, currentDeltaX))}px)`,
                    willChange: 'transform'
                }}
            >
                <div className="flex flex-col min-w-0 pr-1.5">
                    <span className="text-xs sm:text-sm font-black text-gray-800 dark:text-slate-200 truncate">
                        {seat.id}番 {seat.name ? `${seat.name}` : ''}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold">
                        {currentDeltaX > 20 ? '離して +1' : currentDeltaX < -20 ? '離して -1' : '← スライド →'}
                    </span>
                </div>
                <div className={`text-2xl sm:text-3xl font-black shrink-0 ${isPort ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {countVal}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 2. タップ式カウンターカード
// ==========================================
function CounterCardTap({ side, seat, index, onCountDelta, onClear, totalSeats }) {
    const isPort = side === 'port';
    const isCrowded = (totalSeats || 0) >= 8;

    if (seat.isVisible === false) return null;

    const countVal = parseInt(seat.count, 10) || 0;

    const handlePlus = (e) => {
        e.stopPropagation();
        triggerVibration(25);
        onCountDelta(side, index, 1);
    };

    const handleMinus = (e) => {
        e.stopPropagation();
        triggerVibration(18);
        onCountDelta(side, index, -1);
    };

    return (
        <div className={`rounded-xl border flex items-center justify-between shadow-sm select-none ${isCrowded ? 'p-1.5' : 'p-2 sm:p-2.5'} ${
            isPort 
                ? 'bg-red-50/70 dark:bg-slate-800/90 border-red-200 dark:border-red-900/50' 
                : 'bg-emerald-50/70 dark:bg-slate-800/90 border-emerald-200 dark:border-emerald-900/50'
        }`}>
            <div className="flex flex-col min-w-0 pl-1">
                <span className="text-xs sm:text-sm font-black text-gray-800 dark:text-slate-200 truncate">
                    {seat.id}番 {seat.name ? `${seat.name}` : ''}
                </span>
                <span className={`text-lg sm:text-xl font-black ${isPort ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {countVal}
                </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                <button
                    type="button"
                    onClick={handleMinus}
                    className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-slate-700 active:bg-gray-300 dark:active:bg-slate-600 text-gray-700 dark:text-slate-200 font-black text-base flex items-center justify-center active:scale-95 transition-all shadow-sm"
                    aria-label="マイナス1"
                >
                    −
                </button>
                <button
                    type="button"
                    onClick={handlePlus}
                    className={`w-10 h-10 rounded-xl font-black text-lg flex items-center justify-center text-white active:scale-95 transition-all shadow-md ${
                        isPort 
                            ? 'bg-red-500 hover:bg-red-600 active:bg-red-700' 
                            : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700'
                    }`}
                    aria-label="プラス1"
                >
                    ＋
                </button>
            </div>
        </div>
    );
}

// ==========================================
// 3. テンキー（キーパッド）入力式カウンターカード
// ==========================================
function CounterKeypadCard({ side, seat, index, onSeatChange, totalSeats }) {
    const isPort = side === 'port';
    const isCrowded = (totalSeats || 0) >= 8;

    if (seat.isVisible === false) return null;

    const handleChange = (e) => {
        let val = e.target.value;
        if (val.length > 3) val = val.slice(0, 3);
        if (parseInt(val, 10) < 0) val = '0';
        onSeatChange(side, index, 'count', val);
    };

    return (
        <div className={`rounded-xl border flex items-center justify-between shadow-sm select-none ${isCrowded ? 'p-1.5' : 'p-2 sm:p-2.5'} ${
            isPort 
                ? 'bg-red-50/70 dark:bg-slate-800/90 border-red-200 dark:border-red-900/50' 
                : 'bg-emerald-50/70 dark:bg-slate-800/90 border-emerald-200 dark:border-emerald-900/50'
        }`}>
            <div className="flex flex-col min-w-0 pl-1">
                <span className="text-xs sm:text-sm font-black text-gray-800 dark:text-slate-200 truncate">
                    {seat.id}番 {seat.name ? `${seat.name}` : ''}
                </span>
            </div>
            <div className="w-16 shrink-0">
                <input
                    type="number"
                    pattern="[0-9]*"
                    className={`w-full text-center font-black text-xl sm:text-2xl rounded-lg border py-1 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 ${
                        isPort 
                            ? 'text-red-600 dark:text-red-400 border-red-300 focus:ring-red-300' 
                            : 'text-emerald-600 dark:text-emerald-400 border-emerald-300 focus:ring-emerald-300'
                    }`}
                    placeholder="0"
                    value={seat.count !== undefined ? seat.count : ''}
                    onChange={handleChange}
                />
            </div>
        </div>
    );
}

// ==========================================
// 4. リアルタイム潮時アラートバー
// ==========================================
function TideAlertBanner({ tideState, highTide1, highTide2, lowTide1, lowTide2 }) {
    if (!tideState && !highTide1 && !highTide2 && !lowTide1 && !lowTide2) {
        return null;
    }

    const formatTideTime = (timeStr, label) => {
        if (!timeStr) return null;
        return `${label} ${timeStr}`;
    };

    const tides = [
        formatTideTime(highTide1, '満潮'),
        formatTideTime(lowTide1, '干潮'),
        formatTideTime(highTide2, '満潮'),
        formatTideTime(lowTide2, '干潮')
    ].filter(Boolean);

    return (
        <div className="bg-sky-50 dark:bg-slate-800/90 border border-sky-200 dark:border-slate-700 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-bold text-sky-900 dark:text-sky-300 shadow-sm shrink-0">
            <div className="flex items-center gap-1.5 truncate">
                <span className="text-sm">🌊</span>
                <span className="font-black text-sky-800 dark:text-sky-200">{tideState ? (tideState.endsWith('潮') ? tideState : `${tideState}潮`) : '潮時'}</span>
                {tides.length > 0 && (
                    <span className="text-gray-400 dark:text-slate-500 mx-1">|</span>
                )}
                <span className="truncate text-[11px] sm:text-xs">
                    {tides.join(' ・ ')}
                </span>
            </div>
        </div>
    );
}

// ==========================================
// 5. カウンターリセット ＆ モード切替ボタン
// ==========================================
function ResetButton({ onReset, counterMode, setCounterMode }) {
    const [showConfirm, setShowConfirm] = React.useState(false);

    const handleConfirm = () => {
        triggerVibration(30);
        onReset();
        setShowConfirm(false);
    };

    return (
        <div className="space-y-2 mt-2 shrink-0">
            {/* モード切替ラジオ調ボタン */}
            <div className="flex bg-gray-200 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-black shadow-inner">
                <button
                    type="button"
                    onClick={() => { triggerVibration(15); setCounterMode('tap'); localStorage.setItem('fishing_counter_mode', 'tap'); }}
                    className={`flex-1 py-2 rounded-lg transition-all ${counterMode === 'tap' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}
                >
                    TAP（ボタン）
                </button>
                <button
                    type="button"
                    onClick={() => { triggerVibration(15); setCounterMode('slide'); localStorage.setItem('fishing_counter_mode', 'slide'); }}
                    className={`flex-1 py-2 rounded-lg transition-all ${counterMode === 'slide' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}
                >
                    SLIDE（スライド）
                </button>
                <button
                    type="button"
                    onClick={() => { triggerVibration(15); setCounterMode('keypad'); localStorage.setItem('fishing_counter_mode', 'keypad'); }}
                    className={`flex-1 py-2 rounded-lg transition-all ${counterMode === 'keypad' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}
                >
                    KEYPAD（テンキー）
                </button>
            </div>

            {/* リセットボタン */}
            {!showConfirm ? (
                <button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    className="w-full bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-black py-2 rounded-xl text-xs border border-gray-300 dark:border-slate-600 transition-all active:scale-95 shadow-sm"
                >
                    釣果数のみリセット（サイズ・お名前は保持）
                </button>
            ) : (
                <div className="flex gap-2 p-1.5 bg-red-50 dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/50 animate-[fadeIn_0.15s_ease-out]">
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-2 rounded-lg text-xs shadow active:scale-95 transition-all"
                    >
                        本当にリセットする
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowConfirm(false)}
                        className="px-4 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold rounded-lg text-xs active:scale-95 transition-all"
                    >
                        中止
                    </button>
                </div>
            )}
        </div>
    );
}