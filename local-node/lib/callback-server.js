const express = require('express');

/**
 * Callback Server Module
 * Handles task completion reports from devices and manages retry logic.
 */
class CallbackServer {
    /**
     * @param {number} port - Port to listen on
     * @param {object} supabase - Supabase client instance
     * @param {Map} deviceState - Shared device state map
     */
    constructor(port, supabase, deviceState) {
        this.port = port;
        this.supabase = supabase;
        this.deviceState = deviceState;
        this.app = express();
        this.app.use(express.json());
        this.setupRoutes();
    }

    setupRoutes() {
        this.app.post('/callback', async (req, res) => {
            const { taskId, success, logs, result } = req.body;
            console.log(`[Callback] Task ${taskId} finished. Success: ${success}`);

            try {
                if (success) {
                    // RPC: complete_video_task
                    await this.supabase.rpc('complete_video_task', {
                        p_task_id: taskId,
                        p_watch_duration: result?.duration || 0,
                        p_liked: result?.liked || false,
                        p_commented: result?.commented || false,
                        p_comment_text: result?.commentText || null
                    });
                } else {
                    await this.handleFailure(taskId, logs);
                }

                // Clear Local State
                for (const [serial, state] of this.deviceState.entries()) {
                    if (state.taskId === taskId) {
                        this.deviceState.delete(serial);
                        break;
                    }
                }
                res.json({ received: true });
            } catch (e) {
                console.error(`[Callback Error] ${e.message}`);
                res.status(500).json({ error: e.message });
            }
        });
    }

    /**
     * Handle task failure with retry logic
     */
    async handleFailure(taskId, logs) {
        try {
            // Fetch current metadata to check retry count
            const { data: task, error } = await this.supabase
                .from('youtube_video_tasks')
                .select('metadata')
                .eq('id', taskId)
                .single();

            if (error) throw error;

            const metadata = task.metadata || {};
            const retryCount = metadata.retry_count || 0;
            const maxRetries = 3;

            if (retryCount < maxRetries) {
                console.log(`[Callback] Retrying task ${taskId} (${retryCount + 1}/${maxRetries})`);
                await this.supabase
                    .from('youtube_video_tasks')
                    .update({ 
                        status: 'pending', 
                        metadata: { ...metadata, retry_count: retryCount + 1 },
                        error_message: logs, 
                        updated_at: new Date() 
                    })
                    .eq('id', taskId);
            } else {
                console.log(`[Callback] Task ${taskId} failed permanently after ${retryCount} retries.`);
                await this.supabase
                    .from('youtube_video_tasks')
                    .update({ status: 'failed', error_message: logs, updated_at: new Date() })
                    .eq('id', taskId);
            }
        } catch (e) {
            console.error(`[Callback] Error handling failure for task ${taskId}: ${e.message}`);
        }
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 Callback Server running on port ${this.port}`);
        });
    }
}

module.exports = CallbackServer;