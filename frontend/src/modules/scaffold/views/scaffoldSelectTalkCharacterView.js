define(['core/origin', 'backbone-forms'], function (Origin, BackboneForms) {
  var ScaffoldSelectTalkCharacterView = Backbone.Form.editors.Base.extend({

    className: 'scaffold-select-talk-character-editor',

    events: {
      'change #_selectTalkCharacter': 'updateCharacterName'
    },

    initialize: function (options) {
      Backbone.Form.editors.Base.prototype.initialize.call(this, options);
      this.template = options.template || this.constructor.template;
    },

    preRender: function () {
      var characters = [];
      var charIndex = 1;
      $('.component-edit-inner [data-key="properties"] .field-talk-characters .list-items .list-item').each(function () {
        $(this).find('div[name="_characters"] > div').each(function () {
          var title = $(this).find('[data-id="name"] .list-item-value').text();
          if (title) {
            characters.push({ title: title, characterID: charIndex });
            charIndex += 1;
          }
        });
      });
      this.characters = characters;
    },

    render: function () {
      this.preRender();
      this.$el.append(Handlebars.templates[this.constructor.template](this));
      this.setValue(this.value);
      this.postRender();
      return this;
    },

    postRender: function () {
      this.updateCharacterName();
    },

    updateCharacterName: function() {
      this.form.fields['_characterName'].editor.setValue(this.characters[this.getValue()-1]['title']);
    },

    setValue: function (value) {
      this.$el.find('#_selectTalkCharacter').val(value);
    },

    getValue: function () {
      var val = this.$el.find('#_selectTalkCharacter').val();
      return val;
    },

    remove: function () {
      Backbone.View.prototype.remove.apply(this, arguments);
    }

  }, { template: 'scaffoldSelectTalkCharacter' });

  Origin.on('origin:dataReady', function () {
    Origin.scaffold.addCustomField('SelectTalkCharacter', ScaffoldSelectTalkCharacterView);
  });

  return ScaffoldSelectTalkCharacterView;

});
