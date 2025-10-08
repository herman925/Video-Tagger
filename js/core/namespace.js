(function establishVideoTaggerNamespace(global) {
  if (!global) return;

  const root = global.VideoTagger || {};
  root.core = root.core || {};
  root.player = root.player || {};
  root.tagging = root.tagging || {};

  global.VideoTagger = root;
})(typeof window !== 'undefined' ? window : undefined);
