// Biological constants (Gompertz-Makeham mortality, childbirth risks, immunity).
// ---- Tunable biology (per *life-year*; the life clock is sim.bioYearDays() game days per year)
export const GOMPERTZ_A = 0.00005;   // baseline adult hazard

export const GOMPERTZ_B = 0.09;      // hazard roughly doubles every ~8 years of age

export const MAKEHAM = 0.002;        // accidents etc., regardless of age (the storyteller adds the drama)

export const INFANT_HAZARD = 0.12;   // first year of life, pre-modern (halved with healthy, fed care)

export const CHILD_HAZARD = 0.01;    // ages 1-5

export const MATERNAL_RISK = 0.012;  // ~1.2% per birth, pre-industrial average

export const STILLBIRTH_RISK = 0.03;

export const MIDWIFE_FACTOR = 0.6;   // trained help cut maternal deaths 20-40%

export const PREGNANCY_YEARS = 0.75; // nine months

export const IMMUNITY_YEARS = 1.5;   // after recovering from sickness
