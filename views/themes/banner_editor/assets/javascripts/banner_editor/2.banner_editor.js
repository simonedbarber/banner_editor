(function(factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node / CommonJS
        factory(require('jquery'));
    } else {
        // Browser globals.
        factory(jQuery);
    }
})(function($) {

    'use strict';

    let NAMESPACE = 'qor.bannereditor',
        EVENT_ENABLE = 'enable.' + NAMESPACE,
        EVENT_DISABLE = 'disable.' + NAMESPACE,
        EVENT_CLICK = 'click.' + NAMESPACE,
        EVENT_DRAGSTART = 'dragstart.' + NAMESPACE,
        EVENT_DRAGSTOP = 'dragstop.' + NAMESPACE,
        EVENT_DRAG = 'drag.' + NAMESPACE,
        EVENT_DROP = 'drop.' + NAMESPACE,

        CLASS_DRAGGABLE = '.qor-bannereditor__draggable',
        CLASS_BOTTOMSHEETS = '.qor-bottomsheets',
        CLASS_MEDIABOX = 'qor-bottomsheets__mediabox',
        CLASS_TOOLBAR_BUTTON = '.qor-bannereditor__button',
        CLASS_BANNEREDITOR_VALUE = '.qor-bannereditor__value',
        CLASS_BANNEREDITOR_BG = '.qor-bannereditor__bg',
        CLASS_BANNEREDITOR_IMAGE = '.qor-bannereditor__toolbar-image',
        CLASS_BANNEREDITOR_DRAGGING = 'qor-bannereditor__dragging',
        CLASS_CANVAS = '.qor-bannereditor__canvas';

    function getImgSize(url, callback) {
        let img = new Image();

        img.onload = function() {
            if ($.isFunction(callback)) {
                callback(this.naturalWidth || this.width, this.naturalHeight || this.height);
            }
        };
        img.src = url;
    }

    function QorBannerEditor(element, options) {
        this.$element = $(element);
        this.options = $.extend({}, QorBannerEditor.DEFAULTS, $.isPlainObject(options) && options);
        this.init();
    }

    QorBannerEditor.prototype = {
        constructor: QorBannerEditor,

        init: function() {
            let $element = this.$element;
            this.config = {};
            this.$textarea = $element.find(CLASS_BANNEREDITOR_VALUE);
            this.config.toolbar = this.$textarea.data('configure');
            this.$canvas = $element.find(CLASS_CANVAS);
            this.$bg = $element.find(CLASS_BANNEREDITOR_BG);
            this.initToolbar();
            this.bind();
        },

        bind: function() {
            this.$element
                .on(EVENT_CLICK, CLASS_TOOLBAR_BUTTON, this.addElements.bind(this))
                .on(EVENT_CLICK, CLASS_BANNEREDITOR_IMAGE, this.openBottomSheets.bind(this))
                .on(EVENT_CLICK, CLASS_DRAGGABLE, this.handleInlineEdit.bind(this))
                .on(EVENT_DRAGSTOP, CLASS_DRAGGABLE, this.handleDragStop.bind(this))
                .on(EVENT_DRAG, CLASS_DRAGGABLE, this.handleDrag.bind(this));

            $(CLASS_DRAGGABLE).draggable();

            $(document).on(EVENT_CLICK, '.qor-bannereditor__content button[type="submit"]', this.renderElement.bind(this));
        },

        initToolbar: function() {
            let $toolbar = $(window.Mustache.render(QorBannerEditor.toolbar, this.config));

            $toolbar.appendTo($('.qor-bannereditor__toolbar-btns'));
            this.$popover = $(QorBannerEditor.popover).appendTo('body');
        },

        initMedia: function() {
            let $trs = $(CLASS_BOTTOMSHEETS).find('tbody tr'),
                $tr,
                $img;

            $trs.each(function() {
                $tr = $(this);
                $img = $tr.find('.qor-table--ml-slideout p img').first();
                $tr.find('.qor-table__actions').remove();

                if ($img.length) {
                    $tr.find('.qor-table--medialibrary-item').css('background-image', 'url(' + $img.prop('src') + ')');
                    $img.parent().remove();
                }
            });
        },

        openBottomSheets: function(e) {
            var $ele = $(e.target).closest(CLASS_BANNEREDITOR_IMAGE),
                url = $ele.data('banner-media-url');
            this.BottomSheets = $('body').data('qor.bottomsheets');

            this.BottomSheets.open({
                url: url
            }, this.handleBannerImage.bind(this));

            return false;

        },

        handleBannerImage: function() {

            var $bottomsheets = $(CLASS_BOTTOMSHEETS),
                options = {
                    onSelect: this.addBannerImage.bind(this),
                    onSubmit: this.addBannerImage.bind(this)
                };

            $bottomsheets.qorSelectCore(options).addClass(CLASS_MEDIABOX);
            this.initMedia();
        },

        addBannerImage: function(data) {
            let MediaOption = data.MediaOption.OriginalURL ? data.MediaOption : JSON.parse(data.MediaOption),
                imgUrl = MediaOption.OriginalURL,
                bg = `<div class="${CLASS_BANNEREDITOR_BG.slice(1)}" />`,
                $bg;

            if (!this.$bg.length) {
                this.$canvas.wrapInner(bg);
                this.$bg = $bg = this.$element.find(CLASS_BANNEREDITOR_BG);
            }

            this.resetBoxSize(imgUrl, $bg);

            $bg.css({
                'background-image': `url(${imgUrl})`,
                'background-repeat': 'no-repeat',
                'background-position': 'center center',
                'width': '100%',
                'height': '100%'
            });

            this.BottomSheets.hide();
            return false;
        },

        resetBoxSize: function(url, $bg) {
            let $canvas = this.$canvas,
                cWidth = $canvas.width(),
                iWidth, iHeight;

            getImgSize(url, function(width, height) {
                if (width < cWidth) {
                    $canvas.width(width);
                    $canvas.height(height);
                }
            });
        },

        handleInlineEdit: function(e) {
            let $target = $(e.target);

            $target.addClass(CLASS_BANNEREDITOR_DRAGGING).append(QorBannerEditor.inlineEdit);
        },

        handleDrag: function(event, ui) {
            ui.helper.addClass(CLASS_BANNEREDITOR_DRAGGING);
        },

        handleDragStop: function(event, ui) {
            let cWidth = this.$canvas.width(),
                cHeight = this.$canvas.height(),
                helperLeft = ui.position.left / cWidth * 100 + '%',
                helperTop = ui.position.top / cHeight * 100 + '%',
                css = {
                    'left': helperLeft,
                    'top': helperTop
                }

            ui.helper.css(css).attr({
                'data-position-left': helperLeft,
                'data-position-top': helperTop
            }).removeClass(CLASS_BANNEREDITOR_DRAGGING);
        },

        renderElement: function(e) {
            let $form = $(e.target).closest('form'),
                url = $form.prop('action'),
                method = $form.prop('method'),
                formData = new FormData($form[0]),
                $canvas = this.$canvas,
                $bg = this.$bg,
                $body = $bg.length ? $bg : $canvas,
                $textarea = this.$textarea,
                $popover = this.$popover,
                draggableEvent = this.draggableEvent,
                elementType = this.elementType;

            if (!$form.length) {
                return;
            }

            $.ajax(url, {
                method: method,
                dataType: 'json',
                data: formData,
                processData: false,
                contentType: false,
                success: function(data) {
                    $(data.Template)
                        .addClass('qor-bannereditor__draggable')
                        .css({
                            'position': 'absolute',
                            'left': 0,
                            'top': 0
                        })
                        .attr('data-title', elementType)
                        .appendTo($body)
                        .draggable({
                            addClasses: false,
                            distance: 10,
                            snap: true
                        });
                    $textarea.val($canvas.html());
                    $popover.qorModal('hide');
                }
            });

            return false;
        },

        addElements: function(e) {
            let $target = $(e.target),
                url = $target.data('banner-url'),
                title = $target.data('title'),
                $popover = this.$popover;

            this.elementType = title;

            $.ajax(url, {
                method: 'GET',
                dataType: 'html',
                success: function(html) {
                    let $content = $(html).find('.qor-form-container');

                    $content.find('.qor-button--cancel').attr('data-dismiss', 'modal').removeAttr('href');
                    $popover.find('.qor-bannereditor__title').html(title);
                    $popover.find('.qor-bannereditor__content').html($content.html());

                    $popover.trigger('enable').qorModal('show');
                }
            });

        }
    };

    QorBannerEditor.toolbar = `[[#toolbar]]<button class="mdl-button mdl-button--colored mdl-js-button qor-bannereditor__button" data-banner-url="[[CreateUrl]]" data-title="[[Name]]" type="button">[[Name]]</button>[[/toolbar]]`;

    QorBannerEditor.inlineEdit = `<div class="qor-bannereditor__button-inline">
                                    <button class="mdl-button mdl-button--icon qor-bannereditor__button-edit" type="button"><i class="material-icons">mode_edit</i></button>
                                    <button class="mdl-button mdl-button--icon qor-bannereditor__button-delete" type="button"><i class="material-icons">delete_forever</i></button>
                                  </div>`;

    QorBannerEditor.popover = `<div class="qor-modal fade qor-bannereditor__form" tabindex="-1" role="dialog" aria-hidden="true">
                                  <div class="mdl-card mdl-shadow--2dp" role="document">
                                    <div class="mdl-card__title">
                                        <h2 class="mdl-card__title-text qor-bannereditor__title"></h2>
                                    </div>
                                    <div class="mdl-card__supporting-text qor-bannereditor__content"></div>
                                  </div>
                                </div>`;


    QorBannerEditor.plugin = function(options) {
        return this.each(function() {
            let $this = $(this),
                data = $this.data(NAMESPACE),
                fn;

            if (!data) {
                if (/destroy/.test(options)) {
                    return;
                }
                $this.data(NAMESPACE, (data = new QorBannerEditor(this, options)));
            }

            if (typeof options === 'string' && $.isFunction(fn = data[options])) {
                fn.apply(data);
            }
        });
    };


    $(function() {
        let selector = '[data-toggle="qor.bannereditor"]';

        $(document).
        on(EVENT_DISABLE, function(e) {
            QorBannerEditor.plugin.call($(selector, e.target), 'destroy');
        }).
        on(EVENT_ENABLE, function(e) {
            QorBannerEditor.plugin.call($(selector, e.target));
        }).
        triggerHandler(EVENT_ENABLE);
    });

    return QorBannerEditor;
});