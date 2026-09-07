// ==========================================
// settings.js : 設定・海況・データ管理パネル（完全統合版）
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
    const imageInputRef = React.useRef(null);
    const [tempKey, setTempKey] = React.useState(userApiKey || '');
    const [showKey, setShowKey] = React.useState(false);
    const [showTextInput, setShowTextInput] = React.useState(false);
    const [pasteText, setPasteText] = React.useState('');
    const [isAnalyzingImage, setIsAnalyzingImage] = React.useState(false);

    React.useEffect(() => {
        setTempKey(userApiKey || '');
    }, [userApiKey]);

    if (!isSettingsOpen) return null;

    // ==========================================
    // 1. 画像から気象・潮時をAI自動解析
    // ==========================================
    const handleImageAnalysis = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const activeKey = (userApiKey || '').trim();
        if (!activeKey) {
            setToastMessage('APIキーが設定されていません。下の「Gemini API設定」に入力して保存してください。');
            if (imageInputRef.current) imageInputRef.current.value = '';
            return;
        }

        setIsAnalyzingImage(true);
        setToastMessage('画像をGeminiで解析中...\n潮時・気象データを抽出しています');

        try {
            // 画像をBase64に変換
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const res = reader.result;
                    const base64 = res.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const prompt = `この画像は潮時表（タイドグラフ）または海の気象予報のスクリーンショットです。
以下の情報を読み取り、必ず指定のJSON形式のみで出力してください。余計な説明文やコードブロック(\`\`\`)は一切不要です。
読み取れない項目は空文字 "" にしてください。

【読み取り対象】
- tideState: 潮回り (例: 大潮, 中潮, 小潮, 若潮, 長潮)
- highTide1: 満潮時刻1 (例: 05:24)
- highTide2: 満潮時刻2 (例: 17:40)
- lowTide1: 干潮時刻1 (例: 11:15)
- lowTide2: 干潮時刻2 (例: 23:50)
- weather1: 天候前半 (例: 晴れ, 曇り, 雨)
- weather2: 天候後半
- windDir1: 風向前半 (例: 北, 北東, 南西)
- windDir2: 風向後半
- windSpeed1: 風速前半 (例: 3m, 5m)
- windSpeed2: 風速後半
- waveHeight1: 波高前半 (例: 1.0m, 0.5m)
- waveHeight2: 波高後半

JSON形式:
{"tideState":"","highTide1":"","highTide2":"","lowTide1":"","lowTide2":"","weather1":"","weather2":"","windDir1":"","windDir2":"","windSpeed1":"","windSpeed2":"","waveHeight1":"","waveHeight2":""}`;

            // Gemini API呼び出し (画像認識)
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
                const errJson = await response.json().catch(() => ({}));
                throw new Error(errJson.error?.message || `API通信エラー: HTTP ${response.status}`);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error('AIから解析結果が得られませんでした');

            const cleanJson = rawText.replace(/```json/gi, '').split('```').join('').trim();
            const parsed = JSON.parse(cleanJson);

            // 読み取れた項目を各ステートへ反映
            let appliedCount = 0;
            if (parsed.tideState) { setTideState(parsed.tideState); appliedCount++; }
            if (parsed.highTide1) { setHighTide1(parsed.highTide1); appliedCount++; }
            if (parsed.highTide2) { setHighTide2(parsed.highTide2); appliedCount++; }
            if (parsed.lowTide1) { setLowTide1(parsed.lowTide1); appliedCount++; }
            if (parsed.lowTide2) { setLowTide2(parsed.lowTide2); appliedCount++; }
            if (parsed.weather1) { setWeather1(parsed.weather1); appliedCount++; }
            if (parsed.weather2) { setWeather2(parsed.weather2); appliedCount++; }
            if (parsed.windDir1) { setWindDir1(parsed.windDir1); appliedCount++; }
            if (parsed.windDir2) { setWindDir2(parsed.windDir2); appliedCount++; }
            if (parsed.windSpeed1) { setWindSpeed1(parsed.windSpeed1); appliedCount++; }
            if (parsed.windSpeed2) { setWindSpeed2(parsed.windSpeed2); appliedCount++; }
            if (parsed.waveHeight1) { setWaveHeight1(parsed.waveHeight1); appliedCount++; }
            if (parsed.waveHeight2) { setWaveHeight2(parsed.waveHeight2); appliedCount++; }

            setToastMessage(`画像解析完了！\n${appliedCount}個の潮時・気象データを自動入力しました`);
        } catch (err) {
            console.error('Image Analysis Error:', err);
            setToastMessage(`画像解析に失敗しました: ${err.message}`);
        } finally {
            setIsAnalyzingImage(false);
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    // ==========================================
    // 2. バックアップ保存（エクスポート）処理
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
            console.error('Export Error:', e);
            setToastMessage('バックアップの保存に失敗しました');
        }
    };

    // 共通復元ロジック
    const applyRestoreData = (textData) => {
        if (!textData || !textData.trim()) throw new Error('データが空です');
        const parsed = JSON.parse(textData);
        let importedList = [];

        if (Array.isArray(parsed)) {
            importedList = parsed;
        } else if (parsed && Array.isArray(parsed.records)) {
            importedList = parsed.records;
        } else {
            throw new Error('データ形式が認識できません');
        }

        if (importedList.length === 0) {
            setToastMessage('ファイル内に有効な釣果データが見つかりませんでした');
            return false;
        }

        localStorage.setItem('fishing_records', JSON.stringify(importedList));
        setRecords(importedList);
        setToastMessage(`復元完了：${importedList.length}件の釣果データを復元しました`);
        setIsSettingsOpen(false);
        return true;
    };

    // ==========================================
    // 3. バックアップ復元（ファイル読み込み）
    // ==========================================
    const handleFileImport = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                applyRestoreData(event.target.result);
            } catch (err) {
                console.error('Import Error:', err);
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

    // テキスト貼り付けからの復元
    const handlePasteRestore = () => {
        try {
            applyRestoreData(pasteText);
            setPasteText('');
            setShowTextInput(false);
        } catch (err) {
            setToastMessage('データの読み取りに失敗しました。コピーした文字列が正しいかご確認ください。');
        }
    };

    // ==========================================
    // 4. 完全初期化（ファクトリーリセット）
    // ==========================================
    const handleFullReset = () => {
        const confirm1 = window.confirm('【警告】すべての釣果データと保存設定を完全に初期化しますか？\nこの操作は絶対に取り消せません。');
        if (!confirm1) return;

        const confirm2 = window.confirm('本当によろしいですか？\nすべての履歴、座席記録、メモが削除されます。');
        if (!confirm2) return;

        try {
            localStorage.removeItem('fishing_records');
            localStorage.removeItem('port_seat_count');
            localStorage.removeItem('starboard_seat_count');
            localStorage.removeItem('fishing_last_tab');
            localStorage.removeItem('fishing_counter_mode');

            if (typeof onFactoryReset === 'function') {
                onFactoryReset();
            } else {
                setRecords([]);
            }

            setToastMessage('すべてのデータを完全に初期化しました');
            setIsSettingsOpen(false);
        } catch (e) {
            console.error('Reset Error:', e);
            setToastMessage('初期化処理中にエラーが発生しました');
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

                {/* スクロール可能コンテンツ */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm no-scrollbar">
                    
                    {/* 📷 AI画像自動解析ボタン */}
                    <div className="bg-gradient-to-r from-blue-50 to-sky-100 dark:from-slate-900 dark:to-blue-950 p-3.5 rounded-xl border border-sky-200 dark:border-blue-800 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="font-black text-sky-900 dark:text-sky-300 flex items-center gap-1 text-xs">
                                📷 潮時表・気象画像の自動読み取り
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-600 dark:text-slate-400 leading-tight">
                            潮時表や天気予報のスクショを選択すると、満干潮時刻や風波をAIが自動解析して入力します。
                        </p>
                        <button
                            onClick={() => imageInputRef.current && imageInputRef.current.click()}
                            disabled={isAnalyzingImage}
                            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black py-2.5 rounded-xl shadow text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                            {isAnalyzingImage ? (
                                <><span className="animate-spin mr-1">↻</span> AIが画像解析中...</>
                            ) : (
                                <><span>📸</span> 画像を選択して自動入力</>
                            )}
                        </button>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageAnalysis}
                        />
                    </div>

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

                    {/* 基本海況・ポイント設定 */}
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

                    {/* 潮時（満潮・干潮時刻） */}
                    <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
                        <span className="font-black text-gray-700 dark:text-slate-200 block text-xs">潮時時刻（カウンターのアラートと連動）</span>
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

                    {/* 天候・風向・風速・波高（前半／後半） */}
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

                    {/* データ管理（バックアップ・復元） */}
                    <div className="bg-sky-50 dark:bg-slate-900/60 p-3 rounded-xl border border-sky-100 dark:border-slate-700 space-y-2.5">
                        <span className="font-black text-sky-800 dark:text-sky-300 block text-xs">データ管理・バックアップ</span>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                            釣果データを端末に保存したり、保存したファイルやコピーしたテキストから復元できます。
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

                        {/* テキスト貼り付け枠 */}
                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={() => setShowTextInput(!showTextInput)}
                                className="text-[11px] text-sky-600 dark:text-sky-400 underline font-bold"
                            >
                                {showTextInput ? '▲ 貼り付け入力を閉じる' : '▼ ファイルが選べない時はこちら（文字貼り付けで復元）'}
                            </button>

                            {showTextInput && (
                                <div className="mt-2 space-y-2 animate-[fadeIn_0.15s_ease-out]">
                                    <textarea
                                        rows="3"
                                        className="w-full border rounded-lg p-2 text-[11px] font-mono bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100"
                                        placeholder="バックアップファイルの中身をコピーしてここに貼り付け"
                                        value={pasteText}
                                        onChange={(e) => setPasteText(e.target.value)}
                                    />
                                    <button
                                        onClick={handlePasteRestore}
                                        className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 rounded-lg text-xs transition-all"
                                    >
                                        貼り付けた内容から復元する
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Gemini AI設定（APIキー ＆ モデル選択） */}
                    <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2.5">
                        <span className="font-black text-gray-700 dark:text-slate-200 block text-xs">Gemini AI設定</span>
                        
                        {/* APIキー */}
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-1">Gemini APIキー</label>
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

                    {/* 完全初期化（ファクトリーリセット） */}
                    <div className="pt-2">
                        <button
                            onClick={handleFullReset}
                            className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-700 text-center transition-colors"
                        >
                            ⚠️ アプリを完全初期化する
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}