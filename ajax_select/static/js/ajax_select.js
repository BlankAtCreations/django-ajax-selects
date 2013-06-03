if (typeof jQuery.fn.autocompletehtml != 'function') {

    (function ($) {
        $.fn.autocompletehtml = function () {
            var $text = $(this), sizeul = true;
            var autoComplete = this.data("ui-autocomplete");
            if (typeof(autoComplete) == "undefined") {
                autoComplete = this.data("autocomplete");
            }

            autoComplete._renderItem = function _renderItemHTML(ul, item) {
                if (sizeul) {
                    if (ul.css('max-width') == 'none') ul.css('max-width', $text.outerWidth());
                    sizeul = false;
                }
                return $("<li></li>")
                    .data("item.autocomplete", item)
                    .append("<a>" + item.match + "</a>")
                    .appendTo(ul);
            };
            return this;
        }
        $.fn.autocompleteselect = function (options) {

            return this.each(function () {
                var id = this.id;
                var $this = $(this);

                var $text = $("#" + id + "_text");
                var $deck = $("#" + id + "_on_deck");

                function receiveResult(event, ui) {
                    if ($this.val()) {
                        kill();
                    }
                    $this.val(ui.item.pk);
                    $text.val('');
                    addKiller(ui.item.repr);
                    $deck.trigger("added", ui.item);

                    return false;
                }

                function addKiller(repr, pk) {
                    killer_id = "kill_" + pk + id;
                    killButton = '<span class="ui-icon ui-icon-trash" id="' + killer_id + '">X</span> ';
                    if (repr) {
                        $deck.empty();
                        $deck.append("<div>" + killButton + repr + "</div>");
                    } else {
                        $("#" + id + "_on_deck > div").prepend(killButton);
                    }
                    $("#" + killer_id).click(function () {
                        kill();
                        $deck.trigger("killed");
                    });
                }

                function kill() {
                    $this.val('');
                    $deck.children().fadeOut(1.0).remove();
                }

                options.select = receiveResult;
                $text.autocomplete(options);
                $text.autocompletehtml();

                if (options.initial) {
                    its = options.initial;
                    addKiller(its[0], its[1]);
                }

                $this.bind('didAddPopup', function (event, pk, repr) {
                    ui = { item: { pk: pk, repr: repr } }
                    receiveResult(null, ui);
                });
            });
        };

        $.fn.autocompleteselectmultiple = function (options) {
            return this.each(function () {
                var id = this.id;
                var model = options.model;
                var app_label = options.app_label;
                var channel = options.channel;
                var total_forms = 0;

                var $this = $(this);
                var $text = $("#" + id + "_text");
                var $deck = $("#" + id + "_on_deck");

                function receiveResult(event, ui) {
                    pk = ui.item.pk;
                    prev = $this.val();

                    if (prev.indexOf("|" + pk + "|") == -1) {
                        $this.val((prev ? prev : "|") + pk + "|");
                        addKiller(ui.item.repr, pk, total_forms);
                        $text.val('');
                        $deck.trigger("added", ui.item);
                    }

                    return false;
                }

                function addKiller(repr, pk, counter) {

                    killer_id = "kill_" + pk + id;
                    killButton = '<span class="ui-icon ui-icon-trash" id="' + killer_id + '">X</span>';
                    $deck.append('<div id="' + id + '_on_deck_' + pk + '">' + killButton + ' </div>');
                    $.get('/admin/lookups/ajax_lookup/form/' + model + '/' + app_label + '/' + channel + '/' + pk + '/?counter=' + counter, function (data) {
                        $('#' + id + '_on_deck_' + pk).append('<ul />');
                        $('#' + id + '_on_deck_' + pk + ' > ul').append(data);
                        $('#' + id + '_on_deck_' + pk).append('<input type="hidden" name="' + model + '_' + channel + '-' + counter + '-id" value="' + pk + '" />');
                        $('#' + id + '_on_deck_' + pk).append('<br style="clear: both;" />');
                    });
                    total_forms++;
                    $('#' + model + '-' + channel + '-TOTAL_FORMS').val(total_forms);

                    $("#" + killer_id).click(function () {
                        kill(pk);
                        $deck.trigger("killed");
                        total_forms--;
                        $('#' + model + '-' + channel + '-TOTAL_FORMS').val(total_forms);
                    });

                }

                function kill(pk) {
                    $this.val($this.val().replace("|" + pk + "|", "|"));
                    $("#" + id + "_on_deck_" + pk).fadeOut().remove();
                }

                options.select = receiveResult;
                $text.autocomplete(options);
                $text.autocompletehtml();

                if (options.initial) {
                    $('#customer_form').append('<input id="' + options.model + '-' + options.channel + '-TOTAL_FORMS" type="hidden" value="0" name="' + options.model + '-' + options.channel + '-TOTAL_FORMS" />')
                    $.each(options.initial, function (i, its) {
                        addKiller(its[0], its[1], i);
                    });

                }

                $this.bind('didAddPopup', function (event, pk, repr) {
                    ui = { item: { pk: pk, repr: repr } }
                    receiveResult(null, ui);
                });
            });
        };

        window.addAutoComplete = function (prefix_id, callback) { /*(html_id)*/
            /* detects inline forms and converts the html_id if needed */
            var prefix = 0;
            var html_id = prefix_id;
            if (html_id.indexOf("__prefix__") != -1) {
                // Some dirty loop to find the appropriate element to apply the callback to
                while ($('#' + html_id).length) {
                    html_id = prefix_id.replace(/__prefix__/, prefix++);
                }
                html_id = prefix_id.replace(/__prefix__/, prefix - 2);
                // Ignore the first call to this function, the one that is triggered when
                // page is loaded just because the "empty" form is there.
                if ($("#" + html_id + ", #" + html_id + "_text").hasClass("ui-autocomplete-input"))
                    return;
            }
            callback(html_id);
        }
        /*	the popup handler
         requires RelatedObjects.js which is part of the django admin js
         so if using outside of the admin then you would need to include that manually */
        window.didAddPopup = function (win, newId, newRepr) {
            var name = windowname_to_id(win.name);
            $("#" + name).trigger('didAddPopup', [html_unescape(newId), html_unescape(newRepr)]);
            win.close();
        }

    })(jQuery);
}
