(function(global) {
    global.utils = {
        fromTemplate: function(name) {
            var tmpl = document.getElementById(name);

            if (!tmpl) {
                return null;
            }

            var newNode = tmpl.cloneNode(true);
            newNode.classList.remove("template");
            newNode.removeAttribute("id");

            return newNode;
        },

        textNode: function(text) {
            return document.createTextNode(text);
        },

        timeFromTimestamp: function(timestamp) {
            var date = new Date(timestamp);
            return  date.getHours() + ":" + date.getMinutes();
        },

        log: function(message) {
            console.log(message);
        }
    };
})(ibglobal);