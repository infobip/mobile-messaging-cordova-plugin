/**
 * Created by aberezhnoy on 13/07/2017.
 */

(function(global) {
    var utils = global.utils;

    var Layout = {
        rootNode: null,
        headNode: null,
        titleNode: null,
        contentNode: null,
        naviNode: null,
        busyNode: null,

        init: function() {
            this.rootNode = document.body.querySelector(".app");
            this.headNode = this.rootNode.querySelector(".head");
            this.titleNode = this.headNode.querySelector(".title");
            this.contentNode = this.rootNode.querySelector(".content");
            this.naviNode = this.rootNode.querySelector(".navi");
            this.busyNode = document.body.querySelector(".dialog-busy");
            this.busyNode.parentNode.removeChild(this.busyNode);
            this.busyNode.style.display = "block";
        },

        title: function(newTitle) {
            var textNode = document.createTextNode(newTitle);
            this.titleNode.innerHTML = "";
            this.titleNode.appendChild(textNode);
        },

        addButton: function(name, options, handler) {
            var buttonNode = utils.fromTemplate("navi-button");
            buttonNode.querySelector(".text").appendChild(utils.textNode(options.naviTitle));
            buttonNode.querySelector(".icon").classList.add(options.naviIcon || "icon-folder");

            if (options && options.width) {
                buttonNode.style.width = options.width;
            }

            buttonNode.addEventListener("click", function() {
                handler();
            });
            buttonNode.setAttribute("data-button", name);
            this.naviNode.appendChild(buttonNode);
        },

        setActiveButton: function(name) {
            var currentActiveButton = this.naviNode.querySelector(".navi-button.active");
            if (currentActiveButton) {
                currentActiveButton.classList.remove("active");
            }

            var buttonNode = this.naviNode.querySelector("[data-button=" + name + "]");
            buttonNode.classList.add("active");
        },

        content: function(newContent) {
            var prevContent = [];
            var contentNode = this.contentNode;
            var current = contentNode.firstChild;

            while (current) {
                var next = current.nextSibling;
                contentNode.removeChild(current);
                prevContent.push(current);
                current = next;
            }

            if (newContent) {
                contentNode.appendChild(newContent);
            }

            return prevContent;
        },

        busy: function(isBusy) {
            if (isBusy) {
                this.contentNode.appendChild(this.busyNode);
            } else {
                this.contentNode.removeChild(this.busyNode);
            }
        }
    };

    global.Layout = Layout;
})(ibglobal);
