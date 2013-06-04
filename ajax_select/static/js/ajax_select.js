
//leave a blank line here

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
                var model = options.model;
                var app_label = options.app_label;
                var channel = options.channel;

                var $text = $("#" + id + "_text");
                var $deck = $("#" + id + "_on_deck");

                function receiveResult(event, ui) {
                    if ($this.val()) {
                        kill();
                    }
                    $this.val(ui.item.pk);
                    $text.val('');
                    addKiller(ui.item.repr, ui.item.pk);
                    $deck.trigger("added", ui.item);

                    return false;
                }

                function addKiller(repr, pk) {
					var counter = 0;
                    var killer_id = "kill_" + pk + id;
                    var killButton = '<span class="ui-icon ui-icon-trash" id="' + killer_id + '">X</span> ';
                    if (repr) {
						$.get(options.form_source+'?pk=' + pk + '&counter=' + counter, function (data) {
							$deck.empty();
							$('#' + id + '_on_deck').append('<ul />');
							$('#' + id + '_on_deck > ul').append(data);
							$('#' + id + '_on_deck').append('<input type="hidden" name="' + model + '_' + channel + '-' + counter + '-id" value="' + pk + '" />');
							$('#' + id + '_on_deck').append('<br style="clear: both;" />');
							$("#" + id + "_on_deck").prepend(killButton);
							$('#' + model + '_' + channel + '-TOTAL_FORMS').val(1);							
							$("#" + killer_id).click(function () {
								kill();
								$deck.trigger("killed");
							});							
						});
                    }
                }

                function kill() {
                    $this.val('');
                    $deck.children().fadeOut(1.0).remove();
					$('#' + model + '_' + channel + '-TOTAL_FORMS').val(0);						
                }

                options.select = receiveResult;
                $text.autocomplete(options);
                $text.autocompletehtml();

                if (options.initial) {
					$(this).parents('form').append('<input id="' + options.model + '_' + options.channel + '-TOTAL_FORMS" type="hidden" value="0" name="' + options.model + '_' + options.channel + '-TOTAL_FORMS" />')				
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
                    var killer_id = "kill_" + pk + id;
                    var killButton = '<span class="ui-icon ui-icon-trash" id="' + killer_id + '">X</span>';
					$deck.append('<div id="' + id + '_on_deck_' + pk + '">' + killButton + ' </div>');
					$("#" + killer_id).hide();
                    $.get(options.form_source+'?pk=' + pk + '&counter=' + counter, function (data) {
						$("#" + killer_id).show();
                        $('#' + id + '_on_deck_' + pk).append('<ul />');
                        $('#' + id + '_on_deck_' + pk + ' > ul').append(data);
                        $('#' + id + '_on_deck_' + pk).append('<input type="hidden" name="' + model + '_' + channel + '-' + counter + '-id" value="' + pk + '" />');
                        $('#' + id + '_on_deck_' + pk).append('<br style="clear: both;" />');

						total_forms++;
						$('#' + model + '_' + channel + '-TOTAL_FORMS').val(total_forms);
				
                    });
					$("#" + killer_id).click(function () {
						kill(pk);
						$deck.trigger("killed");
						total_forms--;
						$('#' + model + '_' + channel + '-TOTAL_FORMS').val(total_forms);
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
                    $(this).parents('form').append('<input id="' + options.model + '_' + options.channel + '-TOTAL_FORMS" type="hidden" value="0" name="' + options.model + '_' + options.channel + '-TOTAL_FORMS" />')
                    $.each(options.initial, function (i, its) {
						console.log('adding killer for ' + its[0] + its[1] + i);
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
