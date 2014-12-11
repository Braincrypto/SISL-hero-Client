var Game = Backbone.View.extend({
  className: 'goals-timeline',

  sceneTemplate: _.template( 
    '<div class="scene">' +
      '<div class="ground">' +
        '<svg width="0" height="0">' +
          '<defs>' +
            '<linearGradient id="goal-timeline-grad" x1="0" y1="0" x2="0" y2="100%">' +
              '<stop offset="0%" stop-color="#4d4f53" />' +
              '<stop offset="20%" stop-color="#666" />' +
              '<stop offset="100%" stop-color="#666" />' +
            '</linearGradient>' +
            '<linearGradient id="target-zone-grad" x1="0" y1="0" x2="0" y2="100%">' +
              '<stop offset="0%" stop-color="#666" />' +
              '<stop offset="20%" stop-color="#666" />' +
              '<stop offset="40%" stop-color="#8dc63f" stop-opacity="0.3"/>' +
              '<stop offset="60%" stop-color="#8dc63f" stop-opacity="0.3"/>' +
              '<stop offset="80%" stop-color="#666" />' +
              '<stop offset="100%" stop-color="#666" />' +
            '</linearGradient>' +
            '<linearGradient id="target-zone-grad-good" x1="0" y1="0" x2="0" y2="100%">' +
              '<stop offset="0%" stop-color="#666"/>' +
              '<stop offset="20%" stop-color="#666"/>' +
              '<stop offset="40%" stop-color="<%= green %>"/>' +
              '<stop offset="60%" stop-color="<%= green %>"/>' +
              '<stop offset="80%" stop-color="#666"/>' +
              '<stop offset="100%" stop-color="#666"/>' +
            '</linearGradient>' +
            '<linearGradient id="target-zone-grad-bad" x1="0" y1="0" x2="0" y2="100%">' +
              '<stop offset="0%" stop-color="#666"/>' +
              '<stop offset="20%" stop-color="#666"/>' +
              '<stop offset="40%" stop-color="<%= red %>" stop-opacity="0.3"/>' +
              '<stop offset="60%" stop-color="<%= red %>" stop-opacity="0.3"/>' +
              '<stop offset="80%" stop-color="#666"/>' +
              '<stop offset="100%" stop-color="#666"/>' +
            '</linearGradient>' +
            '</defs>' +
          '<path class="grass" d="M 0,0 L 0,0 L 0,0, L 0,0 z" fill="url(#goal-timeline-grad)"/>' +
          '<path class="target" d="M 0,0 L 0,0 L 0,0, L 0,0 z" fill="url(#target-zone-grad)"/>' +
          '<path class="verticals" />' +
        '</svg>' +
      '</div>' +
    '</div>' +
    '<div class="paused-text-container"><div class="paused-text"><div class="big">~ LOADING ~</div></div></div>'
  ),

  dialogContent: {
    'instructions': {
      title: 'HOW TO PLAY',
      text: 'You will see bubbles scrolling down the screen with letters on them.<br/>' +
      'Your goal is to hit the correct key at the moment the bubble is in its target circle (marked underneath).<br/>' +
      'If you hit the right key at the right time, the bubble will pop.<br/>' +
      'If you miss or hit the wrong key, the target zone will flash red.<br/>' +
      'Information about the game is displayed on the top corners.<br/>' +
      'Try to press ONE key per bubble! The game will know if you are ignoring bubbles or mashing buttons.<br/><br/>' +
      'Let\'s start with a small example.<br/>' +
      'Get ready by putting your fingers on the right keys!<br/>' +
      'Good luck!<br/>',
      footer: 'Press SPACE to start',
    },
    'sessionStart': {
      title: 'GET READY',
      text: 'The real game will now start playing.<br/>' +
      'Try to be as accurate as possible! (Remember, one keypress per bubble)<br/>' +
      'because the difficulty will adjust to your performance.<br/>' +
      'So, the better you do, the sooner you will finish!<br/><br/>' +
      'Get ready by putting your finger on the right keys!<br/>' +
      'Good luck!',
      footer: 'Press SPACE to start',
    },
    'sessionDone': {
      title: 'End of Game',
      text: 'You have finished the experiment!<br/>' + 
      'Thanks for playing!',
      footer: 'PRESS SPACE to finish your work',
    },
    'recogInstructions': {
      title: 'Recognition Test: Instructions',
      text: 'Did you notice any repeating patterns throughout the game?<br/>' +
      'There was a repeating sequence of bubbles throughout the game, <br/>' +
      'and now we want to know if you can identify it.<br/><br/>' +
      'You will now play the game for a very short period of time.<br/>' +
      'Afterwards you will be asked how familiar you are with the sequence you played.',
      footer: 'Press SPACE to start',
    },
    'recogStart': {
      title: 'Recognition Quiz',
      text: 'Play through the sequence.<br/>' +
      'Then rate how familiar it is to you!',
      footer: 'Press SPACE to start',
    },
    'recogRating': {
      title: 'RECOGNITION RATING',
      text: 'Rate on a scale from 0 to 9<br/>' +
      '(0=Not at all familiar, 9=Very familiar)<br/><br/>' +
      'How familiar were you with the sequence you just played?<br/>' +
      'Press any number key to enter or change your rating<br/>' +
      'Hit the Spacebar to confirm and continue',
      footer: '',
    },
    'break': {
      title: 'BREAK',
      text: 'This is a small break period so that you can relax a bit for the next round!',
      footer :'Press SPACE to continue',
    },
    'pause': {
      title: 'PAUSE',
      text: '',
      footer: 'Press SPACE to continue',
    },
  },

  dialogTemplate: _.template(
     '<div class="big">~ <%= title %> ~</div>' +
     '<%= text %><br/>' + 
     '<div class="big"><%= mesg %></div>' +
     '<div class="small">(Keys in game: <%= keys %>)</div>' 
  ),

  endTemplate: '<div class="big">~ END OF GAME ~<div>',
  
  loadingTemplate: '<div class="big">~ LOADING GAME ~<div>',

  // #################
  // Runtime variables
  // #################
  
  // runtime variables
  currentBubbles: [],
  refreshDate: new Date(),
  speedFactor: 1,
  timeToShow: 6000, // 6 seconds
  
  // responses
  responses: [],
  batch: 0,
  combo: [],

  // state
  started: false,
  ended: false,

  // ######################
  // Game options variables
  // ######################
  
  options: {
    endPoint: Config.endPoint,
    
    // ### IDs
    scenario: 0,

    // ### responses
    // - send options
    batchSize: 30,
    
    // - speed
    comboWindow: 12,
    speedUpTrigger: 0.8,
    speedUpInc: 0.05,
    slowDownTrigger: 0.3,
    lowestSpeedFactor: 0.3,
    slowDownDec: -0.05,

    // ### Bubbles
    // - size & color (init later)
    bubbleColor: [],
    circleSize: 5,
    goodColor: '#8dc63f',
    badColor: '#D00000',
    ratioBubble: 10,

    // - letter
    showLetters: false,
    letterColor: 'white',
    letterSize: 1.0,

    // ### Keyboard
    keys: [
      'A',
      'S',
      'D',
      'F',
      'G',
      'H'
    ],
    // validation key is space
    validKey: 32,
    
    // ### Patterns
    events: [],
    
    adaptativeSpeed: false,
    
    // ### Design
    numMarkers: 12,
    middlePadding: .5,

    // ### Time
    baseTimeToShow: 6000, // 6 seconds
    interval: 65,
    timeUnit: 1000,
    accuracyRange: .02,
    accuracyOffset: .2,
    
    // ### Other
    score: 100,
    infinityOffset: 0.3,
  },

  initialize: function () {
    this.$document = $(document);
    this.$window = $(window);
    this.$body = $('body');
    this.$el.html(this.sceneTemplate({green: this.options.goodColor, red: this.options.badColor}));
    this.displayText(this.loadingTemplate);

    this.loadParam(function(that) {
      that.setup();
      that.layout();
      that.attach();
      that.adjustSpeed();
      that.renderStatic();
      that.renderDynamic();
    });
  },

  loadParam: function(process) {
    var that = this;
    
    // perform sync call with ajax on cross domain using CORS
    jQuery.ajaxSetup({async:false});

    // get config file
    console.log('Getting config from: ' + this.options.endPoint + '/user/' + this.options.token + '/challenge');
    jQuery.getJSON(this.options.endPoint + '/user/' + this.options.token + '/challenge', function(data) {
      $.extend(that.options, data);
    })
    .done(function() {
      console.log('Data successfully received!'); 
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      console.log('Data not received... ' + textStatus); 
      console.log(errorThrown.toString());
      console.log('CORS enabled? ' + jQuery.support.cors);
    })
    
    // get back to asynchronous mode
    jQuery.ajaxSetup({async:true});

    process(this);
  },  

  setup: function () {
    this.startDate = new Date();
    this.options.totalevents = this.options.events.length;
    
    this.timeScale = d3.time.scale().range([0, 1]);

    this.zIndexScale = d3.scale.linear()
      .domain([0, 1])
      .rangeRound([100, 10]);

    this.opacityScale = d3.scale.linear()
      .domain([-0.02, 0.00, 0.3, 1])
      .range([0.0, 1, 1, 0.1]);

    this.markerOpacityScale = d3.scale.linear()
      .domain([-0.02, 0.02, 0.3, 1])
      .range([0.0, 1, 0.1, 0]);

    this.xScale = d3.scale.linear()
      .domain([-1.1, 1.1]);

    this.yScale = d3.scale.linear()
      .domain([0, 1]);

    this.projectionScale = d3.scale.linear()
      .domain([0, 1.0])
      .range([1.00, 1 + 1. / this.options.infinityOffset]);

    this.angle = Math.acos(1. / (this.options.infinityOffset + 1)) * 180. / Math.PI;

    if (this.options.bubbleColor.length === 0)
      this.options.bubbleColor = d3.scale.category10().range().slice(0, this.options.keys.length);
 },

  // ########################
  // ### Actions & Logic ####
  // ########################
  
  startGame: function () {
    if (!this.started && !this.ended) {
      this.started = true;
      if (this.currentBubbles.length) {
        this.adjustBubbleDate();
        console.log("Time adjusted after paused");
        this.responses.push({
          cueId: -1,
          eventTimestamp: new Date().getTime() - this.startDate.getTime(),
          eventType: 'start',
          eventValue: 0,
          eventDist: 0,
          eventSpeed: this.speedFactor,
        });
      }
      this.interval = window.setInterval(this.onInterval, this.options.interval);
      this.removeText();
    }
  },

  startDialog: function (dialog) {
    // change state to paused if not already
    if(this.started && !this.ended) {
      this.started = false;
      this.pausedTime = new Date();
    
      // pause by default
      if(typeof(dialog) === 'undefined') {
        this.dialog = {
          type: 'pause',
          time: 0,
          keys: [],
        }
      } else {
        this.dialog = dialog;
      }
      
      console.log(this.dialog.type);
      this.responses.push({
        cueId: -1,
        eventTimestamp: new Date().getTime() - this.startDate.getTime(),
        eventType: this.dialog.type,
        eventValue: 0,
        eventDist: 0,
        eventSpeed: this.speedFactor,
      });
    }
  },
  
  updateDialog: function (confirmation) {
    var content = this.dialogContent[this.dialog.type];
    content.keys = this.options.keys.toString();
    this.dialog.time = this.dialog.time - this.options.interval;
    if (this.dialog.type === 'recogRating')
      content.mesg = 'Your rating: ' + this.dialog.value;
    else if (this.dialog.time > 0)
      content.mesg = ((this.dialog.time % (60000)) / this.options.timeUnit).toFixed(0);
    else
      content.mesg = content.footer;
    
    if(confirmation && this.dialog.time <= 0) {
      if(this.dialog.type === 'recogRating') {
        this.responses.push({
          cueId: -1,
          eventTimestamp: new Date().getTime() - this.startDate.getTime(),
          eventType: this.dialog.subtype,
          eventValue: this.dialog.value,
          eventDist: 0,
          eventSpeed: 0,
        });
        this.sendResponses(true);
      }
      this.removeText();
      this.dialog = false;
      this.startGame();
    } else {
      if (this.dialog.time <= 0) {
        window.clearInterval(this.interval);
      }

      this.displayText(this.dialogTemplate(content));
    }
  },

  endGame: function () {
    if (this.started) {
      window.clearInterval(this.interval);
      this.ended = true;
      this.endedTime = new Date();
      this.sendResponses();
      this.trigger('end', true);
    }
  },

  onInterval: function () {
    if(this.currentBubbles.length === 0 && this.options.events.length === 0 && !this.dialog) {
      console.log('Ending game');
      this.endGame();
    } else {
      this.refresh();
    }
  },

  attach: function () {
    this.onInterval = this.onInterval.bind(this);
    this.$document.on('keydown', this.onKeydown.bind(this));
    this.$document.on('keyup', this.onKeyup.bind(this));
    this.$window.on('resize', this.onWindowResize.bind(this));

    this.$window.on('scroll touchmove', function (evt) { evt.preventDefault(); });
    this.$body.on('scroll touchmove', function (evt) { evt.preventDefault(); });
  },

  dettach: function () {
    this.onInterval = this.onInterval.bind(this);
    this.$document.off('keydown', this.onKeydown.bind(this));
    this.$document.off('keyup', this.onKeyup.bind(this));
  },
  
  onWindowResize: function () {
    this.layout();
    this.renderStatic();
  },

  onKeyup: function (evt) {
    // escape parameters
    if (this.ended || evt.altKey || evt.ctrlKey || evt.metaKey)
      return;
    
    var charCode = (evt.which) ? evt.which : evt.keyCode;
    var validkey = (charCode === this.options.validKey);
    if (!this.dialog) {
        this.keyupBubble(String.fromCharCode(charCode));
    } 
  },

  onKeydown: function (evt) {
    // escape parameters
    if (this.ended || evt.altKey || evt.ctrlKey || evt.metaKey)
      return;

    evt.preventDefault();
    var charCode = (evt.which) ? evt.which : evt.keyCode;
    var validkey = (charCode === this.options.validKey);
    // process any validation in priority
    if (!this.dialog) {
      if (validkey)
        this.startDialog();
      else
        this.keyhitBubble(String.fromCharCode(charCode));
    } else {
      // hack for numpad keys
      key = String.fromCharCode((charCode >= 96 ? charCode - 48 : charCode))
      if (this.dialog.keys.indexOf(parseInt(key)) > -1)
        this.dialog.value = key;
      this.updateDialog(validkey);
    }
  },

  // ##############
  // ### Logic ####
  // ##############
  
  processEvent: function () {
    if (this.options.events.length === 0)
      return;
    
    if (this.options.events[0].type === 'dialog') {
      // wait for game field to be empty to start dialog event
      if (this.currentBubbles.length === 0) {
        var evt = this.options.events.shift(),
            value = evt.value,
            idx = value.indexOf('.'),
            type = (idx > -1 ? value.substring(0, idx): value),
            subtype = value;

        this.startDialog({
          type: type,
          subtype: subtype,
          time: (type === 'sessionDone' || type === 'recogRating' ? 0 : evt.duration),
          keys: (type === 'recogRating' ? _.range(10) : []),
          value: 0,
        });
      }
      return;
    }

    if (this.options.events[0].type === 'speedSet') {
      var evt = this.options.events.shift(),
          value = evt.value;
      this.adjustSpeed(value);
      return;
    }

    if (this.options.events[0].type === 'speedAdapt') {
      var evt = this.options.events.shift(),
          value = evt.value;
      this.adaptSpeed(value);
      return;
    }

    if (this.options.events[0].type === 'cue') {
      var last = _.last(this.currentBubbles),
          date = new Date(new Date().getTime() + this.timeToShow),
          bubble;

      if (!last) {
        var evt = this.options.events.shift();
        bubble = this.createBubble(evt, date);
      } else {
        bubbleDifference = this.timeScale(date.getTime()) - this.timeScale(last.date.getTime());
        if (bubbleDifference > last.dist) {
          var evt = this.options.events.shift();
          bubble = this.createBubble(evt, date);
        }
      }
      if (bubble) {
        this.currentBubbles.push(bubble);
      }
    
      return;
    }

    // if we reached this point, event unknown
    console.log('Unknown event: ' + this.options.events[0].type);
    this.options.events.shift();
  },

  refresh: function () {
    // update date
    this.refreshDate = new Date();
    // update number of events left
    this.trigger('percent', {percent: 100 - Math.round(this.options.events.length * 100 / this.options.totalevents)});
    if (this.dialog) {
      this.updateDialog();
    } else {
      this.sendResponses();
      this.clearFeedback();
      this.updateCurrentBubbles();
      this.processEvent();
      this.updateTimeScale();
      this.renderDynamic();
    }
  },

  keyhitBubble: function (key) {
    // interval has to be added because the timeScale is one interval late
    var current = this.options.accuracyOffset,
      bestBubble = false,
      hit = false,
      offset,
      bestOffset,
      diff,
      bestDiff,
      bubble;

    // Looking at all the possible bubbles to report error
    for (var i = 0; i < this.currentBubbles.length; i++) {
      bubble = this.currentBubbles[i];
      offset = current - this.timeScale(bubble.date.getTime());
      diff = Math.abs(offset);
     
      if(!bestBubble || diff < bestDiff) {
        bestBubble = bubble;
        bestDiff = diff;
        bestOffset = offset;
      }
    }

    // Update key if has been hit
    if (!bestBubble.beenHit && bestBubble.key === key && bestDiff <= this.options.accuracyRange) {
      var score = Math.round(this.options.score * Math.sqrt(1 - (bestDiff/this.options.accuracyRange)));
      this.trigger('score', {score: score, bubble: bestBubble});
      bestBubble.beenHit = true;
      hit = true;
      bestBubble.offset = bestOffset;

      this.bubbleEvent();
    }
    
    if (this.options.adaptativeSpeed)
      this.combo.push(hit);

    var keyNum = this.options.keys.indexOf(key);
    // add response to buffer
    this.responses.push({
      cueId: bestBubble.id,
      eventTimestamp: new Date().getTime() - this.startDate.getTime(),
      eventType: (hit ? 'keydown-hit' : 'keydown-miss'),
      eventValue: keyNum + 1,
      eventDist: bestOffset,
      eventSpeed: this.speedFactor,
    });

    // storing variables for keyup event
    this.lastBestBubbleId = bestBubble.id;
    this.lastBestBubbleNum = keyNum + 1;
    this.lastBestOffset = bestOffset;

    // give visual feeback
    this.feedback(keyNum, hit);
  },

  keyupBubble: function (key) {
    if (this.bestBubbleId)
      this.responses.push({
        cueId: this.lastBestBubbleId,
        eventTimestamp: new Date().getTime() - this.startDate.getTime(),
        eventType: 'keyup',
        eventValue: this.lastBestBubbleNum,
        eventDist: this.lastBestOffset,
        eventSpeed: this.speedFactor,
      });
  },

  createBubble: function (evt, date) {
    // adjust speed
    this.adjustSpeed();
    var i = evt.value - 1;
    // create bubble
    var newBubble = {
      id: evt.cueId,
      date: date,
      keyNumber: i,
      key: this.options.keys[i],
      dist: evt.dist,
      color: this.options.bubbleColor[i],
      beenHit: false,
      type: 'cue-created',
    };
    
    // push event appeared
    this.responses.push({
      cueId: newBubble.id,
      eventTimestamp: this.refreshDate.getTime() - this.startDate.getTime(),
      eventType: newBubble.type,
      eventValue: newBubble.keyNumber + 1,
      eventDist: 0,
      eventSpeed: this.speedFactor,
    });

    return newBubble;
  },

  updateCurrentBubbles: function () {
    this.currentBubbles = _.filter(this.currentBubbles, function (bubble) {
      var newtype = bubble.type,
          z = this.timeScale(bubble.date.getTime()) - this.options.accuracyOffset,
          kept = this.timeScale(bubble.date.getTime()) + .1 > 0;
       
      if (z < 0 && z > -this.options.accuracyRange)
        newtype = 'cue-after-target';
      if (z > 0 && z < this.options.accuracyRange)
        newtype = 'cue-in-target';      
      if (!kept) {
        newtype = 'cue-disappear';
        if (!bubble.beenHit)
          this.combo.push(0);
      }

      if (!bubble.beenHit && newtype !== bubble.type) {
        bubble.type = newtype;
        this.responses.push({
          cueId: bubble.id,
          eventTimestamp: this.refreshDate.getTime() - this.startDate.getTime(),
          eventType: bubble.type,
          eventValue: bubble.keyNumber + 1,
          eventDist: 0,
          eventSpeed: this.speedFactor,
        });
      }
      return kept;
    }, this);
  },
  
  adaptSpeed: function(bool) {
    this.combo = [];
    this.options.adaptativeSpeed = (bool === true);
    this.responses.push({
      cueId: -1,
      eventTimestamp: this.refreshDate.getTime() - this.startDate.getTime(),
      eventType: 'speedAdapt',
      eventValue: bool,
      eventDist: 0,
      eventSpeed: this.speedFactor,
    });
    console.log('Adaptative speed: ' + this.options.adaptativeSpeed);
  },

  adjustSpeed: function(forced) {
    if(forced) {
      this.combo = [];
      this.speedFactor = forced;

      this.trigger('speed', {speed: this.speedFactor});
      this.responses.push({
        cueId: -1,
        eventTimestamp: this.refreshDate.getTime() - this.startDate.getTime(),
        eventType: 'speedSet',
        eventValue: this.speedFactor,
        eventDist: 0,
        eventSpeed: this.speedFactor,
      });
      console.log('Set speed: ' + this.speedFactor);
    }
    
    // recompute speedFactor
    if(this.options.adaptativeSpeed && this.combo.length > this.options.comboWindow) {
      var sum = 0,
          speedChange = 0;

      for(var i = 0; i < this.combo.length; i++)
        sum += this.combo[i];
      
      var ratio = sum / this.combo.length;

      this.combo = [];

      if(ratio >= this.options.speedUpTrigger)
        speedChange = this.options.speedRatio;

      if(ratio <= this.options.speedDownTrigger && this.speedFactor > this.options.lowestSpeedFactor)
        speedChange = 1 / this.options.speedRatio;
      
      console.log('Speed change: ' + speedChange);

      if(speedChange) {
        this.responses.push({
          cueId: -1,
          eventTimestamp: this.refreshDate.getTime() - this.startDate.getTime(),
          eventType: 'speed-change',
          eventValue: speedChange,
          eventDist: 0,
          eventSpeed: this.speedFactor,
        });
        
        this.speedFactor = Math.round(this.speedFactor * speedChange * 100) / 100;
        this.trigger('speed', {speed: this.speedFactor});
        console.log('Performance ratio: ' + ratio + ', Speed: ' + this.speedFactor);
      }
    }
    
    this.timeToShow = this.options.baseTimeToShow / this.speedFactor;
  },

  adjustBubbleDate: function () {
    var diff = new Date().getTime() - this.pausedTime.getTime();
    _.each(this.currentBubbles, function (o) {
      o.date = new Date(o.date.getTime() + diff);
    });
  },

  updateTimeScale: function () {
    this.timeScale
      .domain([this.refreshDate, new Date(this.refreshDate.getTime() + this.timeToShow)]);
  },

  // ################
  // ### Network ####
  // ################

  sendResponses: function(forced) {
    if((this.responses.length >= this.options.batchSize) || (this.responses.length > 0 && (this.ended || forced))) {
      // store the batch locally
      var 
        responsesBatch = this.responses,
        batchProcessed = this.batch;
      
      // update batch number and empty buffer
      this.batch++;
      this.responses = [];
      
      // send data
      console.log('Batch: ' + batchProcessed + ' - Sending');
      jQuery.ajax({
        type: "POST",
        crossDomain: true,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        url: this.options.endPoint + '/user/' + this.options.token + '/response',
        data: JSON.stringify({
          token: this.options.token,
          scenario: this.options.scenario,
          batchId: batchProcessed,
          end: this.ended,
          score: this.score,
          responses: responsesBatch, 
        }),
        // Will retry three times
        timeout: 60000,
        tryCount: 0,
        retryLimit: 3,
        error: function(xhr, textStatus, errorThrown ) {
          if (textStatus === 'timeout') {
            console.log('Batch: ' + batchProcessed + ' - Timeout');
            this.tryCount++;
            if (this.tryCount <= this.retryLimit) {
              //try again
              $.ajax(this);
              return;
            }            
            return;
          }
        },
        success: function() {
          console.log('Batch: ' + batchProcessed + ' - Success');
        },
        complete: function() {
          console.log('Batch: ' + batchProcessed + ' - Sent');
        }
      });
    }
  },

  // ####################
  // #### Rendering #####
  // ####################

  // --------------------
  // --- Dynamic Rendering
  // --------------------
  
  renderDynamic: function () {
    this.renderGround();
    this.renderBubbles();
  },

  displayText: function (text) {
    this.$('.paused-text').html(text);
    this.$el.addClass('paused');
  },

  removeText: function () {
    this.$el.removeClass('paused');
  },

  feedback: function(numKey, answer) {
    var that = this;
    this.feedbackDate = new Date(this.refreshDate.getTime() + 100);
    this.feedbackOn = true;
    this.feedbackKey = numKey;
    
    var fill,
        circle;

    if (answer) {
      fill = 'url(#target-zone-grad-good)';
      circle = this.options.goodColor;
    } else {
      fill = 'url(#target-zone-grad-bad)';
      circle = this.options.badColor;
    }

    d3.select(this.el).select('.target')
      .style('fill', fill);
    d3.select(this.el).selectAll('.circle')
      .style('border-color', function (d) {
        return d === numKey? circle: that.options.bubbleColor[d];
      });
  },

  clearFeedback: function() {
    if(this.feedbackOn && this.feedbackDate.getTime() < new Date().getTime()) {
      var that = this;
      d3.select(this.el).select('.target')
        .style('fill', function () {
          return 'url(#target-zone-grad)';
        });
      d3.select(this.el).selectAll('.circle')
        .style('border-color',  function (d) {
          return that.options.bubbleColor[d];
        });
      this.feedbackOn = false;
    }
  },

  renderGround: function () {
    var
      that = this,
      opts = this.options,
      ticks = this.timeScale.ticks(d3.time.seconds, .5),
      format = this.timeScale.tickFormat(d3.time.seconds, .5),
      markers;


    markers = d3.select(this.el).select('.ground').selectAll('.marker')
      .data(ticks, function (d) {
        return d.getTime();
      })

    markers.enter()
      .insert('div', ':first-child')
        .attr('class', 'marker')
        .style('opacity', 0);

    markers
      .each(function(d) {
        var
          z = that.timeScale(d),
          p = 1 / that.projectionScale(z);
          node = d3.select(this);
        
        node
          .style({'z-index': (that.zIndexScale(z) - 20),})
          .transition()
          .duration(opts.interval)
          .ease('linear')
          .style({
            'position': 'absolute',
            'opacity': that.markerOpacityScale(z),
            'top': that.yScale(p) + 'px',
            'left': that.xScale(-1*p) + 'px',
            'right': (that.xScale.range()[1] - that.xScale(p)) + 'px',
            'font-size': (p*35) + 'px',
          })
      });  

    markers
      .exit()
      .remove();
  },

  renderBubbles: function () {
    var
      that = this,
      opts = this.options,
      bubbles;

    // Data
    bubbles = d3.select(this.el).selectAll('.bubble')
      .data(this.currentBubbles, function (d) {
        return d.id;
      });

    // Enter
    bubbles.enter()
      .append('div')
        .attr('class', 'bubble')
        .each(function (d) {
          var
            z = that.timeScale(d.date),
            p = 1 / that.projectionScale(z),
            r = that.maxBubbleSize * p,
            node = d3.select(this);

          node.style({
            'font-size': that.options.letterSize * r + 'px',
            'width': r*2 + 'px',
            'height': r*2 + 'px',
            'background-color': d.color,
            'opacity': that.opacityScale(z),
            'top': that.yScale(p) + 'px',
            'left': that.xScale(c*p) + 'px',
            'margin-top': -r + 'px',
            'margin-left': -r + 'px',
          });
          
          if (that.options.showLetters) {
            this.textContent = d.key;
            node.style({
              color: that.options.letterColor,
            });
          }
        })
        .style('transform', 'rotateX( ' + this.angle + 'deg )')
        .append('span')
          .attr('class', 'shadow');

    // Update
    bubbles
      .each(function (d, i) {
        var
          z = that.timeScale(d.date),
          p = 1 / that.projectionScale(z),
          r = Math.max(~~(that.maxBubbleSize * p), 0.01),
          division = 2 / (that.options.keys.length + 1 + that.options.middlePadding),
          c,
          node = d3.select(this);
          
        if (d.keyNumber < (that.options.keys.length / 2))
          c = -1 + (d.keyNumber + 1) * division;
        else
          c = 1 - (that.options.keys.length - d.keyNumber) * division;

        node
          .style('z-index', that.zIndexScale(z))
          .transition()
          .duration(opts.interval)
          .ease('linear')
          .style({
            'font-size': that.options.letterSize * r + 'px',
            'width': r*2 + 'px',
            'height': r*2 + 'px',
            'opacity': that.opacityScale(z),
            'top': that.yScale(p) + 'px',
            'left': that.xScale(c*p) + 'px',
            'margin-top': -r + 'px',
            'margin-left': -r + 'px',
            'transform': 'rotateX( ' + this.angle + 'deg )',
          });
      });

    // Exit
    bubbles
      .exit()
      .remove();
  },

  bubbleEvent: function() {
    bubbles = d3.select(this.el).selectAll('.bubble')

    bubbles
      .classed('has-been-hit', function(d, i) {
        return d.beenHit;
      });

    // remove rotation to enable disappear animation
    hits = d3.select(this.el).selectAll('.has-been-hit');
    hits
      .style('transform', null);
  },

  // --------------------
  // --- Static Rendering
  // --------------------

  renderStatic: function() {
    this.updateTimeScale();
    this.renderGrass();
    this.renderVerticals();
    this.renderTarget();
    this.renderCircles();
    this.renderDynamic();
  },
  
  layout: function () {
    var
      w = this.$el.width() || 848,
      h = this.$el.height() || 518,
      s = Math.min(w, h);

    // Setup scales according to screen
    this.xScale
      .range([0, w]);

    this.yScale
      .range([-h * this.options.infinityOffset, h]);

    d3.select(this.el).select('.ground').select('svg')
      .attr('width', w)
      .attr('height', h);
    
    this.maxBubbleSize = h * this.options.ratioBubble;

    // Setup perspective
    this.perspective = Math.round(- h * Math.tan(this.angle));
  }, 
  
  renderGrass: function() {
    var
      near = 1/this.projectionScale.range()[0],
      far = 1/this.projectionScale.range()[1];
      path = 'M ' + this.xScale(-1*far) + ',' + this.yScale(far) + ' ' +
             'L ' + this.xScale( 1*far) + ',' + this.yScale(far) + ' ' +
             'L ' + this.xScale( 1*near) + ',' + this.yScale(near) + ' ' +
             'L ' + this.xScale(-1*near) + ',' + this.yScale(near) + ' ' +
             'z';

    d3.select(this.el).select('.grass')
      .attr('d', path);    
  },

  renderVerticals: function() {
    var
      near = 1/this.projectionScale.range()[0],
      far = 1/this.projectionScale.range()[1],
      delta = 2/(this.options.keys.length + 1 + this.options.middlePadding)
      segs = [];

    for(var i = 1; i <= this.options.keys.length / 2; i++) {
      segs.push(
        'M ' + this.xScale(far * (-1 + i * delta) ) + ',' + this.yScale(far) + ' ' +
        'L ' + this.xScale(near * (-1 + i * delta) ) + ',' + this.yScale(near)
      );
      segs.push(
        'M ' + this.xScale(far * (1 - i * delta) ) + ',' + this.yScale(far) + ' ' +
        'L ' + this.xScale(near * (1 - i * delta) ) + ',' + this.yScale(near)
      );
    }

    d3.select(this.el).select('.verticals')
      .attr('d', segs.join(' '));
  },

  renderTarget: function() {
    var
      zfar = this.options.accuracyOffset + this.options.accuracyRange,
      znear = this.options.accuracyOffset - this.options.accuracyRange,
      far = 1 / this.projectionScale(zfar),
      near = 1 / this.projectionScale(znear),
      path = 'M ' + this.xScale(-1*far) + ',' + this.yScale(far) + ' ' +
             'L ' + this.xScale( 1*far) + ',' + this.yScale(far) + ' ' +
             'L ' + this.xScale( 1*near) + ',' + this.yScale(near) + ' ' +
             'L ' + this.xScale(-1*near) + ',' + this.yScale(near) + ' ' +
             'z';
 
    d3.select(this.el).select('.target')
      .attr('d', path);
  },

  renderCircles: function () {
    var
      that = this,
      opts = this.options,
      division = 2 / (opts.keys.length + 1 + opts.middlePadding),
      z = this.options.accuracyOffset,
      p = 1 / that.projectionScale(z),
      r = Math.max(~~(this.maxBubbleSize * p), 0.01) + opts.circleSize,
      circles;
    
    // Data
    circles = d3.select(this.el).selectAll('.circle')
      .data(_.range(this.options.keys.length));
    
    // Enter
    circles.enter()
      .append('div')
      .attr('class', 'circle')
      .append('div')
      .attr('class', 'text')
      .style('border-width', opts.circleSize + 'px')
      .style('border-color', function (d) {
        return opts.bubbleColor[d];
      })
      .classed('right', function (d) {
        return d+1 > opts.keys.length/2
      })
      .classed('left', function (d) {
        return d+1 <= opts.keys.length/2
      })
      .text(function(d) {
        return opts.keys[d];
      });
      

    // Update
    circles
      .style('border-color', function (d) {
        return opts.bubbleColor[d];
      })
      .style('left', function (d) {
          if (d < (opts.keys.length / 2))
            c = -1 + (d + 1) * division;
          else
            c = 1 - (opts.keys.length - d) * division;
        return that.xScale(c*p) + 'px';
      })
      .style({
        'transform': 'rotateX( ' + this.angle + 'deg )',
        'border-width': opts.circleSize + 'px',
        'width': r*2 + 'px',
        'height': r*2 + 'px',
        'z-index': that.zIndexScale(z),
        'top': Math.round(that.yScale(p)) + 'px',
        'margin-top': -r + 'px',
        'margin-left': -r + 'px',
      })
      .selectAll('.text')
        .style('font-size', function() {
          return (r / 2.) + 'px';
        });

    // Exit
    circles
      .exit()
      .remove();
  },
});
