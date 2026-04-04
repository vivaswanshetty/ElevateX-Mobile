#!/bin/bash

# EAS Build Monitor with Auto-Fix
# Monitors build and solves errors automatically

WORKSPACE="/Users/vivaswanshetty/Documents/Projects/elevatex-mobileapp/elevatex-mobile/apps/mobile"
MAX_ATTEMPTS=3
ATTEMPT=0

cd "$WORKSPACE"

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔄 Build Attempt #$ATTEMPT at $(date)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Start build and get the build ID
  BUILD_OUTPUT=$(eas build --platform android --profile internal 2>&1)
  BUILD_ID=$(echo "$BUILD_OUTPUT" | grep -i "build id\|https://expo.dev" | head -1)
  
  echo "Build started: $BUILD_ID"
  
  # Monitor build status
  while true; do
    STATUS=$(eas build:view --json 2>&1 | jq -r '.status' 2>/dev/null || eas build:view 2>&1 | grep -i "status" | head -1)
    
    if echo "$STATUS" | grep -qi "finished\|completed\|errored\|failed"; then
      echo "✅ Build finished: $STATUS"
      break
    fi
    
    echo "⏳ Still building... Status: $STATUS ($(date))"
    sleep 60
  done
  
  # Check final status
  FINAL_STATUS=$(eas build:view 2>&1)
  
  if echo "$FINAL_STATUS" | grep -qi "errored\|failed"; then
    echo "❌ Build FAILED - Fetching logs..."
    
    # Get build ID from status
    BUILD_ID=$(echo "$FINAL_STATUS" | grep "^ID" | awk '{print $NF}')
    LOG_URL="https://expo.dev/accounts/vivaswan.shetty/projects/elevatex/builds/$BUILD_ID"
    
    echo "📋 Logs available at: $LOG_URL"
    echo "🔍 Accessing logs and analyzing errors..."
    
    # Try to fetch and display more details
    eas build:view --json 2>&1 | grep -i "error\|failed" || true
    
    # Common fixes
    echo "🛠️ Attempting automatic fixes..."
    
    # Check for node_modules issues
    if echo "$FINAL_STATUS" | grep -qi "node_modules\|module"; then
      echo "   → Cleaning node_modules..."
      rm -rf node_modules
      bun install
    fi
    
    # Retry the build
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
      echo "🔁 Retrying build (Attempt $ATTEMPT/$MAX_ATTEMPTS)..."
      sleep 10
      continue
    else
      echo "❌ Build failed after $MAX_ATTEMPTS attempts"
      echo "📖 Check logs manually: $LOG_URL"
      exit 1
    fi
  else
    echo "✅ BUILD SUCCESSFUL!"
    echo "$FINAL_STATUS"
    
    # Get APK link
    APK_URL=$(echo "$FINAL_STATUS" | grep -i "archive\|artifact" | grep -o "https://[^[:space:]]*" | head -1)
    if [ ! -z "$APK_URL" ]; then
      echo "📦 APK Download: $APK_URL"
    fi
    
    exit 0
  fi
done

echo "❌ Maximum build attempts reached without success"
exit 1
