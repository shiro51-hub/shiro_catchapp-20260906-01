// ==========================================
// app.js : メイン司令塔・画面遷移・全体レンダリング
// ==========================================

// 画像キャプチャ用のライブラリを動的に読み込む機能
const loadHtml2Canvas = () => {
    return new Promise((resolve, reject) => {
        if (window.html2canvas) {
            resolve(window.html2canvas);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => resolve(window.html2canvas);
        script.onerror = () => reject(new Error('画像の生成に必要なツールの読み込みに失敗しました'));
        document.head.appendChild(script);
    });
};

const IconCamera = ({ className = "w-4 h-4 mr-1 shrink-0" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

// ==========================================
// デジタル釣果ボード（SNS画像）作成モーダル
// ==========================================
function ShareImageModal({ record, onClose, setToastMessage }) {
    const [isAnonymous, setIsAnonymous] = React.useState(false);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [cardTheme, setCardTheme] = React.useState('dark'); // 'dark' or 'light' (marine blue)
    const cardRef = React.useRef(null);

    React.useEffect(() => {
        loadHtml2Canvas();
    }, []);

    if (!record) return null;

    const stats = getTopAnglerDetails(record.port || [], record.starboard || []);
    const unit = getUnit(record.targetFish);
    const pSeats = (record.port || []).filter(s => s && s.isVisible !== false);
    const sSeats = (record.starboard || []).filter(s => s && s.isVisible !== false);

    // マリンブルー(light) と ダークナイト(dark) のカラー設定
    const isDark = cardTheme === 'dark';
    const bgClass = isDark ? 'bg-slate-900 border-slate-950' : 'bg-gradient-to-br from-sky-500 to-blue-700 border-blue-900';
    const textClass = isDark ? 'text-slate-100' : 'text-white';
    const canvasBg = isDark ? '#0f172a' : '#0284c7';

    const handleDownload = async () => {
        setIsGenerating(true);
        setToastMessage('カードを作成しています...');
        try {
            const html2canvas = await loadHtml2Canvas();
            const canvas = await html2canvas(cardRef.current, {
                scale: 3,
                backgroundColor: canvasBg,
                useCORS: true,
                logging: false
            });
            const imgData = canvas.toDataURL('image/png');
            
            const link = document.createElement('a');
            const safeDate = record.date.replace(/-/g, '');
            const safeTarget = record.targetFish || '釣果';
            link.download = `山下丸_${safeDate}_${safeTarget}.png`;
            link.href = imgData;
            link.click();
            
            setToastMessage('釣果カードを保存しました！\n写真アプリからSNSに投稿できます。');
        } catch (e) {
            console.error(e);
            setToastMessage('画像の作成に失敗しました。電波の良い場所でお試しください。');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
            <div className="flex-1 w-full overflow-y-auto pb-[280px] pt-8 px-4 flex justify-center items-start no-scrollbar">
                <div 
                    ref={cardRef} 
                    className={`${bgClass} ${textClass} relative flex flex-col border-[6px] shadow-2xl rounded-xl overflow-hidden transition-all duration-300`} 
                    style={{ width: '100%', maxWidth: '420px', minWidth: '340px' }}
                >
                    {/* 背景透かしロゴ (白のまま透明度だけ変える) */}
                    <img 
                        src="./fish_logo.png" 
                        onError={(e) => e.target.style.display='none'} 
                        className={`absolute inset-0 m-auto w-[85%] h-[85%] object-contain pointer-events-none transition-all duration-300 ${isDark ? 'opacity-[0.12]' : 'opacity-[0.15]'}`} 
                        alt="" 
                    />
                    
                    <div className="p-4 sm:p-5 flex flex-col gap-4 relative z-10">
                        {/* ヘッダー */}
                        <div className={`flex justify-between items-start border-b pb-3 ${isDark ? 'border-slate-700/80' : 'border-blue-400/50'}`}>
                            <div className="flex flex-col gap-1.5">
                                {/* テキストロゴ */}
                                <img 
                                    src="./text_logo.png" 
                                    onError={(e) => e.target.style.display='none'} 
                                    className="h-8 sm:h-10 object-contain object-left mb-1 transition-all duration-300" 
                                    alt="yamashitamaru" 
                                />
                                <div className={`text-xs sm:text-sm font-bold tracking-widest ${isDark ? 'text-sky-300' : 'text-sky-100'}`}>
                                    {record.date.replace(/-/g, '.')} {getDayOfWeek(record.date)} {record.weather1 && `| ${record.weather1}`}
                                </div>
                            </div>
                            <div className="text-right mt-1">
                                <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">{record.targetFish}</div>
                            </div>
                        </div>

                        {/* 本日の釣果（下限〜上限）と竿頭 */}
                        <div className={`rounded-xl p-4 border flex flex-col items-center justify-center shadow-md relative overflow-hidden backdrop-blur-sm ${isDark ? 'bg-gradient-to-b from-slate-800/90 to-slate-800/40 border-amber-500/30' : 'bg-white/10 border-white/30'}`}>
                            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500"></div>
                            
                            <div className={`text-xs sm:text-sm font-black mb-1.5 flex items-center tracking-widest ${isDark ? 'text-amber-400' : 'text-yellow-300'}`}>
                                <IconTrophy className="w-4 h-4 mr-1" /> 本日の釣果
                            </div>
                            
                            <div className="flex items-end justify-center gap-1.5 mb-3">
                                <div className={`text-4xl sm:text-5xl font-black leading-none ${isDark ? 'text-amber-500' : 'text-yellow-300'}`}>
                                    {stats.min}<span className="text-2xl sm:text-3xl mx-1 font-bold opacity-70">〜</span>{stats.max}
                                </div>
                                <div className={`text-lg sm:text-xl font-black mb-0.5 ${isDark ? 'text-amber-200' : 'text-yellow-100'}`}>{unit}</div>
                            </div>

                            <div className={`w-full pt-3 mt-1 border-t flex flex-col items-center ${isDark ? 'border-slate-600/50' : 'border-white/30'}`}>
                                <span className={`text-[10px] sm:text-xs font-bold mb-0.5 ${isDark ? 'text-slate-300' : 'text-sky-100'}`}>👑 本日の竿頭</span>
                                <span className="text-lg sm:text-xl font-black truncate max-w-[280px] text-white">
                                    {isAnonymous ? '非公開' : (record.topAnglerName || '-')} {(!isAnonymous && record.topAnglerName) ? 'さん' : ''}
                                </span>
                            </div>

                            {(record.sizeMin || record.sizeMax) && (
                                <div className={`text-xs font-bold mt-4 px-3 py-1 rounded-full ${isDark ? 'bg-slate-900/60 text-slate-300' : 'bg-black/20 text-white'}`}>
                                    型: {record.sizeMin || '?'}〜{record.sizeMax || '?'} cm
                                </div>
                            )}
                        </div>

                        {/* 座席リスト */}
                        <div className="flex gap-2.5 w-full mt-1">
                            {/* 左舷 */}
                            <div className={`flex-1 rounded-lg p-3 border backdrop-blur-sm ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-black/10 border-white/20'}`}>
                                <div className={`font-black text-xs sm:text-sm tracking-widest border-b pb-1.5 mb-2.5 text-center ${isDark ? 'text-red-400 border-red-900/50' : 'text-pink-300 border-pink-300/40'}`}>左舷</div>
                                <div className="space-y-1.5">
                                    {pSeats.map((s, i) => {
                                        const c = parseInt(s.count) || 0;
                                        const isTop = c === stats.max && c > 0;
                                        const isAvg = c >= stats.avg && c > 0 && !isTop;
                                        
                                        let textColor = isDark ? 'text-slate-400' : 'text-sky-100';
                                        if (isTop) textColor = isDark ? 'text-amber-400 font-black' : 'text-yellow-300 font-black';
                                        else if (isAvg) textColor = 'text-white font-bold';

                                        return (
                                            <div key={`p-${i}`} className={`flex justify-between items-center text-sm sm:text-base py-0.5 border-b last:border-0 ${textColor} ${isDark ? 'border-slate-700/30' : 'border-white/10'}`}>
                                                <div className="truncate pr-1 flex-1">
                                                    <span className="opacity-50 mr-1.5 text-xs sm:text-sm">{s.id}.</span>
                                                    <span>{isAnonymous ? `座席${s.id}` : (s.name || '-')}</span>
                                                </div>
                                                <div className="font-black flex items-center">{isTop && <IconTrophy className="w-3.5 h-3.5 mr-1 text-amber-500" />}{c}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* 右舷 */}
                            <div className={`flex-1 rounded-lg p-3 border backdrop-blur-sm ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-black/10 border-white/20'}`}>
                                <div className={`font-black text-xs sm:text-sm tracking-widest border-b pb-1.5 mb-2.5 text-center ${isDark ? 'text-emerald-400 border-emerald-900/50' : 'text-emerald-300 border-emerald-300/40'}`}>右舷</div>
                                <div className="space-y-1.5">
                                    {sSeats.map((s, i) => {
                                        const c = parseInt(s.count) || 0;
                                        const isTop = c === stats.max && c > 0;
                                        const isAvg = c >= stats.avg && c > 0 && !isTop;

                                        let textColor = isDark ? 'text-slate-400' : 'text-sky-100';
                                        if (isTop) textColor = isDark ? 'text-amber-400 font-black' : 'text-yellow-300 font-black';
                                        else if (isAvg) textColor = 'text-white font-bold';

                                        return (
                                            <div key={`s-${i}`} className={`flex justify-between items-center text-sm sm:text-base py-0.5 border-b last:border-0 ${textColor} ${isDark ? 'border-slate-700/30' : 'border-white/10'}`}>
                                                <div className="truncate pr-1 flex-1">
                                                    <span className="opacity-50 mr-1.5 text-xs sm:text-sm">{s.id}.</span>
                                                    <span>{isAnonymous ? `座席${s.id}` : (s.name || '-')}</span>
                                                </div>
                                                <div className="font-black flex items-center">{isTop && <IconTrophy className="w-3.5 h-3.5 mr-1 text-amber-500" />}{c}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* フッター情報 */}
                        <div className={`rounded-lg p-3 text-xs sm:text-sm flex flex-wrap gap-x-4 gap-y-2 justify-between border mt-2 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-black/20 border-transparent'}`}>
                            <div className="flex gap-4">
                                <div className={isDark ? 'text-slate-400' : 'text-sky-100'}>総計: <span className="font-bold text-white">{record.total || 0}</span> {unit}</div>
                                <div className={isDark ? 'text-slate-400' : 'text-sky-100'}>平均: <span className="font-bold text-white">{record.avg || 0}</span> {unit}</div>
                            </div>
                            <div className={`flex gap-3 ${isDark ? 'text-slate-500' : 'text-sky-200'}`}>
                                {record.waterTemp && <span>水温: {record.waterTemp}℃</span>}
                                {record.tideState && <span>潮: {record.tideState}</span>}
                                {record.point && <span>{record.point}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* コントロールパネル */}
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-2xl p-4 flex flex-col gap-3 absolute bottom-0 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-black text-gray-800 dark:text-slate-100 text-base sm:text-lg">釣果ボードを作成</span>
                    <button onClick={onClose} className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-600 dark:text-slate-300 font-bold hover:bg-gray-300">✕</button>
                </div>
                
                {/* テーマ切り替えボタン */}
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-700/50 rounded-xl mb-1">
                    <button 
                        onClick={() => setCardTheme('light')} 
                        className={`flex-1 py-2 text-sm font-black rounded-lg transition-all ${cardTheme === 'light' ? 'bg-sky-500 shadow text-white' : 'text-gray-500 dark:text-slate-400 active:bg-gray-200'}`}
                    >
                        🌊 マリンブルー
                    </button>
                    <button 
                        onClick={() => setCardTheme('dark')} 
                        className={`flex-1 py-2 text-sm font-black rounded-lg transition-all ${cardTheme === 'dark' ? 'bg-slate-800 shadow text-amber-400' : 'text-gray-500 dark:text-slate-400 active:bg-gray-200'}`}
                    >
                        🌙 ダークナイト
                    </button>
                </div>

                <label className="flex items-center justify-between p-3 bg-gray-100 dark:bg-slate-700/50 rounded-xl cursor-pointer active:scale-[0.98] transition-transform">
                    <span className="text-sm font-bold text-gray-700 dark:text-slate-200">
                        お名前を隠す（匿名化）
                        <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">SNSで共有する際などにプライバシーを保護します</div>
                    </span>
                    <input 
                        type="checkbox" 
                        className="w-5 h-5 text-sky-500 rounded focus:ring-sky-500 border-gray-300 dark:border-slate-600 dark:bg-slate-800"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                    />
                </label>

                <button 
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:from-sky-600 active:to-blue-700 text-white font-black py-3.5 rounded-xl text-sm shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2"
                >
                    {isGenerating ? (
                        <><span className="animate-spin text-lg leading-none mb-1">↻</span> キャプチャ中...</>
                    ) : (
                        <><IconCamera className="w-5 h-5" /> この画像をスマホに保存</>
                    )}
                </button>
            </div>
        </div>
    );
}

// ==========================================
// アプリ本体
// ==========================================
function App() {
    const [activeTab, setActiveTab] = React.useState(() => localStorage.getItem('fishing_last_tab') || 'input');
    const [counterMode, setCounterMode] = React.useState(() => localStorage.getItem('fishing_counter_mode') || 'tap');
    const [inputSide, setInputSide] = React.useState('both');
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [theme, setTheme] = React.useState(() => localStorage.getItem('theme') || 'light');
    const [userApiKey, setUserApiKey] = React.useState(() => localStorage.getItem('fishing_api_key') || '');
    const [selectedAiModel, setSelectedAiModel] = React.useState(() => localStorage.getItem('fishing_ai_model') || 'Gemini 2.5 Flash');
    const [toastMessage, setToastMessage] = React.useState('');

    const [date, setDate] = React.useState(getTodayString());
    const [targetFish, setTargetFish] = React.useState('');
    const [sizeMin, setSizeMin] = React.useState('');
    const [sizeMax, setSizeMax] = React.useState('');
    const [point, setPoint] = React.useState('');
    const [waterTemp, setWaterTemp] = React.useState('');
    const [waterDepth, setWaterDepth] = React.useState('');
    const [tide, setTide] = React.useState('');
    const [tideState, setTideState] = React.useState('');
    const [highTide1, setHighTide1] = React.useState('');
    const [highTide2, setHighTide2] = React.useState('');
    const [lowTide1, setLowTide1] = React.useState('');
    const [lowTide2, setLowTide2] = React.useState('');
    const [weather1, setWeather1] = React.useState('');
    const [weather2, setWeather2] = React.useState('');
    const [windDir1, setWindDir1] = React.useState('');
    const [windDir2, setWindDir2] = React.useState('');
    const [windSpeed1, setWindSpeed1] = React.useState('');
    const [windSpeed2, setWindSpeed2] = React.useState('');
    const [waveHeight1, setWaveHeight1] = React.useState('');
    const [waveHeight2, setWaveHeight2] = React.useState('');
    const [detailedMemo, setDetailedMemo] = React.useState('');

    const [records, setRecords] = React.useState([]);
    const [portSeatCount, setPortSeatCount] = React.useState(() => localStorage.getItem('port_seat_count') || '');
    const [starboardSeatCount, setStarboardSeatCount] = React.useState(() => localStorage.getItem('starboard_seat_count') || '');

    const getInitialSeats = (countStr) => {
        const count = countStr === '' ? 0 : parseInt(countStr, 10);
        return Array(count).fill(null).map((_, i) => ({ id: i + 1, name: '', count: '', memo: '', isVisible: true }));
    };

    const [portSeats, setPortSeats] = React.useState(() => getInitialSeats(portSeatCount));
    const [starboardSeats, setStarboardSeats] = React.useState(() => getInitialSeats(starboardSeatCount));

    const [searchQuery, setSearchQuery] = React.useState('');
    const [sortOrder, setSortOrder] = React.useState('date_desc');
    const [expandedRecordId, setExpandedRecordId] = React.useState(null);
    const [sharedRecordId, setSharedRecordId] = React.useState(null);
    const [recordToDelete, setRecordToDelete] = React.useState(null);
    
    const [shareImageRecord, setShareImageRecord] = React.useState(null);

    const [showMemoModal, setShowMemoModal] = React.useState(false);
    const [activeMemoRecordId, setActiveMemoRecordId] = React.useState(null);
    const [tempMemo, setTempMemo] = React.useState('');

    const [generatingAiId, setGeneratingAiId] = React.useState(null);
    const [showAiModal, setShowAiModal] = React.useState(false);
    const [aiGeneratedPatterns, setAiGeneratedPatterns] = React.useState([]);
    const [aiGeneratedText, setAiGeneratedText] = React.useState('');
    const [showAiInputModal, setShowAiInputModal] = React.useState(false);
    const [targetRecordForAi, setTargetRecordForAi] = React.useState(null);
    const [aiCurrentStep, setAiCurrentStep] = React.useState(0);
    const [aiInputData, setAiInputData] = React.useState({
        condition: '', scenery: '', tide: '', activity: '', episode: '', size: '', topAngler: '', patterns: [1]
    });
    const aiTimerRef = React.useRef(null);
    const aiAnalysisTimerRef = React.useRef(null);

    const [showAnalysisModal, setShowAnalysisModal] = React.useState(false);
    const [analyzingRecordId, setAnalyzingRecordId] = React.useState(null);
    const [currentAnalysis, setCurrentAnalysis] = React.useState(null);

    const wizardSteps = [
        { id: 'condition', title: '📊 今日の釣況', desc: '今日の船全体の食い気・上がり具合を選択してください。', isSelect: true, options: ['🌟 絶好調', '☀️ 好調', '☁️ 普通', '🌊 食い渋り', '☔ 厳しい'] },
        { id: 'scenery', title: '🌅 海の情景', desc: '今日の海はどんな雰囲気でしたか？', placeholder: '例：ベタ凪の釣り日和でした、冷たい北風が吹く中でのスタートでした など' },
        { id: 'tide', title: '🌊 潮の流れ', desc: '潮の流れの速さや変化はどうでしたか？', placeholder: '例：一日中速くて釣りづらかった、二枚潮だった など' },
        { id: 'activity', title: '🎣 魚の活性・補足', desc: '魚の食い気や、全体的な状況はどうでしたか？', placeholder: '例：朝から入れ食い状態、後半は食い渋り、皆さんお土産十分 など' },
        { id: 'episode', title: '✨ 印象的なエピソード', desc: 'バラシや外道など、特記する出来事はありましたか？', placeholder: '例：大型のバラシが多かった、外道で立派なマダイが交じった など' },
        { id: 'size', title: '📏 サイズ感', desc: '釣れた魚の平均的な大きさはどうでしたか？', placeholder: '例：良型揃い、中型主体に小ぶりが交じる など ※数字は入れない' },
        { id: 'topAngler', title: '👑 竿頭の釣り方・好成績の要因', desc: 'トップの人の工夫やコメントを教えてください。', placeholder: '例：誘いをマメに入れていた、「底付近でアタリが集中した」との事 など' },
        { id: 'patterns', title: '📝 生成パターンの選択', desc: '作成したい文章のパターンを選択してください（複数選択可）。', isMultiSelect: true, options: [
            { id: 1, label: '【標準】王道の日報（400字程度）' },
            { id: 2, label: '【標準・詳報】じっくり読ませる日報（500字程度）' },
            { id: 3, label: '【公式HP向け】信頼感のある丁寧な文章' },
            { id: 4, label: '【情景重視】海の雰囲気・臨場感' },
            { id: 5, label: '【好調・熱血】大漁と活気を伝える文章' },
            { id: 6, label: '【技術・攻略】竿頭の工夫・ヒットパターン' },
            { id: 7, label: '【時合い集中】ワンチャンスの連発劇' },
            { id: 8, label: '【渋い日・要約短文】簡潔なまとめ版（300字程度）' },
            { id: 9, label: '【渋い日・潮/海況分析】次回への期待' },
            { id: 10, label: '【渋い日・テクニカル攻略】工夫と拾い釣り' },
            { id: 11, label: '【渋い日・1尾の価値＆ゲスト魚】' },
            { id: 12, label: '【渋い日・船長の意気込み＆感謝】' }
        ]}
    ];

    React.useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark');
        if (theme === 'dark') root.classList.add('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    React.useEffect(() => {
        try {
            const saved = localStorage.getItem('fishing_records');
            if (saved) {
                const parsed = JSON.parse(saved);
                setRecords(parsed);
                const todayRec = parsed.find(r => r.date === date);
                if (todayRec) {
                    setPortSeats(todayRec.port || []);
                    setStarboardSeats(todayRec.starboard || []);
                    setPortSeatCount((todayRec.port || []).length || '');
                    setStarboardSeatCount((todayRec.starboard || []).length || '');
                    setTargetFish(todayRec.targetFish || '');
                    setSizeMin(todayRec.sizeMin || '');
                    setSizeMax(todayRec.sizeMax || '');
                    setPoint(todayRec.point || '');
                    setWaterTemp(todayRec.waterTemp || '');
                    setWaterDepth(todayRec.waterDepth || '');
                    setTide(todayRec.tide || '');
                    setTideState(todayRec.tideState || '');
                    setHighTide1(todayRec.highTide1 || '');
                    setHighTide2(todayRec.highTide2 || '');
                    setLowTide1(todayRec.lowTide1 || '');
                    setLowTide2(todayRec.lowTide2 || '');
                    setWeather1(todayRec.weather1 || todayRec.weather || '');
                    setWeather2(todayRec.weather2 || '');
                    setWindDir1(todayRec.windDir1 || todayRec.windDir || '');
                    setWindDir2(todayRec.windDir2 || '');
                    setWindSpeed1(todayRec.windSpeed1 || todayRec.windSpeed || '');
                    setWindSpeed2(todayRec.windSpeed2 || '');
                    setWaveHeight1(todayRec.waveHeight1 || todayRec.waveHeight || '');
                    setWaveHeight2(todayRec.waveHeight2 || '');
                    setDetailedMemo(todayRec.detailedMemo || '');
                } else {
                    setPortSeatCount('');
                    setStarboardSeatCount('');
                    setPortSeats([]);
                    setStarboardSeats([]);
                    setTargetFish(''); setSizeMin(''); setSizeMax('');
                    setPoint(''); setWaterTemp(''); setWaterDepth(''); setTide('');
                    setTideState(''); setHighTide1(''); setHighTide2(''); setLowTide1(''); setLowTide2('');
                    setWeather1(''); setWeather2(''); setWindDir1(''); setWindDir2('');
                    setWindSpeed1(''); setWindSpeed2(''); setWaveHeight1(''); setWaveHeight2('');
                    setDetailedMemo('');
                }
            }
        } catch (e) {}
    }, [date]);

    React.useEffect(() => {
        setRecords(prev => {
            const pTotal = portSeats.reduce((sum, s) => sum + (s.isVisible !== false ? (parseInt(s.count) || 0) : 0), 0);
            const sTotal = starboardSeats.reduce((sum, s) => sum + (s.isVisible !== false ? (parseInt(s.count) || 0) : 0), 0);
            const stats = getTopAnglerDetails(portSeats, starboardSeats);

            const recData = {
                id: Date.now(),
                date, targetFish, total: pTotal + sTotal,
                anglers: stats.anglers, avg: stats.avg, min: stats.min, max: stats.max, topAnglerName: stats.topNamesString,
                portTotal: pTotal, starboardTotal: sTotal,
                port: portSeats, starboard: starboardSeats, sizeMin, sizeMax,
                point, waterTemp, waterDepth, tide, tideState,
                highTide1, highTide2, lowTide1, lowTide2,
                weather1, weather2, windDir1, windDir2, windSpeed1, windSpeed2, waveHeight1, waveHeight2,
                detailedMemo
            };

            const existingIdx = prev.findIndex(r => r.date === date);
            let updated = [...prev];
            if (existingIdx >= 0) {
                recData.id = updated[existingIdx].id;
                recData.aiGeneratedPatterns = updated[existingIdx].aiGeneratedPatterns;
                recData.aiGeneratedText = updated[existingIdx].aiGeneratedText;
                recData.aiAnalysisResult = updated[existingIdx].aiAnalysisResult;
                recData.aiInput_condition = updated[existingIdx].aiInput_condition;
                recData.aiInput_scenery = updated[existingIdx].aiInput_scenery;
                recData.aiInput_tide = updated[existingIdx].aiInput_tide;
                recData.aiInput_activity = updated[existingIdx].aiInput_activity;
                recData.aiInput_episode = updated[existingIdx].aiInput_episode;
                recData.aiInput_size = updated[existingIdx].aiInput_size;
                recData.aiInput_topAngler = updated[existingIdx].aiInput_topAngler;
                recData.aiInput_patterns = updated[existingIdx].aiInput_patterns;
                updated[existingIdx] = recData;
            } else {
                const hasData = (pTotal + sTotal > 0) || targetFish || point || waterTemp || waterDepth || tide || tideState || weather1 || windDir1 || sizeMin || sizeMax;
                if (hasData) {
                    updated.push(recData);
                    updated.sort((a, b) => new Date(b.date) - new Date(a.date));
                }
            }
            localStorage.setItem('fishing_records', JSON.stringify(updated));
            return updated;
        });
    }, [
        date, targetFish, sizeMin, sizeMax, point, waterTemp, waterDepth, tide, tideState,
        highTide1, highTide2, lowTide1, lowTide2, weather1, weather2, windDir1, windDir2,
        windSpeed1, windSpeed2, waveHeight1, waveHeight2, detailedMemo, portSeats, starboardSeats
    ]);

    const handleCountDelta = (side, index, delta) => {
        const isP = side === 'port';
        const seats = isP ? [...portSeats] : [...starboardSeats];
        if (!seats[index]) return;
        const nextVal = Math.max(0, Math.min(999, (parseInt(seats[index].count) || 0) + delta));
        seats[index] = { ...seats[index], count: String(nextVal) };
        if (isP) setPortSeats(seats);
        else setStarboardSeats(seats);
    };

    const handleSeatChange = (side, index, field, value) => {
        const isP = side === 'port';
        const seats = isP ? [...portSeats] : [...starboardSeats];
        if (!seats[index]) return;
        seats[index] = { ...seats[index], [field]: value };
        if (isP) setPortSeats(seats);
        else setStarboardSeats(seats);
    };

    const handleSeatCountChange = (side, newCount) => {
        const count = newCount === '' ? '' : Math.max(0, Math.min(15, parseInt(newCount, 10)));
        const actual = count === '' ? 0 : count;
        if (side === 'port') {
            setPortSeatCount(count);
            localStorage.setItem('port_seat_count', count);
            const newSeats = Array(actual).fill(null).map((_, i) => portSeats[i] || { id: i + 1, name: '', count: '', memo: '', isVisible: true });
            setPortSeats(newSeats);
        } else {
            setStarboardSeatCount(count);
            localStorage.setItem('starboard_seat_count', count);
            const newSeats = Array(actual).fill(null).map((_, i) => starboardSeats[i] || { id: i + 1, name: '', count: '', memo: '', isVisible: true });
            setStarboardSeats(newSeats);
        }
    };

    const handleToggleVisibility = (side, index) => {
        const isP = side === 'port';
        const seats = isP ? [...portSeats] : [...starboardSeats];
        if (!seats[index]) return;
        seats[index] = { ...seats[index], isVisible: !seats[index].isVisible };
        if (isP) setPortSeats(seats);
        else setStarboardSeats(seats);
    };

    const handleSizeChange = (type, val) => {
        let processed = String(val);
        if (processed.length > 4) processed = processed.slice(0, 4);
        if (parseInt(processed, 10) < 0) processed = '0';
        if (type === 'min') setSizeMin(processed);
        else setSizeMax(processed);
    };

    const resetOnlyCounts = () => {
        setPortSeats(portSeats.map(s => ({ ...s, count: '' })));
        setStarboardSeats(starboardSeats.map(s => ({ ...s, count: '' })));
        setToastMessage('釣果数をリセットしました（サイズ・お名前は保持）');
    };

    const handleDeleteRecord = (recordId) => {
        setRecords(prev => {
            const updated = prev.filter(r => r.id !== recordId);
            localStorage.setItem('fishing_records', JSON.stringify(updated));
            return updated;
        });
        setToastMessage('釣果記録を削除しました');
    };

    const openMemoModal = (record) => {
        setActiveMemoRecordId(record.id);
        setTempMemo(record.detailedMemo || '');
        setShowMemoModal(true);
    };

    const saveMemo = () => {
        if (activeMemoRecordId) {
            setRecords(prev => {
                const next = prev.map(r => r.id === activeMemoRecordId ? { ...r, detailedMemo: tempMemo } : r);
                localStorage.setItem('fishing_records', JSON.stringify(next));
                return next;
            });
            const target = records.find(r => r.id === activeMemoRecordId);
            if (target && target.date === date) {
                setDetailedMemo(tempMemo);
            }
        } else {
            setDetailedMemo(tempMemo);
        }
        setShowMemoModal(false);
        setToastMessage('メモを保存しました');
    };

    const copyMemoToClipboard = () => {
        const ta = document.createElement('textarea');
        ta.value = tempMemo;
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            setToastMessage('メモをコピーしました！');
        } catch (e) {}
        document.body.removeChild(ta);
    };

    const updateAiInputForRecord = (recordId, field, value) => {
        setRecords(prevRecords => {
            const newRecords = prevRecords.map(r => 
                r.id === recordId ? { ...r, [`aiInput_${field}`]: value } : r
            );
            localStorage.setItem('fishing_records', JSON.stringify(newRecords));
            return newRecords;
        });
    };

    const getPatternPrompt = (id) => {
        const prompts = {
            1: "■■■ 1.【標準】王道の日報（400字程度） ■■■\n全体のバランスが取れた標準的で読みやすいレポート",
            2: "■■■ 2.【標準・詳報】じっくり読ませる日報（500字程度） ■■■\n状況や展開、海の様子をより詳しく伝える読み応えのある文章",
            3: "■■■ 3.【公式HP向け】信頼感のある丁寧な文章 ■■■\n客観的で整った、公式ホームページやお知らせ向けの文章",
            4: "■■■ 4.【情景重視】海の雰囲気・臨場感 ■■■\n天気・波・朝の気配など、現場の空気感を情緒豊かに伝える文章",
            5: "■■■ 5.【好調・熱血】大漁と活気を伝える文章 ■■■\n入れ食いや好成績の喜び、船上の活気をストレートに伝える熱いトーン",
            6: "■■■ 6.【技術・攻略】竿頭の工夫・ヒットパターン ■■■\n誘い方、タナ、仕掛けの工夫など、釣り人目線で役立つ解説文章",
            7: "■■■ 7.【時合い集中】ワンチャンスの連発劇 ■■■\n1日の中でパタパタッと食い立った時合いやドラマに焦点を当てた文章",
            8: "■■■ 8.【渋い日・要約短文】簡潔なまとめ版（300字程度） ■■■\n厳しい日の状況をサクッと簡潔に報告するショート文章",
            9: "■■■ 9.【渋い日・潮/海況分析】次回への期待 ■■■\nなぜ渋かったかを冷静に分析し、次回の好転への期待を伝える文章",
            10: "■■■ 10.【渋い日・テクニカル攻略】工夫と拾い釣り ■■■\n渋い中でも工夫して顔を見た「腕の見せ所・テクニカルな面白さ」を伝える文章",
            11: "■■■ 11.【渋い日・1尾の価値＆ゲスト魚】 ■■■\n数は出なくても良型や美味しい外道、価値ある1尾を称える文章",
            12: "■■■ 12.【渋い日・船長の意気込み＆感謝】 ■■■\n最後まで頑張ってくれたお客様への感謝と、次回のリベンジを誓う男らしい文章"
        };
        return prompts[id];
    };

    const handleAiGenerate = async (record, conditionInfo, sceneryInfo, tideInfo, activityInfo, episodeInfo, sizeInfo, topAnglerInfo, selectedPatterns, customKey) => {
        setGeneratingAiId(record.id);
        const activeApiKey = (customKey || userApiKey || '').replace(/[\s\r\n ]/g, '');
        if (!activeApiKey) {
            setToastMessage('APIキーが入力されていません。設定画面の「データ管理」からGeminiのAPIキーを入力してください。');
            setGeneratingAiId(null);
            return;
        }
        if (!selectedPatterns || selectedPatterns.length === 0) {
            setToastMessage('作成するパターンが選択されていません。');
            setGeneratingAiId(null);
            return;
        }

        const modelName = getActualModelName(selectedAiModel);
        const formatPrompt = selectedPatterns.map(id => getPatternPrompt(id)).join("\n\n");
        const systemPrompt = `※あなたはベテラン釣り船「山下丸」の船長です。海の男らしく、媚びないけれどお客様への温かみがある性格として、以下の釣行記録を作成してください。■ 絶対厳守のルール・文体：「です・ます調」で統一する。簡潔な「〜です」「〜でした」という表現にする（「〜ですね」「〜ですよ」などの甘い語尾、丁寧すぎる表現禁止、「だぜ」「だな」などの友達や後輩にしゃべるような表現は禁止）。・敬称のルール：竿頭などお客様のお名前を紹介する際は、かしこまりすぎた「様」ではなく、必ず「さん」付けに統一すること（例: 〇〇さん）。・表現：「混じる」は「交じる」に、「潮周り」は「潮回り」に統一。・速度：潮や流れは「速い」を使用（「早い」は不可）。・日付：「今日は」「本日は」を使用（「この日は」「当日は」は使用不可）。・禁止：絵文字、太文字、装飾記号（★、◆など）は一切使用しない。・段落と改行の禁止：途中で絶対に改行を行わず、すべての文章を隙間なく繋げて、ひと続きの1つの段落として出力してください。＃ハルシネーション防止の対策・捏造の禁止：提供された【釣果データ】および【船長からの追加情報】にある事実のみを使用してください。書いていない出来事、釣れていない魚種などを勝手に想像して創作（捏造）することは絶対に禁止です。・推測の禁止：情報が不足している項目について、無理に推測で文章を膨らませないでください。情報がない場合はその話題には触れず、ある事実だけを使って簡潔に構成してください。・誇張の禁止：釣果やサイズについて、データ以上の大げさな表現はしないでください。・トーンの合わせ方：指定された「船全体の調子（絶好調/好調/普通/食い渋り/厳しい）」に100%合わせて文章のテンションを調整してください。■ 記載内容のルール1. 冒頭：必ず「〇〇沖へと出船しました。」から開始し、次に「海上では…」と天候や海況（風・波・水温・潮色）を伝える。海況を伝える際は情景が目に浮かぶような表現を1文交え、潮回り、海水温、潮色を簡潔に一連の流れで記載してください。特に指示がない限り"水深〇〇mでした"は不要です。2. 状況：潮の流れの強さや変化、魚の活性、印象的なエピソードを組み込む。3. 竿頭の釣果とお名前（敬称は「さん」）、二番手は釣果だけを紹介する：名前を出すのは「竿頭」のみ。単位（匹、尾、枚、杯など）は魚によって変更すること。4. サイズ：数字（〇cm）は絶対に出さず、「良型」「中型主体」などの言葉のみで表現する。5. 分析：竿頭の釣り方や好釣果の要因、決め手、コツ、工夫した点などを分析して書く。6. 締め：釣れた人・釣れなかった人双方に配慮し、「またのご乗船お待ちしております」と前向きに締める。■ 出力フォーマット必ず以下の■■■タイトル■■■という区切り文字で区切って、それぞれ明確に切り口やトーンを変えた指定パターンの文章を出力してください。余計な挨拶やマークダウン(\`\`\`など)は含めないでください。${formatPrompt}`;

        const unit = getUnit(record.targetFish);
        let inputData = `日付: ${record.date} (${getDayOfWeek(record.date)})\n釣り物: ${record.targetFish}\n釣果: ${record.min}〜${record.max} ${unit}\n竿頭: ${record.topAnglerName || 'なし'}\nポイント: ${record.point || ''}\n水深: ${record.waterDepth || ''}m / 水温: ${record.waterTemp || ''}℃ / 潮色: ${record.tide || ''} / 潮回り: ${record.tideState || ''}\n天候・風波: 前半[${record.weather1 || ''}, ${record.windDir1 || ''} ${record.windSpeed1 || ''}, ${record.waveHeight1 || ''}] / 後半[${record.weather2 || ''}, ${record.windDir2 || ''} ${record.windSpeed2 || ''}, ${record.waveHeight2 || ''}]`;

        let extraInfo = "";
        if (record.detailedMemo && record.detailedMemo.trim() !== '') {
            extraInfo += `\n・詳細メモ・釣行メモ（船長記録）: ${record.detailedMemo.trim()}`;
        }
        if (conditionInfo) extraInfo += `\n・船全体の調子（釣況）の評価: ${conditionInfo}`;
        if (sceneryInfo) extraInfo += `\n・海の情景: ${sceneryInfo}`;
        if (tideInfo) extraInfo += `\n・潮の流れの様子: ${tideInfo}`;
        if (activityInfo) extraInfo += `\n・全体的な釣果の評価・魚の活性: ${activityInfo}`;
        if (episodeInfo) extraInfo += `\n・印象的なエピソード: ${episodeInfo}`;
        if (sizeInfo) extraInfo += `\n・サイズ感: ${sizeInfo}`;
        if (topAnglerInfo) extraInfo += `\n・竿頭の釣り方・好成績の要因・コメント: ${topAnglerInfo}`;

        const userQuery = `以下の釣果データと船長からの追加情報をもとに、指示されたルールの通りに指定パターンの文章を作成してください。\n\n【釣果データ】\n${inputData}\n\n【船長からの追加情報】${extraInfo ? extraInfo : '\n(特になし)'}`;

        try {
            const text = await callGeminiApi(activeApiKey, `${systemPrompt}\n\n${userQuery}`, modelName, false);
            if (text) {
                const parts = text.split(/■■■/);
                const patterns = [];
                for (let i = 1; i < parts.length; i += 2) {
                    const title = parts[i]?.trim();
                    const content = parts[i+1]?.trim();
                    if (title && content) patterns.push({ title, content });
                }
                const newPatterns = patterns.length > 0 ? patterns : [];
                const newText = patterns.length === 0 ? text : '';

                setAiGeneratedPatterns(newPatterns);
                setAiGeneratedText(newText);
                setRecords(prev => {
                    const updated = prev.map(r => r.id === record.id ? { ...r, aiGeneratedPatterns: newPatterns, aiGeneratedText: newText } : r);
                    localStorage.setItem('fishing_records', JSON.stringify(updated));
                    return updated;
                });
                setShowAiModal(true);
            }
        } catch (e) {
            console.error("AI Generation Error:", e);
            setToastMessage(`文章の生成に失敗しました: ${e.message}`);
        } finally {
            setGeneratingAiId(null);
        }
    };

    const handleCopyPattern = (text) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            setToastMessage('コピーしました！');
        } catch (err) {}
        document.body.removeChild(ta);
    };

    const generateShareText = (record) => {
        const unit = getUnit(record.targetFish);
        let text = `【山下丸 釣果記録】\n`;
        text += `日付: ${record.date.replace(/-/g, '/')}${getDayOfWeek(record.date)}\n`;
        if (record.targetFish) text += `釣り物: ${record.targetFish}\n`;
        text += `釣果: ${record.min}〜${record.max} ${unit}\n`;
        if (record.sizeMin || record.sizeMax) {
            text += `型: ${record.sizeMin || '?'}〜${record.sizeMax || '?'} cm\n`;
        }
        if (record.topAnglerName) {
            text += `竿頭: ${record.topAnglerName} さん\n`;
        }
        if (record.point || record.waterTemp || record.waterDepth || record.tide || record.tideState) {
            text += `【海の状況】\n`;
            if (record.point) text += ` ポイント: ${record.point}\n`;
            if (record.waterDepth) text += ` 水深: ${record.waterDepth}m\n`;
            if (record.waterTemp) text += ` 水温: ${record.waterTemp}℃\n`;
            if (record.tide) text += ` 潮色: ${record.tide}\n`;
            if (record.tideState) text += ` 潮回り: ${record.tideState}\n`;
        }
        text += `総合計: ${record.total || 0} ${unit} (${record.anglers || 0}名)\n`;
        text += `一人平均: ${record.avg || 0} ${unit}\n\n`;

        const pSeats = (record.port || []).filter(s => s && s.isVisible !== false);
        if (pSeats.length > 0) {
            text += `■左舷 (${record.portTotal || 0}${unit})\n`;
            pSeats.forEach(s => {
                const nameStr = (s.name && s.name.trim() !== '') ? s.name.trim() : '-';
                const memoStr = s.memo ? ` (${s.memo})` : '';
                const countVal = (s.count !== '' && s.count !== undefined && s.count !== null) ? s.count : 0;
                text += `${s.id}. ${nameStr}${memoStr}: ${countVal}${unit}\n`;
            });
            text += `\n`;
        }

        const sSeats = (record.starboard || []).filter(s => s && s.isVisible !== false);
        if (sSeats.length > 0) {
            text += `■右舷 (${record.starboardTotal || 0}${unit})\n`;
            sSeats.forEach(s => {
                const nameStr = (s.name && s.name.trim() !== '') ? s.name.trim() : '-';
                const memoStr = s.memo ? ` (${s.memo})` : '';
                const countVal = (s.count !== '' && s.count !== undefined && s.count !== null) ? s.count : 0;
                text += `${s.id}. ${nameStr}${memoStr}: ${countVal}${unit}\n`;
            });
        }
        return text.trim();
    };

    const shareToLine = (record) => {
        const text = generateShareText(record);
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
        setSharedRecordId(null);
    };

    const shareToEmail = (record) => {
        const text = generateShareText(record);
        const subject = `【山下丸 釣果記録】${record.date.replace(/-/g, '/')}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
        setSharedRecordId(null);
    };

    const handleRunAiAnalysis = async (record) => {
        if (!userApiKey) {
            setToastMessage('APIキーが未入力です。「データ管理」でGemini APIキーを設定してください。');
            return;
        }
        setAnalyzingRecordId(record.id);
        setToastMessage(`AI (${selectedAiModel}) が釣況・釣り座を多角分析中...`);

        const unit = getUnit(record.targetFish);
        const pSeats = (record.port || []).filter(s => s.isVisible !== false);
        const sSeats = (record.starboard || []).filter(s => s.isVisible !== false);

        const portAnglers = pSeats.length;
        const starboardAnglers = sSeats.length;
        const portTotal = record.portTotal || 0;
        const starboardTotal = record.starboardTotal || 0;
        const portAvg = portAnglers > 0 ? (portTotal / portAnglers).toFixed(1) : '0.0';
        const starboardAvg = starboardAnglers > 0 ? (starboardTotal / starboardAnglers).toFixed(1) : '0.0';

        const prompt = `あなたはベテラン遊漁船「山下丸」の船長兼データアナリストです。以下の釣果・海況・座席メモデータを精査し、客観的カルテおよび公式HP/日報用のトータル文章を作成してください。
【当日のデータ】- 日付: ${record.date} (${getDayOfWeek(record.date)})- 上限釣果（トップ）: ${record.max} ${unit}- 竿頭: ${record.topAnglerName || 'なし'} (${record.max} ${unit})- ポイント: ${record.point || '久里浜沖周辺'} / 水深: ${record.waterDepth || '-'}m / 水温: ${record.waterTemp || '-'}℃- 潮色: ${record.tide || '-'} / 潮回り: ${record.tideState || '-'}- 天候・風波: 前半[${record.weather1 || '-'}, 風:${record.windDir1 || '-'}${record.windSpeed1 || '-'}, 波:${record.waveHeight1 || '-'}] / 後半[${record.weather2 || '-'}, 風:${record.windDir2 || '-'}${record.windSpeed2 || '-'}, 波:${record.waveHeight2 || '-'}]- 船長メモ/詳細メモ: ${record.detailedMemo || 'なし'}- 左舷状況: 乗船 ${portAnglers}名 / 合計 ${portTotal}${unit} / 1人平均 ${portAvg}${unit}  座席詳細: ${pSeats.map(s => `${s.id}番(${s.name || '-'}):${s.count || 0}${unit} [${s.memo || ''}]`).join(', ')}- 右舷状況: 乗船 ${starboardAnglers}名 / 合計 ${starboardTotal}${unit} / 1人平均 ${starboardAvg}${unit}  座席詳細: ${sSeats.map(s => `${s.id}番(${s.name || '-'}):${s.count || 0}${unit} [${s.memo || ''}]`).join(', ')}
【指示事項】1. totalSummaryReport（トータル状況日報）:   本日のポイント、天候、海況、メモを総合的に総括し、公式HPや日報にそのまま掲載できる400字程度の完成されたトータル状況日報を作成してください。   【厳守ルール】   ・出船内容の宣言（「本日は〇〇釣りで〜」など）は書かず、ポイントや現場の状況から書き出してください。   ・釣果については「上限の釣果（トップの数）」のみを記載し、「〇〜〇」といった範囲表示や「平均釣果」は絶対に記載しないでください。   ・サイズについて「〇cm」といった具体的な寸法数値は一切出さないでください（触れる場合は「良型」「中型主体」などの表現のみ）。   ・文体は「です・ます調」で統一し、途中の不要な改行は避け、読みやすく温かみのある船長目線でまとめてください。
2. seatBiasAnalysis（座席バイアス分析）:   左右舷の比較において、単純な合計数だけでなく必ず「乗船人数」と「1人あたりの平均釣果」を基準にして、人数の偏りによる見かけの差と実際の釣況差を明確に区別して考察してください。
必ず以下のJSON形式のみで出力してください（Markdownコードブロックや余計な文字は一切不要）。{  "difficulty": "★1〜★5で難易度評価と一言(例: ★★★☆☆ テクニカルな拾い釣りデー)",  "totalSummaryReport": "指示ルールを厳守した400字程度の完成されたトータル状況日報文章",  "seatBiasAnalysis": "左右舷の人数差および1人あたり平均釣果を踏まえた左右差、トモ・ミヨシ・胴の間での釣果の偏り、風向き・潮の流れ（潮上・潮下）による座席バイアスの分析",  "environmentCorrelation": "水温・潮色・潮回り・天候変化が魚の食い気や活性にどう影響を与えていたかの相関分析",  "topAnglerFactors": "竿頭（トップ）や好成績者が釣果を伸ばした要因（誘い方、タナ、メモ情報、仕掛けの工夫など）の考察",  "captainAdvice": "次回同じような潮回り・海況になった時の推奨ポイント、流し方の工夫、お客様へのアドバイス"}`;
        try {
            const text = await callGeminiApi(userApiKey, prompt, selectedAiModel, true);
            const cleanJson = (text || '').replace(/```json/gi, '').replace(/