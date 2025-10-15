let myWebcam;
let myHandTracker;
let hands = [];
let trackerOptions = { maxHands: 1, flipHorizontal: true };
let webcamAlpha = 255;

let currentPhraseIndex = 0;
let txtSp;
const spdLimit = 70; // Настроить

let spiralRingStep = 20;
let letterSpacing = 0;
let spiralSpaceShift = 18;
let startRadius = 20;
let startAngle = 0;
let borderDistance = -10;
let noiseStartRadius = 0;
let noiseStartRadiusTarget = 300;
let startTime;
let midX, midY;
let currentMidX, currentMidY;
let isBlue = false;
let wasBlue = false;

let isChangingText = false;
let textChangeTimer = 0;
const changeDelay = 0;
const charsPerChange = 500;

let isExplodingAgain = false;
let explodeStartTime = 0;

let phrases = [];
let fallbackPhrases = [
  "Attention is the slow art of becoming porous, letting the world's small details pass through without resistance.",
  "You realize, at last, that attention is not a tool but a tenderness, a way of being touched back by what you thought you were only looking at.",
  "True focus is a form of love, an offering of your own light so that the ordinary might finally see itself.",
  "Focus is not about holding tighter, but about being still enough for the word to rest upon you.",
  "Perhaps to hold a word at your fingertips is not to control it, but to let it tremble there, between motion and stillness, between knowing and unknowing.",
  "Each syllable carries its own gravity, and you hover above it, trying not to fall entirely in.",
  "So what dissolves here is the duality between subject and object, speaker and spoken, the perceiver and the perceived.",
  "To focus is to be suspended between two silences: the one before the thought, and the one after it leaves you.",
  "Attention is the gentlest form of alchemy.",
  "The space between attention and its object is not empty, but strung with the invisible harp-strings of relation, and to focus is to hear them hum.",
  "Words are nervous creatures — they shy away from the weight of touch, and you can cradle them only for a moment before they turn back into air.",
  "There is a kind of grace in that — in knowing that nothing truly belongs to you, not even the language you speak.",
  "It is the point where perception turns into participation, and the fingertip, once a border, becomes a threshold.",
  "Perhaps holding a word is not the task at all, perhaps the grace is in letting it hover, weightless, until it chooses to land again.",
  "The world writes itself through you — you only think you are the one tracing the line.",
  "To focus is to build a small shelter in time, a place where thought can breathe.",
  "To truly see a thing is to un-name it.",
  "Sometimes you hold a single word so long it begins to lose meaning — light, breath, distance — until it becomes a sound, a vibration, a hum.",
  "A word arrives not to be kept but to pass through you.",
  "Time gathers in the curve of a letter.",
  "Sometimes you let it go, and feel the afterglow linger — the faintest tingle where language once was.",
  "How long can you hold a meaning?",
  "Each word carries the weight of what it leaves unsaid.",
  "You hold it too long, and it softens, melts, leaving a sense of thought on your fingertips.",
  "To hold a word is to touch breath made visible, warm and fragile, already turning to air.",
  "A word is a small eternity trying on the shape of sound, and the moment you name it, it begins to decay.",
  "To hold a thought still is to invite its reflection, and reflection always bends the light a little differently.",
  "Holding language is like trying to weigh light — every definition scatters what it sought to measure.",
  "The letters soften and lean toward your hand, as if to thank it for believing in their fragile gravity.",
  "Feel the word warming the air between your fingers."
];

// Загрузка

let modelLoaded = false;
let phrasesGenerated = false;
let webcamLoaded = false;
let loadingMessage = "Loading...";

let isGeneratingPhrases = false;

// Генерация Mistral API

async function generatePoeticPhrases() {
  if (isGeneratingPhrases) return;
  isGeneratingPhrases = true;

  const apiKey = "3pqdV38WnPZ75Qo0aqhIKdDH4bpsSNV3";
  const apiUrl = "https://api.mistral.ai/v1/chat/completions";
  const promptText = "Prose yet lyrical short reflection in English, meditative metaphorical fragment on focus, perception and language inspired by the question 'How long can you hold a word at your fingertips?'. Use second-person narration and long sentences. No explanations.";

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json"
    },
    body: JSON.stringify({
      model: "open-mistral-nemo",
      messages: [{ role: "user", content: promptText }],
			max_tokens: 300,
      temperature: 0.6
    })
  };

  const controller = new AbortController(); // Таймаут с AbortController
  const timeoutMs = 5000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  requestOptions.signal = controller.signal;

  try {
    const response = await fetch(apiUrl, requestOptions);
    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      console.warn("API response not ok, using fallback.");
      addFallbackPhrases();
      return;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";

    let isInvalid = false;
    if (text.length < 50) { // Длина текста
      isInvalid = true;
    } else if (/\d+\./.test(text)) {
      isInvalid = true;
    } else if (/[*+\/=@\[\]\\^_`{|}~<>#%&\n]/.test(text)) { // Странное форматирование
      isInvalid = true;
    }

    if (isInvalid) {
      console.warn("API response invalid, using fallback.");
      addFallbackPhrases();
      return;
    }

    const sentences = text
      .replace(/\n+/g, ' ') // Абзацы
	  .match(/.*?[.!?](?=\s*[A-Z]|$)/g) || [] // Предложения

	const validSentences = sentences
	  .map(sentence => sentence.trim())
	  .filter(sentence => sentence.length > 10 && sentence.length <= 200);

    if (validSentences.length > 0) {
      phrases.push(...validSentences);
      phrasesGenerated = true;
      console.log("AI phrases loaded.");
    } else {
      console.warn("API returned no valid phrases, using fallback.");
      addFallbackPhrases();
    }
  } catch (err) {
		clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn("Fetch aborted by timeout, using fallback.");
    } else {
      console.error("Fetch error:", err);
    }
    addFallbackPhrases();
  } finally {
    isGeneratingPhrases = false;
  }
}

function addFallbackPhrases() {
  console.log("Using fallback phrases.");
  phrases.push(...fallbackPhrases);
  phrasesGenerated = true;
}

// Запуск

function preload() {
  generatePoeticPhrases(); // Генерация фраз

  myHandTracker = ml5.handPose(trackerOptions, () => {
    modelLoaded = true;
    console.log("HandPose model loaded");
    initializeWebcamAndHandTracker();
  });
  setTimeout(() => {
    if (!modelLoaded) {
      console.warn("HandPose model failed to load");
      loadingMessage = "Loading failed, please refresh.";
    }
  }, 30000); // Таймаут
}

function drawLoadingScreen() {
  background(255);
  textAlign(CENTER, CENTER);
  fill(0);
  textSize(30);
  text(loadingMessage, width / 2, height / 2);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Arial');
  frameRate(30);

  // Начальный экран загрузки
  drawLoadingScreen();

  currentMidX = width / 2;
  currentMidY = height / 2;
}

function draw() {
    background(255);
  if (!modelLoaded || !phrasesGenerated || !webcamLoaded) {
    drawLoadingScreen();
    return;
  }

  if (!txtSp) {
    let initialText = getNextPhrase();
    txtSp = new SpiralText(width / 2, height / 2, initialText, spiralRingStep, letterSpacing, spiralSpaceShift, startRadius, startAngle, borderDistance);
  }

  drawWebcamVideo();

  isBlue = false;
  midX = width / 2;
  midY = height / 2;

  updateHandPosition();
  checkPinchState();

  if (isChangingText) {
    if (millis() - textChangeTimer > changeDelay) {
      changeNextChars();
      textChangeTimer = millis();
    }
  }

  currentMidX = lerp(currentMidX, midX, 0.5);
  currentMidY = lerp(currentMidY, midY, 0.5);

  updateNoiseRadius();

  txtSp.setXY(currentMidX, currentMidY);
  txtSp.draw();
}

// Повторное наполнение массива

function getNextPhrase() {
  if (phrases.length < 2 && !isGeneratingPhrases) { // Когда осталась одна фраза
		console.log("Refilling phrases...");
    generatePoeticPhrases();
  }

  if (phrases.length === 0) addFallbackPhrases(); // До этого не должно дойти

  const next = phrases.splice(floor(random(phrases.length)), 1)[0];
  return next;
}

function startTextChange() {
  let newText = getNextPhrase();
  isChangingText = true;
  txtSp.startTextChange(newText);
  textChangeTimer = millis();
  startTime = millis();
}

function changeNextChars() {
  if (txtSp.changeNextChars(charsPerChange)) {
    isChangingText = false;
  }
}

// Без изменений

function updateHandPosition() {
  if (hands.length > 0) {
    let ratio = myWebcam.width && myWebcam.height ? max(width / myWebcam.width, height / myWebcam.height) : 1;
    let xOffset = (width - myWebcam.width * ratio) / 2;
    let yOffset = (height - myWebcam.height * ratio) / 2;

    for (let hand of hands) {
      let thumbTip = hand.keypoints[4];
      let indexTip = hand.keypoints[8];

      if (thumbTip && indexTip) {
        let tx = thumbTip.x * ratio + xOffset;
        let ty = thumbTip.y * ratio + yOffset;
        let ix = indexTip.x * ratio + xOffset;
        let iy = indexTip.y * ratio + yOffset;

        fill(0, 255, 0);
        noStroke();
        ellipse(tx, ty, 8, 8);
        ellipse(ix, iy, 8, 8);

        midX = (tx + ix) / 2;
        midY = (ty + iy) / 2;

        let distance = dist(tx, ty, ix, iy);
        isBlue = distance < 80;

        fill(isBlue ? color(0, 0, 255) : color(255, 0, 0));
        ellipse(midX, midY, 12, 12);
      }
    }
  }
}

function checkPinchState() {
  if (!isBlue && wasBlue && txtSp.allSymbolsInside && !isChangingText && !isExplodingAgain) {
    startExplosionFromCenter();
  }
  wasBlue = isBlue;
}

function updateNoiseRadius() {
  if (isBlue) {
    if (!startTime) startTime = millis();
    let elapsedTime = millis() - startTime;
    let progress = constrain(elapsedTime / 20000, 0, 1);
    noiseStartRadius = lerp(0, noiseStartRadiusTarget, progress);
  } else {
    noiseStartRadius = 0;
    startTime = null;
  }
}

function initializeWebcamAndHandTracker() {
  navigator.mediaDevices.getUserMedia({ video: true }).then(() => {
    myWebcam = createCapture(VIDEO);
    myWebcam.hide();
    myHandTracker.detectStart(myWebcam, gotHands);
    webcamLoaded = true;
  }).catch(err => {
    console.error("Camera access failed:", err);
    loadingMessage = "Please allow camera access and refresh the page.";
  });
}

function drawWebcamVideo() {
  if (!webcamLoaded) return;
  push();
  if (trackerOptions.flipHorizontal) {
    translate(width, 0);
    scale(-1, 1);
  }
  let ratio = myWebcam.width && myWebcam.height ? max(width / myWebcam.width, height / myWebcam.height) : 1;
  tint(255, 255, 255, webcamAlpha);
  image(
    myWebcam,
    (width - myWebcam.width * ratio) / 2,
    (height - myWebcam.height * ratio) / 2,
    myWebcam.width * ratio,
    myWebcam.height * ratio
  );
  pop();
}

function gotHands(results) {
  hands = results;
}

function startExplosionFromCenter() {
  isExplodingAgain = true;
  explodeStartTime = millis();

  for (let i in txtSp.particles) {
    let p = txtSp.particles[i];
    p.pos = createVector(txtSp.xPos, txtSp.yPos);
    let angle = (i / txtSp.particles.length) * TWO_PI * 5;
    let spiralForce = 0.1 * (i % 10 + 1);
    let radial = p5.Vector.random2D().mult(random(1, 4));
    let tangent = p5.Vector.fromAngle(angle + HALF_PI).mult(spiralForce * random(1, 3));
    p.spd = radial.add(tangent);
  }

  setTimeout(() => {
    startTextChange();
    isExplodingAgain = false;
  }, 0);
}

class SpiralText {
  constructor(x, y, text, spiralRingStep, letterSpacing, spiralSpaceShift, startRadius, startAngle, borderDistance) {
    this.xPos = x;
    this.yPos = y;
    this.spiralText = text;
    this.spiralRingStep = spiralRingStep;
    this.letterSpacing = letterSpacing;
    this.spiralSpaceShift = spiralSpaceShift;
    this.startRadius = startRadius;
    this.startAngle = startAngle;
    this.borderDistance = borderDistance;
    this.particles = {};
    this.attractor = null;
    this.targetText = text;
    this.currentChangeIndex = 0;
    this.allSymbolsInside = false;
  }

  setXY(x, y) {
    this.xPos = x;
    this.yPos = y;
  }

  startTextChange(newText) {
    for (let i = newText.length; i < this.spiralText.length; i++) {
      delete this.particles[i];
    }
    this.targetText = newText;
    this.currentChangeIndex = 0;
  }

  changeNextChars(count) {
    let changed = 0;
    let newTextArr = this.spiralText.split('');
    let targetTextArr = this.targetText.split('');

    while (changed < count && this.currentChangeIndex < this.targetText.length) {
      let targetChar = targetTextArr[this.currentChangeIndex];
      
      if (this.currentChangeIndex >= newTextArr.length) {
        newTextArr.push(targetChar);
        if (!this.particles[this.currentChangeIndex]) {
          let pos = createVector(this.xPos, this.yPos);
          let newParticle = new Particle(targetChar, pos);
          newParticle.spd = p5.Vector.random2D().mult(random(2, 4));
          this.particles[this.currentChangeIndex] = newParticle;
        }
      } else {
        if (newTextArr[this.currentChangeIndex] !== targetChar) {
          newTextArr[this.currentChangeIndex] = targetChar;
          if (this.particles[this.currentChangeIndex]) {
            this.particles[this.currentChangeIndex].setLetter(targetChar);
          }
        }
      }
      
      this.currentChangeIndex++;
      changed++;
    }

    if (this.currentChangeIndex >= this.targetText.length) {
      newTextArr = newTextArr.slice(0, this.targetText.length);
      Object.keys(this.particles).forEach(key => {
        if (Number(key) >= this.targetText.length) {
          delete this.particles[key];
        }
      });
    }

    this.spiralText = newTextArr.join('');
    return this.currentChangeIndex >= this.targetText.length;
  }

  draw() {
    this.allSymbolsInside = true;
    textAlign(CENTER);
    let iterCharPos = 0;
    let angle = this.startAngle;
    let currRadius = this.startRadius;

    while (iterCharPos < this.spiralText.length) {
      let currSymbol = this.spiralText.charAt(iterCharPos);
      let currSymbolWidth = textWidth(currSymbol);
      let spiralSpaceStep = currSymbolWidth + this.spiralSpaceShift + this.letterSpacing;
      let countOfsymb = TWO_PI * currRadius / spiralSpaceStep;
      let radiusStep = this.spiralRingStep / countOfsymb;
      currRadius += radiusStep;
      angle += (currSymbolWidth / 2 + this.spiralSpaceShift / 2) / currRadius;
      let baseX = cos(angle) * currRadius + this.xPos;
      let baseY = sin(angle) * currRadius + this.yPos;
      
      if (currRadius > noiseStartRadius) {
        this.allSymbolsInside = false;
        
        if (!this.particles[iterCharPos]) {
          this.particles[iterCharPos] = new Particle(currSymbol, createVector(baseX, baseY));
        }
        this.particles[iterCharPos].update(createVector(this.xPos, this.yPos));
        this.particles[iterCharPos].draw();
      } else {
        push();
        translate(baseX, baseY);
        rotate(HALF_PI + angle);
        noStroke();
        fill(0);
        text(currSymbol, 0, 0);
        pop();
      }
      iterCharPos++;
    }
  }
}

class Particle {
  constructor(letter, pos) {
    this.pos = pos.copy();
    this.spd = createVector(random(-0.01, 0.01), random(-0.01, 0.01));
    this.acc = createVector();
    this.letter = letter;
    this.targetLetter = letter;
    this.turnFactor = random(20, 30);
    this.targetPos = pos.copy();
    this.size = 30;
    this.targetSize = 30;
  }

  setLetter(newLetter) {
    this.targetLetter = newLetter;
    this.letter = newLetter;
  }

  update(attractor) {
    this.targetPos = attractor.copy();
    let attraction = p5.Vector.sub(this.targetPos, this.pos);
    this.acc = attraction.copy().normalize().div(this.turnFactor);
    this.spd.add(this.acc);
    this.spd.limit(5);
    this.pos.add(this.spd);
  }

  draw() {
    fill(0);
    noStroke();
    textSize(this.size);
    textAlign(CENTER, CENTER);
    text(this.letter, this.pos.x, this.pos.y);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
