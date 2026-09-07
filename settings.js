// ==========================================
// settings.js : 設定・海況・データ管理パネル
// ==========================================

function SettingsPanel({
    isSettingsOpen, setIsSettingsOpen,
    portCount, starboardCount, onCountChange,
    point, setPoint, waterTemp, setWaterTemp,
    waterDepth, setWaterDepth, tide, setTide,
    tideState, setTideState, highTide1, setHighTide1,
    highTide2, setHighTide2, lowTide1, setLowTide1,
    lowTide2, setLowTide2, weather1, setWeather1,
    weather2, setWeather2, windDir1, setWindDir1,
    windDir2, setWindDir2, windSpeed1, setWindSpeed1,
    windSpeed2, setWindSpeed2, waveHeight1, setWaveHeight1,
    waveHeight2, setWaveHeight2, theme, setTheme,
    targetFish, setTargetFish, date, setToastMessage,
    onFactoryReset, records, setRecords,
    userApiKey, setUserApiKey, selectedAiModel, setSelectedAiModel
}) {
    const fileInputRef = React.useRef(null);
    const [tempKey, setTempKey] = React.useState(userApiKey || '');
    const [showKey, setShowKey] = React.useState(false);

    React.useEffect(() => {
        setTempKey(userApiKey || '');
    }, [userApiKey]);

    if (!isSettingsOpen) return null;

    // バックアップファイルの保存（Androidでも確実に拾えるMIMEタイプ指定）
    const handleExportData = () => {
        try {
            const dataToExport = {
                version: "1.0",
                exportedAt: new Date().toISOString(),
                records: records || []
            };
            const jsonStr = JSON.stringify(dataToExport, null, 2);
            // Androidブラウザが弾かないよう text/plain と application/json の互換設定
            const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const dateStr = date ? date.replace(/-/g, '') : 'backup';
            a.href = url;
            a.download = `yamashitamaru_backup_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setToastMessage('バックアップファイルを保存しました');
        } catch (e) {
            console.error(e);
            setToastMessage('バックアップの保存に失敗しました');
        }
    };

    // バックアップファイルの読み込み・復元処理
    const handleFileImport = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const parsed = JSON.parse(content);

                let importedRecords = [];
                if (Array.isArray(parsed)) {
                    importedRecords = parsed;
                } else if (parsed && Array.isArray(parsed.records)) {
                    importedRecords = parsed.records;
                } else {
                    throw new Error('無効なデータ形式です');
                }

                if (importedRecords.length === 0) {
                    setToastMessage('ファイル内に復元できる釣果データがありませんでした');
                    return;
                }

                setRecords(importedRecords);
                localStorage.setItem('fishing_records', JSON.stringify(importedRecords));
                setToastMessage(`復元完了：${importedRecords.length}件の釣果データを読み込みました`);
                setIsSettingsOpen(false);
            } catch (err) {
                console.error(err);
                setToastMessage('ファイルの復元に失敗しました。データが正しいかご確認ください。');
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.onerror = () => {
            setToastMessage('ファイルの読み込み中にエラーが発生しました');
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleSaveApiKey = () => {
        const cleaned = (tempKey || '').trim();
        setUserApiKey(cleaned);
        localStorage.setItem('fishing_api_key', cleaned);
        setToastMessage('Gemini APIキーを保存しました');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-[fadeIn_0.15s_ease-out]">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden text-gray-800 dark:text-slate-100">
                {/* ヘッダー */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
                    <span className="font-black text-base flex items-center gap-1.5">
                        <IconSettings className="w-5 h-5 text-sky-600 dark:text-sky-400" /> 設定・管理
                    </span>
                    <button onClick={() => setIsSettingsOpen(false)} className="w-7 h-7 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-xs hover:bg-gray-300 active:scale-95">
                        ✕
                    </button>
                </div>

                {/* 設定コンテンツ */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm no-scrollbar">
                    {/* 釣り座数設定 */}
                    <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
                        <span className="font-black text-gray-700 dark:text-slate-200 block text-xs">釣り座の席数設定（0〜15席）</span>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[11px] font-bold text-red-500 block mb-1">左舷 席数</label>
                                <input type="number" min="0" max="15" className="w-full border rounded-lg px-2.5 py-1.5 font-black bg-white dark:bg-slate-800 text-center" value={portCount} onChange={(e) => onCountChange('port', e.target.value)} placeholder="0" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-emerald-600 block mb-1">右舷 席数</label>
                                <input type="number" min="0" max="15" className="w-full border rounded-lg px-2.5 py-1.5 font-black bg-white dark:bg-slate-800 text-center" value={starboardCount} onChange={(e) => onCountChange('starboard', e.target.value)} placeholder="0" />
                            </div>
                        </div>
                    </div>

                    {/* 海況・気象設定 */}
                    <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
                        <span className="font-black text-gray-700 dark:text-slate-200 block text-xs">当日の海の状況・ポイント</span>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">ポイント</label>
                                <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={point} onChange={(e) => setPoint(e.target.value)} placeholder="例: 久里浜沖" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">水深 (m)</label>
                                <input type="number" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={waterDepth} onChange={(e) => setWaterDepth(e.target.value)} placeholder="例: 45" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">水温 (℃)</label>
                                <input type="number" step="0.1" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={waterTemp} onChange={(e) => setWaterTemp(e.target.value)} placeholder="例: 18.5" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">潮色</label>
                                <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={tide} onChange={(e) => setTide(e.target.value)} placeholder="例: 澄み / 薄濁り" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">潮回り</label>
                                <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={tideState} onChange={(e) => setTideState(e.target.value)} placeholder="例: 中潮 / 大潮" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">釣り物</label>
                                <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={targetFish} onChange={(e) => setTargetFish(e.target.value)} placeholder="例: カワハギ" />
                            </div>
                        </div>
                    </div>

                    {/* データ管理（バックアップ・復元） */}
                    <div className="bg-sky-50 dark:bg-slate-900/60 p-3 rounded-xl border border-sky-100 dark:border-slate-700 space-y-2.5">
                        <span className="font-black text-sky-800 dark:text-sky-300 block text-xs">データ管理・バックアップ</span>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                            釣果データを端末に保存したり、保存したバックアップファイルからデータを復元できます。
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            {/* 書き出しボタン */}
                            <button
                                onClick={handleExportData}
                                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-black py-2.5 rounded-xl shadow-sm text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
                            >
                                <span>📥</span> データを保存
                            </button>

                            {/* 復元ボタン（テキスト・JSON・全形式を網羅してピッカーで選択可能にする） */}
                            <button
                                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                className="w-full bg-white dark:bg-slate-800 border border-sky-300 dark:border-slate-600 text-sky-700 dark:text-sky-300 font-black py-2.5 rounded-xl shadow-sm text-xs flex items-center justify-center gap-1 active:scale-95 transition-all hover:bg-sky-50"
                            >
                                <span>📤</span> データを復元
                            </button>
                            
                            {/* Androidのファイルピッカーでグレーアウトさせないための accept 拡張 */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,text/plain,application/json,text/json,*/*"
                                className="hidden"
                                onChange={handleFileImport}
                            />
                        </div>
                    </div>

                    {/* Gemini API設定 */}
                    <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
                        <span className="font-black text-gray-700 dark:text-slate-200 block text-xs">Gemini APIキー設定</span>
                        <div className="relative">
                            <input
                                type={showKey ? "text" : "password"}
                                className="w-full border rounded-lg pl-2.5 pr-8 py-1.5 font-mono text-xs bg-white dark:bg-slate-800"
                                placeholder="AIzaSy..."
                                value={tempKey}
                                onChange={(e) => setTempKey(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                            >
                                {showKey ? '隠す' : '表示'}
                            </button>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={handleSaveApiKey}
                                className="flex-1 bg-gray-800 hover:bg-gray-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-1.5 rounded-lg text-xs transition-all"
                            >
                                APIキーを保存
                            </button>
                        </div>
                    </div>

                    {/* テーマ設定 */}
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/60 rounded-xl border border-gray-200 dark:border-slate-700">
                        <span className="font-bold text-xs">画面テーマ</span>
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="px-3 py-1 bg-white dark:bg-slate-800 border rounded-lg font-bold text-xs shadow-sm"
                        >
                            {theme === 'dark' ? '🌙 ダークモード' : '☀️ ライトモード'}
                        </button>
                    </div>

                    {/* 初期化（ファクトリーリセット） */}
                    <div className="pt-2">
                        <button
                            onClick={() => {
                                if (window.confirm('すべての釣果記録と設定を初期化しますか？\n（この操作は元に戻せません）')) {
                                    onFactoryReset();
                                }
                            }}
                            className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-700 text-center"
                        >
                            ⚠️ アプリを完全初期化する
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}