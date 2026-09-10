// ==========================================
// CounterCardTap : タップ式カウンターカード
// （＋で緑フラッシュ、ーで赤フラッシュの視覚フィードバック付き）
// ==========================================
function CounterCardTap({ side, seat, index, onCountDelta, onClear, totalSeats }) {
    const [flash, setFlash] = React.useState(null); // 'plus' | 'minus' | null
    const timerRef = React.useRef(null);
    const longPressTimerRef = React.useRef(null);

    // 視覚フラッシュを発火させる処理
    const triggerFlash = (type) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setFlash(type);
        timerRef.current = setTimeout(() => {
            setFlash(null);
        }, 220); // 0.22秒後に自然に戻る
    };

    // プラス処理（緑発光 ＋ 振動）
    const handlePlus = (e) => {
        e.stopPropagation();
        onCountDelta(side, index, 1);
        triggerFlash('plus');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20);
        }
    };

    // マイナス処理（赤発光 ＋ 振動）
    const handleMinus = (e) => {
        e.stopPropagation();
        onCountDelta(side, index, -1);
        triggerFlash('minus');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([15, 30, 15]);
        }
    };

    // 長押しクリア処理（1秒押し続けで0リセット）
    const handlePointerDown = () => {
        longPressTimerRef.current = setTimeout(() => {
            if (typeof onClear === 'function') {
                onClear(side, index);
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }
        }, 1000);
    };

    const handlePointerUp = () => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };

    const isPort = side === 'port';
    const countVal = seat.count === '' ? '-' : seat.count;

    // フラッシュ状態に応じた背景色と枠線の切り替え
    let bgClasses = 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700';
    if (flash === 'plus') {
        // ＋タップ時：鮮やかなエメラルドグリーンに発光
        bgClasses = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-400 shadow-emerald-200 dark:shadow-none transition-none';
    } else if (flash === 'minus') {
        // －タップ時：鮮やかなローズレッドに発光
        bgClasses = 'bg-rose-100 dark:bg-rose-950/80 border-rose-500 ring-2 ring-rose-400 shadow-rose-200 dark:shadow-none transition-none';
    } else {
        bgClasses += ' transition-colors duration-200';
    }

    return (
        <div 
            className={`rounded-xl border shadow-sm p-2 flex flex-col justify-between select-none relative overflow-hidden ${bgClasses}`}
            style={{ minHeight: totalSeats >= 10 ? '72px' : '82px' }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            {/* 上段：座席番号とお名前 */}
            <div className="flex justify-between items-center px-1">
                <span className={`text-xs font-black ${isPort ? 'text-red-500' : 'text-emerald-600'}`}>
                    {seat.id}.
                </span>
                <span className="text-xs font-bold text-gray-700 dark:text-slate-200 truncate max-w-[90px]">
                    {seat.name || '-'}
                </span>
            </div>

            {/* 中・下段：カウント表示と［ー］［＋］ボタン */}
            <div className="flex items-center justify-between gap-1 mt-1">
                {/* マイナスボタン（赤系統） */}
                <button
                    type="button"
                    onClick={handleMinus}
                    className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-gray-600 dark:text-slate-200 active:bg-rose-500 active:text-white flex items-center justify-center font-black text-lg shadow-xs transition-colors"
                    title="1減らす"
                >
                    －
                </button>

                {/* 数字表示エリア */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <span className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${
                        flash === 'plus' 
                            ? 'text-emerald-700 dark:text-emerald-300 scale-110' 
                            : flash === 'minus' 
                                ? 'text-rose-700 dark:text-rose-300 scale-95' 
                                : 'text-gray-800 dark:text-slate-100'
                    } transition-transform duration-100`}>
                        {countVal}
                    </span>
                    {seat.memo && (
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 truncate max-w-[80px] mt-0.5">
                            {seat.memo}
                        </span>
                    )}
                </div>

                {/* プラスボタン（緑系統） */}
                <button
                    type="button"
                    onClick={handlePlus}
                    className="w-10 h-9 rounded-lg bg-sky-500 hover:bg-emerald-500 text-white active:bg-emerald-600 flex items-center justify-center font-black text-xl shadow-xs transition-colors"
                    title="1増やす"
                >
                    ＋
                </button>
            </div>
        </div>
    );
}