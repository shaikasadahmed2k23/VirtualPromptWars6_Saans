import { OVERNIGHT_INDOOR_HOURS } from '@saans/shared';

import { avoided, timeSpan, type PlanCopy } from './plan-copy.js';

const mopTip = {
  title: 'झाड़ू नहीं, पोछा लगाएँ',
  detail: 'सूखी झाड़ू से महीन धूल फिर हवा में उड़ती है। गीले पोछे या कपड़े से धूल दबी रहती है।',
};
const smokeTip = {
  title: 'घर में धुआँ नहीं',
  detail: 'अगरबत्ती, धूप, मच्छर कॉइल, मोमबत्ती और सिगरेट घर के अंदर PM2.5 बढ़ाते हैं।',
};
const cookingVentTip = {
  title: 'खाना पकाते समय हवा निकालें',
  detail: 'तलते या तड़का लगाते समय हर बार एग्ज़ॉस्ट फ़ैन या चिमनी चलाएँ; इससे महीन कण बाहर निकलते हैं।',
};

/** Hindi copy for the deterministic planner. */
export const HI_COPY: PlanCopy = {
  modeNames: {
    petrolCar: 'कार',
    twoWheeler: 'दोपहिया',
    autoRickshaw: 'ऑटो-रिक्शा',
    bus: 'बस',
    metro: 'मेट्रो',
    walk: 'पैदल',
    cycle: 'साइकिल',
  },
  categoryNames: {
    good: 'अच्छी',
    satisfactory: 'संतोषजनक',
    moderate: 'मध्यम',
    poor: 'ख़राब',
    veryPoor: 'बहुत ख़राब',
    severe: 'गंभीर',
  },
  summary: (aqi, bestWindow, location) => {
    const now = `${location} में अभी हवा की गुणवत्ता ${HI_COPY.categoryNames[aqi.category]} है (NAQI ${String(aqi.value)})।`;
    if (bestWindow === null) {
      return `${now} अगले 24 घंटों में कोई साफ़ समय नहीं दिखता, इसलिए ज़्यादातर घर के अंदर रहने की योजना बनाएँ।`;
    }
    const verdict = bestWindow.allUnsafe ? 'सबसे कम ख़राब' : 'सबसे साफ़';
    return `${now} अगले 24 घंटों में बाहर निकलने का ${verdict} समय ${timeSpan(bestWindow)} है।`;
  },
  routine: {
    outdoor: {
      title: 'बाहर जाने का सबसे अच्छा समय',
      detail: 'काम-काज, बच्चों को स्कूल छोड़ना, सैर और व्यायाम इसी समय करें।',
    },
    outdoorUnsafe: {
      title: 'बाहर जाने का सबसे कम ख़राब समय',
      detail: 'यह समय भी गंभीर श्रेणी में है। बाहर कम से कम रहें और ठीक से फ़िट N95 पहनें।',
    },
    stayIn: {
      title: 'घर में रहें, खिड़कियाँ बंद',
      detail: 'अभी प्रदूषण सबसे ज़्यादा है। बाहर के काम टालें और दरवाज़े-खिड़कियाँ बंद रखें।',
    },
    night: {
      title: 'साफ़ हवा में सोएँ',
      detail: 'सोने के कमरे का दरवाज़ा और खिड़कियाँ बंद रखें; प्यूरीफ़ायर हो तो वहीं चलाएँ।',
    },
  },
  indoorHacks: {
    clean: [
      {
        title: 'घर में ताज़ी हवा आने दें',
        detail: 'हवा साफ़ हो तब खिड़कियाँ खोलें ताकि खाना पकाने का धुआँ और बासी हवा निकल जाए।',
      },
      cookingVentTip,
      mopTip,
    ],
    polluted: [
      {
        title: 'सिर्फ़ साफ़ समय में खिड़कियाँ खोलें',
        detail: 'प्रदूषण के चरम समय खिड़कियाँ बंद रखें और हवा सबसे साफ़ हो तब थोड़ी देर खोलें।',
      },
      cookingVentTip,
      mopTip,
      smokeTip,
    ],
    severe: [
      {
        title: 'घर को बंद रखें',
        detail: 'दरवाज़े-खिड़कियाँ बंद रखें; दरवाज़े के नीचे की दरार पर गीला तौलिया रखें।',
      },
      {
        title: 'एक साफ़ कमरा बनाएँ',
        detail: 'एक कमरा बंद रखें और उसमें प्यूरीफ़ायर चलाएँ, ख़ासकर बच्चों और बुज़ुर्गों के लिए।',
      },
      {
        title: 'पंखे वाला फ़िल्टर बनाएँ',
        detail: 'प्यूरीफ़ायर नहीं है? बॉक्स फ़ैन पर MERV-13 या HEPA फ़िल्टर बाँधें — सस्ता अस्थायी उपाय।',
      },
      smokeTip,
      mopTip,
    ],
  },
  alternatives: {
    commute: {
      title: 'मेट्रो लें या सवारी साझा करें',
      detail: 'बंद सार्वजनिक परिवहन से आपका प्रदूषण-संपर्क भी घटता है और शहर का प्रदूषण भी।',
    },
    cleanCooking: {
      title: 'ढककर पकाएँ',
      detail: 'ढक्कन लगाकर और LPG या इंडक्शन की धीमी आँच पर पकाने से ईंधन और धुआँ दोनों घटते हैं।',
    },
    dirtyFuel: {
      title: 'LPG या इंडक्शन अपनाएँ',
      detail:
        'लकड़ी, केरोसिन और कोयले के चूल्हे घर के अंदर PM2.5 के बड़े स्रोत हैं। प्रधानमंत्री उज्ज्वला योजना में सब्सिडी वाली LPG के बारे में पूछें।',
    },
    heating: {
      title: 'गर्मी के लिए घर में आग न जलाएँ',
      detail:
        'कोयले या लकड़ी की अंगीठी कमरे को धुएँ और कार्बन मोनोऑक्साइड से भर देती है। बिजली का हीटर या गर्म कपड़े इस्तेमाल करें।',
    },
    waste: {
      title: 'पत्ते या कचरा न जलाएँ',
      detail:
        'खुले में जलाना सर्दियों के स्मॉग का बड़ा कारण है। पत्तों की खाद बनाएँ और जलाने की शिकायत नगर निगम हेल्पलाइन पर करें।',
    },
  },
  impacts: {
    'commute-metro': {
      title: 'दफ़्तर के दिनों में मेट्रो लें',
      explain: (facts, { commuteMode }) => {
        const { ug, pct } = avoided(facts);
        return `${HI_COPY.modeNames[commuteMode]} की जगह मेट्रो लेने से हर हफ़्ते लगभग ${String(facts.co2SavedKgPerWeek ?? 0)} किलो CO2 बचती है और आने-जाने में साँस से जाने वाला PM2.5 हर दफ़्तर-दिन लगभग ${ug} µg (${pct}%) घटता है। अनुमान।`;
      },
    },
    'commute-n95': {
      title: 'आने-जाने में N95 पहनें',
      explain: (facts, { commuteMode }) => {
        const { ug, pct } = avoided(facts);
        return `ठीक से फ़िट N95 पहनने से ${HI_COPY.modeNames[commuteMode]} से आने-जाने में साँस से जाने वाला PM2.5 हर दफ़्तर-दिन लगभग ${ug} µg (${pct}%) घटता है। अनुमान।`;
      },
    },
    'exercise-shift': {
      title: 'सबसे साफ़ समय में व्यायाम करें',
      explain: (facts, { bestWindow, worstWindow }) => {
        const { ug, pct } = avoided(facts);
        return `${timeSpan(worstWindow)} की जगह ${timeSpan(bestWindow)} व्यायाम करने से व्यायाम के दौरान साँस से जाने वाला PM2.5 लगभग ${ug} µg (${pct}%) घटता है। अनुमान।`;
      },
    },
    'exercise-indoors': {
      title: 'आज घर के अंदर व्यायाम करें',
      explain: (facts) => {
        const { ug, pct } = avoided(facts);
        return `आज जागने का हर घंटा गंभीर श्रेणी में है। बाहर की जगह घर में व्यायाम करने से साँस से जाने वाला PM2.5 लगभग ${ug} µg (${pct}%) घटता है। अनुमान।`;
      },
    },
    'close-windows': {
      title: 'चरम समय में खिड़कियाँ बंद रखें',
      explain: (facts, { worstWindow }) => {
        const { ug, pct } = avoided(facts);
        return `${timeSpan(worstWindow)} खिड़कियाँ बंद रखने से उस समय घर में हर व्यक्ति के साँस से जाने वाला PM2.5 लगभग ${ug} µg (${pct}%) घटता है। अनुमान।`;
      },
    },
    'purifier-run': {
      title: 'रात भर प्यूरीफ़ायर चलाएँ',
      explain: (facts) => {
        const { ug, pct } = avoided(facts);
        return `बंद कमरे में ${String(OVERNIGHT_INDOOR_HOURS)} घंटे की नींद के दौरान प्यूरीफ़ायर चलाने से हर सोने वाले का PM2.5 लगभग ${ug} µg (${pct}%) घटता है। अनुमान।`;
      },
    },
    'purifier-buy': {
      title: 'सोने के कमरे के लिए HEPA प्यूरीफ़ायर पर विचार करें',
      explain: (facts) => {
        const { ug, pct } = avoided(facts);
        return `बंद कमरे में HEPA प्यूरीफ़ायर ${String(OVERNIGHT_INDOOR_HOURS)} घंटे में हर सोने वाले का PM2.5 लगभग ${ug} µg (${pct}%) घटा सकता है। शुरुआत के लिए पंखे वाला फ़िल्टर सस्ता है। अनुमान।`;
      },
    },
  },
};
