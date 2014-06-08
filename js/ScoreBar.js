var ScoreBar = Backbone.View.extend({

  template: '<div class="score"></div><div class="hits"></div>',

  scoreTemplate: _.template('<%= model.get("score") %>pts / <%= model.get("percent") %>%'),
  hitsTemplate: _.template('<%= model.get("speed") %>x / Hits: <%= model.get("hits") %>'),

  initialize: function () {
    this.build();
    this.attach();
    this.render();
  },
  
  build: function () {
    this.$el.html(this.template);
    this.$score = this.$('.score');
    this.$hits = this.$('.hits');
  },

  attach: function () {
    this.listenTo(this.model, 'change', this.onScoreChange);
  },

  onScoreChange: function () {
    this.render();
  },

  render: function () {
    this.$score.text(this.scoreTemplate({model: this.model}));
    this.$hits.text(this.hitsTemplate({model: this.model}));
  }
});
