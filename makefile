all: 
	tsx index.ts

db: 
	docker compose up -d

container:
	docker run -d --name review-scraper --env-file .env review-scraper

build:
	docker build -t review-scraper .

start:
	docker run -d --name review-scraper --env-file .env review-scraper

bs:
	make build && make start
