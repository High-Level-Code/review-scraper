import * as dotenv from "dotenv";
import puppeteer from "puppeteer";
import prisma from "./prisma/prisma";

dotenv.config();

const REVIEWS_LINK = "https://www.google.com/search?sca_esv=ff698a007cca6e58&rlz=1C1CHBD_enBR1102BR1102&sxsrf=ADLYWIIuU1f04Hkd9srR5N8_2ocWnRI4_A:1732911444645&q=urgentgaragedoor.com&si=ACC90nxUaQlEYyPWPer1nJgAB5evn4qtFnMAX98mvHiUas5jYW9KztU2dMdvbqtGcJupbobWDQixeHct5WG9VPwzvE6jNe80CR_MwBri2plWwn7ceUlzBvJk9fo4Ko2mpLMK2EH2bUJ4HrPo_l7eS2uFi_S4RtbT-_wK7YAYB6M6eF7lHuT4Vrrus6exCIbY_XieD2P4Mhr_-6ct7DeCgNX7r0PwOPmOSylP_BsgbOXsiO3aTyBRZd3gu_AY_ZJ3hhluglldkmMBwiFciNsAzBWIqn2ttA_bs8tD6bUxtmq3uEaqkEU6nSs%3D&sa=X&ved=2ahUKEwjShdeYroKKAxVeLrkGHe9ALYIQ6RN6BAgPEAE&biw=1918&bih=993&dpr=1";


function delay(ms: number){ return new Promise(resolve => setTimeout(resolve, ms)) };


let reviews: any[] = [];

(async () => {

  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--disable-translate', '--lang=en-US', "--start-maximized"], });

  const page = await browser.newPage();

  await page.goto(REVIEWS_LINK, { waitUntil: 'load' });
  const reviewsModal = await page.waitForSelector('a[data-async-trigger="reviewDialog"]')!;
  reviewsModal?.click();
  reviewsModal?.dispose();

  await page.waitForSelector(".gws-localreviews__general-reviews-block");
  const recents = await page.waitForSelector("div[data-sort-id='newestFirst']")!;
  recents?.click();
  recents?.dispose();

  const N_REVIEWS = 204;

  await delay(3000);

  
  let reviewsElements: any | null;
  console.log("rendering all reviews for scraping...");
  while (true) {
    await page.evaluate(() => {
      const divEl = document.querySelector(".review-dialog-list")!;
      divEl.scrollTop += divEl.scrollHeight;
    });

    const divs = await page.$$(".gws-localreviews__google-review");
    if (divs.length === N_REVIEWS) {
      reviewsElements = divs;
      break;
    };
  }

  for (const element of reviewsElements) {
    const uniqueProfileURL = await element.$eval(".TSUbDb > a", (el: any) => (el as HTMLAnchorElement).href);
    const profilePicture = await element.$eval(".lDY1rd", (el: any) => (el as HTMLImageElement).src);
    const name = await element.$eval(".TSUbDb > a", (el: any) => (el as HTMLAnchorElement).innerText);
    const rating = await element.$eval(".lTi8oc", (el: any) => (el as HTMLSpanElement).ariaLabel);
    const match = (rating as string).match(/\d+/)
    const ratingNumber = Number(match![0]);
    const comment = await element.$$eval(".Jtu6Td", (elements: any) => {
      const targetElement = elements[1]; // Get the second element (if it exists)
      if (targetElement) {
        const innerSpan = targetElement.querySelector("span span"); // Target the nested spans
        return innerSpan?.innerText || null; // Return the text or null if not found
      }
      return null; // No second element
    });

    const review = {
      uniqueProfileURL, profilePicture, name, ratingNumber, comment
    }
    console.log(review);
    reviews.push(review);
  }

  console.log(`${reviews.length} reviews found!`);

  await delay(3000);
  await page.screenshot({ path: 'screenshot.png' });

  await browser.close();
  
  // END PUPPETEER

  const lastReviewFromDB = await prisma.review.findFirst({
    orderBy: {createdAt: "desc"}
  })


  if (lastReviewFromDB && lastReviewFromDB.comment === reviews[0].comment) return console.error("no new reviews");

  await prisma.review.createMany({
    data: reviews,
    skipDuplicates: true,
  })

  console.log("reviews stored successfully");

  await prisma.$disconnect();


})();

