(function registerYouTubeAdapter(global) {
  if (!global) return;

  const YT_PLAYER_STATE = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5
  };

  class PlyrYouTubeAdapter {
    constructor(plyrInstance) {
      this.plyr = plyrInstance || null;
      this.state = YT_PLAYER_STATE.UNSTARTED;
    }

    setState(newState) {
      this.state = newState;
    }

    getPlayerState() {
      return this.state;
    }

    playVideo() {
      try {
        this.plyr?.play();
      } catch (err) {
        console.warn('[youtubeAdapter] Plyr adapter failed to play', err);
      }
    }

    pauseVideo() {
      try {
        this.plyr?.pause();
      } catch (err) {
        console.warn('[youtubeAdapter] Plyr adapter failed to pause', err);
      }
    }

    stopVideo() {
      try {
        this.plyr?.stop();
      } catch (err) {
        console.warn('[youtubeAdapter] Plyr adapter failed to stop', err);
      }
    }

    seekTo(seconds, allowSeekAhead = true) { // eslint-disable-line no-unused-vars
      if (!this.plyr) return;
      try {
        this.plyr.currentTime = Number.isFinite(seconds) ? seconds : 0;
      } catch (err) {
        console.warn('[youtubeAdapter] Plyr adapter failed to seek', { seconds, err });
      }
    }

    getCurrentTime() {
      const cur = this.plyr?.currentTime;
      return Number.isFinite(cur) ? cur : 0;
    }

    getDuration() {
      const duration = this.plyr?.duration;
      return Number.isFinite(duration) ? duration : 0;
    }

    destroy() {
      if (this.plyr) {
        try {
          this.plyr.destroy();
        } catch (err) {
          console.warn('[youtubeAdapter] Plyr adapter failed to destroy Plyr instance', err);
        }
      }
      this.plyr = null;
      this.state = YT_PLAYER_STATE.UNSTARTED;
    }
  }

  function ensureYouTubePlayerStateConstants() {
    if (typeof global !== 'undefined') {
      global.YT = global.YT || {};
      global.YT.PlayerState = global.YT.PlayerState || { ...YT_PLAYER_STATE };
    }
  }

  ensureYouTubePlayerStateConstants();

  const adapterApi = {
    YT_PLAYER_STATE,
    PlyrYouTubeAdapter,
    ensureYouTubePlayerStateConstants
  };

  global.VideoTagger = global.VideoTagger || {};
  global.VideoTagger.YouTubeAdapter = adapterApi;
})(typeof window !== 'undefined' ? window : undefined);
