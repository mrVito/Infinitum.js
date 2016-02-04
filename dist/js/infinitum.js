var Infinitum = (function () {
    "use strict";

    function Infinitum(options, map)
    {
        this.defaults = {
            debug: false,
            template: '#item-template',
            container: 'body',
            contentClass: '',
            spinnerClass: 'loader',
            messageClass: 'message',
            sourceAttr: 'data-load',
            dataPath: 'data',
            nextPagePath: 'next_page',
            offset: 0,
            endMessage: 'No more items to load...'
        };

        this.options = $.extend({}, this.defaults, options);
        this.map = map;
        this.template = this.getTemplateContent();
        this.container = this.getContainer();
        this.placeholderNames = this.getPlaceholderNames();
        this.content = this.insertContent();
        this.spinner = this.insertSpinner();
        this.message = this.insertMessage();
        this.scrollHelper = this.insertScrollHelper();
        this.nextPage = this.parseSource();
        this.loading = false;
        this.canLoad = true;
        this.page = 1;

        this.bindEvents();

        this.check();
    }

    /**
     * Bind event listeners
     */
    Infinitum.prototype.bindEvents = function () {
        $(window).on('scroll', this.check.bind(this));

        this.container.on('infinitum:scrolled-in', this.onScrolledIn.bind(this));
        this.container.on('infinitum:loaded', this.onLoaded.bind(this));
        this.container.on('infinitum:end', this.onEnd.bind(this));
    };

    /**
     * Get container element instance
     *
     * @returns {JQuery|jQuery|HTMLElement}
     */
    Infinitum.prototype.getContainer = function () {
        return $(this.options.container);
    };

    /**
     * Parse data source from attribute
     *
     * @returns {string}
     */
    Infinitum.prototype.parseSource = function () {
        return this.container.attr(this.options.sourceAttr);
    };

    /**
     * Insert content container into main container
     *
     * @returns {JQuery|jQuery|HTMLElement}
     */
    Infinitum.prototype.insertContent = function () {
        var content = $('<div>');
        content.addClass(this.options.contentClass);

        this.container.append(content);

        return content;
    };

    /**
     * Insert scroll-helper element into container
     *
     * @returns {JQuery|jQuery|HTMLElement}
     */
    Infinitum.prototype.insertScrollHelper = function () {
        var scrollHelper = $('<div>');

        this.container.append(scrollHelper);

        return scrollHelper;
    };

    /**
     * Insert a spinner element into container
     *
     * @returns {JQuery|jQuery|HTMLElement}
     */
    Infinitum.prototype.insertSpinner = function () {
        var spinner = $('<div>');
        spinner.addClass(this.options.spinnerClass);
        spinner.hide();

        this.container.append(spinner);

        return spinner;
    };

    /**
     * Insert message element into container
     *
     * @returns {JQuery|jQuery|HTMLElement}
     */
    Infinitum.prototype.insertMessage = function () {
        var message = $('<div>');
        message.addClass(this.options.messageClass);
        message.hide();

        this.container.append(message);

        return message;
    };

    /**
     * Check if scroll helper is in view
     * and we need to load next page
     */
    Infinitum.prototype.check = function () {
        if( ! this.canLoad) {
            return;
        }

        var inView = this.isInView(this.scrollHelper);

        if( ! this.loading && inView) {
            this.container.trigger('infinitum:scrolled-in');
        }
    };

    /**
     * Check if element is in view
     *
     * @param {jQuery} element
     * @returns {boolean}
     */
    Infinitum.prototype.isInView = function (element) {
        var elementPosition = element.offset().top;
        var windowHeight = $(window).height();
        var scrollTop = $(window).scrollTop();

        return elementPosition - scrollTop > 0 && elementPosition - scrollTop < windowHeight - this.options.offset;
    };

    /**
     * Load items from server
     */
    Infinitum.prototype.load = function () {
        this.loading = true;

        if(this.nextPage === void 0) {
            this.container.trigger('infinitum:end');
        }

        $.ajax({
            url: this.nextPage,
            dataType: 'json',
            success: function (data) {
                this.renderResponse(data);
                this.parseNextPage(data);
                this.container.trigger('infinitum:loaded');
            }.bind(this),
            error: function (data) {
                this.showMessage('Error: (' + data.status + ") " + data.statusText);
            }.bind(this)
        });
    };

    /**
     * Render a response from server
     *
     * @param respnse
     */
    Infinitum.prototype.renderResponse = function (respnse) {
        var parsed = this.parseResponse(respnse);

        if(parsed === void 0) {
            this.showMessage('Response cannot be parsed');

            return;
        }

        if( ! Array.isArray(parsed)) {
            this.showMessage('Response data must be an array');

            return;
        }

        try {
            this.render(parsed);
        } catch(ex) {
            this.showMessage(ex);
        }
    };

    /**
     * Parse a response from server and prepare for rendering
     *
     * @param response
     */
    Infinitum.prototype.parseResponse = function (response) {
        return this.getProperty(response, this.options.dataPath);
    };

    /**
     * Parse data item for the template
     *
     * @param data
     * @returns {object}
     */
    Infinitum.prototype.parseData = function (data) {
        var _this = this;
        var parsed = {};

        this.placeholderNames.forEach(function (name) {
            var key = _this.map[name];

            if(key === void 0) {
                throw 'Map is missing a property that is defined in the template';
            }

            parsed[name] = _this.getProperty(data, key);
        });

        return parsed;
    };

    /**
     * Parse next page url from server response
     *
     * @param {object} response
     */
    Infinitum.prototype.parseNextPage = function (response) {
        this.nextPage = this.getProperty(response, this.options.nextPagePath);
    };

    /**
     * Event handler
     * When scroll helper is scrolled into view
     */
    Infinitum.prototype.onScrolledIn = function () {
        this.load();
        this.spinner.show();
    };

    /**
     * Event handler
     * When items are loaded
     */
    Infinitum.prototype.onLoaded = function () {
        this.spinner.hide();

        this.loading = false;
        this.page++;
    };

    /**
     * Event handler
     * When there is no more items to load
     */
    Infinitum.prototype.onEnd = function () {
        this.showMessage(this.options.endMessage);
    };

    /**
     * Render parsed response
     *
     * @param response
     */
    Infinitum.prototype.render = function (response) {
        var _this = this;

        response.forEach(function (item) {
            try {
                var data = _this.parseData(item);
            } catch(e) {
                throw 'Cannot render template: ' + e;
            }

            var template = _this.renderTemplate(data);
            _this.appendItem(template);
        });
    };

    /**
     * Append an item to the content container
     *
     * @param item
     */
    Infinitum.prototype.appendItem = function (item) {
        this.content.append(item);
    };

    /**
     * Get plain html content of the template
     * Remove template element from the DOM
     *
     * @returns {string|JQuery}
     */
    Infinitum.prototype.getTemplateContent = function () {
        var $template = $(this.options.template);

        var template = $template.html();

        $template.remove();

        return template;
    };

    /**
     * Render a template with a data provided
     *
     * @param {object} data Data to insert in a template
     * @returns {string}
     */
    Infinitum.prototype.renderTemplate = function (data) {
        var rendered = this.template;

        this.placeholderNames.forEach(function (placeholder) {
            var pattern = new RegExp("{{ *" + placeholder + " *}}", "g");
            rendered = rendered.replace(pattern, data[placeholder])
        });

        return rendered;
    };

    /**
     * Get placeholder names from the template
     *
     * @returns {Array}
     */
    Infinitum.prototype.getPlaceholderNames = function () {
        var names = [];
        var regex = /{{ *([a-zA-Z0-9_]+) *}}/g;

        var match = regex.exec(this.template);
        while (match != null) {
            names.push(match[1]);
            match = regex.exec(this.template);
        }

        return names;
    };

    /**
     * Show a message in the message element
     *
     * @param message
     */
    Infinitum.prototype.showMessage = function (message) {
        if (this.options.debug) {
            this.message.text(message);
        } else {
            this.message.text(this.options.endMessage);
        }

        this.message.show();
        this.spinner.hide();
        this.canLoad = false;
    };

    /**
     * Get property from object using dot notation
     *
     * @param {object} object Object to query
     * @param {string} key Key path (i.e. "item.data.name")
     * @returns {string|number|object|Array}
     */
    Infinitum.prototype.getProperty = function (object, key) {
        var path = key.split('.');

        var index = 0,
            length = path.length;

        while (object != null && index < length) {
            object = object[path[index++]];
        }

        return (index && index == length) ? object : undefined;
    };

    return Infinitum;
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZmluaXR1bS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiaW5maW5pdHVtLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIEluZmluaXR1bSA9IChmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBmdW5jdGlvbiBJbmZpbml0dW0ob3B0aW9ucywgbWFwKVxuICAgIHtcbiAgICAgICAgdGhpcy5kZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGRlYnVnOiBmYWxzZSxcbiAgICAgICAgICAgIHRlbXBsYXRlOiAnI2l0ZW0tdGVtcGxhdGUnLFxuICAgICAgICAgICAgY29udGFpbmVyOiAnYm9keScsXG4gICAgICAgICAgICBjb250ZW50Q2xhc3M6ICcnLFxuICAgICAgICAgICAgc3Bpbm5lckNsYXNzOiAnbG9hZGVyJyxcbiAgICAgICAgICAgIG1lc3NhZ2VDbGFzczogJ21lc3NhZ2UnLFxuICAgICAgICAgICAgc291cmNlQXR0cjogJ2RhdGEtbG9hZCcsXG4gICAgICAgICAgICBkYXRhUGF0aDogJ2RhdGEnLFxuICAgICAgICAgICAgbmV4dFBhZ2VQYXRoOiAnbmV4dF9wYWdlJyxcbiAgICAgICAgICAgIG9mZnNldDogMCxcbiAgICAgICAgICAgIGVuZE1lc3NhZ2U6ICdObyBtb3JlIGl0ZW1zIHRvIGxvYWQuLi4nXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIHRoaXMuZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLm1hcCA9IG1hcDtcbiAgICAgICAgdGhpcy50ZW1wbGF0ZSA9IHRoaXMuZ2V0VGVtcGxhdGVDb250ZW50KCk7XG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gdGhpcy5nZXRDb250YWluZXIoKTtcbiAgICAgICAgdGhpcy5wbGFjZWhvbGRlck5hbWVzID0gdGhpcy5nZXRQbGFjZWhvbGRlck5hbWVzKCk7XG4gICAgICAgIHRoaXMuY29udGVudCA9IHRoaXMuaW5zZXJ0Q29udGVudCgpO1xuICAgICAgICB0aGlzLnNwaW5uZXIgPSB0aGlzLmluc2VydFNwaW5uZXIoKTtcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gdGhpcy5pbnNlcnRNZXNzYWdlKCk7XG4gICAgICAgIHRoaXMuc2Nyb2xsSGVscGVyID0gdGhpcy5pbnNlcnRTY3JvbGxIZWxwZXIoKTtcbiAgICAgICAgdGhpcy5uZXh0UGFnZSA9IHRoaXMucGFyc2VTb3VyY2UoKTtcbiAgICAgICAgdGhpcy5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FuTG9hZCA9IHRydWU7XG4gICAgICAgIHRoaXMucGFnZSA9IDE7XG5cbiAgICAgICAgdGhpcy5iaW5kRXZlbnRzKCk7XG5cbiAgICAgICAgdGhpcy5jaGVjaygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJpbmQgZXZlbnQgbGlzdGVuZXJzXG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5iaW5kRXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAkKHdpbmRvdykub24oJ3Njcm9sbCcsIHRoaXMuY2hlY2suYmluZCh0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5jb250YWluZXIub24oJ2luZmluaXR1bTpzY3JvbGxlZC1pbicsIHRoaXMub25TY3JvbGxlZEluLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLmNvbnRhaW5lci5vbignaW5maW5pdHVtOmxvYWRlZCcsIHRoaXMub25Mb2FkZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuY29udGFpbmVyLm9uKCdpbmZpbml0dW06ZW5kJywgdGhpcy5vbkVuZC5iaW5kKHRoaXMpKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0IGNvbnRhaW5lciBlbGVtZW50IGluc3RhbmNlXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7SlF1ZXJ5fGpRdWVyeXxIVE1MRWxlbWVudH1cbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLmdldENvbnRhaW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICQodGhpcy5vcHRpb25zLmNvbnRhaW5lcik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFBhcnNlIGRhdGEgc291cmNlIGZyb20gYXR0cmlidXRlXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUucGFyc2VTb3VyY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbnRhaW5lci5hdHRyKHRoaXMub3B0aW9ucy5zb3VyY2VBdHRyKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5zZXJ0IGNvbnRlbnQgY29udGFpbmVyIGludG8gbWFpbiBjb250YWluZXJcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtKUXVlcnl8alF1ZXJ5fEhUTUxFbGVtZW50fVxuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUuaW5zZXJ0Q29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSAkKCc8ZGl2PicpO1xuICAgICAgICBjb250ZW50LmFkZENsYXNzKHRoaXMub3B0aW9ucy5jb250ZW50Q2xhc3MpO1xuXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZChjb250ZW50KTtcblxuICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5zZXJ0IHNjcm9sbC1oZWxwZXIgZWxlbWVudCBpbnRvIGNvbnRhaW5lclxuICAgICAqXG4gICAgICogQHJldHVybnMge0pRdWVyeXxqUXVlcnl8SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5pbnNlcnRTY3JvbGxIZWxwZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzY3JvbGxIZWxwZXIgPSAkKCc8ZGl2PicpO1xuXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZChzY3JvbGxIZWxwZXIpO1xuXG4gICAgICAgIHJldHVybiBzY3JvbGxIZWxwZXI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluc2VydCBhIHNwaW5uZXIgZWxlbWVudCBpbnRvIGNvbnRhaW5lclxuICAgICAqXG4gICAgICogQHJldHVybnMge0pRdWVyeXxqUXVlcnl8SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5pbnNlcnRTcGlubmVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3Bpbm5lciA9ICQoJzxkaXY+Jyk7XG4gICAgICAgIHNwaW5uZXIuYWRkQ2xhc3ModGhpcy5vcHRpb25zLnNwaW5uZXJDbGFzcyk7XG4gICAgICAgIHNwaW5uZXIuaGlkZSgpO1xuXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZChzcGlubmVyKTtcblxuICAgICAgICByZXR1cm4gc3Bpbm5lcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5zZXJ0IG1lc3NhZ2UgZWxlbWVudCBpbnRvIGNvbnRhaW5lclxuICAgICAqXG4gICAgICogQHJldHVybnMge0pRdWVyeXxqUXVlcnl8SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5pbnNlcnRNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbWVzc2FnZSA9ICQoJzxkaXY+Jyk7XG4gICAgICAgIG1lc3NhZ2UuYWRkQ2xhc3ModGhpcy5vcHRpb25zLm1lc3NhZ2VDbGFzcyk7XG4gICAgICAgIG1lc3NhZ2UuaGlkZSgpO1xuXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZChtZXNzYWdlKTtcblxuICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgc2Nyb2xsIGhlbHBlciBpcyBpbiB2aWV3XG4gICAgICogYW5kIHdlIG5lZWQgdG8gbG9hZCBuZXh0IHBhZ2VcbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLmNoZWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiggISB0aGlzLmNhbkxvYWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpblZpZXcgPSB0aGlzLmlzSW5WaWV3KHRoaXMuc2Nyb2xsSGVscGVyKTtcblxuICAgICAgICBpZiggISB0aGlzLmxvYWRpbmcgJiYgaW5WaWV3KSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci50cmlnZ2VyKCdpbmZpbml0dW06c2Nyb2xsZWQtaW4nKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBlbGVtZW50IGlzIGluIHZpZXdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5pc0luVmlldyA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBlbGVtZW50UG9zaXRpb24gPSBlbGVtZW50Lm9mZnNldCgpLnRvcDtcbiAgICAgICAgdmFyIHdpbmRvd0hlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKTtcbiAgICAgICAgdmFyIHNjcm9sbFRvcCA9ICQod2luZG93KS5zY3JvbGxUb3AoKTtcblxuICAgICAgICByZXR1cm4gZWxlbWVudFBvc2l0aW9uIC0gc2Nyb2xsVG9wID4gMCAmJiBlbGVtZW50UG9zaXRpb24gLSBzY3JvbGxUb3AgPCB3aW5kb3dIZWlnaHQgLSB0aGlzLm9wdGlvbnMub2Zmc2V0O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGl0ZW1zIGZyb20gc2VydmVyXG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmxvYWRpbmcgPSB0cnVlO1xuXG4gICAgICAgIGlmKHRoaXMubmV4dFBhZ2UgPT09IHZvaWQgMCkge1xuICAgICAgICAgICAgdGhpcy5jb250YWluZXIudHJpZ2dlcignaW5maW5pdHVtOmVuZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIHVybDogdGhpcy5uZXh0UGFnZSxcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUmVzcG9uc2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJzZU5leHRQYWdlKGRhdGEpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLnRyaWdnZXIoJ2luZmluaXR1bTpsb2FkZWQnKTtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSxcbiAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd01lc3NhZ2UoJ0Vycm9yOiAoJyArIGRhdGEuc3RhdHVzICsgXCIpIFwiICsgZGF0YS5zdGF0dXNUZXh0KTtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIGEgcmVzcG9uc2UgZnJvbSBzZXJ2ZXJcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZXNwbnNlXG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5yZW5kZXJSZXNwb25zZSA9IGZ1bmN0aW9uIChyZXNwbnNlKSB7XG4gICAgICAgIHZhciBwYXJzZWQgPSB0aGlzLnBhcnNlUmVzcG9uc2UocmVzcG5zZSk7XG5cbiAgICAgICAgaWYocGFyc2VkID09PSB2b2lkIDApIHtcbiAgICAgICAgICAgIHRoaXMuc2hvd01lc3NhZ2UoJ1Jlc3BvbnNlIGNhbm5vdCBiZSBwYXJzZWQnKTtcblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoICEgQXJyYXkuaXNBcnJheShwYXJzZWQpKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dNZXNzYWdlKCdSZXNwb25zZSBkYXRhIG11c3QgYmUgYW4gYXJyYXknKTtcblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKHBhcnNlZCk7XG4gICAgICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgICAgICAgIHRoaXMuc2hvd01lc3NhZ2UoZXgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFBhcnNlIGEgcmVzcG9uc2UgZnJvbSBzZXJ2ZXIgYW5kIHByZXBhcmUgZm9yIHJlbmRlcmluZ1xuICAgICAqXG4gICAgICogQHBhcmFtIHJlc3BvbnNlXG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5wYXJzZVJlc3BvbnNlID0gZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFByb3BlcnR5KHJlc3BvbnNlLCB0aGlzLm9wdGlvbnMuZGF0YVBhdGgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZSBkYXRhIGl0ZW0gZm9yIHRoZSB0ZW1wbGF0ZVxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUucGFyc2VEYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdmFyIHBhcnNlZCA9IHt9O1xuXG4gICAgICAgIHRoaXMucGxhY2Vob2xkZXJOYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0gX3RoaXMubWFwW25hbWVdO1xuXG4gICAgICAgICAgICBpZihrZXkgPT09IHZvaWQgMCkge1xuICAgICAgICAgICAgICAgIHRocm93ICdNYXAgaXMgbWlzc2luZyBhIHByb3BlcnR5IHRoYXQgaXMgZGVmaW5lZCBpbiB0aGUgdGVtcGxhdGUnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwYXJzZWRbbmFtZV0gPSBfdGhpcy5nZXRQcm9wZXJ0eShkYXRhLCBrZXkpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcGFyc2VkO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZSBuZXh0IHBhZ2UgdXJsIGZyb20gc2VydmVyIHJlc3BvbnNlXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2VcbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLnBhcnNlTmV4dFBhZ2UgPSBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgdGhpcy5uZXh0UGFnZSA9IHRoaXMuZ2V0UHJvcGVydHkocmVzcG9uc2UsIHRoaXMub3B0aW9ucy5uZXh0UGFnZVBhdGgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFdmVudCBoYW5kbGVyXG4gICAgICogV2hlbiBzY3JvbGwgaGVscGVyIGlzIHNjcm9sbGVkIGludG8gdmlld1xuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUub25TY3JvbGxlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmxvYWQoKTtcbiAgICAgICAgdGhpcy5zcGlubmVyLnNob3coKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRXZlbnQgaGFuZGxlclxuICAgICAqIFdoZW4gaXRlbXMgYXJlIGxvYWRlZFxuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUub25Mb2FkZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc3Bpbm5lci5oaWRlKCk7XG5cbiAgICAgICAgdGhpcy5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMucGFnZSsrO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFdmVudCBoYW5kbGVyXG4gICAgICogV2hlbiB0aGVyZSBpcyBubyBtb3JlIGl0ZW1zIHRvIGxvYWRcbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLm9uRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnNob3dNZXNzYWdlKHRoaXMub3B0aW9ucy5lbmRNZXNzYWdlKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHBhcnNlZCByZXNwb25zZVxuICAgICAqXG4gICAgICogQHBhcmFtIHJlc3BvbnNlXG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICByZXNwb25zZS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gX3RoaXMucGFyc2VEYXRhKGl0ZW0pO1xuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ0Nhbm5vdCByZW5kZXIgdGVtcGxhdGU6ICcgKyBlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUgPSBfdGhpcy5yZW5kZXJUZW1wbGF0ZShkYXRhKTtcbiAgICAgICAgICAgIF90aGlzLmFwcGVuZEl0ZW0odGVtcGxhdGUpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXBwZW5kIGFuIGl0ZW0gdG8gdGhlIGNvbnRlbnQgY29udGFpbmVyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXRlbVxuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUuYXBwZW5kSXRlbSA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHRoaXMuY29udGVudC5hcHBlbmQoaXRlbSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldCBwbGFpbiBodG1sIGNvbnRlbnQgb2YgdGhlIHRlbXBsYXRlXG4gICAgICogUmVtb3ZlIHRlbXBsYXRlIGVsZW1lbnQgZnJvbSB0aGUgRE9NXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfEpRdWVyeX1cbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLmdldFRlbXBsYXRlQ29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICR0ZW1wbGF0ZSA9ICQodGhpcy5vcHRpb25zLnRlbXBsYXRlKTtcblxuICAgICAgICB2YXIgdGVtcGxhdGUgPSAkdGVtcGxhdGUuaHRtbCgpO1xuXG4gICAgICAgICR0ZW1wbGF0ZS5yZW1vdmUoKTtcblxuICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBhIHRlbXBsYXRlIHdpdGggYSBkYXRhIHByb3ZpZGVkXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSBEYXRhIHRvIGluc2VydCBpbiBhIHRlbXBsYXRlXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLnJlbmRlclRlbXBsYXRlID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHJlbmRlcmVkID0gdGhpcy50ZW1wbGF0ZTtcblxuICAgICAgICB0aGlzLnBsYWNlaG9sZGVyTmFtZXMuZm9yRWFjaChmdW5jdGlvbiAocGxhY2Vob2xkZXIpIHtcbiAgICAgICAgICAgIHZhciBwYXR0ZXJuID0gbmV3IFJlZ0V4cChcInt7ICpcIiArIHBsYWNlaG9sZGVyICsgXCIgKn19XCIsIFwiZ1wiKTtcbiAgICAgICAgICAgIHJlbmRlcmVkID0gcmVuZGVyZWQucmVwbGFjZShwYXR0ZXJuLCBkYXRhW3BsYWNlaG9sZGVyXSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJlbmRlcmVkO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGxhY2Vob2xkZXIgbmFtZXMgZnJvbSB0aGUgdGVtcGxhdGVcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBJbmZpbml0dW0ucHJvdG90eXBlLmdldFBsYWNlaG9sZGVyTmFtZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBuYW1lcyA9IFtdO1xuICAgICAgICB2YXIgcmVnZXggPSAve3sgKihbYS16QS1aMC05X10rKSAqfX0vZztcblxuICAgICAgICB2YXIgbWF0Y2ggPSByZWdleC5leGVjKHRoaXMudGVtcGxhdGUpO1xuICAgICAgICB3aGlsZSAobWF0Y2ggIT0gbnVsbCkge1xuICAgICAgICAgICAgbmFtZXMucHVzaChtYXRjaFsxXSk7XG4gICAgICAgICAgICBtYXRjaCA9IHJlZ2V4LmV4ZWModGhpcy50ZW1wbGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmFtZXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3cgYSBtZXNzYWdlIGluIHRoZSBtZXNzYWdlIGVsZW1lbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICovXG4gICAgSW5maW5pdHVtLnByb3RvdHlwZS5zaG93TWVzc2FnZSA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGVidWcpIHtcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZS50ZXh0KG1lc3NhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5tZXNzYWdlLnRleHQodGhpcy5vcHRpb25zLmVuZE1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5tZXNzYWdlLnNob3coKTtcbiAgICAgICAgdGhpcy5zcGlubmVyLmhpZGUoKTtcbiAgICAgICAgdGhpcy5jYW5Mb2FkID0gZmFsc2U7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldCBwcm9wZXJ0eSBmcm9tIG9iamVjdCB1c2luZyBkb3Qgbm90YXRpb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvYmplY3QgT2JqZWN0IHRvIHF1ZXJ5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBLZXkgcGF0aCAoaS5lLiBcIml0ZW0uZGF0YS5uYW1lXCIpXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudW1iZXJ8b2JqZWN0fEFycmF5fVxuICAgICAqL1xuICAgIEluZmluaXR1bS5wcm90b3R5cGUuZ2V0UHJvcGVydHkgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXkpIHtcbiAgICAgICAgdmFyIHBhdGggPSBrZXkuc3BsaXQoJy4nKTtcblxuICAgICAgICB2YXIgaW5kZXggPSAwLFxuICAgICAgICAgICAgbGVuZ3RoID0gcGF0aC5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKG9iamVjdCAhPSBudWxsICYmIGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBvYmplY3QgPSBvYmplY3RbcGF0aFtpbmRleCsrXV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gKGluZGV4ICYmIGluZGV4ID09IGxlbmd0aCkgPyBvYmplY3QgOiB1bmRlZmluZWQ7XG4gICAgfTtcblxuICAgIHJldHVybiBJbmZpbml0dW07XG59KSgpOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
