var Hero = Backbone.View.extend({
  initialize: function () {
    this.model = new Backbone.Model({
      start: new Date(),
      score: 0,
      hits: 0
    });
    this.$body = $('body');
    
    this.build();
    this.attach();
  },

  build: function () {
    this.game = new Game({
      el: $('.game')
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
    if (this.controllerBar) {
      this.listenTo(this.controllerBar, 'press', this.onControllerBarPress);
    }
  },

  onGameScore: function (evt) {
    this.model.set({
      score: this.model.get('score') + evt.score,
      hits: this.model.get('hits') + 1
    });
  },

  onControllerBarPress: function (evt) {
    this.game.processKeyHit(evt.key);
  },


});

$(function () {
  window.hero = new Hero();
  window.scrollTo(0,1);
});
