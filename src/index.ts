import * as dotenv from "dotenv";
import prisma from "../prisma/prisma";
import { Prisma } from "@prisma/client";
import cron from "node-cron";
import { scrapeReviews } from "./modules/scraper";
import requiredGlobals, { CRONJOB_KEY, ENVIRONMENT, checkMissingRequiredGlobals } from "./modules/config/globals";
import { fireEmailAlert } from "./modules/email";

dotenv.config();

if (ENVIRONMENT === "production") {

  (async () => {
    await checkMissingRequiredGlobals();
    const { MAIN_SCHEDULE } = requiredGlobals;
    cron.schedule(MAIN_SCHEDULE, async () => {
      await main();
    })

  })();

} else {
  (async () => {
    // await main();
    // process.exit(0);
    cron.schedule("*/2 * * * *", async () => {
      await main();
    })
  })();
}


function isPuppeteerError(error: any) {
  return error.stack && error.stack.includes('puppeteer');
}

function isPrismaError(error: any) {
  return error instanceof Prisma.PrismaClientKnownRequestError || 
    error instanceof Prisma.PrismaClientUnknownRequestError || 
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError;
}

async function hitDavidsEndpoint() {

  try {
    const endpoint = "https://davidsgarage.pro/api";
    console.log("> Calling extra endpoint: " + endpoint);
    const req = await fetch(endpoint, {
      method: "POST", 
      headers: {
        "Authorization": `Bearer ${CRONJOB_KEY}`
      },
      body: JSON.stringify({message: "sup bro!"})
    });

    const body = await req.text() ? await req.json() : undefined;

    if (!req.ok) {
      console.error(`> [Error] Request to '${endpoint}' return bad status code: ${req.status}. body: ${body}\n`);
      return await fireEmailAlert(`Request to '${endpoint}' return bad status code: ${req.status}. body: ${body}`);
    }

    console.log(`[Success] Request successfully made.\n`);
    
  } catch (error) {
    console.error(`> [Error] Error. Details:\n${error}\n`);
    await fireEmailAlert(error);
  }
}

async function main() {

  try {

    try {
      console.log(`environment: ${ENVIRONMENT}`);
      await scrapeReviews();
    } catch (error) {

      if (isPuppeteerError(error)) {
        console.error("> [Error] Error from puppeteer");
        await fireEmailAlert(error.message);
        return await prisma.review.findMany(); // hit the database anyways
      }

      if (isPrismaError(error)) {
        console.error(`> [ERROR] Error from Prisma: Details:\n${error}\n`);
        return await fireEmailAlert(error.message);
      }

      console.error(`> [Error] Unhandled Error. Details:\n${error}\n`);
      await fireEmailAlert(error.message);

    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    if (isPrismaError(error)) {
      console.error(`> [ERROR] Error from Prisma. Details:\n${error}\n`);
      return await fireEmailAlert(error.message);
    }

    console.error(`> [Error] Unhandled Error. Details:\n${error}\n`);
    await fireEmailAlert(error.message);
  } finally {
    await hitDavidsEndpoint();
  }
}
