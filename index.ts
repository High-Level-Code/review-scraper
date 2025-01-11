import * as dotenv from "dotenv";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import prisma from "../prisma/prisma";
import { Prisma } from "@prisma/client";
import cron from "node-cron";

dotenv.config();

const REVIEWS_LINK = "https://www.google.com/search?sca_esv=ff698a007cca6e58&rlz=1C1CHBD_enBR1102BR1102&sxsrf=ADLYWIIuU1f04Hkd9srR5N8_2ocWnRI4_A:1732911444645&q=urgentgaragedoor.com&si=ACC90nxUaQlEYyPWPer1nJgAB5evn4qtFnMAX98mvHiUas5jYW9KztU2dMdvbqtGcJupbobWDQixeHct5WG9VPwzvE6jNe80CR_MwBri2plWwn7ceUlzBvJk9fo4Ko2mpLMK2EH2bUJ4HrPo_l7eS2uFi_S4RtbT-_wK7YAYB6M6eF7lHuT4Vrrus6exCIbY_XieD2P4Mhr_-6ct7DeCgNX7r0PwOPmOSylP_BsgbOXsiO3aTyBRZd3gu_AY_ZJ3hhluglldkmMBwiFciNsAzBWIqn2ttA_bs8tD6bUxtmq3uEaqkEU6nSs%3D&sa=X&ved=2ahUKEwjShdeYroKKAxVeLrkGHe9ALYIQ6RN6BAgPEAE&biw=1918&bih=993&dpr=1";


function delay(ms: number){ return new Promise(resolve => setTimeout(resolve, ms)) };

let reviews: any[] = [];

async function scrapeReviews() {

  const chromePath = process.env.ENV === "production" ? 
    await chromium.executablePath() :
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const browser = await puppeteer.launch({ 
    headless: chromium.headless, 
    defaultViewport: chromium.defaultViewport,
    args: chromium.args,
    executablePath: chromePath
  });

  const page = await browser.newPage();

  await page.goto(REVIEWS_LINK, { waitUntil: 'load' });

  const n = await page.$eval('a[data-async-trigger="reviewDialog"] > span', (el: any) => (el as HTMLSpanElement).innerText);
  const n_match = (n as string).match(/\d+/)
  const N_REVIEWS = Number(n_match![0]);

  const reviewsModal = await page.waitForSelector('a[data-async-trigger="reviewDialog"]')!;
  reviewsModal?.click();
  reviewsModal?.dispose();

  await page.waitForSelector(".gws-localreviews__general-reviews-block");
  const recentsButton = await page.waitForSelector("div[data-sort-id='newestFirst']")!;
  recentsButton?.click();
  recentsButton?.dispose();

  await delay(3000);

  const reviewsFromDBCount = await prisma.review.count();
  console.log("reviews from db: ", reviewsFromDBCount, " reviews in the page: ", N_REVIEWS);

  if (reviewsFromDBCount && reviewsFromDBCount >= N_REVIEWS) {
    await browser.close();
    return console.error("there is no new reviews");
  }

  
  let reviewsElements: any | null;
  console.log(`rendering all ${N_REVIEWS} reviews for scraping...`);
  
  // STARTS rendering reviews and scraping them
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

    const photosAttached = await element.$$eval(".acCJ4b > div > div > a > div", (els: any[]) => {

      return els.map(((el: HTMLDivElement) => {
        const computedStyle = getComputedStyle(el);
        const bgImage = computedStyle.backgroundImage;
        const urlMatch = bgImage.match(/url\(["']?(.*?)["']?\)/)
        return urlMatch && urlMatch[1];
        
      }));

    }).catch(() => null);

    const review = {
      uniqueProfileURL, profilePicture, name, ratingNumber, comment,
      photosAttached: photosAttached
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

  const reviewPromises = reviews.map((review: any) => {
    
    const { name, uniqueProfileURL, profilePicture, comment, photosAttached, ratingNumber } = review;

    const photos = photosAttached.map((x: any) => { return {url: x} });

    return prisma.review.create({
      data: {
        name, uniqueProfileURL, profilePicture, comment, ratingNumber,
        photosAttached: {
          create: photos
        }
      } 
    })
  });

  await prisma.$transaction(reviewPromises);
  console.log("reviews stored successfully");
};

cron.schedule("*/3 * * * *", async () => {
  try {
    scrapeReviews()
  } catch (error) {
    if (isPuppeteerError(error)) {
      console.error("error came from puppeteer");
      await prisma.review.findMany();
    }
    if (isPrismaError(error)) console.error("error came from prisma");
  } finally {
    await prisma.$disconnect();
    hitDavidsEndpoint();
  }
})

process.on('unhandledRejection', (error: any) => {
  console.error('Unhandled Rejection:', error.message);
});

process.on('uncaughtException', (error: any) => {
  console.error('Uncaught Exception:', error.message);
});

function isPuppeteerError(error: any) {
  return error.stack && error.stack.includes('puppeteer');
}

function isPrismaError(error: any) {
  return error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientUnknownRequestError;
}

async function hitDavidsEndpoint() {
  const cronjob_key = process.env.CRONJOB_KEY;
  if (!cronjob_key) return console.log("cronjob key not found");

  const endpoint = "https://davidsgarage.pro/api";
  console.log("> Calling extra endpoint: " + endpoint);
  const req = await fetch(endpoint, {
    method: "POST", 
    headers: {
      "Authorization": `Bearer ${cronjob_key}`
    },
    body: JSON.stringify({message: "sup bro!"})
  });
  const res = await req.json();
  if (res.error) return console.error(res.error);
  console.log("Success: ", res.data);
}
