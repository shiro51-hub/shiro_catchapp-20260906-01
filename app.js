{/* ========================================== */}
{/* 釣果ボード最下段：集計情報 ＆ 海況ステータス */}
{/* ========================================== */}

{/* 上段：型・総計・平均 */}
<div className="grid grid-cols-3 gap-2 py-2 px-3 border-b border-gray-200 dark:border-slate-700 text-center">
    <div>
        <span className="text-xs text-gray-500 dark:text-slate-400 block font-bold">型</span>
        <span className="text-sm sm:text-base font-black text-gray-800 dark:text-slate-100">{sizeRange || '―'}</span>
    </div>
    <div>
        <span className="text-xs text-gray-500 dark:text-slate-400 block font-bold">総計</span>
        <span className="text-sm sm:text-base font-black text-sky-600 dark:text-sky-400">{totalCount} 匹</span>
    </div>
    <div>
        <span className="text-xs text-gray-500 dark:text-slate-400 block font-bold">平均</span>
        <span className="text-sm sm:text-base font-black text-gray-800 dark:text-slate-100">{avgCount} 匹</span>
    </div>
</div>

{/* 下段：【ポイント＋水深】 【水温】 【潮回り】 */}
<div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-slate-900/40 text-xs sm:text-sm font-black">
    {/* 1. ポイント + 水深（「水深」の文字は省略し、直後に m 表示） */}
    <div className="text-gray-700 dark:text-slate-200 flex items-center gap-1.5 truncate">
        <span>{point || 'ポイント未設定'}</span>
        {waterDepth ? (
            <span className="text-sky-600 dark:text-sky-400 font-black">{waterDepth}m</span>
        ) : null}
    </div>

    {/* 2. 水温（「水温」の漢字 ＋ 数字℃） */}
    <div className="text-gray-700 dark:text-slate-200 shrink-0 px-2">
        <span>水温</span>{' '}
        <span className="text-amber-600 dark:text-amber-400 font-black">
            {waterTemp ? `${waterTemp}℃` : '―'}
        </span>
    </div>

    {/* 3. 潮回り（「潮」の重複を防ぎ、大潮・中潮など名称のみ表示） */}
    <div className="text-sky-700 dark:text-sky-300 shrink-0 font-black">
        {tideState ? (
            tideState.endsWith('潮') ? tideState : `${tideState}潮`
        ) : '―'}
    </div>
</div>