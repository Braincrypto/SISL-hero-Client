var Game = Backbone.View.extend({
  className: 'goals-timeline',

  template: 
    '<div class="scene">' +
      '<div class="horizon"></div>' +
      '<div class="ground">' +
        '<svg width="0" height="0">' +
          '<defs>' +
            '<linearGradient id="goal-timeline-grad" x1="0" y1="0" x2="0" y2="100%">' +
              '<stop offset="0%" stop-color="#4d4f53" />' +
              '<stop offset="20%" stop-color="#666" />' +
              '<stop offset="100%" stop-color="#666" />' +
            '</linearGradient>' +
          '</defs>' +
          '<path class="grass" d="M 0,0 L 0,0 L 0,0, L 0,0 z" fill="url(#goal-timeline-grad)"/>' +
          '<path class="verticals" />' +
        '</svg>' +
      '</div>' +
    '</div>' +
    '<div class="paused-text-container"><div class="paused-text">~ PAUSED ~</div></div>',

  options: {
    endPoint: '/~ehrhardn/cgi-bin/server.cgi/',
    token: 'default',

    // ### Bubbles
    // - color (init later)
    bubbleColor: [],

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
    numMarkers: 12,
    maxBubbleSize: 100,
    timeToShow: 6000, // 12 seconds
    interval: 65,
    minTimeBetween: 750,
    maxTimeBetween: 1250,
    timeUnit: 1000,
    accuracy: 250,
    accuracyOffset: 100,
    score: 2500,
  },

  events: {
  },

  initialize: function () {
    var that = this;
    this.date = new Date();
    this.data = [];
    this.$document = $(document);
    this.$window = $(window);
    this.$body = $('body');
    this.$el.html(this.template);
    
    this.bubbleIndex = 0;
    this.responses = [];

    this.loadParam(function () {
      that.setup();
      that.layout();
      that.attach();
      that.render();
    });
  },

  loadParam: function(process) {
    var that = this;
    
    // perform sync call with ajax
    jQuery.ajaxSetup({async:false});
    
    this.options.token = decodeURI(
      (RegExp('token=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    )
    
    // get config file
    jQuery.getJSON(this.options.endPoint + 'user/' + this.options.token + '/challenge', function(data) {
      $.extend(that.options, data);
    })
    process();
  },  

  setup: function () {
    console.log(this.options.keys.length);

    this.timeScale = d3.time.scale().range([0, 1]);

    this.scoreScale = d3.scale.sqrt()
      .domain([this.options.accuracy, 0])
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
      .domain([-0.9, 0.9]);

    this.yScale = d3.scale.linear()
      .domain([0, 1]);

    this.projectionScale = d3.scale.linear()
      .domain([-0.01, 1.0])
      .range([1.00, 25]);

    if (this.options.bubbleColor.length === 0)
      this.options.bubbleColor = d3.scale.category10().range().slice(0, this.options.keys.length);
 },

  // ################
  // ### Actions ####
  // ################
  
  start: function () {
    if (!this.started && !this.end) {
      this.started = true;
      this.layout();
      if (this.pausedTime && this.data.length) {
        this.adjustDataForStoppedTime();
      }
      this.refresh();
      this.interval = window.setInterval(this.onInterval, this.options.interval);
      this.removeText();
    }
  },

  adjustDataForStoppedTime: function () {
    var diff = new Date().getTime() - this.pausedTime.getTime();
    _.each(this.data, function (o) {
      o.date = new Date(o.date.getTime() + diff);
    });
  },

  pauseGame: function () {
    if (this.started && !this.end) {
      window.clearInterval(this.interval);
      this.displayText('~ PAUSE ~<br/>(ESC to continue)');
      this.started = false;
      this.pausedTime = new Date();
    }
  },
  
  endGame: function () {
    if (this.started) {
      window.clearInterval(this.interval);
      this.displayText('~ END OF TRAINING ~');
      this.end = true;
      this.endTime = new Date();
    }
  },

  onInterval: function () {
    if(this.data.length === 0 && this.options.patternkeys.length === 0) {
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
        return this.start();
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

  processKeyHit: function (key) {
    var current = new Date().getTime() + this.options.accuracyOffset,
      high = current + this.options.accuracy,
      low = current - this.options.accuracy,
      bestBubble = false,
      highScore,
      score,
      offset,
      diff,
      bubble;
    if (this.options.keys.indexOf(key) !== -1) {
      for (var i = 0; i < this.data.length; i++) {
        bubble = this.data[i];
        if (bubble.timeStamp > high) {
          break;
        }
        if (!bubble.beenHit && bubble.key === key && bubble.timeStamp >= low && bubble.timeStamp <= high) {
          offset = current - bubble.timeStamp;
          diff = Math.abs(offset);
          score = this.scoreScale(diff);
          if (!bestBubble || score > highScore) {
            highScore = score;
            bestBubble = bubble;
          }
        }
      }
    }
    if (bestBubble) {
      this.trigger('score', {score: highScore, bubble: bestBubble});
      bestBubble.beenHit = true;
      bestBubble.offset = offset;
    }
  },

  addMoreBubbles: function () {
    if (this.options.patternkeys.length === 0)
      return;

    var last = _.last(this.data),
      date = new Date(new Date().getTime() + this.options.timeToShow),
      bubble;
    
    if (!last) {
      var i = this.options.patternkeys.shift();
      bubble = this.createBubble(this.bubbleIndex, i, date);
    } else {
      bubbleDifference = date.getTime() - last.date.getTime();
      if (bubbleDifference > this.options.patterntime[this.bubbleIndex] * this.options.timeUnit) {
        var i = this.options.patternkeys.shift();
        bubble = this.createBubble(this.bubbleIndex, i, date);
      }
    }
    if (bubble) {
      this.data.push(bubble);
      this.bubbleIndex++;
    }
  },

  createBubble: function (id, i, date) {
    return {
      date: date,
      timeStamp: date.getTime(),
      i: i,
      key: this.options.keys[i],
      color: this.options.bubbleColor[i],
      id: id
    }
  },

  cleanData: function () {
    var currentMax = this.date.getTime() - 1000;//+ this.options.accuracyOffset + this.options.accuracy;
    this.data = _.filter(this.data, function (o) {
      var kept = o.date.getTime() > currentMax;
      if(!kept) {
        this.responses.push({
          id: o.id,
          timestamp: o.timestamp,
          beenHit: o.beenHit,
          offset: o.beenHit ? o.offset: null,
        });
      }
      return kept;
    }, this);
    if (!this.breakStarted && !this.data.length && this.options.patterntime[this.bubbleIndex] > 2*this.options.timeToShow) {
      this.breakStarted = true;
      this.breakTime = this.options.patterntime[this.bubbleIndex];
    }
  },

  refresh: function () {
    this.date = new Date();
    if (this.breakStarted) {
      this.breakTime = this.breakTime - this.options.interval;
      if (this.breakTime > 0)
        this.displayText(
          "~ BREAK ~<br/>" + 
          "Time Left: " + 
          Math.round(this.breakTime / 60000) + ":" + 
          ((this.breakTime % (60000)) / this.options.timeUnit).toFixed(0) + 
          "<br/>" +
          "(Will be in paused state after this period)"
          );
      else {
        this.breakStarted = false;
        this.removeText();
        this.pauseGame()
      }
    } else {
      this.cleanData();
      this.addMoreBubbles();
      this.render();
    }
  },

  // ####################
  // #### Rendering #####
  // ####################

  layout: function () {
    var
      w = this.$el.width() || 848,
      h = this.$el.height() || 518,
      s = Math.min(w, h);

    this.xScale
      .range([0, w]);

    this.yScale
      .range([h*0.125, h]);

    d3.select(this.el).select('.ground').select('svg')
      .attr('width', w)
      .attr('height', h);
  },
  
  interpretData: function () {
    this.timeScale
      .domain([this.date, new Date(this.date.getTime() + this.options.timeToShow)]);
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

  renderGround: function () {
    var
      that = this,
      opts = this.options,
      ticks = this.timeScale.ticks(d3.time.seconds, 1),
      format = this.timeScale.tickFormat(d3.time.seconds, 1),
      markers;

    d3.select(this.el).select('.horizon')
      .style('top', function () {
        var
          z = that.timeScale(new Date(that.date.getTime() + (that.options.accuracyOffset/2))),
          p = 1 / that.projectionScale(z);
        return Math.ceil(that.yScale(p)) + 'px';
      });

    d3.select(this.el).select('.grass')
      .attr('d', function () {
        var
          near = 1/that.projectionScale.range()[0],
          far = 1/that.projectionScale.range()[1];

        return (
          'M ' + that.xScale(0) + ',' + that.yScale(0) + ' ' +
          'L ' + that.xScale( 1*near) + ',' + that.yScale(near) + ' ' +
          'L ' + that.xScale(-1*near) + ',' + that.yScale(near) + ' ' +
          'z'
        );
      });

    d3.select(this.el).select('.verticals')
      .attr('d', function () {
        var
          near = 1/that.projectionScale.range()[0],
          far = 1/that.projectionScale.range()[1],
          delta = 2/(that.options.keys.length + 1)
          segs = [];

        for(var i = 1; i <= that.options.keys.length; i++) {
          segs.push(
            'M ' + that.xScale(0) + ',' + that.yScale(0) + ' ' +
            'L ' + that.xScale(near * (-1 + i * delta) ) + ',' + that.yScale(near)
          );
        }

        return segs.join(' ');
      });

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
        var
          z = that.timeScale(d),
          p = 1 / that.projectionScale(z);
        return that.markerOpacityScale(z);
      })
      .style('z-index', function (date, i, a) {
        return that.zIndexScale(that.timeScale(date)) - 2;
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
        return that.xScale(-1*p) + 'px';
      })
      .style('font-size', function (d) {
        var
          z = that.timeScale(d),
          p = 1 / that.projectionScale(z);
        return (p*35) + 'px';
      });

    markers.exit()
      .remove();
  },

  renderBubbles: function () {
    var
      that = this,
      opts = this.options,
      bubbles;

    // Data
    bubbles = d3.select(this.el).selectAll('.bubble')
      .data(this.data, function (d) {
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
            r = that.options.maxBubbleSize * p,
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
        .style('opacity', 1e-3);

    // Update
    bubbles
      .attr('data-r', function (d, i) {
        var
          z = that.timeScale(d.date),
          p = 1 / that.projectionScale(z),
          r = Math.max(~~(that.options.maxBubbleSize * p), 0.01);

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
          r = that.options.maxBubbleSize * p;
        return that.yScale(p) + 'px';
      })
      .style('left', function (d, i) {
        var
          division = 2 / (that.options.keys.length + 1),
          z = that.timeScale(d.date),
          p = 1 / that.projectionScale(z),
          r = that.options.maxBubbleSize * p,
          c = -1 + ((d.i%that.options.keys.length) + 1) * division;
        return that.xScale(c*p) + 'px';
      })
      .style('margin-top', function (d) {
        var
          z = that.timeScale(d.date),
          p = 1 / that.projectionScale(z),
          r = that.options.maxBubbleSize * p;
        return -r*2 + 'px';
      })
      .style('margin-left', function (d) {
        var
          z = that.timeScale(d.date),
          p = 1 / that.projectionScale(z),
          r = that.options.maxBubbleSize * p;
        return -r + 'px';
      });


    // Exit
    bubbles
      .exit()
      .remove();
  },
});
