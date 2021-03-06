var request = require('request');
var cheerio = require('cheerio');
var wpi = require('wiring-pi');
var Sound = require('node-aplay');

wpi.setup('gpio');
wpi.pinMode(17, wpi.OUTPUT); // led R
wpi.pinMode(27, wpi.OUTPUT); // led G
wpi.pinMode(22, wpi.OUTPUT); // led B


var rgbColors = {
  red: [1, 0, 0],
  grey: [1, 1, 1],
  blue: [0, 0, 1],
  black: [0, 0, 0]
}


var lastColor, lastBliking;

var hasChanged = function (color, blinking) {
  var changed = false;
  if (lastColor !== color || lastBliking !== blinking) {
    changed = true;
  }
  lastColor = color;
  lastBliking = blinking;
  return changed;
}

var sounds = {
  red: 'sounds/red.wav',
  grey: 'sounds/grey.wav',
  blue: 'sounds/blue.wav',
  blinking: 'sounds/blinking.wav'
};

var ledInterval;


var setSound = function (color, isRunning) {
  if (isRunning) {
    color = 'blinking';
  }
  console.log('setSound: ' + sounds[color]);
  new Sound(sounds[color]).play();
}

var setLedStatus = function (color, blinking) {
  console.log('led: ' + color);
  clearInterval(ledInterval);

  var currentColor = color;
  setLedColor(currentColor);

  if (blinking) {
    ledInterval = setInterval(function () {
      if (currentColor === 'black') {
        currentColor = color;
      } else {
        currentColor = 'black';
      }
      setLedColor(currentColor);
    }, 500);
  }

}


var setLedColor = function (color) {
  var rgbColor = rgbColors[color];
  wpi.digitalWrite(17, rgbColor[0]);
  wpi.digitalWrite(27, rgbColor[1]);
  wpi.digitalWrite(22, rgbColor[2]);
};


var refreshTime = 15000;
var refreshTimeWhenRunning = 5000;

var scrapJenking = function () {
  var url = 'http://jenkins.pub.dtvc.local/view/www_ccma_cat/job/www_ccma_cat-webapp-functionalTest-moduls-validate-parametrized/';
  request(url, function (error, response, html) {
    var colorStatus = 'blue';
    var isRunning = false;
    if (!error) {
      var $ = cheerio.load(html);
      var img = $('#buildHistory .build-row')[0];
      var imgSrc = $(img).find('img').attr('src');

      isRunning = (imgSrc.indexOf('anime.gif') !== -1);

      if (imgSrc.indexOf('/red') !== -1) {
        colorStatus = 'red';
      } else if (imgSrc.indexOf('/grey') !== -1) {
        colorStatus = 'grey';
      } else if (imgSrc.indexOf('/blue') !== -1) {
        colorStatus = 'blue';
      }
    }

    if (hasChanged(colorStatus, isRunning)) {
      setLedStatus(colorStatus, isRunning);
      setSound(colorStatus, isRunning);
    }
    //LED!!!!

    setTimeout(function () {
      scrapJenking();
    }, (isRunning) ? refreshTimeWhenRunning : refreshTime);

  })
};


scrapJenking();

process.on('exit', function (code) {
  setLedStatus('grey', false);
  setSound('black', false);
});