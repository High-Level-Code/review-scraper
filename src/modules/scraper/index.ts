import { ENVIRONMENT, REVIEWS_LINK } from "../config/globals";
import { delay } from "../../utils/index";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import prisma from "../../../prisma/prisma";

export async function scrapeReviews() {

  let reviews: any[] = [];

  console.log("starting puppeteer...");
  const chromePath = ENVIRONMENT === "production" ? 
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

  console.log("scraping...");
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
