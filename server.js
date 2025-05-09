const express = require('express');
const ytdl = require('ytdl-core');
const cors = require('cors');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.post('/api/video', async (req, res) => {
  const { url } = req.body;

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    });

    const formats = info.formats; // Get all formats (video+audio, video-only, audio-only)

    const categorizedFormats = {
      high: [],
      medium: [],
      low: [],
      audio: []
    };

    formats.forEach(format => {
      const formatInfo = {
        url: format.url,
        quality: format.qualityLabel || format.audioBitrate || 'Unknown',
        container: format.container || format.mimeType.split(';')[0].split('/')[1]
      };

      if (format.hasVideo && format.hasAudio) {
        const qualityNum = parseInt(format.qualityLabel) || 0;
        if (qualityNum >= 1080) {
          categorizedFormats.high.push(formatInfo);
        } else if (qualityNum >= 480 && qualityNum <= 720) {
          categorizedFormats.medium.push(formatInfo);
        } else {
          categorizedFormats.low.push(formatInfo);
        }
      } else if (format.hasAudio && !format.hasVideo) {
        formatInfo.quality = `${format.audioBitrate}kbps`;
        categorizedFormats.audio.push(formatInfo);
      } else if (format.hasVideo && !format.hasAudio) {
        const qualityNum = parseInt(format.qualityLabel) || 0;
        if (qualityNum >= 1080) {
          categorizedFormats.high.push(formatInfo);
        } else if (qualityNum >= 480 && qualityNum <= 720) {
          categorizedFormats.medium.push(formatInfo);
        } else {
          categorizedFormats.low.push(formatInfo);
        }
      }
    });

    res.json({
      title: info.videoDetails.title || 'Untitled Video',
      thumbnail: info.videoDetails.thumbnails?.[0]?.url || '',
      formats: categorizedFormats
    });
  } catch (err) {
    console.error(err);
    if (err.message.includes('Sign in to confirm your age')) {
      return res.status(403).json({ error: 'This video is age-restricted and cannot be downloaded without authentication.' });
    } else if (err.message.includes('Video unavailable')) {
      return res.status(404).json({ error: 'This video is unavailable or restricted in your region.' });
    }
    res.status(500).json({ error: 'Failed to fetch video details. Please try again.' });
  }
});

module.exports = app;
