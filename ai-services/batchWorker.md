# Running the Batch Worker

## Setup
cp .env.example .env  # add SUPABASE_SERVICE_ROLE_KEY
npm install

## Start worker
node batchWorker.js

## Run in background (local)
nohup node batchWorker.js > worker.log 2>&1 &

## Deploy to Railway
- Set env vars in Railway dashboard
- Start command: node ai-services/batchWorker.js

## Notes
- Worker processes one image at a time to avoid OpenAI rate limits
- 8 second delay between generations
- Safe to restart at any time — processing items auto-reset to pending on restart
- Monitor worker.log for errors
