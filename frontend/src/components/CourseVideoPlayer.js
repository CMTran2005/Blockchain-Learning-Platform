import React from 'react';
import { getIpfsVideoUrl } from '../utils/api';

/**
 * Renders course preview video based on provider.
 * - youtube / vimeo: iframe embed
 * - pinata / cloudinary / direct: HTML5 <video>
 */
const CourseVideoPlayer = ({ videoUrl, videoProvider, videoCid, title = 'Course Video', autoplay = false }) => {
  const src = getIpfsVideoUrl(videoUrl, videoCid);
  if (!src) {
    return (
      <div className="video-placeholder">
        <p>Chưa có video cho khóa học này. Xem nội dung bên dưới hoặc thêm video trong Admin.</p>
      </div>
    );
  }

  const isEmbed =
    videoProvider === 'youtube' ||
    videoProvider === 'vimeo' ||
    src.includes('youtube.com') ||
    src.includes('youtu.be') ||
    src.includes('vimeo.com');

  if (isEmbed) {
    const embedSrc = src.includes('?') ? `${src}&autoplay=${autoplay ? 1 : 0}` : `${src}?autoplay=${autoplay ? 1 : 0}`;
    return (
      <iframe
        className="video-player"
        src={embedSrc}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <video
      className="video-player video-player-native"
      src={src}
      controls
      autoPlay={autoplay}
      playsInline
    >
      Your browser does not support HTML5 video.
    </video>
  );
};

export default CourseVideoPlayer;
