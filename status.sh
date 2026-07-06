#!/bin/bash

# Define colors for the dashboard
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVICES=("caddy" "gunicorn" "fastapi" "celery")

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}          IMAGE ORCHESTRATOR INFRA STATUS           ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Check health statuses
for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo -e "  [ ${GREEN}OK${NC} ] $service is running smoothly."
    else
        echo -e "  [ ${RED}FAIL${NC} ] $service is ${RED}DOWN${NC}!"
    fi
done

echo -e "${BLUE}----------------------------------------------------${NC}"
echo -e "${YELLOW}               RECENT SYSTEM JOURNALS               ${NC}"
echo -e "${BLUE}----------------------------------------------------${NC}"

# 2. Print recent logs for each service
for service in "${SERVICES[@]}"; do
    echo -e "\n${YELLOW}>>> Last 5 lines for: $service${NC}"
    sudo journalctl -u "$service" -n 5 --no-pager | sed 's/^/  /'
done

echo -e "${BLUE}====================================================${NC}"




