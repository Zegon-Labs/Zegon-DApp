export interface HeroSmokeParticle {
  x: string;
  y: string;
  size: string;
  duration: string;
  delay: string;
  driftX: string;
  driftY: string;
  peakOpacity: number;
}

/** Precomputed smoke puffs — deterministic, no runtime randomness. */
export const HERO_SMOKE_PARTICLES: HeroSmokeParticle[] = [
  { x: "8%", y: "2%", size: "82px", duration: "9s", delay: "0s", driftX: "-32px", driftY: "-320px", peakOpacity: 0.94 },
  { x: "22%", y: "6%", size: "62px", duration: "7s", delay: "-2s", driftX: "22px", driftY: "-280px", peakOpacity: 0.9 },
  { x: "38%", y: "0%", size: "92px", duration: "10s", delay: "-4s", driftX: "-16px", driftY: "-340px", peakOpacity: 0.96 },
  { x: "52%", y: "8%", size: "66px", duration: "8s", delay: "-1s", driftX: "38px", driftY: "-300px", peakOpacity: 0.92 },
  { x: "66%", y: "4%", size: "74px", duration: "9.5s", delay: "-6s", driftX: "-26px", driftY: "-330px", peakOpacity: 0.95 },
  { x: "80%", y: "10%", size: "56px", duration: "6.5s", delay: "-3s", driftX: "28px", driftY: "-260px", peakOpacity: 0.88 },
  { x: "14%", y: "18%", size: "72px", duration: "8.5s", delay: "-5s", driftX: "-42px", driftY: "-310px", peakOpacity: 0.93 },
  { x: "30%", y: "22%", size: "52px", duration: "7.5s", delay: "-7s", driftX: "18px", driftY: "-290px", peakOpacity: 0.87 },
  { x: "46%", y: "16%", size: "86px", duration: "11s", delay: "-8s", driftX: "-10px", driftY: "-350px", peakOpacity: 0.96 },
  { x: "60%", y: "24%", size: "58px", duration: "7s", delay: "-2.5s", driftX: "32px", driftY: "-270px", peakOpacity: 0.9 },
  { x: "74%", y: "20%", size: "64px", duration: "8s", delay: "-9s", driftX: "-22px", driftY: "-295px", peakOpacity: 0.91 },
  { x: "6%", y: "30%", size: "54px", duration: "6s", delay: "-4.5s", driftX: "14px", driftY: "-250px", peakOpacity: 0.86 },
  { x: "88%", y: "28%", size: "48px", duration: "6.8s", delay: "-1.5s", driftX: "-36px", driftY: "-265px", peakOpacity: 0.84 },
  { x: "18%", y: "36%", size: "76px", duration: "9s", delay: "-10s", driftX: "26px", driftY: "-325px", peakOpacity: 0.94 },
  { x: "42%", y: "32%", size: "68px", duration: "8.2s", delay: "-3.8s", driftX: "-30px", driftY: "-305px", peakOpacity: 0.92 },
  { x: "56%", y: "38%", size: "46px", duration: "5.8s", delay: "-6.5s", driftX: "20px", driftY: "-240px", peakOpacity: 0.85 },
  { x: "70%", y: "34%", size: "78px", duration: "10.5s", delay: "-11s", driftX: "-18px", driftY: "-335px", peakOpacity: 0.95 },
  { x: "34%", y: "42%", size: "56px", duration: "7.2s", delay: "-0.8s", driftX: "24px", driftY: "-275px", peakOpacity: 0.89 },
  { x: "50%", y: "44%", size: "62px", duration: "8.8s", delay: "-5.5s", driftX: "-38px", driftY: "-315px", peakOpacity: 0.91 },
  { x: "26%", y: "48%", size: "66px", duration: "9.2s", delay: "-7.5s", driftX: "16px", driftY: "-300px", peakOpacity: 0.93 },
  { x: "62%", y: "46%", size: "52px", duration: "6.2s", delay: "-2.2s", driftX: "-24px", driftY: "-255px", peakOpacity: 0.87 },
  { x: "12%", y: "52%", size: "58px", duration: "7.8s", delay: "-9.5s", driftX: "30px", driftY: "-285px", peakOpacity: 0.9 },
  { x: "78%", y: "50%", size: "72px", duration: "8.6s", delay: "-4.2s", driftX: "-28px", driftY: "-308px", peakOpacity: 0.92 },
  { x: "44%", y: "52%", size: "44px", duration: "5.5s", delay: "-1.2s", driftX: "10px", driftY: "-235px", peakOpacity: 0.84 },
];
