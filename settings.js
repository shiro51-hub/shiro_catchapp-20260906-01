// ==========================================
// settings.js : 設定パネル・潮時OCR・Windy気象OCR
// ==========================================

const SettingsPanel = ({
    isSettingsOpen, setIsSettingsOpen, portCount, starboardCount, onCountChange,
    point, setPoint, waterTemp, setWaterTemp, waterDepth, setWaterDepth, tide, setTide,
    tideState, setTideState, highTide1, setHighTide1, highTide2, setHighTide2, lowTide1, setLowTide1, lowTide2, setLowTide2,
    weather1, setWeather1, weather2, setWeather2, windDir1, setWindDir1, windDir2, setWindDir2,
    windSpeed1, setWindSpeed1, windSpeed2, setWindSpeed2, waveHeight1, setWaveHeight1, waveHeight2, setWaveHeight2,
    theme, setTheme, targetFish, setTargetFish, date, setToastMessage, onFactoryReset, records, setRecords,
    userApiKey, setUserApiKey, selectedAiModel, setSelectedAiModel
}) => {
    const [settingsTab, setSettingsTab] = React.useState('seat');
    const [isAiPredictingTide, setIsAiPredictingTide] = React.useState(false);
    const tideFileInputRef = React.useRef(null);
    const tideAbortControllerRef = React.useRef(null);

    const tides = ['澄み', '薄濁り', '濁り', 'ささ濁り'];
    const fishList = ["カワハギ", "アジ", "カサゴ", "アマダイ", "イカ", "マダイ", "タチウオ", "シロギス"];
    const pointList = ["久里浜沖", "鴨居沖", "観音崎沖", "竹岡沖", "下浦沖", "走水沖", "剣崎沖"];
    const waveOptions = ['穏やか', '穏やかな方', '多少波がある', '波がやや高い', '波が高い', 'しける', '大シケ', '猛烈にしける'];
    const weatherIcons = [
        { label: '晴れ', icon: '☀️' },
        { label: '晴曇', icon: '⛅' },
        { label: '曇り', icon: '☁️' },
        { label: '曇時々雨', icon: '🌧️' },
        { label: '雨', icon: '☔' },
        { label: '雪/荒', icon: '⛄' }
    ];
    const windDirs = ['北西', '北', '北東', '西', '無風', '東', '南西', '南', '南東'];
    const availableModels = ['Gemini 2.5 Flash', 'Gemini 2.5 Pro', 'Gemini 3.5 Flash', 'Gemini 3.6 Flash', 'Gemini 3.7 Flash', 'Gemini 3.8 Flash', 'Gemini 3.1 Pro'];

    const [showFishDropdown, setShowFishDropdown] = React.useState(false);
    const [showPointDropdown, setShowPointDropdown] = React.useState(false);
    const [showFactoryConfirm, setShowFactoryConfirm] = React.useState(false);
    const fileInputRef = React.useRef(null);

    const resizeImage = (file, maxWidth = 1200, quality = 0.8) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve({
                        base64Data: dataUrl.split(',')[1],
                        mimeType: 'image/jpeg'
                    });
                };
                img.onerror = () => reject(new Error('画像の展開に失敗しました'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsDataURL(file);
        });
    };

    const handleCancelTideOcr = () => {
        if (tideAbortControllerRef.current) {
            tideAbortControllerRef.current.abort();
            tideAbortControllerRef.current = null;
        }
        setIsAiPredictingTide(false);
        setToastMessage('解析を手動で中止しました。');
        if (tideFileInputRef.current) tideFileInputRef.current.value = '';
    };

    const handleOcrTideImage = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!userApiKey) {
            setToastMessage('APIキーが未入力です。「データ管理」タブでGemini APIキーを設定してください。');
            event.target.value = '';
            return;
        }

        const controller = new AbortController();
        tideAbortControllerRef.current = controller;

        setIsAiPredictingTide(true);
        setToastMessage(`📷 AI (${selectedAiModel}) が画像を解析中...\n※最大2分お待ちいただけます（中止ボタンでいつでも中断可能）`);

        let isFinished = false;
        const timeoutId = setTimeout(() => {
            if (!isFinished) {
                isFinished = true;
                controller.abort();
                setIsAiPredictingTide(false);
                setToastMessage('⚠️ 解析がタイムアウト（2分経過）しました。電波の良い場所で再度お試しいただくか、画像をご確認ください。');
                if (event.target) event.target.value = '';
            }
        }, 120000);

        try {
            const { base64Data, mimeType } = await resizeImage(file, 1600, 0.85);

            const dateLabel = date ? `${date} ${typeof getDayOfWeek === 'function' ? getDayOfWeek(date) : ''}` : '本日';
            const pointLabel = point || '久里浜・東京湾周辺';

            const prompt = `あなたは潮汐表・タイドグラフの高度な画像解析エキスパートです。提供された画像は、潮汐アプリのスクリーンショット（波形のタイドグラフ、帯状グラフ、または満潮・干潮が一覧化されたテキスト・表形式のいずれか）です。
【解析対象】日付: ${dateLabel}場所の目安: ${pointLabel}
【読み取り指示】1. 潮回り（大潮、中潮、小潮、長潮、若潮）が画像内に記載されていれば抽出してください。2. 満潮時刻（最大2回）と干潮時刻（最大2回）を正確に特定してください。   - タイドグラフ（曲線・波形）の場合: 波の頂点（山）にマークや吹き出しで表示されている時刻を満潮、谷（底）に表示されている時刻を干潮として読み取ってください。   - 表形式・リスト形式の場合: 「満潮」「干潮」の行または列に記載されている時刻を順に抽出してください。   - 1日に満潮や干潮が1回しかない、または枠外の場合は空文字 "" にしてください。3. 時刻は24時間制の "HH:MM" 形式（例: "04:35", "16:20"）に統一してください。
必ず以下のJSONスキーマ形式のみで出力してください（Markdownのコードブロックや余計な解説文は一切不要です）。{  "tideState": "大潮 または 中潮 または 小潮 または 長潮 または 若潮",  "highTide1": "HH:MM",  "highTide2": "HH:MM または 空文字",  "lowTide1": "HH:MM",  "lowTide2": "HH:MM または 空文字"}`;

            const text = await callGeminiApi(userApiKey, prompt, selectedAiModel, true, base64Data, mimeType, controller.signal);
            if (isFinished) return;

            const cleanJson = (text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanJson);

            if (data.tideState) setTideState(data.tideState);
            if (data.highTide1) setHighTide1(data.highTide1);
            if (data.highTide2 !== undefined) setHighTide2(data.highTide2 || '');
            if (data.lowTide1) setLowTide1(data.lowTide1);
            if (data.lowTide2 !== undefined) setLowTide2(data.lowTide2 || '');

            setToastMessage('✨ 画像から潮回り・満干潮時刻を自動入力しました！');
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Tide OCR Aborted');
            } else {
                console.error("AI Tide Image OCR Error:", err);
                if (!isFinished) {
                    setToastMessage(`潮時画像の解析に失敗しました: ${err.message || 'データ形式不正'}`);
                }
            }
        } finally {
            isFinished = true;
            clearTimeout(timeoutId);
            tideAbortControllerRef.current = null;
            setIsAiPredictingTide(false);
            if (event.target) event.target.value = '';
        }
    };

    const [isAiPredictingWeatherOcr, setIsAiPredictingWeatherOcr] = React.useState(false);
    const weatherFileInputRef = React.useRef(null);
    const weatherAbortControllerRef = React.useRef(null);

    const handleCancelWeatherOcr = () => {
        if (weatherAbortControllerRef.current) {
            weatherAbortControllerRef.current.abort();
            weatherAbortControllerRef.current = null;
        }
        setIsAiPredictingWeatherOcr(false);
        setToastMessage('気象解析を手動で中止しました。');
        if (weatherFileInputRef.current) weatherFileInputRef.current.value = '';
    };

    const handleOcrWeatherImage = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!userApiKey) {
            setToastMessage('APIキーが未入力です。「データ管理」タブでGemini APIキーを設定してください。');
            event.target.value = '';
            return;
        }

        const controller = new AbortController();
        weatherAbortControllerRef.current = controller;

        setIsAiPredictingWeatherOcr(true);
        setToastMessage(`📷 AI (${selectedAiModel}) がWindy画像を解析中...\n※最大2分お待ちいただけます（中止可能）`);

        let isFinished = false;
        const timeoutId = setTimeout(() => {
            if (!isFinished) {
                isFinished = true;
                controller.abort();
                setIsAiPredictingWeatherOcr(false);
                setToastMessage('⚠️ 解析がタイムアウトしました。電波の良い環境で再度お試しください。');
                if (event.target) event.target.value = '';
            }
        }, 120000);

        try {
            const { base64Data, mimeType } = await resizeImage(file, 1600, 0.85);

            const prompt = `あなたは気象・海洋気象アプリ（Windyなど）の画面解析エキスパートです。提供された画像は、Windyまたは類似の気象予測アプリのスクリーンショット（時系列テーブル、アイコン、風向矢印、数値など）です。
【解析指示】主に日中の釣行時間帯（前半：午前6-10時頃 / 後半：午前11時〜午後15時頃）を基準にして、以下の気象・海況要素を読み取ってください。1.【重要：風向矢印の読み取りルール（超厳格判定）】Windyの矢印は「風が流れていく先」を向いています。気象の風向は「風が吹いてくる側（矢印の根元側）」を指します。左右の傾き（北東と北西）を絶対に取り違えないよう、以下の時計の文字盤基準で厳密に判定してください。
・矢印の先端が【7時〜8時の方向（左斜め下 ↙）】を向いている場合：  ➔ 右上（北東）から左下（南西）へ吹いているため、必ず【北東】と判定してください（※北西と誤認厳禁！）。
・矢印の先端が【4時〜5時の方向（右斜め下 ↘）】を向いている場合：  ➔ 左上（北西）から右下（南東）へ吹いているため、必ず【北西】と判定してください。
・矢印の先端が【1時〜2時の方向（右斜め上 ↗）】を向いている場合：  ➔ 左下（南西）から右上（北東）へ吹いているため、必ず【南西】と判定してください。
・矢印の先端が【10時〜11時の方向（左斜め上 ↖）】を向いている場合：  ➔ 右下（南東）から左上（北西）へ吹いているため、必ず【南東】と判定してください。
・先端が真下（6時 ↓）＝【北】・先端が真上（12時 ↑）＝【南】・先端が真右（3時 →）＝【西】・先端が真左（9時 ←）＝【東】※もし画面内に「NE」「ENE」「北東」などのテキスト表記がある場合は、矢印の目視よりも文字を最優先してください。
2. 天気: ☀️, ⛅, ☁️, 🌧️, ☔, ⛄ のいずれか1つの絵文字（小雨や曇り時々雨は 🌧️ に判定）。3. 風の強さ（瞬間最大風速）:   - 通常の平均風速（風）ではなく、必ず【瞬間最大風速（突風 / Wind gusts）】の数値を採用してください。   - 単位は必ず「m/s」とし、数値に続けて「8m/s」「6〜9m/s」のように記載してください（kt表示の場合はm/s換算、または表示数値を元に必ず「m/s」表記で統一）。4. 波・うねり: 波高の数値（m）を参考に、「0.5m」「1m前後」「ベタ凪」など簡潔なテキスト。
必ず以下のJSONスキーマ形式のみで出力してください（Markdownのコードブロックや解説は一切不要）。{  "weather1": "前半の天気絵文字",  "weather2": "後半の天気絵文字",  "windDir1": "前半の風向",  "windDir2": "後半の風向",  "windSpeed1": "前半の瞬間最大風速（例: 7m/s または 6〜8m/s）",  "windSpeed2": "後半の瞬間最大風速（例: 5m/s または 4〜6m/s）",  "waveHeight1": "前半の波・うねり",  "waveHeight2": "後半の波・うねり"}`;

            const text = await callGeminiApi(userApiKey, prompt, selectedAiModel, true, base64Data, mimeType, controller.signal);
            if (isFinished) return;

            const cleanJson = (text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanJson);

            const normalizeWeather = (val) => {
                if (!val) return '';
                const s = String(val).trim();
                if (s.includes('⛄') || s.includes('雪') || s.includes('荒')) return '⛄';
                if (s.includes('🌧️') || s.includes('🌧') || s.includes('🌦️') || s.includes('🌦') || s.includes('時々雨') || s.includes('一時雨')) return '🌧️';
                if (s.includes('☔') || s.includes('雨')) return '☔';
                if (s.includes('⛅') || s.includes('晴曇') || s.includes('薄曇')) return '⛅';
                if (s.includes('☁️') || s.includes('☁') || s.includes('曇')) return '☁️';
                if (s.includes('☀️') || s.includes('☀') || s.includes('晴')) return '☀️';
                const matched = weatherIcons.find(w => s.includes(w.icon) || s.includes(w.label));
                return matched ? matched.icon : '';
            };

            if (data.weather1) setWeather1(normalizeWeather(data.weather1));
            if (data.weather2) setWeather2(normalizeWeather(data.weather2));

            if (data.windDir1) setWindDir1(data.windDir1);
            if (data.windDir2) setWindDir2(data.windDir2);

            const formatWindSpeed = (val) => {
                if (!val) return '';
                let s = String(val).trim();
                if (/m\/s$/i.test(s)) return s;
                if (/m$/i.test(s)) return s.replace(/m$/i, 'm/s');
                return `${s}m/s`;
            };

            if (data.windSpeed1) setWindSpeed1(formatWindSpeed(data.windSpeed1));
            if (data.windSpeed2) setWindSpeed2(formatWindSpeed(data.windSpeed2));
            if (data.waveHeight1) setWaveHeight1(data.waveHeight1);
            if (data.waveHeight2) setWaveHeight2(data.waveHeight2);

            setToastMessage('✨ Windy画像から天候・風・波データを自動入力しました！');
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Weather OCR Aborted');
            } else {
                console.error("AI Weather Image OCR Error:", err);
                if (!isFinished) {
                    setToastMessage(`気象画像の解析に失敗しました: ${err.message || 'データ形式不正'}`);
                }
            }
        } finally {
            isFinished = true;
            clearTimeout(timeoutId);
            weatherAbortControllerRef.current = null;
            setIsAiPredictingWeatherOcr(false);
            if (event.target) event.target.value = '';
        }
    };

    const handleExport = () => {
        if (records.length === 0) {
            setToastMessage('保存する記録がありません');
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records));
        const dl = document.createElement('a');
        dl.setAttribute("href", dataStr);
        dl.setAttribute("download", `fishing_records_backup_${getTodayString()}.json`);
        document.body.appendChild(dl);
        dl.click();
        dl.remove();
        setToastMessage('バックアップファイルを保存しました');
    };

    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedRecords = JSON.parse(e.target.result);
                if (!Array.isArray(importedRecords)) throw new Error("Invalid format");
                setRecords(prev => {
                    const newRecords = [...prev];
                    importedRecords.forEach(impRec => {
                        const idx = newRecords.findIndex(r => r.date === impRec.date);
                        if (idx >= 0) newRecords[idx] = impRec;
                        else newRecords.push(impRec);
                    });
                    newRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
                    localStorage.setItem('fishing_records', JSON.stringify(newRecords));
                    return newRecords;
                });
                setToastMessage('データを正常に復元・統合しました！');
            } catch (err) {
                setToastMessage('ファイルの読み込みに失敗しました。正しいJSONファイルを選択してください。');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    if (!isSettingsOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-start items-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!showFactoryConfirm) setIsSettingsOpen(false); }}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-b-3xl shadow-2xl flex flex-col max-h-[90vh] animate-slideDownModal overflow-hidden">
                {showFactoryConfirm && (
                    <div className="absolute inset-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex items-center justify-center p-4">
                        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl shadow-xl border-2 border-red-400 dark:border-red-700 w-full text-center">
                            <h3 className="text-xl font-black text-red-600 dark:text-red-400 mb-3 flex items-center justify-center"><IconTrash className="w-6 h-6 mr-1" /> 危険な操作</h3>
                            <p className="text-sm font-bold text-red-800 dark:text-red-300 mb-6 leading-relaxed">
                                本当にすべてのデータを削除して初期化しますか？<br/>過去の記録もすべて消去され、元に戻せません。
                            </p>
                            <div className="flex flex-col gap-3">
                                <button onClick={() => { onFactoryReset(); setShowFactoryConfirm(false); setIsSettingsOpen(false); }} className="w-full bg-red-600 text-white font-black py-3.5 rounded-xl active:bg-red-700 shadow-md">はい、すべて削除します</button>
                                <button onClick={() => setShowFactoryConfirm(false)} className="w-full bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-black py-3.5 rounded-xl active:bg-gray-100 shadow-sm border-2 border-gray-300">キャンセル</button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                    <h2 className="text-xl font-black text-gray-800 dark:text-slate-100 flex items-center">
                        <IconSettings className="w-6 h-6 mr-2 text-sky-500" /> 設定
                    </h2>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-gray-500 dark:text-slate-400">表示</span>
                        <div className="flex bg-gray-200 dark:bg-slate-800 p-1 rounded-full relative w-24 h-9 shadow-inner border border-gray-300 dark:border-slate-700">
                            <div className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] bg-white dark:bg-slate-600 rounded-full shadow-sm transition-transform duration-300 ${theme === 'light' ? 'translate-x-0' : 'translate-x-full'}`}></div>
                            <div className="flex-1 flex items-center justify-center z-10 cursor-pointer" onClick={() => setTheme('light')}>
                                <IconSun className={`w-4 h-4 ${theme === 'light' ? 'text-amber-500' : 'text-gray-400'}`} />
                            </div>
                            <div className="flex-1 flex items-center justify-center z-10 cursor-pointer" onClick={() => setTheme('dark')}>
                                <IconMoon className={`w-4 h-4 ${theme === 'dark' ? 'text-yellow-300' : 'text-gray-400'}`} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex bg-gray-200 dark:bg-slate-800 px-1 pt-2 gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-slate-700 shrink-0">
                    {[{ id: 'seat', label: '座席数' }, { id: 'fish_point', label: '釣り物/海況' }, { id: 'tide_time', label: '潮時' }, { id: 'weather', label: '天気' }, { id: 'data', label: 'データ管理' }].map(t => (
                        <button key={t.id} onClick={() => setSettingsTab(t.id)} className={`shrink-0 flex-1 px-2 py-2 text-xs sm:text-sm font-black rounded-t-xl transition-all ${settingsTab === t.id ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow' : 'text-gray-500 dark:text-slate-400'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="p-5 overflow-y-auto space-y-5 flex-1 no-scrollbar text-sm font-medium">
                    {settingsTab === 'seat' && (
                        <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                            <p className="text-sm text-gray-500 dark:text-slate-400">左舷・右舷それぞれの最大座席数を設定してください。</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col items-center bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
                                    <span className="font-black text-red-500 mb-3">左舷</span>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => onCountChange('port', Math.max(0, (portCount === '' ? 0 : portCount) - 1))} className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow border font-bold text-red-500 text-xl">−</button>
                                        <input type="number" className="w-12 text-center text-2xl font-black bg-transparent border-b-2 border-red-300 dark:border-red-700 focus:outline-none text-gray-800 dark:text-slate-100" value={portCount} onChange={(e) => onCountChange('port', e.target.value)} />
                                        <button onClick={() => onCountChange('port', (portCount === '' ? 0 : portCount) + 1)} className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow border font-bold text-red-500 text-xl">＋</button>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                                    <span className="font-black text-emerald-600 dark:text-emerald-400 mb-3">右舷</span>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => onCountChange('starboard', Math.max(0, (starboardCount === '' ? 0 : starboardCount) - 1))} className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow border font-bold text-emerald-600 text-xl">−</button>
                                        <input type="number" className="w-12 text-center text-2xl font-black bg-transparent border-b-2 border-emerald-300 dark:border-emerald-700 focus:outline-none text-gray-800 dark:text-slate-100" value={starboardCount} onChange={(e) => onCountChange('starboard', e.target.value)} />
                                        <button onClick={() => onCountChange('starboard', (starboardCount === '' ? 0 : starboardCount) + 1)} className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow border font-bold text-emerald-600 text-xl">＋</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {settingsTab === 'fish_point' && (
                        <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                            <div className="space-y-1.5 relative z-20">
                                <label className="text-sm font-black text-gray-500">釣り物</label>
                                <div className="relative">
                                    <input type="text" className="w-full border rounded-xl pl-4 pr-10 py-3 bg-gray-50 dark:bg-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-sky-200" placeholder="選択または手入力" value={targetFish} onChange={(e) => setTargetFish(e.target.value)} onFocus={() => setShowFishDropdown(true)} onBlur={() => setTimeout(() => setShowFishDropdown(false), 250)} />
                                    <IconChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                </div>
                                {showFishDropdown && (
                                    <ul className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border rounded-xl shadow-lg max-h-48 overflow-y-auto py-1 z-30">
                                        {fishList.map(fish => (
                                            <li key={fish} className="px-4 py-2.5 font-bold hover:bg-sky-50 dark:hover:bg-slate-700 cursor-pointer border-b last:border-0" onMouseDown={() => { setTargetFish(fish); setShowFishDropdown(false); }}>{fish}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="space-y-1.5 relative z-10">
                                <label className="text-sm font-black text-gray-500">ポイント (場所)</label>
                                <div className="relative">
                                    <input type="text" className="w-full border rounded-xl pl-4 pr-10 py-3 bg-gray-50 dark:bg-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-sky-200" placeholder="選択または手入力" value={point} onChange={(e) => setPoint(e.target.value)} onFocus={() => setShowPointDropdown(true)} onBlur={() => setTimeout(() => setShowPointDropdown(false), 250)} />
                                    <IconChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                </div>
                                {showPointDropdown && (
                                    <ul className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border rounded-xl shadow-lg max-h-48 overflow-y-auto py-1 z-30">
                                        {pointList.map(pt => (
                                            <li key={pt} className="px-4 py-2.5 font-bold hover:bg-sky-50 dark:hover:bg-slate-700 cursor-pointer border-b last:border-0" onMouseDown={() => { setPoint(pt); setShowPointDropdown(false); }}>{pt}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-black text-gray-500">水深 (m)</label>
                                    <input type="text" className="w-full border rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 font-bold" placeholder="-" value={waterDepth} onChange={(e) => setWaterDepth(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-sm font-black text-gray-500">水温 (℃)</label>
                                    <input type="number" step="0.1" className="w-full border rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 font-bold" placeholder="-" value={waterTemp} onChange={(e) => setWaterTemp(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-black text-gray-500">潮色</label>
                                <div className="flex gap-1.5 mt-1">
                                    {tides.map(t => (
                                        <button key={t} onClick={() => setTide(t)} className={`flex-1 py-2.5 text-xs font-black rounded-xl border ${tide === t ? 'bg-sky-500 text-white border-sky-500' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300'}`}>{t}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {settingsTab === 'tide_time' && (
                        <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                            <input
                                type="file"
                                accept="image/*"
                                ref={tideFileInputRef}
                                onChange={handleOcrTideImage}
                                className="hidden"
                            />
                            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 p-4 rounded-2xl text-white shadow-md flex items-center justify-between">
                                <div className="pr-2">
                                    <h4 className="font-black text-sm flex items-center">📷 タイドグラフ/潮見表画像から読取</h4>
                                    <p className="text-[11px] text-blue-100 mt-0.5">スクショや写真から潮回り・満干潮時刻を抽出</p>
                                </div>
                                {isAiPredictingTide ? (
                                    <button
                                        onClick={handleCancelTideOcr}
                                        className="shrink-0 bg-red-500 hover:bg-red-600 text-white font-black px-3.5 py-2 rounded-xl text-xs shadow active:scale-95 transition-all flex items-center gap-1 animate-pulse"
                                    >
                                        ✕ 中止
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => tideFileInputRef.current?.click()}
                                        className="shrink-0 bg-white text-indigo-700 font-black px-3.5 py-2 rounded-xl text-xs shadow hover:bg-blue-50 active:scale-95 transition-all"
                                    >
                                        画像を選択
                                    </button>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-black text-gray-500">潮回り</label>
                                <div className="flex gap-1 mt-1">
                                    {['大潮', '中潮', '小潮', '長潮', '若潮'].map(t => (
                                        <button key={t} onClick={() => setTideState(t)} className={`flex-1 py-2.5 text-xs font-black rounded-xl border ${tideState === t ? 'bg-sky-500 text-white border-sky-500' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300'}`}>{t}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500">満潮 (1回目 / 2回目)</label>
                                    <input type="time" className="w-full border rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-800 font-bold" value={highTide1} onChange={(e) => setHighTide1(e.target.value)} />
                                    <input type="time" className="w-full border rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-800 font-bold" value={highTide2} onChange={(e) => setHighTide2(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500">干潮 (1回目 / 2回目)</label>
                                    <input type="time" className="w-full border rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-800 font-bold" value={lowTide1} onChange={(e) => setLowTide1(e.target.value)} />
                                    <input type="time" className="w-full border rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-800 font-bold" value={lowTide2} onChange={(e) => setLowTide2(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}
                    {settingsTab === 'weather' && (
                        <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                            <input
                                type="file"
                                accept="image/*"
                                ref={weatherFileInputRef}
                                onChange={handleOcrWeatherImage}
                                className="hidden"
                            />
                            <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-blue-600 p-4 rounded-2xl text-white shadow-md flex items-center justify-between">
                                <div className="pr-2">
                                    <h4 className="font-black text-sm flex items-center">📷 Windyスクショから気象読取</h4>
                                    <p className="text-[11px] text-sky-100 mt-0.5">時系列表・予報画像から天気・風向・風速・波高を抽出</p>
                                </div>
                                {isAiPredictingWeatherOcr ? (
                                    <button
                                        onClick={handleCancelWeatherOcr}
                                        className="shrink-0 bg-red-500 hover:bg-red-600 text-white font-black px-3.5 py-2 rounded-xl text-xs shadow active:scale-95 transition-all flex items-center gap-1 animate-pulse"
                                    >
                                        ✕ 中止
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => weatherFileInputRef.current?.click()}
                                        className="shrink-0 bg-white text-teal-800 font-black px-3.5 py-2 rounded-xl text-xs shadow hover:bg-teal-50 active:scale-95 transition-all"
                                    >
                                        画像を選択
                                    </button>
                                )}
                            </div>
                            {/* 前半 */}
                            <div className="bg-sky-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-sky-100 dark:border-slate-700 space-y-3">
                                <h3 className="text-xs font-black text-sky-700 dark:text-sky-400">🌅 前半 (出船〜中盤)</h3>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500">天気</label>
                                    <div className="flex gap-1 mt-1">
                                        {weatherIcons.map(w => (
                                            <button key={`w1-${w.icon}`} onClick={() => setWeather1(weather1 === w.icon ? '' : w.icon)} className={`flex-1 py-2 text-xl rounded-xl border ${weather1 === w.icon ? 'bg-white border-sky-500 shadow-md scale-105' : 'bg-gray-100 dark:bg-slate-800 opacity-60'}`}>{w.icon}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    {windDirs.map(dir => (
                                        <button key={`d1-${dir}`} onClick={() => setWindDir1(windDir1 === dir ? '' : dir)} className={`py-1.5 text-xs font-black rounded-lg border ${windDir1 === dir ? 'bg-sky-500 text-white border-sky-600 shadow' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300'}`}>{dir}</button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sky-200/50 dark:border-slate-700">
                                    <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 px-2.5 py-1.5 focus-within:border-sky-500">
                                        <span className="text-xs font-black text-gray-500 dark:text-slate-400 mr-1.5 shrink-0">風</span>
                                        <input
                                            type="text"
                                            placeholder="例: 6〜8m/s"
                                            className="w-full bg-transparent text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none min-w-0"
                                            value={windSpeed1}
                                            onChange={(e) => setWindSpeed1(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 px-2 py-1.5 focus-within:border-sky-500">
                                        <span className="text-xs font-black text-gray-500 dark:text-slate-400 mr-1 shrink-0">波</span>
                                        <select
                                            className="w-full bg-transparent text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none cursor-pointer min-w-0"
                                            value={waveHeight1}
                                            onChange={(e) => setWaveHeight1(e.target.value)}
                                        >
                                            <option value="">選択してください</option>
                                            {waveOptions.map((opt) => (
                                                <option key={`wh1-${opt}`} value={opt} className="text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-800">
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            {/* 後半 */}
                            <div className="bg-amber-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-amber-100 dark:border-slate-700 space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black text-amber-700 dark:text-amber-400">🌇 後半 (中盤〜帰港)</h3>
                                    <button onClick={() => { setWeather2(weather1); setWindDir2(windDir1); setWindSpeed2(windSpeed1); setWaveHeight2(waveHeight1); }} className="text-[10px] font-black bg-white dark:bg-slate-700 border border-amber-200 px-2.5 py-1 rounded-lg text-amber-600 dark:text-amber-400">🔄 前半と同じ</button>
                                </div>
                                <div className="flex gap-1 mt-1">
                                    {weatherIcons.map(w => (
                                        <button key={`w2-${w.icon}`} onClick={() => setWeather2(weather2 === w.icon ? '' : w.icon)} className={`flex-1 py-2 text-xl rounded-xl border ${weather2 === w.icon ? 'bg-white border-amber-500 shadow-md scale-105' : 'bg-gray-100 dark:bg-slate-800 opacity-60'}`}>{w.icon}</button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    {windDirs.map(dir => (
                                        <button key={`d2-${dir}`} onClick={() => setWindDir2(windDir2 === dir ? '' : dir)} className={`py-1.5 text-xs font-black rounded-lg border ${windDir2 === dir ? 'bg-amber-500 text-white border-amber-600 shadow' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300'}`}>{dir}</button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/50 dark:border-slate-700">
                                    <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 px-2.5 py-1.5 focus-within:border-amber-500">
                                        <span className="text-xs font-black text-gray-500 dark:text-slate-400 mr-1.5 shrink-0">風</span>
                                        <input
                                            type="text"
                                            placeholder="例: 4〜6m/s"
                                            className="w-full bg-transparent text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none min-w-0"
                                            value={windSpeed2}
                                            onChange={(e) => setWindSpeed2(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 px-2 py-1.5 focus-within:border-amber-500">
                                        <span className="text-xs font-black text-gray-500 dark:text-slate-400 mr-1 shrink-0">波</span>
                                        <select
                                            className="w-full bg-transparent text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none cursor-pointer min-w-0"
                                            value={waveHeight2}
                                            onChange={(e) => setWaveHeight2(e.target.value)}
                                        >
                                            <option value="">選択してください</option>
                                            {waveOptions.map((opt) => (
                                                <option key={`wh2-${opt}`} value={opt} className="text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-800">
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {settingsTab === 'data' && (
                        <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
                            <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                                <label className="text-xs font-black text-gray-600 dark:text-slate-300 block">🤖 使用する基本AIモデル</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {availableModels.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => { setSelectedAiModel(m); localStorage.setItem('fishing_ai_model', m); }}
                                            className={`py-2 px-2 text-xs font-black rounded-xl border transition-all text-center ${selectedAiModel === m ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-500 block mb-1">🔑 Gemini APIキー</label>
                                <input type="password" placeholder="AI StudioのAPIキー" className="w-full border rounded-xl px-3 py-2.5 bg-gray-50 dark:bg-slate-800 text-sm font-bold" value={userApiKey} onChange={(e) => { setUserApiKey(e.target.value); localStorage.setItem('fishing_api_key', e.target.value); }} />
                            </div>
                            <div className="space-y-2 pt-3 border-t">
                                <h3 className="text-sm font-black flex items-center"><IconDownload /> バックアップ</h3>
                                <button onClick={handleExport} className="w-full bg-sky-50 dark:bg-slate-800 text-sky-600 font-black py-3 rounded-xl border border-sky-200 dark:border-slate-600 shadow-sm">全データをファイルに保存</button>
                            </div>
                            <div className="space-y-2 pt-3 border-t">
                                <h3 className="text-sm font-black flex items-center"><IconUpload /> データの復元</h3>
                                <input type="file" accept=".json" onChange={handleFileImport} className="hidden" ref={fileInputRef} />
                                <button onClick={() => fileInputRef.current?.click()} className="w-full bg-emerald-50 dark:bg-slate-800 text-emerald-600 font-black py-3 rounded-xl border border-emerald-200 dark:border-slate-600 shadow-sm">ファイルを選んで復元</button>
                            </div>
                            <div className="pt-3 border-t">
                                <button onClick={() => setShowFactoryConfirm(true)} className="w-full bg-red-50 text-red-600 font-black py-3 rounded-xl border border-red-200 shadow-sm flex items-center justify-center">
                                    <IconTrash className="w-4 h-4 mr-1" /> 全データを完全に初期化
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 pb-safe flex justify-center">
                    <button onClick={() => setIsSettingsOpen(false)} className="w-2/3 bg-sky-500 text-white font-black py-2.5 rounded-xl shadow-md active:bg-sky-600 transition-colors">設定完了</button>
                </div>
            </div>
        </div>
    );
};

window.SettingsPanel = SettingsPanel;