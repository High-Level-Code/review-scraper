#!/bin/sh

# echo "Environment variables loaded at $(date)" >> /usr/src/app/logs.txt
printenv >> /etc/environment

touch /usr/src/app/logs.txt

touch /etc/cron.d/scraper-cron
printenv > /etc/cron.d/scraper-cron
echo "*/10 * * * * cd /usr/src/app && npm start >> /usr/src/app/logs.txt 2>&1" >> /etc/cron.d/scraper-cron
echo "> --env-file variables to the cron file\n" >> /usr/src/app/logs.txt
cat /etc/cron.d/scraper-cron >> /usr/src/app/logs.txt


# Give execute permissions to the cron job file
chmod 644 /etc/cron.d/scraper-cron
chmod 755 /usr/src/app
chmod 644 /usr/src/app/logs.txt

# Apply the cron job
crontab /etc/cron.d/scraper-cron

# cd /usr/src/app

# Run the npm command (or any other command you need)
# npm start >> /usr/src/app/logs.txt 2>&1
