var Hero = Backbone.View.extend({
  initialize: function () {
    console.log('starting hero');
    this.model = new Backbone.Model({
      start: new Date(),
      score: 0,
      hits: 0,
      speed: 1,
    });
    this.$body = $('body');
    this.build();
    this.attach();
  },

  build: function () {
    this.game = new Game({
      el: $('.game'),
      token: this.options.token,
    });

    this.scoreBar = new ScoreBar({
      el: $('.score-bar'),
      model: this.model
    });

    _.defer(function (that) {
      that.game.instructionGame();
    }, this);
  },
  
  attach: function () {
    this.listenTo(this.game, 'score', this.onGameScore);
    this.listenTo(this.game, 'speed', this.onGameSpeed);
    this.listenTo(this.game, 'end', this.onEnd);
    
    if (this.controllerBar) {
      this.listenTo(this.controllerBar, 'press', this.onControllerBarPress);
    }
  },

  onGameScore: function (evt) {
    this.model.set({
      score: this.model.get('score') + evt.score,
      hits: this.model.get('hits') + 1,
    });
  },
  
  onGameSpeed: function (evt) {
    this.model.set({
      speed: evt.speed
    });
  },

  onControllerBarPress: function (evt) {
    this.game.processKeyHit(evt.key);
  },

  onEnd: function (evt) {
    console.log('exiting hero');
    if(this.options.callback)
      this.options.callback();
  }
});

