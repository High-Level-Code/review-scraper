import nodemailer from "nodemailer";
import { ENVIRONMENT, SENDER_EMAIL_ADDRESS, SENDER_EMAIL_PASSWORD } from "../config/globals";

export async function fireEmailAlert(error: string) {

  const recipient = ENVIRONMENT === "production" ?
    ["hierrofernandes23@gmail.com", "240designworks@gmail.com"] : "hierrofernandes23@gmail.com";

  if (
    !SENDER_EMAIL_ADDRESS ||
    !SENDER_EMAIL_PASSWORD
  ) return false;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: `${SENDER_EMAIL_ADDRESS}`,
      pass: `${SENDER_EMAIL_PASSWORD}` 
    }
  });

  // Email options
  const mailOptions = {
    from: `${SENDER_EMAIL_ADDRESS}`,
    to: recipient,
    subject: "Error in 'Review Scraper' execution",
    text: error,
  };

  try {
    console.log(`[Email] Sending email to '${recipient} ...'`);
    const req = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL - SUCCESS] Error Alert successfully sent. Details:\n${req.response}\n`);
    return true;

  } catch (error) {
    console.error(`[EMAIL - ERROR] Error trying to send alert. Details:\n${error.message}\n`);
    return false;
  }
}
