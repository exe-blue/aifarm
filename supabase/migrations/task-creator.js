class TaskCreator {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async createTasks(videos, priorityScore) {
        let createdCount = 0;
        
        for (const video of videos) {
            // 1. 중복 확인 (이미 등록된 영상인지)
            const { data: existing } = await this.supabase
                .from('youtube_video_tasks')
                .select('id')
                .eq('video_url', video.url)
                .maybeSingle();

            if (!existing) {
                // 2. 새 태스크 생성
                const { error } = await this.supabase
                    .from('youtube_video_tasks')
                    .insert({
                        video_url: video.url,
                        video_title: video.title,
                        channel_name: video.channelName,
                        status: 'pending',
                        priority: priorityScore,
                        metadata: {
                            thumbnail: video.thumbnail,
                            published_at: video.publishedAt,
                            source: 'youtube-watcher'
                        }
                    });
                
                if (!error) {
                    createdCount++;
                    console.log(`[Task Creator] Created task: ${video.title}`);
                } else {
                    console.error(`[Task Creator] Failed to insert: ${error.message}`);
                }
            }
        }
        return createdCount;
    }
}

module.exports = TaskCreator;