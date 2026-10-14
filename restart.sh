#!/usr/bin/env bash
branch=$(git branch --show-current)

if [[ "$branch" == "main" ]]; then
	git pull
else
	git pull origin main
fi

docker compose up --build -d
