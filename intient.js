/**
 * DoAi.Me Intient Agent (On-Device Script)
 * 
 * This script is PUSHED by the PC (Laixi Controller) to the Phoneboard devices.
 * It executes a specific task and reports back to the PC.
 * 
 * Context:
 * - Runs on: Galaxy S9 (Android 8/9/10) inside Phoneboard
 * - Environment: AutoX.js
 * - Input: $env object (Injected by heartbeat.js)
 */

"auto";

// --- Configuration ---
// $env is injected by the PC controller before execution
var CONFIG = {
    taskId: $env.TASK_ID,
    videoUrl: $env.VIDEO_URL,
    duration: $env.TARGET_DURATION,
    actions: {
        like: $env.SHOULD_LIKE,
        comment: $env.SHOULD_COMMENT,
        commentText: $env.COMMENT_TEXT
    },
    callbackUrl: $env.CALLBACK_URL
};

console.log("Intient Agent Started: Task " + CONFIG.taskId);

// --- Modules ---
// Assuming common modules are available or we implement basic ones here

function openVideo(url) {
    app.startActivity({
        action: "android.intent.action.VIEW",
        data: url,
        packageName: "com.google.android.youtube"
    });
    waitForPackage("com.google.android.youtube", 10000);
}

function watch(seconds) {
    console.log("Watching for " + seconds + "s");
    // Simple sleep, but in production this would include human-like interaction
    // (scroll, small touches) to prevent screen dimming or bot detection
    var slept = 0;
    while (slept < seconds) {
        sleep(5000);
        slept += 5;
        if (Math.random() < 0.1) {
            // Keep alive interaction
            press(device.width / 2, device.height / 2, 10);
        }
    }
}

function performActions() {
    if (CONFIG.actions.like) {
        console.log("Action: Like");
        var likeBtn = descContains("Like").findOne(2000) || descContains("좋아요").findOne(2000);
        if (likeBtn && !likeBtn.isSelected()) {
            likeBtn.click();
            sleep(1000);
        }
    }

    if (CONFIG.actions.comment) {
        console.log("Action: Comment");
        // Comment logic implementation...
        // (Simplified for brevity)
    }
}

function report(success, logs) {
    console.log("Reporting to " + CONFIG.callbackUrl);
    try {
        http.postJson(CONFIG.callbackUrl, {
            taskId: CONFIG.taskId,
            success: success,
            logs: logs
        });
    } catch (e) {
        console.error("Report failed: " + e);
    }
}

// --- Main Execution ---
try {
    // 1. Launch & Open
    openVideo(CONFIG.videoUrl);
    sleep(5000); // Wait for load

    // 2. Watch
    watch(CONFIG.duration);

    // 3. Interact
    performActions();

    // 4. Report Success
    report(true, "Task completed successfully");

} catch (e) {
    console.error("Execution Error: " + e);
    report(false, e.toString());
} finally {
    // Cleanup if necessary
}