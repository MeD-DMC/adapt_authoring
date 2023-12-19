define([
  'core/origin'
], function () {
  CKEDITOR.ui.prototype.space = function(name) {
    var id = '#' + this.spaceId(name);
    var spaceElem = this.editor.container.findOne(id);
    return spaceElem;
  }
});
