#!/bin/sh

# > LOAD ENV VARIABLES FROM `--env-file .env`
printenv >> /etc/environment

# > Create main script logs
touch /usr/src/app/logs.txt

# > Install reviews-scraper cron with environment variables
touch /etc/cron.d/scraper-cron
printenv > /etc/cron.d/scraper-cron
echo "*/5 * * * * cd /usr/src/app && npm run start >> /usr/src/app/logs.txt 2>&1" >> /etc/cron.d/scraper-cron
echo "> --env-file variables to the cron file\n" >> /usr/src/app/logs.txt
cat /etc/cron.d/scraper-cron >> /usr/src/app/logs.txt

# > Give execute permissions to the cron job file
chmod 644 /etc/cron.d/scraper-cron
chmod 755 /usr/src/app
chmod 644 /usr/src/app/logs.txt

# > Apply the cron job
crontab /etc/cron.d/scraper-cron
