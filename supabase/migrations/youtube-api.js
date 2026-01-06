const axios = require('axios');

class YoutubeApi {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    }

    async getUploadsPlaylistId(channelId) {
        try {
            const res = await axios.get(`${this.baseUrl}/channels`, {
                params: {
                    part: 'contentDetails',
                    id: channelId,
                    key: this.apiKey
                }
            });
            if (!res.data.items || res.data.items.length === 0) return null;
            return res.data.items[0].contentDetails.relatedPlaylists.uploads;
        } catch (error) {
            console.error(`[YouTube API] Error fetching channel ${channelId}:`, error.message);
            return null;
        }
    }

    async getLatestVideos(playlistId, maxResults = 10) {
        try {
            const res = await axios.get(`${this.baseUrl}/playlistItems`, {
                params: {
                    part: 'snippet',
                    playlistId: playlistId,
                    maxResults: maxResults,
                    key: this.apiKey
                }
            });
            
            return res.data.items.map(item => ({
                title: item.snippet.title,
                videoId: item.snippet.resourceId.videoId,
                url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
                channelName: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                thumbnail: item.snippet.thumbnails?.high?.url
            }));
        } catch (error) {
            console.error(`[YouTube API] Error fetching playlist ${playlistId}:`, error.message);
            return [];
        }
    }

    async fetchNewVideos(target) {
        let playlistId = target.target_id;
        
        if (target.target_type === 'channel') {
            playlistId = await this.getUploadsPlaylistId(target.target_id);
        }

        if (!playlistId) {
            console.warn(`[Watcher] Could not determine playlist ID for target ${target.target_id}`);
            return [];
        }

        return await this.getLatestVideos(playlistId);
    }
}

module.exports = YoutubeApi;