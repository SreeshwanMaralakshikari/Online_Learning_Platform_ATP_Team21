export function getVideoEmbed(url) {
  if (!url) return null;

  const trimmedUrl = url.trim();

  try {
    const parsed = new URL(trimmedUrl);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      if (isValidYouTubeId(videoId)) return youtubeEmbed(videoId);
    }

    if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
      const videoId = parsed.searchParams.get("v");
      const shortsId = parsed.pathname.startsWith("/shorts/")
        ? parsed.pathname.split("/").filter(Boolean)[1]
        : "";
      const embedId = parsed.pathname.startsWith("/embed/")
        ? parsed.pathname.split("/").filter(Boolean)[1]
        : "";
      const id = videoId || shortsId || embedId;
      if (isValidYouTubeId(id)) return youtubeEmbed(id);
    }

    if (host === "drive.google.com") {
      const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      if (match?.[1]) return { type: "iframe", src: `https://drive.google.com/file/d/${match[1]}/preview` };
    }

    if (host === "vimeo.com") {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      if (videoId) return { type: "iframe", src: `https://player.vimeo.com/video/${videoId}` };
    }
  } catch {
    return { type: "video", src: trimmedUrl };
  }

  return { type: "video", src: trimmedUrl };
}

function youtubeEmbed(videoId) {
  return {
    type: "iframe",
    src: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
  };
}

function isValidYouTubeId(videoId) {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId || "");
}
