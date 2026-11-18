import { OVERNIGHT_INDOOR_HOURS } from '@saans/shared';

import { avoided, timeSpan, type PlanCopy } from './plan-copy.js';

const mopTip = {
  title: 'Mop, don’t sweep',
  detail: 'Dry sweeping lifts fine dust back into the air. A damp mop or cloth keeps it down.',
};
const smokeTip = {
  title: 'No smoke indoors',
  detail: 'Incense, dhoop, mosquito coils, candles and cigarettes all add PM2.5 inside the home.',
};
const cookingVentTip = {
  title: 'Ventilate while cooking',
  detail: 'Run the exhaust fan or chimney every time you fry or temper; it clears fine particles.',
};

/** English copy for the deterministic planner. */
export const EN_COPY: PlanCopy = {
  modeNames: {
    petrolCar: 'car',
    twoWheeler: 'two-wheeler',
    bus: 'bus',
    metro: 'metro',
    walk: 'walking',
    cycle: 'cycling',
  },
  categoryNames: {
    good: 'Good',
    satisfactory: 'Satisfactory',
    moderate: 'Moderate',
    poor: 'Poor',
    veryPoor: 'Very poor',
    severe: 'Severe',
  },
  summary: (aqi, bestWindow, location) => {
    const now = `Air quality in ${location} is ${EN_COPY.categoryNames[aqi.category]} right now (NAQI ${String(aqi.value)}).`;
    if (bestWindow === null) {
      return `${now} There is no clear cleaner window in the next 24 hours, so plan to stay mostly indoors.`;
    }
    const verdict = bestWindow.allUnsafe ? 'least-bad' : 'cleanest';
    return `${now} The ${verdict} time to be outside in the next 24 hours is ${timeSpan(bestWindow)}.`;
  },
  routine: {
    outdoor: {
      title: 'Best time to be outside',
      detail: 'Do errands, school runs, walks and exercise in this window.',
    },
    outdoorUnsafe: {
      title: 'Least-bad time outside',
      detail: 'Even this window is Severe. Keep outdoor time short and wear a well-fitted N95.',
    },
    stayIn: {
      title: 'Stay in, windows shut',
      detail: 'Pollution peaks now. Postpone outdoor activity and keep doors and windows closed.',
    },
    night: {
      title: 'Sleep in clean air',
      detail: 'Keep the bedroom door and windows closed; run a purifier there if you have one.',
    },
  },
  indoorHacks: {
    clean: [
      {
        title: 'Air out the home',
        detail: 'Open windows while the air is clean to flush out cooking fumes and stale air.',
      },
      cookingVentTip,
      mopTip,
    ],
    polluted: [
      {
        title: 'Ventilate only in the clean window',
        detail: 'Keep windows closed at peak hours and open them briefly when the air is best.',
      },
      cookingVentTip,
      mopTip,
      smokeTip,
    ],
    severe: [
      {
        title: 'Seal the home',
        detail: 'Keep doors and windows shut; put a damp towel along gaps under leaky doors.',
      },
      {
        title: 'Make one clean room',
        detail: 'Keep one room closed with a purifier running, especially for children and elders.',
      },
      {
        title: 'Build a fan filter',
        detail: 'No purifier? Strap a MERV-13 or HEPA filter to a box fan as a low-cost stopgap.',
      },
      smokeTip,
      mopTip,
    ],
  },
  alternatives: {
    commute: {
      title: 'Take the metro or share a ride',
      detail: 'Enclosed public transport cuts both what you breathe and what the city breathes.',
    },
    cleanCooking: {
      title: 'Cook with a lid on',
      detail: 'Lids and a low LPG or induction flame cut fuel use and cooking fumes.',
    },
    dirtyFuel: {
      title: 'Switch to LPG or induction',
      detail:
        'Wood, kerosene and coal stoves are among the biggest indoor PM2.5 sources. Ask about subsidised LPG under PM Ujjwala Yojana.',
    },
    heating: {
      title: 'Never burn fuel indoors for warmth',
      detail:
        'Coal or wood angithis fill the room with smoke and carbon monoxide. Use an electric heater or extra layers.',
    },
    waste: {
      title: 'Don’t burn leaves or rubbish',
      detail:
        'Open burning is a major winter smog source. Compost leaves and report burning to your municipal helpline.',
    },
  },
  impacts: {
    'commute-metro': {
      title: 'Take the metro on office days',
      explain: (facts, { commuteMode }) => {
        const { ug, pct } = avoided(facts);
        return `Switching from ${EN_COPY.modeNames[commuteMode]} to the metro saves about ${String(facts.co2SavedKgPerWeek ?? 0)} kg of CO2 a week and cuts the PM2.5 you breathe while commuting by about ${ug} µg (${pct}%) per office day. Estimate.`;
      },
    },
    'commute-n95': {
      title: 'Wear an N95 on your commute',
      explain: (facts, { commuteMode }) => {
        const { ug, pct } = avoided(facts);
        return `A well-fitted N95 cuts the PM2.5 you breathe on your ${EN_COPY.modeNames[commuteMode]} commute by about ${ug} µg (${pct}%) per office day. Estimate.`;
      },
    },
    'exercise-shift': {
      title: 'Exercise in the cleanest window',
      explain: (facts, { bestWindow, worstWindow }) => {
        const { ug, pct } = avoided(facts);
        return `Exercising ${timeSpan(bestWindow)} instead of ${timeSpan(worstWindow)} cuts the PM2.5 you breathe during your workout by about ${ug} µg (${pct}%). Estimate.`;
      },
    },
    'exercise-indoors': {
      title: 'Exercise indoors today',
      explain: (facts) => {
        const { ug, pct } = avoided(facts);
        return `Every waking hour today is Severe. Working out indoors instead of outside cuts the PM2.5 you breathe by about ${ug} µg (${pct}%). Estimate.`;
      },
    },
    'close-windows': {
      title: 'Keep windows shut at the peak',
      explain: (facts, { worstWindow }) => {
        const { ug, pct } = avoided(facts);
        return `Keeping windows closed ${timeSpan(worstWindow)} cuts the PM2.5 each person at home breathes in that time by about ${ug} µg (${pct}%). Estimate.`;
      },
    },
    'purifier-run': {
      title: 'Run your purifier overnight',
      explain: (facts) => {
        const { ug, pct } = avoided(facts);
        return `Running your purifier in a closed bedroom through ${String(OVERNIGHT_INDOOR_HOURS)} hours of sleep cuts each sleeper’s PM2.5 dose by about ${ug} µg (${pct}%). Estimate.`;
      },
    },
    'purifier-buy': {
      title: 'Consider a HEPA purifier for the bedroom',
      explain: (facts) => {
        const { ug, pct } = avoided(facts);
        return `A HEPA purifier in a closed bedroom would cut each sleeper’s PM2.5 dose over ${String(OVERNIGHT_INDOOR_HOURS)} hours by about ${ug} µg (${pct}%). A DIY fan filter is a cheaper start. Estimate.`;
      },
    },
  },
};
