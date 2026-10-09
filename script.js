/**
 * DK & ALYSSA MARLOWE — CINEMATIC 30FPS SCROLL ENGINE & INTERACTION LOGIC
 * Features:
 * 1. 30 FPS Canvas Frame Scrubbing with LERP Damping
 * 2. Stable Corner Box with Zero Jitter, Realtime Telemetry & Stream Controls
 * 3. Recreated Editorial Portfolio Navigation & Interactions
 * 4. Ambient Web Audio Synthesizer
 * 5. Interactive Kinetic Particle Field
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     1. CONSTANTS & STATE CONFIGURATION
     ========================================================================== */
  const TOTAL_FRAMES = 240;
  const FPS = 30;
  const FRAME_DIR = 'frames_webp/';
  const FRAME_PREFIX = 'frame_';
  const FRAME_EXT = '.webp';
  
  const frameImages = new Array(TOTAL_FRAMES);
  let loadedFramesCount = 0;
  let isReady = false;

  // Animation & Scrub State
  let targetProgress = 0;
  let currentProgress = 0;
  let lastDrawnFrame = -1;
  let isAutoPlaying = false;
  let autoPlayDirection = 1;

  // DOM Elements - Hero & Canvas
  const heroTrack = document.getElementById('hero-track');
  const heroStage = document.getElementById('hero-stage');
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  // Preloader
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-progress-bar');
  const preloaderPercentage = document.getElementById('preloader-percentage');
  const preloaderCount = document.getElementById('preloader-count');

  // Top HUD Telemetry
  const hudTimecode = document.getElementById('hud-timecode');
  const hudFrameStatus = document.getElementById('hud-frame-status');
  const scrollProgressFill = document.getElementById('scroll-progress-fill');
  const scrollPercentage = document.getElementById('scroll-percentage');

  // STABLE CORNER BOX ELEMENTS (Firmly anchored, zero layout shifts)
  const cornerPlayBtn = document.getElementById('corner-play-btn');
  const cornerPlayText = document.getElementById('corner-play-text');
  const cornerTimecode = document.getElementById('corner-timecode');
  const cornerFrame = document.getElementById('corner-frame');
  const cornerMiniFill = document.getElementById('corner-mini-fill');
  const cornerAudioBtn = document.getElementById('corner-audio-btn');
  const cornerAudioState = document.getElementById('corner-audio-state');



  /* ==========================================================================
     2. RETINA CANVAS SIZING & COVER ALGORITHM
     ========================================================================== */
  let canvasWidth = 0;
  let canvasHeight = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeCanvas() {
    if (!canvas || !heroStage) return;
    const rect = heroStage.getBoundingClientRect();
    canvasWidth = rect.width;
    canvasHeight = rect.height;

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    if (lastDrawnFrame >= 0 && frameImages[lastDrawnFrame]) {
      drawFrame(lastDrawnFrame);
    }
  }

  window.addEventListener('resize', resizeCanvas);

  function drawCoverImage(img) {
    if (!img || !img.complete) return;
    const imgW = img.naturalWidth || 1280;
    const imgH = img.naturalHeight || 720;

    const canvasRatio = canvasWidth / canvasHeight;
    const imgRatio = imgW / imgH;

    let renderW, renderH, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      renderW = canvasWidth;
      renderH = canvasWidth / imgRatio;
      offsetX = 0;
      offsetY = (canvasHeight - renderH) / 2;
    } else {
      renderH = canvasHeight;
      renderW = canvasHeight * imgRatio;
      offsetX = (canvasWidth - renderW) / 2;
      offsetY = 0;
    }

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
  }

  function drawFrame(index) {
    const img = frameImages[index];
    if (img && img.complete) {
      drawCoverImage(img);
      lastDrawnFrame = index;
    } else {
      // Zero flicker nearest loaded frame fallback
      for (let offset = 1; offset < 25; offset++) {
        const prev = frameImages[index - offset];
        if (prev && prev.complete) {
          drawCoverImage(prev);
          break;
        }
        const next = frameImages[index + offset];
        if (next && next.complete) {
          drawCoverImage(next);
          break;
        }
      }
    }
  }

  /* ==========================================================================
     3. ASSET PRELOADER (HIGH PERFORMANCE STREAMING)
     ========================================================================== */
  function getFrameUrl(index) {
    const padded = String(index + 1).padStart(4, '0');
    return `${FRAME_DIR}${FRAME_PREFIX}${padded}${FRAME_EXT}`;
  }

  function preloadAssets() {
    resizeCanvas();

    // Priority load frame 0
    const firstImg = new Image();
    firstImg.src = getFrameUrl(0);
    firstImg.onload = () => {
      frameImages[0] = firstImg;
      loadedFramesCount++;
      drawFrame(0);
      loadRemainingFrames();
    };
    firstImg.onerror = () => {
      loadRemainingFrames();
    };
  }

  function loadRemainingFrames() {
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      if (frameImages[i]) continue;
      const img = new Image();
      img.src = getFrameUrl(i);
      img.onload = () => {
        frameImages[i] = img;
        loadedFramesCount++;
        updatePreloaderProgress(loadedFramesCount);
      };
      img.onerror = () => {
        updatePreloaderProgress(loadedFramesCount);
      };
    }
  }

  function updatePreloaderProgress(count) {
    const percent = Math.min(Math.round((count / TOTAL_FRAMES) * 100), 100);
    if (preloaderBar) preloaderBar.style.width = `${percent}%`;
    if (preloaderPercentage) preloaderPercentage.textContent = `${percent}%`;
    if (preloaderCount) preloaderCount.textContent = `${count} / ${TOTAL_FRAMES} FRAMES`;

    // Unlock screen as soon as buffer is ready (30 frames) or 100%
    if ((count >= 30 || count >= TOTAL_FRAMES) && !isReady) {
      isReady = true;
      document.body.classList.remove('is-loading');
      setTimeout(() => {
        if (preloader) preloader.classList.add('fade-out');
      }, 350);
    }
  }

  preloadAssets();

  /* ==========================================================================
     4. TIMECODE & REALTIME TELEMETRY FORMATTING
     ========================================================================== */
  function formatTimecode(frameIndex) {
    const totalSeconds = frameIndex / FPS;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const subFrames = Math.floor(frameIndex % FPS);

    const pad = (n) => String(n).padStart(2, '0');
    return `00:${pad(minutes)}:${pad(seconds)}:${pad(subFrames)}`;
  }

  function updateHUD(frameIndex, progress) {
    const timecodeStr = formatTimecode(frameIndex);
    const paddedIndex = String(frameIndex + 1).padStart(3, '0');

    // Update Top HUD
    if (hudTimecode) hudTimecode.textContent = timecodeStr;
    if (hudFrameStatus) hudFrameStatus.textContent = `FRAME ${paddedIndex} / ${TOTAL_FRAMES} [30 FPS]`;
    if (scrollProgressFill) scrollProgressFill.style.height = `${(progress * 100).toFixed(1)}%`;
    if (scrollPercentage) scrollPercentage.textContent = `${Math.round(progress * 100)}%`;

    // Update STABLE CORNER BOX Telemetry (Always visible & fixed)
    if (cornerTimecode) cornerTimecode.textContent = timecodeStr;
    if (cornerFrame) cornerFrame.textContent = `FR ${paddedIndex} / ${TOTAL_FRAMES}`;
    if (cornerMiniFill) cornerMiniFill.style.width = `${(progress * 100).toFixed(1)}%`;
  }



  /* ==========================================================================
     6. MAIN RENDER LOOP & DAMPED LERP SCROLL SCRUB
     ========================================================================== */
  function calculateScrollProgress() {
    if (!heroTrack) return 0;
    const rect = heroTrack.getBoundingClientRect();
    const scrollableDistance = heroTrack.offsetHeight - window.innerHeight;
    if (scrollableDistance <= 0) return 0;

    const scrolled = -rect.top;
    const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));
    return progress;
  }

  function renderLoop() {
    if (!isAutoPlaying) {
      targetProgress = calculateScrollProgress();
    } else {
      // Auto-play mode sweeps smoothly forward/backward through 30fps frames
      targetProgress += 0.0035 * autoPlayDirection;
      if (targetProgress >= 1) {
        targetProgress = 1;
        autoPlayDirection = -1;
      } else if (targetProgress <= 0) {
        targetProgress = 0;
        autoPlayDirection = 1;
      }
    }

    // Damped smoothing (LERP)
    const lerpFactor = 0.12;
    currentProgress += (targetProgress - currentProgress) * lerpFactor;

    const frameIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(currentProgress * (TOTAL_FRAMES - 1))));

    if (frameIndex !== lastDrawnFrame) {
      drawFrame(frameIndex);
      updateHUD(frameIndex, currentProgress);


      if (typeof updateAudioPitch === 'function') {
        updateAudioPitch(currentProgress);
      }
    }

    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);

  /* Auto Play Toggle in Stable Corner Box */
  if (cornerPlayBtn) {
    cornerPlayBtn.addEventListener('click', () => {
      isAutoPlaying = !isAutoPlaying;
      if (isAutoPlaying) {
        cornerPlayBtn.classList.add('is-playing');
        if (cornerPlayText) cornerPlayText.textContent = 'PAUSE';
      } else {
        cornerPlayBtn.classList.remove('is-playing');
        if (cornerPlayText) cornerPlayText.textContent = 'AUTO-PLAY';
      }
    });
  }

  /* ==========================================================================
     7. SITE HEADER & ACTIVE SECTION HIGHLIGHTING
     ========================================================================== */
  const siteHeader = document.getElementById('site-header');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      siteHeader.classList.add('scrolled');
    } else {
      siteHeader.classList.remove('scrolled');
    }

    let currentSection = 'hero';
    sections.forEach(sec => {
      const top = sec.offsetTop - 220;
      if (window.scrollY >= top) {
        currentSection = sec.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      if (link.getAttribute('data-nav') === currentSection) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }, { passive: true });

  /* ==========================================================================
     8. CUSTOM CURSOR & MAGNETIC HOVER
     ========================================================================== */
  const customCursor = document.getElementById('custom-cursor');
  const cursorFollower = document.getElementById('cursor-follower');

  if (customCursor && cursorFollower) {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let followerX = mouseX;
    let followerY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      customCursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    }, { passive: true });

    function cursorLoop() {
      followerX += (mouseX - followerX) * 0.16;
      followerY += (mouseY - followerY) * 0.16;
      cursorFollower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(cursorLoop);
    }
    requestAnimationFrame(cursorLoop);

    const hoverables = document.querySelectorAll('a, button, input, textarea, select, .showcase-card, .portrait-card, .stable-corner-box, .service-row, .process-row');
    hoverables.forEach(elem => {
      elem.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      elem.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
  }

  /* ==========================================================================
     9. AMBIENT AUDIO SYNTHESIZER (WEB AUDIO API)
     ========================================================================== */
  let audioCtx = null;
  let isSoundActive = false;
  let masterGain = null;
  let synthOscs = [];
  let filterNode = null;

  function initAmbientAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);

      filterNode = audioCtx.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(450, audioCtx.currentTime);

      masterGain.connect(filterNode);
      filterNode.connect(audioCtx.destination);

      // Pentatonic warm ambient drone chord (D, A, E, F#)
      const freqs = [146.83, 220.00, 329.63, 369.99];
      freqs.forEach(freq => {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        oscGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start();
        synthOscs.push(osc);
      });
    } catch (e) {
      console.warn('Web Audio not supported:', e);
    }
  }

  function toggleAudio() {
    if (!audioCtx) {
      initAmbientAudio();
    }
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    isSoundActive = !isSoundActive;
    if (isSoundActive) {
      masterGain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 1.2);
      if (cornerAudioBtn) cornerAudioBtn.classList.add('is-playing');
      if (cornerAudioState) cornerAudioState.textContent = 'SOUND: ON';
    } else {
      masterGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      if (cornerAudioBtn) cornerAudioBtn.classList.remove('is-playing');
      if (cornerAudioState) cornerAudioState.textContent = 'MUTE';
    }
  }

  window.updateAudioPitch = function(progress) {
    if (!isSoundActive || !filterNode || !audioCtx) return;
    const targetFreq = 350 + progress * 600;
    filterNode.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1);
  };

  if (cornerAudioBtn) {
    cornerAudioBtn.addEventListener('click', toggleAudio);
  }

  /* ==========================================================================
     10. INTERACTIVE KINETIC ENERGY PLAYGROUND CANVAS
     ========================================================================== */
  const playCanvas = document.getElementById('playground-canvas');
  if (playCanvas) {
    const playCtx = playCanvas.getContext('2d');
    let pWidth = 0;
    let pHeight = 0;
    const particles = [];
    const NUM_PARTICLES = 65;
    let mousePlay = { x: -1000, y: -1000, radius: 120 };

    function resizePlayground() {
      const rect = playCanvas.parentElement.getBoundingClientRect();
      pWidth = rect.width;
      pHeight = rect.height;
      playCanvas.width = pWidth * dpr;
      playCanvas.height = pHeight * dpr;
      playCtx.scale(dpr, dpr);
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < NUM_PARTICLES; i++) {
        particles.push({
          x: Math.random() * pWidth,
          y: Math.random() * pHeight,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          size: Math.random() * 2.5 + 1.5,
          baseColor: i % 2 === 0 ? '#ff9d42' : '#38bdf8'
        });
      }
    }

    resizePlayground();
    initParticles();
    window.addEventListener('resize', () => {
      resizePlayground();
      initParticles();
    });

    playCanvas.addEventListener('mousemove', (e) => {
      const rect = playCanvas.getBoundingClientRect();
      mousePlay.x = e.clientX - rect.left;
      mousePlay.y = e.clientY - rect.top;
    });

    playCanvas.addEventListener('mouseleave', () => {
      mousePlay.x = -1000;
      mousePlay.y = -1000;
    });

    const resetBtn = document.getElementById('reset-particles-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', initParticles);
    }

    function animatePlayground() {
      playCtx.clearRect(0, 0, pWidth, pHeight);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > pWidth) p.vx *= -1;
        if (p.y < 0 || p.y > pHeight) p.vy *= -1;

        const dx = mousePlay.x - p.x;
        const dy = mousePlay.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mousePlay.radius) {
          const force = (mousePlay.radius - dist) / mousePlay.radius;
          p.x -= (dx / dist) * force * 5;
          p.y -= (dy / dist) * force * 5;
        }

        playCtx.beginPath();
        playCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        playCtx.fillStyle = p.baseColor;
        playCtx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const cdx = p.x - p2.x;
          const cdy = p.y - p2.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cdist < 95) {
            playCtx.beginPath();
            playCtx.moveTo(p.x, p.y);
            playCtx.lineTo(p2.x, p2.y);
            playCtx.strokeStyle = `rgba(255, 157, 66, ${1 - cdist / 95 * 0.75})`;
            playCtx.lineWidth = 0.8;
            playCtx.stroke();
          }
        }
      }

      requestAnimationFrame(animatePlayground);
    }

    requestAnimationFrame(animatePlayground);
  }

  /* ==========================================================================
     11. REALTIME CLOCK & CONTACT FORM INTERACTIONS
     ========================================================================== */
  const liveClock = document.getElementById('live-clock');
  function updateClock() {
    if (!liveClock) return;
    const now = new Date();
    const options = {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    liveClock.textContent = `${now.toLocaleTimeString('en-GB', options)} IST`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Copy Email Button
  const copyEmailBtn = document.getElementById('copy-email-btn');
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
      const email = 'hello@alyssamarlowe.com';
      navigator.clipboard.writeText(email).then(() => {
        const span = copyEmailBtn.querySelector('span');
        const orig = span.textContent;
        span.textContent = '✓ Copied to Clipboard!';
        setTimeout(() => { span.textContent = orig; }, 2200);
      });
    });
  }

  // Contact Form Submission
  const contactForm = document.getElementById('contact-form');
  const formFeedback = document.getElementById('form-feedback');
  if (contactForm && formFeedback) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submit-btn');
      submitBtn.disabled = true;
      submitBtn.querySelector('span').textContent = 'Transmitting...';

      setTimeout(() => {
        formFeedback.textContent = '✓ Message transmitted! We will reply within 24 hours.';
        formFeedback.className = 'form-feedback success';
        contactForm.reset();
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = 'Transmit Message';

        setTimeout(() => {
          formFeedback.textContent = '';
        }, 6000);
      }, 900);
    });
  }

});
