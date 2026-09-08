// ==========================================
// settings.js : 設定・海況・システム管理パネル
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
    const [activeSettingsTab, setActiveSettingsTab] = React.useState('basic'); // 'basic', 'weather', 'system'
    const tideImageInputRef = React.useRef(null);
    const weatherImageInputRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const [tempKey, setTempKey] = React.useState(userApiKey || '');
    const [showKey, setShowKey] = React.useState(false);
    const [showTextInput, setShowTextInput] = React.useState(false);
    const [pasteText, setPasteText] = React.useState('');
    const [isAnalyzingTide, setIsAnalyzingTide] = React.useState(false);
    const [isAnalyzingWeather, setIsAnalyzingWeather] = React.useState(false);

    React.useEffect(() => {
        setTempKey(userApiKey || '');
    }, [userApiKey]);

    if (!isSettingsOpen) return null;

    // AIモデルの表示名とAPI識別子のマップ
    const aiModelOptions = [
        { label: "Gemini 2.5 Flash（推奨・高速）", value: "Gemini 2.5 Flash", id: "gemini-2.5-flash" },
        { label: "Gemini 2.5 Pro（深層考察・高精度）", value: "Gemini 2.5 Pro", id: "gemini-2.5-pro" },
        { label: "Gemini 3.5 Flash", value: "Gemini 3.5 Flash", id: "gemini-3.5-flash" },
        { label: "Gemini 3.6 Flash", value: "Gemini 3.6 Flash", id: "gemini-3.6-flash" },
        { label: "Gemini 3.7 Flash", value: "Gemini 3.7 Flash", id: "gemini-3.7-flash" },
        { label: "Gemini 3.8 Flash", value: "Gemini 3.8 Flash", id: "gemini-3.8-flash" },
        { label: "Gemini 3.1 Pro", value: "Gemini 3.1 Pro", id: "gemini-3.1-pro" }
    ];

    // 波高（波の状態）の選択肢
    const waveHeightOptions = [
        "穏やか",
        "穏やかな方",
        "多少波がある",
        "波がやや高い",
        "波が高い",
        "しける",
        "大しけ"
    ];

    // Base64変換
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // 共通 Gemini Vision 呼び出し
    const callVisionApi = async (file, prompt) => {
        const activeKey = (userApiKey || '').trim();
        if (!activeKey) {
            throw new Error('APIキーが設定されていません。「システム」タブでGemini APIキーを入力して保存してください。');
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
        const clean = text.replace(/```json/gi, '').split('