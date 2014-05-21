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
              '<stop offset="20%" stop-color="#8dc63f" stop-opacity="0.3"/>' +
              '<stop offset="80%" stop-color="#8dc63f" stop-opacity="0.3"/>' +
              '<stop offset="100%" stop-color="#666" />' +
            '</linearGradient>' +
            '<linearGradient id="target-zone-grad-good" x1="0" y1="0" x2="0" y2="100%">' +
              '<stop offset="0%" stop-color="#666"/>' +
              '<stop offset="20%" stop-color="<%= green %>"/>' +
              '<stop offset="80%" stop-color="<%= green %>"/>' +
              '<stop offset="100%" stop-color="#666"/>' +
            '</linearGradient>' +
            '<linearGradient id="target-zone-grad-bad" x1="0" y1="0" x2="0" y2="100%">' +
              '<stop offset="0%" stop-color="#666"/>' +
              '<stop offset="20%" stop-color="<%= red %>" stop-opacity="0.3"/>' +
              '<stop offset="80%" stop-color="<%= red %>" stop-opacity="0.3"/>' +
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

  instructionTemplate: _.template(
    '<div class="big">~ HOW TO PLAY ~</div>' +
    'You will see bubbles going down with the following letters on them (<%= keys %>)<br/>' +
    'and circles at the bottom of your screen.<br/>' +
    'The goal is to hit the key of each bubble at the moment this bubble is the right circle.<br/>' +
    'You can pause at any time using the ESC key.<br/>' +
    '(Note that the difficulty will adjust to your performance)<br/>' +
    'Get ready by putting your finger on the right keys!<br/>' +
    'Good luck!<br/>' + 
    '<div class="big">Hit ESC to start</div>'
  ),

  breakTemplate: _.template(
    '<div class="big">~ <%= title %> ~</div>' + 
    '<%= text %>' + 
    '<br/>' +
    'Get ready!<br/>' +
    '<%= seconds %>'
  ),

  pauseTemplate: _.template(
    '<div class="big">~ <%= title %> ~</div>' +
    '<%= text %>' + 
    '<br/>' +
    'Keys in game: <%= keys %><br/>'+
    'Press ESC to continue'
  ),

  endTemplate: _.template('<div class="big">~ END OF GAME ~<div>'),
  
  loadingTemplate: _.template('<div class="big">~ LOADING GAME ~<div>'),

  // #################
  // Runtime variables
  // #################
  
  // runtime variables
  currentBubbles: [],
  date: new Date(),
  speedFactor: 1,
  timeToShow: 6000, // 6 seconds
  accuracyRange: 0,
  accuracyOffset: 0,
  
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
    
    // ### Patterns
    events: [],
    
    adaptiveSpeed: false,
    
    // ### Design
    numMarkers: 12,
    middlePadding: .5,

    // ### Time
    baseTimeToShow: 6000, // 6 seconds
    interval: 65,
    timeUnit: 1000,
    baseAccuracyRange: .02,
    baseAccuracyOffset: .2,
    
    // ### Other
    score: 100,
    infinityOffset: 0.3,
  },

  events: {
  },

  initialize: function () {
    var that = this;
    this.$document = $(document);
    this.$window = $(window);
    this.$body = $('body');
    this.$el.html(this.sceneTemplate({green: this.options.goodColor, red: this.options.badColor}));
    this.displayText(this.loadingTemplate);
   
    this.loadParam(function () {
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
    console.log(this.options.endPoint + '/user/' + this.options.token + '/challenge');
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

    process();
  },  

  setup: function () {
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
      .range([1.00, 1 + 1/this.options.infinityOffset]);

    if (this.options.bubbleColor.length === 0)
      this.options.bubbleColor = d3.scale.category10().range().slice(0, this.options.keys.length);
 },

  // ################
  // ### Actions ####
  // ################
  
  instructionGame: function() {
    this.displayText(this.instructionTemplate({keys: this.options.keys.toString()}));
  },

  startGame: function () {
    if (!this.started && !this.ended) {
      this.started = true;
      this.startDate = new Date();
      this.layout();
      if (this.currentBubbles.length) {
        this.readjustBubbleDate();
        console.log("Time adjusted after paused");
      }
      this.refresh();
      this.interval = window.setInterval(this.onInterval, this.options.interval);
      this.removeText();
    }
  },

  pauseGame: function (obj) {
    if(typeof(obj)==='undefined') obj = {title: 'PAUSE', test: ''};

    if (this.started && !this.ended) {
      window.clearInterval(this.interval);
      this.displayText(this.pauseTemplate({
        title: obj.title,
        text: obj.text,
        keys: this.options.keys.toString()
      }));
      this.started = false;
      this.pausedTime = new Date();
    }
  },
  
  endGame: function () {
    if (this.started) {
      window.clearInterval(this.interval);
      this.displayText(this.endTemplate);
      this.ended = true;
      this.endedTime = new Date();
      this.sendResponses();
      this.trigger('end', true);
    }
  },

  onInterval: function () {
    if(this.currentBubbles.length === 0 && this.options.events.length === 0) {
      this.endGame();
    } else {
      this.refresh();
    }
  },

  attach: function () {
    this.onInterval = this.onInterval.bind(this);
    this.$document.on('keydown', this.onKeydown.bind(this));
    this.$window.on('resize', this.onWindowResize.bind(this));

    this.$window.on('scroll touchmove', function (evt) { evt.preventDefault(); });
    this.$body.on('scroll touchmove', function (evt) { evt.preventDefault(); });
  },

  dettach: function () {
    this.onInterval = this.onInterval.bind(this);
    this.$document.off('keydown', this.onKeydown.bind(this));
  },
  
  onWindowResize: function () {
    this.layout();
    this.renderStatic();
  },

  onKeydown: function (evt) {
    if (this.breakvalue || evt.altKey || evt.ctrlKey || evt.metaKey) {
      return;
    }
    if (evt.which === 27) {
      evt.preventDefault();
      if (this.started) {
        return this.pauseGame();
      } else {
        return this.startGame();
      }
    }
    if (!this.started) {
      return;
    }
    
    evt.preventDefault();
    
    this.processKeyHit(String.fromCharCode(evt.keyCode));
  },

  // ##############
  // ### Logic ####
  // ##############

  refresh: function () {
    this.date = new Date();
    if (this.breakvalue) {
      this.breakUpdate();
    } else {
      this.sendResponses();
      this.clearFeedback();
      this.clearBubbles();
      this.processEvent();
      this.updateTimeScale();
      this.renderDynamic();
    }
  },

  processKeyHit: function (key) {
    // interval has to be added because the timeScale is one interval late
    var current = this.accuracyOffset,
      bestBubble = false,
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
    if (!bestBubble.beenHit && bestBubble.key === key && bestDiff <= this.accuracyRange) {
      var score = Math.round(this.options.score * Math.sqrt(1 - (bestDiff/this.accuracyRange)));
      this.trigger('score', {score: score, bubble: bestBubble});
      bestBubble.beenHit = true;
      bestBubble.offset = bestOffset;

      this.bubbleEvent();
      this.combo.push(1);
    } else {
      this.combo.push(0);
    }

    keyNum = this.options.keys.indexOf(key);
    // add response to buffer
    this.responses.push({
      cueId: bestBubble.id,
      eventTimestamp: this.date.getTime() - this.startDate.getTime(),
      eventType: (bestBubble.beenHit ? 'press-hit' : 'press-key'),
      eventValue: keyNum + 1,
      eventDist: bestOffset,
      eventSpeed: this.speedFactor,
    });
    
    // give visual feeback
    this.feedback(keyNum, bestBubble.beenHit);
  },

  processEvent: function () {
    if (this.options.events.length === 0)
      return;
    
    if (this.options.events[0].type === 'dialog' && this.currentBubbles.length === 0) {
      var evt = this.options.events.shift(),
          text = evt.value,
          sep = '//',
          idx = text.indexOf(sep);
      
      this.breakvalue = {
        title: (idx >= 0 ? text.substring(0, idx) : "BREAK"),
        text: (idx >= 0 ? text.substring(idx + sep.length) : text),
        time: evt.duration,
      }
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
  },

  createBubble: function (evt, date) {
    // adjust speed
    var speedChange = this.adjustSpeed();
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
    };
    
    // push event appeared
    this.responses.push({
      cueId: newBubble.id,
      eventTimestamp: this.date.getTime() - this.startDate.getTime(),
      eventType: 'cue-created',
      eventValue: newBubble.keyNumber + 1,
      eventDist: 0,
      eventSpeed: this.speedFactor,
    });

    return newBubble;
    },

  clearBubbles: function () {
    this.currentBubbles = _.filter(this.currentBubbles, function (bubble) {
      var kept = this.timeScale(bubble.date.getTime()) + this.accuracyOffset + this.accuracyRange + .1 > 0;
      if (!kept) {
        // adjust combo
        if(!bubble.beenHit)
          this.combo.push(0);

        // push event disappeared
        this.responses.push({
          cueId: bubble.id,
          eventTimestamp: this.date.getTime() - this.startDate.getTime(),
          eventType: 'cue-disappear',
          eventValue: bubble.keyNumber + 1,
          eventDist: 0,
          eventSpeed: this.speedFactor,
        });
      }
      return kept;
    }, this);
  },
  
  adjustSpeed: function() {
    var speedChange = 0;
    // recompute speedFactor
    if(this.options.adaptativeSpeed && this.combo.length > this.options.comboWindow) {
      var sum = 0;

      for(var i = 0; i < this.combo.length; i++)
        sum += this.combo[i];
      
      var ratio = sum / this.combo.length;

      this.combo = [];

      if(ratio > this.options.speedUpTrigger)
        speedChange = this.options.speedRatio;

      if(ratio < this.options.speedDownTrigger && this.speedFactor > this.options.lowestSpeedFactor)
        speedChange = 1 / this.options.speedRatio;
      
      console.log('speedChange: ' + speedChange);

      if(speedChange) {
        this.responses.push({
          cueId: -1,
          eventTimestamp: this.date.getTime() - this.startDate.getTime(),
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
    this.accuracyRange = this.options.baseAccuracyRange;
    this.accuracyOffset = this.options.baseAccuracyOffset;
    return speedChange;
  },

  readjustBubbleDate: function () {
    var diff = new Date().getTime() - this.pausedTime.getTime();
    _.each(this.currentBubbles, function (o) {
      o.date = new Date(o.date.getTime() + diff);
    });
  },

  updateTimeScale: function () {
    this.timeScale
      .domain([this.date, new Date(this.date.getTime() + this.timeToShow)]);
  },

  breakUpdate: function() {
    this.breakvalue.time = this.breakvalue.time - this.options.interval;
    if (this.breakvalue && this.breakvalue.time > 0)
      this.displayText(this.breakTemplate({
        title: this.breakvalue.title,
        text: this.breakvalue.text,
        minutes: Math.round(this.breakvalue.time / 60000), 
        seconds: ((this.breakvalue.time % (60000)) / this.options.timeUnit).toFixed(0),
      }));
    else {
      this.removeText();
      this.pauseGame(this.breakvalue);
      this.breakvalue = false;
    }
  },

  // ################
  // ### Network ####
  // ################

  sendResponses: function() {
    if(this.responses.length >= this.options.batchSize || (this.responses.length > 0 && this.ended)) {
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
    this.renderTarget();
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
    this.feedbackDate = new Date(new Date().getTime() + 100);
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
    var that = this;
    if(this.feedbackOn && this.feedbackDate.getTime() < new Date().getTime()) {
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
          .style({'z-index': (that.zIndexScale(z) - 10),})
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
              'opacity': 0,        
            });
          
          if (that.options.showLetters) {
            this.textContent = d.key;
            node.style({
              color: that.options.letterColor,
            });
          }
        })
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
            .style({'z-index': that.zIndexScale(z),})
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
              'margin-top': -r*2 + 'px',
              'margin-left': -r + 'px',
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
  },

  // --------------------
  // --- Static Rendering
  // --------------------

  renderStatic: function() {
    this.updateTimeScale();
    this.renderGrass();
    this.renderVerticals();
    this.renderCircles();
    this.renderDynamic();
  },
  
  layout: function () {
    var
      w = this.$el.width() || 848,
      h = this.$el.height() || 518,
      s = Math.min(w, h);

    this.xScale
      .range([0, w]);

    this.yScale
      .range([-h * this.options.infinityOffset, h]);

    d3.select(this.el).select('.ground').select('svg')
      .attr('width', w)
      .attr('height', h);
    
    this.maxBubbleSize = w / (2*this.options.ratioBubble);
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
      zfar = this.accuracyOffset + this.accuracyRange,
      znear = this.accuracyOffset - this.accuracyRange,
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
      z = this.accuracyOffset,
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
      .style({
        'border-width': opts.circleSize + 'px',
        'width': r*2 + 'px',
        'height': r*2 + 'px',
        'z-index': that.zIndexScale(z),
        'top': that.yScale(p) + 'px',
        'margin-top': -r*2 + 'px',
        'margin-left': -r + 'px'
      })
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
      .selectAll('.text')
        .style('font-size', function() {
          return (r/5) + 'px';
        });

    // Exit
    circles
      .exit()
      .remove();
  },
});
