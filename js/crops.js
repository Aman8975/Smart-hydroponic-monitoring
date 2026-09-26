/*
 * Crop recipes: starting points drawn from commonly published hydroponic ranges.
 * EC in mS/cm. `until` = last day of the stage, counted from the sowing / planting date.
 * Growers should tune these to their variety, nutrient brand and climate.
 */
window.CROPS = [
  {
    id: 'lettuce', name: { en: 'Lettuce', hi: 'लेट्यूस (सलाद पत्ता)' }, type: 'leafy',
    system: 'NFT / DWC',
    harvest: [40, 55],
    airTemp: [16, 24], waterTemp: [18, 22],
    stages: [
      { key: 'seedling', until: 14, ec: [0.6, 0.9], ph: [5.8, 6.2] },
      { key: 'growth', until: 55, ec: [0.8, 1.2], ph: [5.8, 6.2] }
    ],
    notes: {
      en: 'Bolts and gets tip-burn above ~28°C air. In summer use shade net, keep water cool, or grow heat-tolerant types (Batavia, Grand Rapids).',
      hi: '28°C से ज़्यादा तापमान पर फूल आने लगते हैं और पत्तों के किनारे जलते हैं। गर्मी में शेड नेट लगाएँ, पानी ठंडा रखें, या गर्मी सहने वाली किस्में (बटाविया, ग्रैंड रैपिड्स) उगाएँ।'
    }
  },
  {
    id: 'spinach', name: { en: 'Spinach', hi: 'पालक' }, type: 'leafy',
    system: 'NFT / DWC',
    harvest: [35, 45],
    airTemp: [15, 25], waterTemp: [18, 22],
    stages: [
      { key: 'seedling', until: 14, ec: [1.0, 1.4], ph: [6.0, 6.5] },
      { key: 'growth', until: 50, ec: [1.8, 2.3], ph: [6.0, 7.0] }
    ],
    notes: {
      en: 'Can be cut 2–3 times. Sensitive to warm water (root rot) — keep reservoir below 24°C.',
      hi: '2–3 बार कटाई हो सकती है। गर्म पानी में जड़ सड़ने लगती है — टंकी का पानी 24°C से कम रखें।'
    }
  },
  {
    id: 'methi', name: { en: 'Fenugreek (Methi)', hi: 'मेथी' }, type: 'leafy',
    system: 'NFT / Trays',
    harvest: [25, 32],
    airTemp: [18, 30], waterTemp: [18, 24],
    stages: [
      { key: 'seedling', until: 7, ec: [0.8, 1.2], ph: [6.0, 6.8] },
      { key: 'growth', until: 32, ec: [1.2, 1.8], ph: [6.0, 6.8] }
    ],
    notes: {
      en: 'Less published data than other crops — treat ranges as approximate and record what works for you.',
      hi: 'इस फसल पर कम जानकारी उपलब्ध है — इन आंकड़ों को अनुमान मानें और अपने नतीजे लॉग में लिखें।'
    }
  },
  {
    id: 'coriander', name: { en: 'Coriander', hi: 'धनिया' }, type: 'leafy',
    system: 'NFT / DWC',
    harvest: [35, 45],
    airTemp: [18, 28], waterTemp: [18, 24],
    stages: [
      { key: 'seedling', until: 14, ec: [0.8, 1.2], ph: [6.0, 6.7] },
      { key: 'growth', until: 45, ec: [1.2, 1.8], ph: [6.0, 6.7] }
    ],
    notes: {
      en: 'Crush seeds lightly before sowing for better germination. Bolts quickly in heat.',
      hi: 'बोने से पहले बीज हल्का तोड़ लें, अंकुरण अच्छा होगा। गर्मी में जल्दी फूल आ जाते हैं।'
    }
  },
  {
    id: 'basil', name: { en: 'Basil', hi: 'बेसिल (तुलसी)' }, type: 'herb',
    system: 'NFT / DWC',
    harvest: [35, 90],
    airTemp: [20, 30], waterTemp: [18, 24],
    stages: [
      { key: 'seedling', until: 14, ec: [0.8, 1.2], ph: [5.5, 6.5] },
      { key: 'growth', until: 90, ec: [1.0, 1.6], ph: [5.5, 6.5] }
    ],
    notes: {
      en: 'Handles warm weather well. Pinch the tops to keep it bushy; remove flower buds.',
      hi: 'गर्म मौसम अच्छी तरह सह लेता है। ऊपर की कोंपल तोड़ते रहें ताकि पौधा घना बने; फूल की कलियाँ हटाएँ।'
    }
  },
  {
    id: 'mint', name: { en: 'Mint', hi: 'पुदीना' }, type: 'herb',
    system: 'NFT / DWC',
    harvest: [35, 120],
    airTemp: [18, 30], waterTemp: [18, 24],
    stages: [
      { key: 'rooting', until: 10, ec: [1.0, 1.4], ph: [5.5, 6.5] },
      { key: 'growth', until: 120, ec: [2.0, 2.4], ph: [5.5, 6.5] }
    ],
    notes: {
      en: 'Start from cuttings, not seed. Roots spread fast and can block NFT channels — trim roots monthly.',
      hi: 'बीज से नहीं, कटिंग से लगाएँ। जड़ें तेज़ी से फैलकर NFT चैनल बंद कर सकती हैं — हर महीने जड़ें छाँटें।'
    }
  },
  {
    id: 'pakchoi', name: { en: 'Pak choi', hi: 'पाक चोई' }, type: 'leafy',
    system: 'NFT / DWC',
    harvest: [35, 45],
    airTemp: [15, 25], waterTemp: [18, 22],
    stages: [
      { key: 'seedling', until: 14, ec: [1.0, 1.4], ph: [6.0, 7.0] },
      { key: 'growth', until: 45, ec: [1.5, 2.0], ph: [6.0, 7.0] }
    ],
    notes: {
      en: 'Fast crop with good demand from restaurants and HoReCa buyers.',
      hi: 'जल्दी तैयार होने वाली फसल; होटल-रेस्टोरेंट में अच्छी माँग।'
    }
  },
  {
    id: 'kale', name: { en: 'Kale', hi: 'केल' }, type: 'leafy',
    system: 'NFT / DWC',
    harvest: [50, 90],
    airTemp: [15, 25], waterTemp: [18, 22],
    stages: [
      { key: 'seedling', until: 14, ec: [0.8, 1.2], ph: [5.5, 6.5] },
      { key: 'growth', until: 90, ec: [1.2, 1.8], ph: [5.5, 6.5] }
    ],
    notes: {
      en: 'Harvest outer leaves and let the centre keep growing.',
      hi: 'बाहर की पत्तियाँ तोड़ें, बीच का हिस्सा बढ़ने दें।'
    }
  },
  {
    id: 'tomato', name: { en: 'Tomato', hi: 'टमाटर' }, type: 'fruiting',
    system: 'Dutch bucket / Grow bags',
    harvest: [90, 240],
    airTemp: [18, 29], waterTemp: [18, 24],
    stages: [
      { key: 'seedling', until: 25, ec: [1.2, 1.8], ph: [5.8, 6.3] },
      { key: 'vegetative', until: 55, ec: [2.0, 2.8], ph: [5.8, 6.3] },
      { key: 'fruiting', until: 240, ec: [2.5, 3.5], ph: [5.8, 6.3] }
    ],
    notes: {
      en: 'Inside a polyhouse flowers need help to pollinate — shake/vibrate trusses daily around midday. Watch for blossom-end rot (calcium).',
      hi: 'पॉलीहाउस में परागण के लिए रोज़ दोपहर फूलों के गुच्छे हिलाएँ। फल के निचले सिरे का सड़ना (कैल्शियम की कमी) देखते रहें।'
    }
  },
  {
    id: 'cucumber', name: { en: 'Cucumber', hi: 'खीरा' }, type: 'fruiting',
    system: 'Dutch bucket / Grow bags',
    harvest: [45, 120],
    airTemp: [20, 30], waterTemp: [20, 24],
    stages: [
      { key: 'seedling', until: 14, ec: [1.2, 1.6], ph: [5.5, 6.0] },
      { key: 'vegetative', until: 35, ec: [1.7, 2.2], ph: [5.5, 6.0] },
      { key: 'fruiting', until: 120, ec: [2.0, 2.5], ph: [5.5, 6.0] }
    ],
    notes: {
      en: 'Use parthenocarpic (seedless, self-setting) varieties in polyhouses. Heavy water users in summer — check tank level twice a day.',
      hi: 'पॉलीहाउस में पार्थेनोकार्पिक (बिना परागण फल देने वाली) किस्में लगाएँ। गर्मी में बहुत पानी पीता है — दिन में दो बार टंकी देखें।'
    }
  },
  {
    id: 'capsicum', name: { en: 'Capsicum', hi: 'शिमला मिर्च' }, type: 'fruiting',
    system: 'Dutch bucket / Grow bags',
    harvest: [90, 240],
    airTemp: [18, 28], waterTemp: [18, 24],
    stages: [
      { key: 'seedling', until: 30, ec: [1.2, 1.6], ph: [5.8, 6.3] },
      { key: 'vegetative', until: 60, ec: [1.8, 2.2], ph: [5.8, 6.3] },
      { key: 'fruiting', until: 240, ec: [2.0, 2.8], ph: [5.8, 6.3] }
    ],
    notes: {
      en: 'Coloured capsicum fetches premium prices but takes 2–3 extra weeks on the plant to colour up.',
      hi: 'रंगीन शिमला मिर्च का दाम अच्छा मिलता है, पर रंग आने में पौधे पर 2–3 हफ़्ते ज़्यादा लगते हैं।'
    }
  },
  {
    id: 'chilli', name: { en: 'Chilli', hi: 'हरी मिर्च' }, type: 'fruiting',
    system: 'Dutch bucket / Grow bags',
    harvest: [80, 210],
    airTemp: [20, 30], waterTemp: [18, 24],
    stages: [
      { key: 'seedling', until: 30, ec: [1.2, 1.6], ph: [5.8, 6.3] },
      { key: 'vegetative', until: 60, ec: [1.8, 2.2], ph: [5.8, 6.3] },
      { key: 'fruiting', until: 210, ec: [2.0, 2.8], ph: [5.8, 6.3] }
    ],
    notes: {
      en: 'Watch for thrips and mites (leaf curl). Yellow and blue sticky traps help.',
      hi: 'थ्रिप्स और माइट्स (पत्ती मुड़ना) का ध्यान रखें। पीले और नीले चिपचिपे ट्रैप लगाएँ।'
    }
  },
  {
    id: 'strawberry', name: { en: 'Strawberry', hi: 'स्ट्रॉबेरी' }, type: 'fruiting',
    system: 'NFT / Vertical towers',
    harvest: [60, 180],
    airTemp: [15, 26], waterTemp: [18, 22],
    stages: [
      { key: 'establishment', until: 21, ec: [0.8, 1.2], ph: [5.5, 6.2] },
      { key: 'vegetative', until: 45, ec: [1.0, 1.4], ph: [5.5, 6.2] },
      { key: 'fruiting', until: 180, ec: [1.2, 1.8], ph: [5.5, 6.2] }
    ],
    notes: {
      en: 'Best in the cooler months (Oct–Mar in the plains) or hill regions. Plant from runners/plugs, keep the crown above the water.',
      hi: 'ठंडे महीनों (मैदानों में अक्टूबर–मार्च) या पहाड़ी इलाकों में सबसे अच्छा। रनर/प्लग से लगाएँ, क्राउन पानी से ऊपर रखें।'
    }
  },
  {
    id: 'microgreens', name: { en: 'Microgreens', hi: 'माइक्रोग्रीन्स' }, type: 'micro',
    system: 'Trays',
    harvest: [8, 14],
    airTemp: [18, 26], waterTemp: [18, 24],
    stages: [
      { key: 'growth', until: 14, ec: [0.4, 0.8], ph: [5.8, 6.5] }
    ],
    notes: {
      en: 'Plain water is enough for the first days; a weak feed after the first true leaves improves colour.',
      hi: 'शुरू के दिनों में सादा पानी काफ़ी है; पहली असली पत्तियाँ आने पर हल्का पोषण रंग बेहतर करता है।'
    }
  }
];

window.cropById = function (id) {
  return window.CROPS.find(function (c) { return c.id === id; });
};
