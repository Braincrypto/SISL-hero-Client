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
    '<div class="paused-text-container"><div class="paused-text"><div class="big">~ LOADING ~</div></div></div>'),

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
    '<div class="big">~ BREAK ~</div><br/>' + 
    'Time Left: ' + 
    '<%= minutes %>:' + 
    '<%= seconds %>:' + 
    '<br/>' +
    '(Will be in paused state after this period)'
  ),

  pauseTemplate: _.template(
    '<div class="big">~ PAUSE ~</div>' +
    '(ESC to continue)<br/><br/>' +
    '(Keys in game: <%= keys %>)'
  ),

  endTemplate: _.template('<div class="big">~ END OF GAME ~<div>'),
  
  loadingTemplate: _.template('<div class="big">~ LOADING GAME ~<div>'),

  // #################
  // Runtime variables
  // #################
  
  // runtime variables
  currentBubbles: [],
  date: new Date(),
  bubbleIndex: 0,
  speedFactor: 1,
  timeToShow: 6000, // 12 seconds
  accuracyRange: 100,
  accuracyOffset: 100,
  
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
    endPoint: 'http://127.0.0.1:5000',
    //endPoint: 'http://stanford.edu/~ehrhardn/cgi-bin/server.cgi',
    
    // ### IDs
    token: 'default',
    stepNumber: 0,

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
    patternkeys: [],
    patterntime: [],
    
    adaptiveSpeed: false,
    
    // ### Design
    numMarkers: 12,
    middlePadding: .5,

    // ### Time
    baseTimeToShow: 6000, // 6 seconds
    interval: 65,
    timeUnit: 1000,
    baseAccuracyRange: 100,
    baseAccuracyOffset: 100,
    
    // ### Other
    score: 2500,
  },

  events: {
  },

  initialize: function () {
    var that = this;
    this.$document = $(document);
    this.$window = $(window);
    this.$body = $('body');
    this.$el.html(this.sceneTemplate({green: this.options.goodColor, red: this.options.badColor}));
    this.displayText(_.loadingTemplate);
   
    this.loadParam(function () {
      that.setup();
      that.layout();
      that.attach();
      that.renderStatic();
      that.render();
    });
  },

  loadParam: function(process) {
    var that = this;
    
    // perform sync call with ajax on cross domain using CORS
    jQuery.ajaxSetup({async:false});

    this.options.token = decodeURI(
      (RegExp('token=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    )
    this.options.token = this.options.token.replace('/', '');
    
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

    this.scoreScale = d3.scale.sqrt()
      .domain([this.accuracyRange, 0])
      .rangeRound([0, this.options.score]);

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
      .domain([-0.01, 1.0])
      .range([1.00, 10]);

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

  pauseGame: function () {
    if (this.started && !this.ended) {
      window.clearInterval(this.interval);
      this.displayText(this.pauseTemplate({keys: this.options.keys.toString()}));
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
    }
  },

  onInterval: function () {
    if(this.currentBubbles.length === 0 && this.options.patternkeys.length === 0) {
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
    this.renderGround();
    this.renderStatic();
  },

  onKeydown: function (evt) {
    if (evt.altKey || evt.ctrlKey || evt.metaKey) {
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
    if (this.breakStarted) {
      this.breakUpdate();
    } else {
      this.sendResponses();
      this.clearFeedback();
      this.cleanData();
      this.breakCheck();
      this.addMoreBubbles();
      this.render();
    }
  },

  processKeyHit: function (key) {
    var current = new Date().getTime() + this.accuracyOffset,
      high = current + this.accuracyRange,
      low = current - this.accuracyRange,
      bestBubble = false,
      offset,
      bestOffset,
      diff,
      bestDiff,
      bubble;

    // Looking at all the possible bubbles to report error
    for (var i = 0; i < this.currentBubbles.length; i++) {
      bubble = this.currentBubbles[i];
      offset = current - bubble.date.getTime();
      diff = Math.abs(offset);
     
      if(!bestBubble || diff < bestDiff) {
        bestBubble = bubble;
        bestDiff = diff;
        bestOffset = offset;
      }
    }

    // Update key if has been hit
    if (!bestBubble.beenHit && bestBubble.key === key && bestDiff <= this.accuracyRange) {
      var score = this.scoreScale(bestDiff);
      this.trigger('score', {score: score, bubble: bestBubble});
      bestBubble.beenHit = true;
      bestBubble.offset = bestOffset;

      this.combo.push(1);
    } else {
      this.combo.push(0);
    }

    keyNum = this.options.keys.indexOf(key);
    // add response to buffer
    this.responses.push({
      eventType: 'press-key',
      eventTimestamp: this.date.getTime(),
      speedFactor: this.speedFactor,
      speedChange: 0,
      key: keyNum + 1,
      hit: bestBubble.beenHit,
      offset: bestOffset,
      closestKey: bestBubble.keyNumber + 1,
      queuePosition: bestBubble.id
    });
    
    // give visual feeback
    this.feedback(keyNum, bestBubble.beenHit);
  },

  addMoreBubbles: function () {
    if (this.options.patternkeys.length === 0)
      return;

    var last = _.last(this.currentBubbles),
      date = new Date(new Date().getTime() + this.timeToShow),
      bubble;
    
    if (!last) {
      var i = this.options.patternkeys.shift();
      bubble = this.createBubble(this.bubbleIndex, i, date);
    } else {
      bubbleDifference = date.getTime() - last.date.getTime();
      if (bubbleDifference > this.options.patterntime[this.bubbleIndex] * this.options.timeUnit / this.speedFactor) {
        var i = this.options.patternkeys.shift();
        bubble = this.createBubble(this.bubbleIndex, i, date);
      }
    }
    if (bubble) {
      this.currentBubbles.push(bubble);
      this.bubbleIndex++;
    }
  },

  createBubble: function (id, i, date) {
    // adjust speed
    var speedChange = this.readjustSpeed();

    // create bubble
    var newBubble = {
      id: id,
      date: date,
      keyNumber: i,
      key: this.options.keys[i],
      color: this.options.bubbleColor[i],
      beenHit: false,
    };
    
    // push event appeared
    this.responses.push({
      eventType: 'bubble-appeared',
      eventTimestamp: this.date.getTime(),
      speedFactor: this.speedFactor,
      speedChange: speedChange,
      key: newBubble.keyNumber + 1,
      hit: false,
      offset: 0,
      closestKey: 0,
      queuePosition: newBubble.id
    });

    return newBubble;
    },

  cleanData: function () {
    this.currentBubbles = _.filter(this.currentBubbles, function (bubble) {
      var kept = bubble.date.getTime() + this.accuracyOffset + this.accuracyRange + 100 > this.date.getTime();
      if (!kept) {
        // adjust combo
        this.combo.push(0);

        // push event disappeared
        this.responses.push({
          eventType: 'bubble-disappeared',
          eventTimestamp: this.date.getTime(),
          speedFactor: this.speedFactor,
          speedChange: 0,
          key: bubble.keyNumber + 1,
          hit: false,
          offset: 0,
          closestKey: 0,
          queuePosition: bubble.id
        });
      }
      return kept;
    }, this);
  },
  
  readjustSpeed: function() {
    var speedChange = 0;
    // recompute speedFactor
    if(this.options.adaptativeSpeed && this.combo.length > this.options.comboWindow) {
      var sum = 0;
      for(var i = 0; i < this.combo.length; i++)
        sum += this.combo[i];
      
      var ratio = sum / this.combo.length;

      this.combo = [];

      if(ratio > this.options.speedUpTrigger)
        speedChange = this.options.speedUpInc;

      if(ratio < this.options.slowDownTrigger && this.speedFactor > this.options.lowestSpeedFactor)
        speedChange = this.options.slowDownDec;

      this.speedFactor += speedChange;
      console.log('Performance ratio: ' + ratio + ', Speed: ' + this.speedFactor);
    }
    
    this.timeToShow = this.options.baseTimeToShow / this.speedFactor;
    this.accuracyRange = this.options.baseAccuracyRange / this.speedFactor;
    this.accuracyOffset = this.options.baseAccuracyOffset / this.speedFactor;
    return speedChange;
  },

  readjustBubbleDate: function () {
    var diff = new Date().getTime() - this.pausedTime.getTime();
    _.each(this.currentBubbles, function (o) {
      o.date = new Date(o.date.getTime() + diff);
    });
  },

  breakCheck: function() {
    if (!this.breakStarted && !this.currentBubbles.length && this.options.patterntime[this.bubbleIndex] * this.options.timeUnit > this.timeToShow) {
      this.breakStarted = true;
      this.breakTime = this.options.timeUnit * this.options.patterntime[this.bubbleIndex];
    }
  },

  breakUpdate: function() {
    this.breakTime = this.breakTime - this.options.interval;
    if (this.breakTime > 0)
      this.displayText(breakTemplate({
        minutes: Math.round(this.breakTime / 60000), 
        seconds: ((this.breakTime % (60000)) / this.options.timeUnit).toFixed(0)
      }));
    else {
      this.breakStarted = false;
      this.removeText();
      this.pauseGame()
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
          stepNumber: this.options.stepNumber,
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
  
  interpretData: function () {
    this.timeScale
      .domain([this.date, new Date(this.date.getTime() + this.timeToShow)]);
  },

  render: function () {
    this.interpretData();
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
    this.feedbackDate = new Date(new Date().getTime() + this.accuracyRange);
    this.feedbackOn = true;
    this.feedbackKey = numKey;
    
    var fill = 'url(#target-zone-grad-bad)';
    var circle = this.options.badColor;
    if (answer) {
      fill = 'url(#target-zone-grad-good)';
      circle = this.options.goodColor;
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
      ticks = this.timeScale.ticks(d3.time.seconds, 1),
      format = this.timeScale.tickFormat(d3.time.seconds, 1),
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
      .style('opacity', function (d) {
          z = that.timeScale(d),
          p = 1 / that.projectionScale(z);
        return that.markerOpacityScale(z);
      })
      .style('z-index', function (date, i, a) {
        return that.zIndexScale(that.timeScale(date)) - 10;
      })
      .style('top', function (d) {
        var
          z = that.timeScale(d),
          p = 1 / that.projectionScale(z);
        return that.yScale(p) + 'px';
      })
      .style('left', function (d) {
        var
          z = that.timeScale(d),
          p = 1 / that.projectionScale(z);
        return that.xScale(-1*p) + 'px';
      })
      .style('right', function (d) {
        var
          z = that.timeScale(d),
          p = 1 / that.projectionScale(z);
        return (that.xScale.range()[1] - that.xScale(p)) + 'px';
      })
      .style('font-size', function (d) {
        var
          z = that.timeScale(d),
          p = 1 / that.projectionScale(z);
        return (p*35) + 'px';
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
        .attr('data-r', function (d) {
          var
            z = that.timeScale(d.date),
            p = 1 / that.projectionScale(z),
            r = that.maxBubbleSize * p,
            $this = $(this);
          this.$this = $this;
          $this.css({
            fontSize: that.options.letterSize * r,
            width: r*2,
            height: r*2,
            backgroundColor: d.color          
          });

          if (that.options.showLetters) {
            this.textContent = d.key;
            $this.css({
              color: that.options.letterColor,
            });
          
          }
          
          return r;
        })
        .style('opacity', 1e-3)
        .append('span')
          .attr('class', 'shadow');

    // Update
    bubbles
      .attr('data-r', function (d, i) {
        var
          z = that.timeScale(d.date),
          p = 1 / that.projectionScale(z),
          r = Math.max(~~(that.maxBubbleSize * p), 0.01);

          this.$this.css({
            fontSize: r,
            width: r*2,
            height: r*2,
          });
          if (d.beenHit && !d.classAdded) {
            d.classAdded = true;
            this.$this.addClass('has-been-hit');
          }
          return r;
      })
      .style('opacity', function (d) {
        var
          z = that.timeScale(d.date),
          p = 1 / that.projectionScale(z);
        return that.opacityScale(z);
      })
      .style('z-index', function (d, i, a) {
        return that.zIndexScale(that.timeScale(d.date));
      })
      .style('top', function (d) {
        var
          z = that.timeScale(d.date),
          p = 1 / that.projectionScale(z),
          r = that.maxBubbleSize * p;
        return that.yScale(p) + 'px';
      })
      .style('left', function (d, i) {
        var
          division = 2 / (that.options.keys.length + 1 + that.options.middlePadding),
          z = that.timeScale(d.date),
          p = 1 / that.projectionScale(z),
          r = that.maxBubbleSize * p;
          if (d.keyNumber < (that.options.keys.length / 2))
            c = -1 + (d.keyNumber + 1) * division;
          else
            c = 1 - (that.options.keys.length - d.keyNumber) * division;
        return that.xScale(c*p) + 'px';
      })
      .style('margin-top', function (d) {
        var
          z = that.timeScale(d.date),
          p = 1 / that.projectionScale(z),
          r = that.maxBubbleSize * p;
        return -r*2 + 'px';
      })
      .style('margin-left', function (d) {
        var
          z = that.timeScale(d.date),
          p = 1 / that.projectionScale(z),
          r = that.maxBubbleSize * p;
        return -r + 'px';
      });


    // Exit
    bubbles
      .exit()
      .remove();
  },

  // --------------------
  // --- Static Rendering
  // --------------------

  renderStatic: function() {
    this.interpretData();
    this.renderGrass();
    this.renderVerticals();
    this.renderTarget();
    this.renderCircles();
  },
  
  layout: function () {
    var
      w = this.$el.width() || 848,
      h = this.$el.height() || 518,
      s = Math.min(w, h);

    this.xScale
      .range([0, w]);

    this.yScale
      .range([-h*0.1, h]);

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
      opts = this.options,
      zfar = this.timeScale(new Date(this.timeScale.domain()[0].getTime() + opts.baseAccuracyOffset + opts.baseAccuracyRange)),
      znear = this.timeScale(new Date(this.timeScale.domain()[0].getTime() + opts.baseAccuracyOffset - opts.baseAccuracyRange)),
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
      z =  that.timeScale(new Date(that.timeScale.domain()[0].getTime() + opts.baseAccuracyOffset)),
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
