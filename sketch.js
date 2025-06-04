let myWebcam;
let myHandTracker;
let hands = [];
let trackerOptions = { maxHands: 1, flipHorizontal: true }; // Можно задать больше рук
let webcamAlpha = 255;
const phrases = [
  "You can feel it, It waits, curled in the curve of your hand, between the sinew of gesture and the spasm of memory, where history decays into syntax.",
  "It waits, curled in the curve of your hand, between the sinew of gesture and the spasm of memory, where history decays into syntax.",
  "Let it linger — a weightless object with the heaviness of meaning it has not yet assumed. It is a possibility, not a fact.",
  "So how long? As long as the hush before the first note. As long as the glint in the eye before the tear.",
  "Hold it too tightly, and ink melts into skin. Let it go too soon, and it is only wind. A word — a firefly before the dawn, glowing, vanishing, glowing again.",
  "But sooner or later the current of meaning pulls, and your fingertips, blessed with longing, must release what never belonged to them entirely.",
  "The word becomes a traveler without maps, wandering the alleys of its own invention, each echo a reminder of a language it once believed in.",
  "It’s not loss, but a kind of becoming — when the thing you held so gently no longer needs your hands, when it falls from you like a petal in wind.",
  "And so, like all possibilities, it is more beautiful than anything real. Don’t say it. Don’t even think it fully."
];

let currentPhraseIndex = 0;
let txtSp;
const spdLimit = 50; // Настроить, было 150

let spiralRingStep = 20;
let letterSpacing = 0;
let spiralSpaceShift = 18; // Смещение расстояния между символами в спирали
let startRadius = 20;// Начальный радиус спирали
let startAngle = 0; // Начальный угол спирали
let borderDistance = -5; // Граница, за которой текст не будет рисоваться
let noiseStartRadius = 0;
let noiseStartRadiusTarget = 300; // Целевой радиус
let startTime;
let midX, midY;
let currentMidX, currentMidY;
let isBlue = false;
let wasBlue = false;

// Новые переменные для управления сменой текста
let isChangingText = false;
let textChangeTimer = 0;
const changeDelay = 0; // Задержка между сменами символов (мс)
const charsPerChange = 500; // Сколько символов менять за один шаг

let isExplodingAgain = false;
let explodeStartTime = 0;

function setup() {
  createCanvas(1024, 768);
  initializeWebcamAndHandTracker();
  pixelDensity(1);
  frameRate(30);
  textFont('Arial', 30); // Размер шрифта

  let initialText = phrases[0]
  txtSp = new SpiralText(width / 2, height / 2, initialText, spiralRingStep, letterSpacing, spiralSpaceShift, startRadius, startAngle, borderDistance);

  currentMidX = width / 2;
  currentMidY = height / 2;
}

function draw() {
  background(255);
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

function updateHandPosition() {
  if (hands.length > 0) {
    for (let i = 0; i < hands.length; i++) {
      let hand = hands[i];
      let thumbTip = hand.keypoints[4];
      let indexTip = hand.keypoints[8];

      if (thumbTip && indexTip) {
        fill(0, 255, 0);
        noStroke();
        ellipse(thumbTip.x, thumbTip.y, 5, 5);
        ellipse(indexTip.x, indexTip.y, 5, 5);
        
        midX = (thumbTip.x + indexTip.x) / 2;
        midY = (thumbTip.y + indexTip.y) / 2;
        let distance = dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);
        
        isBlue = distance < 50;
        fill(isBlue ? 0 : 255, 0, isBlue ? 255 : 0);
        ellipse(midX, midY, 10, 10);
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

function startTextChange() {
  currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
  let newText = phrases[currentPhraseIndex]; // Убираем дублирование фразы

  isChangingText = true;
  txtSp.startTextChange(newText);
  textChangeTimer = millis();
  startTime = millis();
}

function changeNextChars() {
  if (txtSp.changeNextChars(charsPerChange)) {
    // Если смена текста завершена
    isChangingText = false;
  }
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
  let constraints = {
    video: {
      width: { ideal: 1024 },
      height: { ideal: 768 },
      facingMode: "user"
    }
  };
  myWebcam = createCapture(VIDEO, constraints, function() {
    console.log("Установленное разрешение:", myWebcam.width, myWebcam.height);
  });
  myWebcam.hide();
  myHandTracker.detectStart(myWebcam, gotHands);
}

function drawWebcamVideo() {
  push();
  if (trackerOptions.flipHorizontal) {
    translate(myWebcam.width, 0);
    scale(-1, 1);
  }
  tint(255, 255, 255, webcamAlpha);
  image(myWebcam, 0, 0, myWebcam.width, myWebcam.height);
  pop();
}

function preload() {
  myHandTracker = ml5.handPose(trackerOptions);
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
    
    // Рассчитываем угол и расстояние для спирали
    let angle = (i / txtSp.particles.length) * TWO_PI * 5;
    let spiralForce = 0.1 * (i % 10 + 1);
    
    // Комбинируем радиальное и тангенциальное ускорение
    let radial = p5.Vector.random2D().mult(random(1, 4));
    let tangent = p5.Vector.fromAngle(angle + HALF_PI)
                   .mult(spiralForce * random(1, 3));
    
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
    // Удаляем частицы для символов, которые больше не нужны
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

    // Обрезаем массив если новый текст короче
    if (this.currentChangeIndex >= this.targetText.length) {
      newTextArr = newTextArr.slice(0, this.targetText.length);
      // Удаляем оставшиеся частицы
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
    this.spd = createVector(random(-0.01, 0.01), random(-0.01, 0.01)); // Случайная начальная скорость
    this.acc = createVector();
    this.letter = letter;
    this.targetLetter = letter;
    this.turnFactor = random(20, 30); // Коэффициент "плавности" поворота
    this.targetPos = pos.copy();
    this.size = 30;
    this.targetSize = 30;
  }

  setLetter(newLetter) {
    this.targetLetter = newLetter;
    this.letter = newLetter; // Меняем символ сразу
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
