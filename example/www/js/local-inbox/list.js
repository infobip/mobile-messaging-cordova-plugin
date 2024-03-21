/**
 * Created by aberezhnoy on 13/07/2017.
 */

(function(global) {
    var utils = global.utils;

    var ListView = function() {
        this.init.apply(this, arguments);
    };

    ListView.prototype = {
        rootNode: null,
        model: null,
        renderer: null,
        _afterRender: null,

        init: function(model) {
            this.model = model;
            this.rootNode = utils.fromTemplate("list");

            this.renderer = function(item) {
                var itemNode = utils.fromTemplate("list-item");
                itemNode.appendChild(utils.textNode(item));

                return itemNode;
            }
        },

        // now it redraw all the list
        render: function() {
            var _this = this;
            var model = this.model;
            var rootNode = this.rootNode;
            rootNode.innerHTML = "";

            model.forEach(function(item) {
                var newNode = _this.renderer(item);
                rootNode.appendChild(newNode);
            });

            if (this._afterRender) {
                this._afterRender();
            }

            return rootNode;
        },

        itemRenderer: function(renderer) {
            this.renderer = renderer;
        },

        afterRender: function(handler) {
            this._afterRender = handler;
        }
    };

    global.ListView = ListView;
})(ibglobal);
