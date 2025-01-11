import { fireEmailAlert } from "../email";

export const ENVIRONMENT = process.env.ENV;

// right one
export const REVIEWS_LINK = "https://www.google.com/search?sca_esv=ff698a007cca6e58&rlz=1C1CHBD_enBR1102BR1102&sxsrf=ADLYWIIuU1f04Hkd9srR5N8_2ocWnRI4_A:1732911444645&q=urgentgaragedoor.com&si=ACC90nxUaQlEYyPWPer1nJgAB5evn4qtFnMAX98mvHiUas5jYW9KztU2dMdvbqtGcJupbobWDQixeHct5WG9VPwzvE6jNe80CR_MwBri2plWwn7ceUlzBvJk9fo4Ko2mpLMK2EH2bUJ4HrPo_l7eS2uFi_S4RtbT-_wK7YAYB6M6eF7lHuT4Vrrus6exCIbY_XieD2P4Mhr_-6ct7DeCgNX7r0PwOPmOSylP_BsgbOXsiO3aTyBRZd3gu_AY_ZJ3hhluglldkmMBwiFciNsAzBWIqn2ttA_bs8tD6bUxtmq3uEaqkEU6nSs%3D&sa=X&ved=2ahUKEwjShdeYroKKAxVeLrkGHe9ALYIQ6RN6BAgPEAE&biw=1918&bih=993&dpr=1";

export const CRONJOB_KEY = process.env.CRONJOB_KEY!

export const SENDER_EMAIL_ADDRESS = process.env.SENDER_EMAIL_ADDRESS!;
export const SENDER_EMAIL_PASSWORD = process.env.SENDER_EMAIL_PASSWORD!;

export const requiredGlobals = {
  MAIN_SCHEDULE: process.env.MAIN_SCHEDULE!,
}

export async function checkMissingRequiredGlobals() {

  const missingGlobals: any[] = [];

  for (const [key, value] of Object.entries(requiredGlobals)) {
    if (value) continue;
    missingGlobals.push(key);
  }

  if (missingGlobals.length === 0) return;

  // HANDLE MISSING GLOBALS
  await fireEmailAlert(`Missing important variables: ${missingGlobals}`);
  throw new Error(`> [ERROR] Missing Important Variables: ${missingGlobals}`)
  // send email alert
}

export default requiredGlobals;
