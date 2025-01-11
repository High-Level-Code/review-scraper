NAME=review-scraper
SOURCE=ghcr.io/high-level-code/$(NAME)

all: 
	tsx src/index.ts

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

push:
	docker tag review-scraper $(SOURCE)
	docker push $(SOURCE)

exe: 
	docker exec -it review-scraper bash
