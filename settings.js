// ==========================================
// settings.js : 設定・海況・データ管理パネル（タブ切り替え＆個別画像解析版）
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
    const [activeSettingsTab, setActiveSettingsTab] = React.useState('seats'); // 'seats', 'weather', 'data'
    const tideImageInputRef = React.useRef(null);
    const weatherImageInputRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const [tempKey, setTempKey] = React.useState(userApiKey || '');
    const [showKey, setShowKey] = React.useState(false);
    const [isAnalyzingTide, setIsAnalyzingTide] = React.useState(false);
    const [isAnalyzingWeather, setIsAnalyzingWeather] = React.useState(false);

    React.useEffect(() => {
        setTempKey(userApiKey || '');
    }, [userApiKey]);

    if (!isSettingsOpen) return null;

    // Base64変換ユーティリティ
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const res = reader.result;
                resolve(res.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // 共通 Gemini Vision 呼び出し
    const callVisionApi = async (file, prompt) => {
        const activeKey = (userApiKey || '').trim();
        if (!activeKey) {
            throw new Error('APIキーが設定されていません。「データ・AI」タブでGemini APIキーを登録してください。');
        }

        const base64Data = await fileToBase64(file);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`;
        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: file.type || 'image/png',
                            data: base64Data
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                response_mime_type: "application/json"
            }
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `通信エラー: HTTP ${response.status}`);
        }

        const resData = await response.json();
        const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('解析結果が得られませんでした');
        const clean = text.replace(/```json/gi, '').split('```').join('').trim();
        return JSON.parse(clean);
    };

    // ==========================================
    // 潮時表 画像解析
    // ==========================================
    const handleTideImageAnalysis = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        setIsAnalyzingTide(true);
        setToastMessage('潮時表を解析中...');

        try {
            const prompt = `この画像は潮時表（タイドグラフ）のスクリーンショットです。
以下の潮時情報を読み取り、JSON形式のみで出力してください。不明な項目は空文字 "" にしてください。
{"tideState":"潮回り(大潮,中潮,小潮,若潮,長潮など)","highTide1":"満潮1(例: 05:24)","highTide2":"満潮2(例: 17:40)","lowTide1":"干潮1(例: 11:15)","lowTide2":"干潮2(例: 23:50)"}`;

            const parsed = await callVisionApi(file, prompt);
            let count = 0;
            if (parsed.tideState) { setTideState(parsed.tideState); count++; }
            if (parsed.highTide1) { setHighTide1(parsed.highTide1); count++; }
            if (parsed.highTide2) { setHighTide2(parsed.highTide2); count++; }
            if (parsed.lowTide1) { setLowTide1(parsed.lowTide1); count++; }
            if (parsed.lowTide2) { setLowTide2(parsed.lowTide2); count++; }

            setToastMessage(`潮時表の解析完了！\n${count}項目の潮時データを反映しました`);
        } catch (err) {
            console.error(err);
            setToastMessage(`潮時表の解析に失敗しました: ${err.message}`);
        } finally {
            setIsAnalyzingTide(false);
            if (tideImageInputRef.current) tideImageInputRef.current.value = '';
        }
    };

    // ==========================================
    // 気象予報 画像解析
    // ==========================================
    const handleWeatherImageAnalysis = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        setIsAnalyzingWeather(true);
        setToastMessage('気象予報を解析中...');

        try {
            const prompt = `この画像は海の天気・風・波の気象予報スクリーンショットです。
午前・午後の予報を読み取り、JSON形式のみで出力してください。不明な項目は空文字 "" にしてください。
{"weather1":"前半天気(晴れ,曇り,雨など)","weather2":"後半天気","windDir1":"前半風向(北,北東など)","windDir2":"後半風向","windSpeed1":"前半風速(例: 3m)","windSpeed2":"後半風速","waveHeight1":"前半波高(例: 1.0m)","waveHeight2":"後半波高"}`;

            const parsed = await callVisionApi(file, prompt);
            let count = 0;
            if (parsed.weather1) { setWeather1(parsed.weather1); count++; }
            if (parsed.weather2) { setWeather2(parsed.weather2); count++; }
            if (parsed.windDir1) { setWindDir1(parsed.windDir1); count++; }
            if (parsed.windDir2) { setWindDir2(parsed.windDir2); count++; }
            if (parsed.windSpeed1) { setWindSpeed1(parsed.windSpeed1); count++; }
            if (parsed.windSpeed2) { setWindSpeed2(parsed.windSpeed2); count++; }
            if (parsed.waveHeight1) { setWaveHeight1(parsed.waveHeight1); count++; }
            if (parsed.waveHeight2) { setWaveHeight2(parsed.waveHeight2); count++; }

            setToastMessage(`気象予報の解析完了！\n${count}項目の気象データを反映しました`);
        } catch (err) {
            console.error(err);
            setToastMessage(`気象予報の解析に失敗しました: ${err.message}`);
        } finally {
            setIsAnalyzingWeather(false);
            if (weatherImageInputRef.current) weatherImageInputRef.current.value = '';
        }
    };

    // ==========================================
    // バックアップ保存（エクスポート）
    // ==========================================
    const handleExportData = () => {
        try {
            let currentRecords = records;
            const savedRaw = localStorage.getItem('fishing_records');
            if (savedRaw) {
                try {
                    const parsed = JSON.parse(savedRaw);
                    if (Array.isArray(parsed)) currentRecords = parsed;
                } catch (e) {}
            }

            const exportPayload = {
                app: "yamashitamaru",
                version: "2.0",
                exportedAt: new Date().toISOString(),
                records: currentRecords || []
            };

            const jsonStr = JSON.stringify(exportPayload, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const safeDate = (date || getTodayString()).replace(/-/g, '');
            a.href = url;
            a.download = `yamashitamaru_backup_${safeDate}.json`;
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

    // ==========================================
    // バックアップ復元（インポート）
    // ==========================================
    const handleFileImport = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                if (!text || !text.trim()) throw new Error('データが空です');
                const parsed = JSON.parse(text);
                let importedList = [];

                if (Array.isArray(parsed)) {
                    importedList = parsed;
                } else if (parsed && Array.isArray(parsed.records)) {
                    importedList = parsed.records;
                } else {
                    throw new Error('データ形式が認識できません');
                }

                if (importedList.length === 0) {
                    setToastMessage('復元できる釣果データが見つかりませんでした');
                    return;
                }

                localStorage.setItem('fishing_records', JSON.stringify(importedList));
                setRecords(importedList);
                setToastMessage(`復元完了：${importedList.length}件の釣果データを復元しました`);
                setIsSettingsOpen(false);
            } catch (err) {
                console.error(err);
                setToastMessage('復元に失敗しました。正しいファイルかご確認ください。');
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.onerror = () => {
            setToastMessage('ファイルの読み込み中にエラーが発生しました');
            if (fileInputRef.current) fileInputRef.current.value = '';
        };

        reader.readAsText(file, 'UTF-8');
    };

    // ==========================================
    // 完全初期化
    // ==========================================
    const handleFullReset = () => {
        const confirm1 = window.confirm('【警告】すべての釣果記録と設定を初期化しますか？\nこの操作は元に戻せません。');
        if (!confirm1) return;
        const confirm2 = window.confirm('本当によろしいですか？');
        if (!confirm2) return;

        try {
            localStorage.clear();
            if (typeof onFactoryReset === 'function') {
                onFactoryReset();
            } else {
                setRecords([]);
            }
            setToastMessage('アプリを初期化しました');
            setIsSettingsOpen(false);
        } catch (e) {
            setToastMessage('初期化に失敗しました');
        }
    };

    const handleSaveApiKey = () => {
        const cleaned = (tempKey || '').trim();
        setUserApiKey(cleaned);
        localStorage.setItem('fishing_api_key', cleaned);
        setToastMessage('Gemini APIキーを保存しました');
    };

    const handleModelChange = (e) => {
        const val = e.target.value;
        setSelectedAiModel(val);
        localStorage.setItem('fishing_ai_model', val);
        setToastMessage(`AIモデルを「${val}」に変更しました`);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-[fadeIn_0.15s_ease-out]">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-md max-h-[92dvh] flex flex-col overflow-hidden text-gray-800 dark:text-slate-100">
                {/* ヘッダー */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 shrink-0">
                    <span className="font-black text-base flex items-center gap-1.5">
                        <IconSettings className="w-5 h-5 text-sky-600 dark:text-sky-400" /> 設定・海況管理
                    </span>
                    <button onClick={() => setIsSettingsOpen(false)} className="w-7 h-7 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-xs hover:bg-gray-300 active:scale-95">
                        ✕
                    </button>
                </div>

                {/* 上部タブ切り替えバー */}
                <div className="flex bg-gray-100 dark:bg-slate-900 p-1.5 gap-1 border-b border-gray-200 dark:border-slate-700 text-xs font-black shrink-0">
                    <button
                        onClick={() => setActiveSettingsTab('seats')}
                        className={`flex-1 py-2 rounded-xl transition-all ${activeSettingsTab === 'seats' ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}
                    >
                        釣り座
                    </button>
                    <button
                        onClick={() => setActiveSettingsTab('weather')}
                        className={`flex-1 py-2 rounded-xl transition-all ${activeSettingsTab === 'weather' ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}
                    >
                        気象・潮時
                    </button>
                    <button
                        onClick={() => setActiveSettingsTab('data')}
                        className={`flex-1 py-2 rounded-xl transition-all ${activeSettingsTab === 'data' ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}
                    >
                        データ・AI
                    </button>
                </div>

                {/* スクロール可能コンテンツ */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm no-scrollbar">

                    {/* ========================================== */}
                    {/* タブ 1: 釣り座設定 */}
                    {/* ========================================== */}
                    {activeSettingsTab === 'seats' && (
                        <div className="space-y-4 animate-[fadeIn_0.15s_ease-out]">
                            <div className="bg-gray-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
                                <div>
                                    <span className="font-black text-gray-700 dark:text-slate-200 block text-xs">釣り座の席数設定（0〜15席）</span>
                                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                        左右それぞれの乗船定員・座席数を入力してください。
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40 shadow-sm">
                                        <label className="text-xs font-black text-red-500 block mb-1">左舷 席数</label>
                                        <input
                                            type="number" min="0" max="15"
                                            className="w-full border rounded-lg px-2.5 py-1.5 font-black text-lg bg-gray-50 dark:bg-slate-900 text-center"
                                            value={portCount}
                                            onChange={(e) => onCountChange('port', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm">
                                        <label className="text-xs font-black text-emerald-600 block mb-1">右舷 席数</label>
                                        <input
                                            type="number" min="0" max="15"
                                            className="w-full border rounded-lg px-2.5 py-1.5 font-black text-lg bg-gray-50 dark:bg-slate-900 text-center"
                                            value={starboardCount}
                                            onChange={(e) => onCountChange('starboard', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================== */}
                    {/* タブ 2: 気象・潮時設定（個別AI解析つき） */}
                    {/* ========================================== */}
                    {activeSettingsTab === 'weather' && (
                        <div className="space-y-4 animate-[fadeIn_0.15s_ease-out]">
                            
                            {/* 📷 AI画像解析（潮時・気象の個別ボタン） */}
                            <div className="bg-gradient-to-r from-blue-50 to-sky-100 dark:from-slate-900 dark:to-blue-950 p-3.5 rounded-xl border border-sky-200 dark:border-blue-800 space-y-2.5">
                                <span className="font-black text-sky-900 dark:text-sky-300 block text-xs">
                                    📷 画像からAI自動読み取り
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    {/* 潮時表解析ボタン */}
                                    <button
                                        onClick={() => tideImageInputRef.current && tideImageInputRef.current.click()}
                                        disabled={isAnalyzingTide || isAnalyzingWeather}
                                        className="bg-white dark:bg-slate-800 border border-sky-300 dark:border-slate-600 hover:bg-sky-50 text-sky-700 dark:text-sky-300 font-black py-2.5 rounded-xl shadow-sm text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
                                    >
                                        {isAnalyzingTide ? <span className="animate-spin">↻</span> : <span>🌊</span>}
                                        <span>潮時表を読取</span>
                                    </button>

                                    {/* 気象予報解析ボタン */}
                                    <button
                                        onClick={() => weatherImageInputRef.current && weatherImageInputRef.current.click()}
                                        disabled={isAnalyzingTide || isAnalyzingWeather}
                                        className="bg-white dark:bg-slate-800 border border-sky-300 dark:border-slate-600 hover:bg-sky-50 text-sky-700 dark:text-sky-300 font-black py-2.5 rounded-xl shadow-sm text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
                                    >
                                        {isAnalyzingWeather ? <span className="animate-spin">↻</span> : <span>☀️</span>}
                                        <span>天気予報を読取</span>
                                    </button>

                                    <input ref={tideImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleTideImageAnalysis} />
                                    <input ref={weatherImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleWeatherImageAnalysis} />
                                </div>
                            </div>

                            {/* 基本海況・ポイント */}
                            <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
                                <span className="font-black text-gray-700 dark:text-slate-200 block text-xs">基本海況・ポイント</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">ポイント</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={point} onChange={(e) => setPoint(e.target.value)} placeholder="例: 久里浜沖" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">釣り物</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={targetFish} onChange={(e) => setTargetFish(e.target.value)} placeholder="例: カワハギ" />
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
                                </div>
                            </div>

                            {/* 潮時時刻 */}
                            <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
                                <span className="font-black text-gray-700 dark:text-slate-200 block text-xs">潮時時刻</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[11px] font-bold text-sky-600 dark:text-sky-400 block mb-0.5">満潮 (1)</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800 text-center" value={highTide1} onChange={(e) => setHighTide1(e.target.value)} placeholder="例: 05:30" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-sky-600 dark:text-sky-400 block mb-0.5">満潮 (2)</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800 text-center" value={highTide2} onChange={(e) => setHighTide2(e.target.value)} placeholder="例: 17:45" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block mb-0.5">干潮 (1)</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800 text-center" value={lowTide1} onChange={(e) => setLowTide1(e.target.value)} placeholder="例: 11:20" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block mb-0.5">干潮 (2)</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800 text-center" value={lowTide2} onChange={(e) => setLowTide2(e.target.value)} placeholder="例: 23:50" />
                                    </div>
                                </div>
                            </div>

                            {/* 天候・気象詳細（前半・後半） */}
                            <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
                                <span className="font-black text-gray-700 dark:text-slate-200 block text-xs">天候・気象（前半／後半）</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">天候 (前半)</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={weather1} onChange={(e) => setWeather1(e.target.value)} placeholder="例: 晴れ" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">天候 (後半)</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={weather2} onChange={(e) => setWeather2(e.target.value)} placeholder="例: 曇り" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">風向 (前半)</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={windDir1} onChange={(e) => setWindDir1(e.target.value)} placeholder="例: 北東" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">風向 (後半)</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={windDir2} onChange={(e) => setWindDir2(e.target.value)} placeholder="例: 南西" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">風速 (前半)</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={windSpeed1} onChange={(e) => setWindSpeed1(e.target.value)} placeholder="例: 3m" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">風速 (後半)</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={windSpeed2} onChange={(e) => setWindSpeed2(e.target.value)} placeholder="例: 6m" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">波高 (前半)</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={waveHeight1} onChange={(e) => setWaveHeight1(e.target.value)} placeholder="例: 1.0m" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-0.5">波高 (後半)</label>
                                        <input type="text" className="w-full border rounded-lg px-2 py-1 font-bold bg-white dark:bg-slate-800" value={waveHeight2} onChange={(e) => setWaveHeight2(e.target.value)} placeholder="例: 1.5m" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================== */}
                    {/* タブ 3: データ管理・AI設定 */}
                    {/* ========================================== */}
                    {activeSettingsTab === 'data' && (
                        <div className="space-y-4 animate-[fadeIn_0.15s_ease-out]">
                            {/* データ管理 */}
                            <div className="bg-sky-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-sky-100 dark:border-slate-700 space-y-2.5">
                                <span className="font-black text-sky-800 dark:text-sky-300 block text-xs">データ管理・バックアップ</span>
                                <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                                    釣果記録を端末にファイルとして保存・復元できます。
                                </p>
                                
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <button
                                        onClick={handleExportData}
                                        className="w-full bg-sky-600 hover:bg-sky-700 text-white font-black py-2.5 rounded-xl shadow-sm text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
                                    >
                                        <span>📥</span> データを保存
                                    </button>

                                    <button
                                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                        className="w-full bg-white dark:bg-slate-800 border border-sky-300 dark:border-slate-600 text-sky-700 dark:text-sky-300 font-black py-2.5 rounded-xl shadow-sm text-xs flex items-center justify-center gap-1 active:scale-95 transition-all hover:bg-sky-50"
                                    >
                                        <span>📤</span> データを復元
                                    </button>
                                    
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileImport}
                                    />
                                </div>
                            </div>

                            {/* Gemini AI設定 */}
                            <div className="bg-gray-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
                                <span className="font-black text-gray-700 dark:text-slate-200 block text-xs">Gemini AI設定</span>
                                
                                {/* APIキー */}
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-1">APIキー</label>
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
                                    <button
                                        onClick={handleSaveApiKey}
                                        className="w-full mt-1.5 bg-gray-800 hover:bg-gray-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-1.5 rounded-lg text-xs transition-all"
                                    >
                                        APIキーを保存
                                    </button>
                                </div>

                                {/* モデル選択 */}
                                <div className="pt-1 border-t border-gray-200 dark:border-slate-700">
                                    <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-1">使用AIモデル</label>
                                    <select
                                        className="w-full border rounded-lg px-2.5 py-1.5 font-bold text-xs bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100"
                                        value={selectedAiModel}
                                        onChange={handleModelChange}
                                    >
                                        <option value="Gemini 2.5 Flash">Gemini 2.5 Flash（推奨・最速・高精度）</option>
                                        <option value="Gemini 2.5 Pro">Gemini 2.5 Pro（深層考察・高精度）</option>
                                        <option value="Gemini 1.5 Flash">Gemini 1.5 Flash（旧標準）</option>
                                        <option value="Gemini 1.5 Pro">Gemini 1.5 Pro（旧プロ）</option>
                                    </select>
                                </div>
                            </div>

                            {/* 画面テーマ設定 */}
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/60 rounded-xl border border-gray-200 dark:border-slate-700">
                                <span className="font-bold text-xs">画面テーマ</span>
                                <button
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-lg font-bold text-xs shadow-sm"
                                >
                                    {theme === 'dark' ? '🌙 ダークモード' : '☀️ ライトモード'}
                                </button>
                            </div>

                            {/* 完全初期化 */}
                            <div className="pt-2">
                                <button
                                    onClick={handleFullReset}
                                    className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-700 text-center transition-colors"
                                >
                                    ⚠️ アプリを完全初期化する
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}