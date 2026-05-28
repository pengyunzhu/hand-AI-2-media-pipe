import {Hands} from 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
import {Camera} from 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
import {drawConnectors, drawLandmarks} from 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js';

const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const gestureName = document.getElementById('gestureName');
const gestureAction = document.getElementById('gestureAction');
const startCameraBtn = document.getElementById('startCameraBtn');
const demoAudio = document.getElementById('demoAudio');

let camera = null;
let lastGesture = '';
let gestureCooldown = false;

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.75,
  minTrackingConfidence: 0.75,
});

hands.onResults(onResults);

startCameraBtn.addEventListener('click', async () => {
  if (camera) {
    return;
  }

  camera = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({image: videoElement});
    },
    width: 1280,
    height: 720,
  });

  try {
    await camera.start();
    startCameraBtn.disabled = true;
    startCameraBtn.textContent = '相機已開啟';
  } catch (error) {
    gestureAction.textContent = '無法開啟相機，請允許相機存取。';
  }
});

function onResults(results) {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (results.image) {
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  }

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

    drawConnectors(canvasCtx, landmarks, Hands.HAND_CONNECTIONS, {
      color: '#7afbff',
      lineWidth: 4,
    });
    drawLandmarks(canvasCtx, landmarks, {color: '#ffffff', lineWidth: 2});

    const gesture = detectGesture(landmarks);
    updateState(gesture);
  } else {
    updateState('none');
  }

  canvasCtx.restore();
}

function getDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function detectGesture(landmarks) {
  const fingerTips = {
    thumb: landmarks[4],
    index: landmarks[8],
    middle: landmarks[12],
    ring: landmarks[16],
    pinky: landmarks[20],
  };

  const fingerPips = {
    thumb: landmarks[3],
    index: landmarks[6],
    middle: landmarks[10],
    ring: landmarks[14],
    pinky: landmarks[18],
  };

  const wrist = landmarks[0];
  const thumbExtended = fingerTips.thumb.y < fingerPips.thumb.y && Math.abs(fingerTips.thumb.x - fingerPips.thumb.x) > 0.08;
  const indexExtended = fingerTips.index.y < fingerPips.index.y;
  const middleExtended = fingerTips.middle.y < fingerPips.middle.y;
  const ringExtended = fingerTips.ring.y < fingerPips.ring.y;
  const pinkyExtended = fingerTips.pinky.y < fingerPips.pinky.y;

  const allExtended = thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended;
  const allFolded = !thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
  const onlyThumb = thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
  const onlyIndex = !thumbExtended && indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
  const onlyTwoFingers = !thumbExtended && indexExtended && middleExtended && !ringExtended && !pinkyExtended;
  const firstThreeFolded = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;

  if (allExtended) {
    return 'open_palm';
  }
  if (onlyThumb || (thumbExtended && firstThreeFolded)) {
    return 'thumbs_up';
  }
  if (allFolded) {
    return 'fist';
  }
  if (onlyTwoFingers) {
    return 'victory';
  }
  if (onlyIndex) {
    return 'point';
  }

  // 以手掌朝上、手指張開和手勢移動方向進行補充判斷
  const isPalmOpen = indexExtended && middleExtended && ringExtended && pinkyExtended && !onlyThumb;
  if (isPalmOpen) {
    return 'open_palm';
  }

  return 'unknown';
}

function updateState(gesture) {
  if (gesture === 'none') {
    gestureName.textContent = '尚未偵測';
    gestureAction.textContent = '請將手放在鏡頭前。';
    lastGesture = '';
    gestureCooldown = false;
    return;
  }

  if (gesture === lastGesture) {
    return;
  }

  if (gestureCooldown) {
    return;
  }

  lastGesture = gesture;
  gestureCooldown = true;
  setTimeout(() => {
    gestureCooldown = false;
  }, 1000);

  switch (gesture) {
    case 'thumbs_up':
      gestureName.textContent = '👍 拇指比讚';
      gestureAction.textContent = '播放音樂';
      demoAudio.play();
      break;
    case 'fist':
      gestureName.textContent = '✊ 握拳';
      gestureAction.textContent = '暫停音樂';
      demoAudio.pause();
      break;
    case 'open_palm':
      gestureName.textContent = '🖐️ 張開手掌';
      gestureAction.textContent = '停止並回到開頭';
      demoAudio.pause();
      demoAudio.currentTime = 0;
      break;
    case 'victory':
      gestureName.textContent = '✌️ 二指勝利手勢';
      gestureAction.textContent = '快轉 5 秒';
      demoAudio.currentTime = Math.min(demoAudio.duration || 0, demoAudio.currentTime + 5);
      break;
    case 'point':
      gestureName.textContent = '👉 伸出食指';
      gestureAction.textContent = '倒退 5 秒';
      demoAudio.currentTime = Math.max(0, demoAudio.currentTime - 5);
      break;
    default:
      gestureName.textContent = '未知手勢';
      gestureAction.textContent = '請嘗試其他手勢。';
      break;
  }
}
