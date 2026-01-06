/**
 * DoAi.Me Phoneboard Controller (Heartbeat Node)
 * 
 * Architecture: PC (Orchestrator) -> Laixi API -> Phoneboard (20x Galaxy S9)
 * Role:
 * 1. Monitor 20 devices in the Phoneboard via Laixi API
 * 2. Report device status to Supabase (Heartbeat)
 * 3. Fetch tasks from Supabase and PUSH scripts (intient.js) to devices
 * 4. Receive task completion callbacks
 */

require('dotenv').config();
const axios = require('axios');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

// --- Configuration ---
const LAIXI_API_URL = process.env.LAIXI_API_URL || 'http://127.0.0.1:9317'; // Laixi Local API
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CALLBACK_PORT = process.env.CALLBACK_PORT || 3000;
const NODE_ID = process.env.NODE_ID || os.hostname();

// --- Clients ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();
app.use(express.json());

// --- State Management ---
// Track running tasks to prevent double assignment
const DeviceState = new Map(); // serial -> { taskId, startTime }

// --- Laixi API Wrapper ---
const Laixi = {
    async getDevices() {
        try {
            // Laixi API: Get list of connected devices (Phoneboard units)
            const res = await axios.get(`${LAIXI_API_URL}/api/devices?q=online`);
            return res.data.data || []; // Adjust based on actual Laixi response structure
        } catch (e) {
            console.error(`[Laixi] Failed to fetch devices: ${e.message}`);
            return [];
        }
    },

    async runScript(serial, script, filename = 'intient.js') {
        try {
            // Laixi API: Push and run script on specific device
            await axios.post(`${LAIXI_API_URL}/api/devices/${serial}/script/run`, {
                script: script,
                name: filename,
                // Options for Laixi execution (e.g., keep alive, auto restart)
                options: {
                    keepAlive: false
                }
            });
            return true;
        } catch (e) {
            console.error(`[Laixi] Failed to run script on ${serial}: ${e.message}`);
            return false;
        }
    },

    async isScriptRunning(serial) {
        try {
            const res = await axios.get(`${LAIXI_API_URL}/api/devices/${serial}/script/status`);
            return res.data.running === true;
        } catch (e) {
            return false;
        }
    }
};

// --- Helper: Get Local IP for Callback ---
function getLocalIp() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return '127.0.0.1';
}
const CALLBACK_URL = `http://${getLocalIp()}:${CALLBACK_PORT}/callback`;

// --- Core Logic ---

async function processDevice(device) {
    const serial = device.serial || device.id;
    
    // 1. Heartbeat: Report device existence to Supabase
    // This registers the device if new, or updates last_seen
    await supabase.rpc('device_heartbeat', {
        p_node_id: NODE_ID,
        p_device_serial: serial,
        p_status: 'online',
        p_battery: device.battery || 100
    });

    // 2. Check if device is busy
    // We check both our local state and Laixi's actual state
    const isRunningInLaixi = await Laixi.isScriptRunning(serial);
    
    if (DeviceState.has(serial)) {
        if (!isRunningInLaixi) {
            // Task finished unexpectedly or just finished
            console.log(`[${serial}] Task finished or died. Clearing state.`);
            DeviceState.delete(serial);
        } else {
            // Still running, skip
            return;
        }
    }

    // 3. Fetch new task (Push Model)
    // We ask Supabase for a pending task assigned to this device (or any available task)
    const { data: task, error } = await supabase
        .rpc('get_next_task_for_device', { p_device_serial: serial });

    if (task) {
        console.log(`[${serial}] Assigning Task ${task.id}: ${task.video_title}`);
        
        // 4. Prepare Script (Injection)
        const scriptTemplate = fs.readFileSync(path.join(__dirname, 'scripts', 'intient.js'), 'utf8');
        const envInjection = `
            var $env = {
                TASK_ID: "${task.id}",
                VIDEO_URL: "${task.video_url}",
                TARGET_DURATION: ${task.target_duration || 60},
                SHOULD_LIKE: ${task.should_like || false},
                SHOULD_COMMENT: ${task.should_comment || false},
                COMMENT_TEXT: "${task.comment_text || ''}",
                CALLBACK_URL: "${CALLBACK_URL}"
            };
        `;
        const finalScript = envInjection + "\n" + scriptTemplate;

        // 5. Push & Run
        const success = await Laixi.runScript(serial, finalScript);
        
        if (success) {
            DeviceState.set(serial, { taskId: task.id, startTime: Date.now() });
            // Update task status to running
            await supabase.from('tasks').update({ status: 'running', started_at: new Date() }).eq('id', task.id);
        }
    }
}

async function loop() {
    console.log('--- Heartbeat Tick ---');
    const devices = await Laixi.getDevices();
    console.log(`Connected Devices: ${devices.length}`);

    for (const device of devices) {
        await processDevice(device);
    }
}

// --- Callback Server ---
app.post('/callback', async (req, res) => {
    const { taskId, success, logs } = req.body;
    console.log(`[Callback] Task ${taskId} finished. Success: ${success}`);
    
    // Update Supabase
    await supabase.rpc('complete_task', {
        p_task_id: taskId,
        p_success: success,
        p_logs: logs
    });

    // Clear local state to allow new tasks
    // We need to find which serial had this task
    for (const [serial, state] of DeviceState.entries()) {
        if (state.taskId === taskId) {
            DeviceState.delete(serial);
            break;
        }
    }

    res.json({ received: true });
});

// --- Start ---
app.listen(CALLBACK_PORT, () => {
    console.log(`Phoneboard Controller listening on port ${CALLBACK_PORT}`);
    console.log(`Callback URL: ${CALLBACK_URL}`);
    
    setInterval(loop, 10000); // Check every 10 seconds
});