#!/bin/bash
cd "$(dirname "$0")/dashboard" && python3 -m http.server 8080
