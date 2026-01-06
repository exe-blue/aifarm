/**
 * DoAi.Me YouTube Watcher Service
 * 
 * Periodically checks registered channels/playlists for new videos
 * and creates tasks in Supabase.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const YoutubeApi = require('./lib/youtube-api');
const TaskCreator = require('./lib/task-creator');

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds loop

if (!SUPABASE_URL || !YOUTUBE_API_KEY) {
    console.error("Missing required environment variables.");
    process.exit(1);
}

// --- Initialization ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const youtube = new YoutubeApi(YOUTUBE_API_KEY);
const taskCreator = new TaskCreator(supabase);

async function runWatcherLoop() {
    console.log('--- Watcher Tick ---');
    
    try {
        // 1. Fetch active targets
        const { data: targets, error } = await supabase
            .from('watch_targets')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;

        const now = new Date();

        for (const target of targets) {
            const lastChecked = new Date(target.last_checked);
            const nextCheck = new Date(lastChecked.getTime() + (target.check_interval_seconds * 1000));

            if (now >= nextCheck) {
                console.log(`Checking target: ${target.channel_name || target.target_id}`);
                
                const videos = await youtube.fetchNewVideos(target);
                const newTasks = await taskCreator.createTasks(videos, target.priority_score);
                
                console.log(`> Found ${videos.length} videos, Created ${newTasks} tasks.`);

                // Update last_checked
                await supabase
                    .from('watch_targets')
                    .update({ last_checked: new Date().toISOString() })
                    .eq('id', target.id);
            }
        }
    } catch (e) {
        console.error('[Watcher Error]', e.message);
    }
}

// --- Start ---
console.log("Starting YouTube Watcher Service...");
setInterval(runWatcherLoop, CHECK_INTERVAL_MS);
runWatcherLoop();