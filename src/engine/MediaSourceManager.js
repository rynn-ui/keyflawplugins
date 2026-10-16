/**
 * Media Source Manager for Keyflaw Web Studio
 * Pure user-driven media playback engine: images and videos.
 * Handles local user files (Blob URLs) cleanly without crossOrigin taint.
 */

export const MEDIA_TYPES = {
  CUSTOM_UPLOAD: 'custom_upload'
};

export class MediaSourceManager {
  constructor(onFrameReady) {
    this.onFrameReady = onFrameReady;
    this.activeType = null;
    this.image = null;
    this.video = null;
    this.videoUrl = null;
    this.imageUrl = null;
    this.mediaName = '';
    this.mediaMime = '';
    this.isPlaying = true;
    this.isLooping = false;
    this.currentTime = 0;
    this.duration = 10;
    this.width = 1024;
    this.height = 1024;
  }

  hasMedia() {
    if (this.image && (this.image.naturalWidth > 0 || this.image.complete)) return true;
    if (this.video && (this.video.videoWidth > 0 || this.video.readyState >= 1)) return true;
    return false;
  }

  async loadMediaFile(file) {
    this.stopPlayback();
    this.clearPreviousMedia();

    this.mediaName = file.name || 'imported_media';
    this.mediaMime = file.type || '';
    this.activeType = MEDIA_TYPES.CUSTOM_UPLOAD;

    const isVideo = file.type?.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg|ogv)$/i.test(file.name);

    if (isVideo) {
      await this.loadVideoFile(file);
    } else {
      await this.loadImageFile(file);
    }
  }

  clearPreviousMedia() {
    if (this.imageUrl) {
      URL.revokeObjectURL(this.imageUrl);
      this.imageUrl = null;
    }
    if (this.videoUrl) {
      URL.revokeObjectURL(this.videoUrl);
      this.videoUrl = null;
    }
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
      this.video = null;
    }
    this.image = null;
    this.activeType = null;
    this.mediaName = '';
  }

  loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      this.imageUrl = url;
      const img = new Image();
      // DO NOT set crossOrigin on local blob URLs (causes browser security exceptions)
      img.onload = () => {
        this.image = img;
        this.video = null;
        this.width = img.naturalWidth || 1024;
        this.height = img.naturalHeight || 1024;
        this.duration = 10;
        this.currentTime = 0;
        resolve();
      };
      img.onerror = (e) => {
        // Fallback: try reading as DataURL if blob URL failed
        const reader = new FileReader();
        reader.onload = () => {
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            this.image = fallbackImg;
            this.video = null;
            this.width = fallbackImg.naturalWidth || 1024;
            this.height = fallbackImg.naturalHeight || 1024;
            resolve();
          };
          fallbackImg.onerror = () => reject(new Error('Failed to load image file.'));
          fallbackImg.src = reader.result;
        };
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      };
      img.src = url;
    });
  }

  loadVideoFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      this.videoUrl = url;
      const vid = document.createElement('video');
      // Set all attributes to guarantee browser autoplay on local blob URLs
      vid.playsInline = true;
      vid.muted = true;
      vid.defaultMuted = true;
      vid.volume = 0;
      vid.loop = this.isLooping;
      vid.autoplay = true;
      vid.setAttribute('webkit-playsinline', 'true');
      vid.setAttribute('playsinline', 'true');
      vid.setAttribute('muted', '');
      vid.preload = 'auto';

      let resolved = false;

      const updateDimensions = () => {
        if (vid.videoWidth > 0 && vid.videoHeight > 0) {
          this.width = vid.videoWidth;
          this.height = vid.videoHeight;
          this.duration = vid.duration || 10;
          return true;
        }
        return false;
      };

      const finishReady = () => {
        if (resolved) return;
        resolved = true;
        this.video = vid;
        this.image = null;
        updateDimensions();
        this.duration = vid.duration || 10;
        vid.play().catch(() => {});
        this.isPlaying = true;
        resolve();
      };

      vid.onloadedmetadata = () => {
        updateDimensions();
        finishReady();
      };

      vid.onloadeddata = () => {
        updateDimensions();
        finishReady();
      };

      vid.oncanplay = () => {
        updateDimensions();
        finishReady();
      };

      vid.ontimeupdate = () => {
        updateDimensions();
      };

      vid.onerror = (e) => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Failed to load video file. Please check video format.'));
        }
      };

      // Safety fallback to prevent hanging
      setTimeout(() => {
        if (!resolved) {
          updateDimensions();
          finishReady();
        }
      }, 600);

      vid.src = url;
      vid.load();
    });
  }

  stopPlayback() {
    if (this.video) {
      this.video.pause();
    }
    this.isPlaying = false;
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.video) {
      if (this.isPlaying) {
        this.video.play().catch(() => {});
      } else {
        this.video.pause();
      }
    }
    return this.isPlaying;
  }

  seek(time) {
    this.currentTime = Math.max(0, Math.min(time, this.duration));
    if (this.video) {
      this.video.currentTime = this.currentTime;
    }
  }

  getTextureElement() {
    if (this.video) {
      if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
        this.width = this.video.videoWidth;
        this.height = this.video.videoHeight;
      }
      if (this.video.readyState >= 1) {
        return this.video;
      }
    }
    if (this.image && (this.image.naturalWidth > 0 || this.image.complete)) {
      this.width = this.image.naturalWidth;
      this.height = this.image.naturalHeight;
      return this.image;
    }
    return null;
  }
}
