(function setupPlayerState(global) {
  if (!global) return;

  const root = global.VideoTagger = global.VideoTagger || {};
  const player = root.player = root.player || {};

  player.constants = player.constants || {};
  player.constants.MEDIA_MODE = player.constants.MEDIA_MODE || {
    AUDIO: 'audio',
    VIDEO: 'video'
  };
  player.constants.CONTROL_LOG_DELTA = player.constants.CONTROL_LOG_DELTA || 0.75;

  player.state = player.state || {};
  player.state.lastAudioControlSnapshot = player.state.lastAudioControlSnapshot || null;
})(typeof window !== 'undefined' ? window : undefined);
