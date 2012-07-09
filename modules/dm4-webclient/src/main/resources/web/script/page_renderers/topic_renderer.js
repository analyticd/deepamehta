/**
 * A page renderer that models a page as a set of fields.
 *
 * @see     PageRenderer interface (script/interfaces/page_renderer.js).
 */
(function() {

    var topic_renderer = {

        // === Page Renderer Implementation ===

        render_page: function(topic) {
            var page_model = create_page_model(topic, "viewable")
            // trigger hook
            dm4c.trigger_plugin_hook("pre_render_page", topic, page_model)
            //
            render_page_model(page_model, "page")
            //
            dm4c.render.associations(topic.id)
        },

        render_form: function(topic) {
            var page_model = create_page_model(topic, "editable")
            // trigger hook
            dm4c.trigger_plugin_hook("pre_render_form", topic, page_model)
            //
            render_page_model(page_model, "form")
            //
            return function() {
                dm4c.do_update_topic(build_topic_model(page_model))
            }
        },

        // === Proprietary methods ===

        /**
         * Creates a page model for a topic.
         *
         * A page model comprises all the information required to render a topic in the page panel (a.k.a. detail
         * panel).
         *
         * A page model is either a FieldModel object (for a simple topic) or a PageModel object (for a complex topic).
         * A PageModel object is a nested structure of FieldModels and (again) PageModels.
         *
         * @param   topic           The topic the page model is created for.
         * @param   assoc_def       The association definition that leads to that topic. Undefined for the top-level
         *                          call. For a simple topic the association definition is used to create the
         *                          corresponding field model. For a complex topic the association definition is
         *                          (currently) not used. ### FIXDOC
         * @param   field_uri       The (base) URI for the field model(s) to create (string). Empty ("") for the
         *                          top-level call.
         * @param   toplevel_topic  The topic the page/form is rendered for. Usually that is the selected topic.
         *                          For a simple topic the top-level topic is used to create the corresponding field
         *                          model. For a complex topic the top-level topic is just passed recursively.
         *                          ### FIXDOC
         *                          Note: for the top-level call "toplevel_topic" and "topic" are usually the same.
         * @param   setting         "viewable" or "editable" (string).
         *
         * @return  The created page model, or undefined. Undefined is returned if the topic is not viewable/editable.
         */
        create_page_model: function(topic, assoc_def, field_uri, toplevel_topic, setting) {
            var topic_type = dm4c.get_topic_type(topic.type_uri)   // ### TODO: real Topics would allow topic.get_type()
            if (!get_view_config()) {
                return
            }
            if (topic_type.is_simple()) {
                return new FieldModel(topic, assoc_def, field_uri, toplevel_topic)
            } else {
                var page_model = new PageModel(topic, assoc_def, field_uri, toplevel_topic)
                for (var i = 0, assoc_def; assoc_def = topic_type.assoc_defs[i]; i++) {
                    var child_topic_type = dm4c.get_topic_type(assoc_def.part_topic_type_uri)
                    var child_field_uri = field_uri + dm4c.COMPOSITE_PATH_SEPARATOR + assoc_def.uri
                    var cardinality_uri = assoc_def.part_cardinality_uri
                    if (cardinality_uri == "dm4.core.one") {
                        var child_topic = topic.composite[assoc_def.uri] || dm4c.empty_topic(child_topic_type.uri)
                        var child_model = this.create_page_model(child_topic, assoc_def, child_field_uri,
                            toplevel_topic, setting)
                    } else if (cardinality_uri == "dm4.core.many") {
                        // ### TODO: server: don't send empty arrays
                        var child_topics = topic.composite[assoc_def.uri] || []
                        if (!js.is_array(child_topics)) {
                            throw "TopicRendererError: field \"" + assoc_def.uri + "\" is defined as multi-value but " +
                                "appears as single-value in " + JSON.stringify(topic)
                        }
                        if (child_topics.length == 0) {
                            child_topics.push(dm4c.empty_topic(child_topic_type.uri))
                        }
                        var child_model = []
                        for (var j = 0, child_topic; child_topic = child_topics[j]; j++) {
                            var child_field = this.create_page_model(child_topic, assoc_def, child_field_uri,
                                toplevel_topic, setting)
                            child_model.push(child_field)
                        }
                    } else {
                        throw "TopicRendererError: \"" + cardinality_uri + "\" is an unexpected cardinality URI"
                    }
                    if (child_model) {
                        page_model.add_child(assoc_def.uri, child_model)
                    }
                }
                return page_model;
            }

            // compare to get_view_config() in FieldModel
            function get_view_config() {
                // the assoc def's config has precedence
                if (assoc_def) {
                    var value = dm4c.get_view_config(assoc_def, setting)
                    if (value != undefined) {
                        return value
                    }
                }
                return dm4c.get_view_config(topic_type, setting, true)
            }
        },

        /**
         * Renders a page model. Called recursively.
         *
         * @param   page_model      The page model to render (a PageModel or a FieldModel).
         * @param   render_mode     "page" or "form" (string).
         * @param   level           The nesting level (integer). Starts at 0.
         * @param   ref_element     The page element the rendering is attached to (a jQuery object).
         *                          Precondition: this element is already part of the DOM.
         * @param   incremental     (boolean).
         */
        render_page_model: function(page_model, render_mode, level, ref_element, incremental) {
            // Note: if the topic is not viewable/editable the page model is undefined
            if (!page_model) {
                return
            }
            //
            if (page_model instanceof FieldModel) {
                var box = render_box(page_model, is_many(), false)  // is_complex=false
                page_model[render_func_name()](box)
            } else if (page_model instanceof PageModel) {
                var box = render_box(page_model, is_many(), true)   // is_complex=true
                for (var assoc_def_uri in page_model.childs) {
                    var child_model = page_model.childs[assoc_def_uri]
                    if (js.is_array(child_model)) {
                        // cardinality "many"
                        for (var i = 0; i < child_model.length; i++) {
                            this.render_page_model(child_model[i], render_mode, level + 1, box)
                        }
                        if (render_mode == "form") {
                            render_add_button(child_model, level + 1, box)
                        }
                    } else {
                        // cardinality "one"
                        this.render_page_model(child_model, render_mode, level + 1, box)
                    }
                }
            } else {
                throw "TopicRendererError: invalid page model"
            }

            function is_many() {
                // Note: the top-level page model has no assoc_def
                return page_model.assoc_def && page_model.assoc_def.part_cardinality_uri == "dm4.core.many"
            }

            function render_func_name() {
                switch (render_mode) {
                case "page":
                    return "render_field"
                case "form":
                    return "render_form_element"
                default:
                    throw "TopicRendererError: \"" + render_mode + "\" is an invalid render mode"
                }
            }

            function render_box(page_model, is_many, is_complex) {
                var box = $("<div>").addClass("box")
                // Note: a simple box doesn't get a "level" class to let it inherit the background color
                if (is_complex) {
                    box.addClass("level" + level)
                }
                if (incremental) {
                    ref_element.before(box)
                } else {
                    ref_element.append(box)
                }
                //
                if (render_mode == "form" && is_many) {
                    render_remove_button(page_model, box)
                }
                //
                return box
            }

            function render_add_button(page_model, level, parent_element) {
                var topic_type = page_model[0].topic_type
                var add_button = dm4c.ui.button(do_add, "Add " + topic_type.value)
                var add_button_div = $("<div>").addClass("add-button").append(add_button)
                parent_element.append(add_button_div)

                function do_add() {
                    // extend page model
                    var topic = dm4c.empty_topic(topic_type.uri)
                    var assoc_def      = page_model[0].assoc_def
                    var field_uri      = page_model[0].uri
                    var toplevel_topic = page_model[0].toplevel_topic
                    var _page_model = topic_renderer.create_page_model(topic, assoc_def, field_uri, toplevel_topic,
                        "editable")
                    page_model.push(_page_model)
                    // render page model
                    topic_renderer.render_page_model(_page_model, "form", level, add_button_div, true) // incremntl=true
                }
            }

            function render_remove_button(page_model, parent_element) {
                var remove_button = dm4c.ui.button(do_remove, undefined, "circle-minus")
                var remove_button_div = $("<div>").addClass("remove-button").append(remove_button)
                parent_element.append(remove_button_div)

                function do_remove() {
                    // update model
                    page_model.topic.delete = true
                    // update view
                    parent_element.remove()
                }
            }
        }
    }

    dm4c.add_page_renderer("dm4.webclient.topic_renderer", topic_renderer)



    // ----------------------------------------------------------------------------------------------- Private Functions

    // === Page Model ===

    /**
     * @param   setting     "viewable" or "editable"
     */
    function create_page_model(topic, setting) {
        return topic_renderer.create_page_model(topic, undefined, "", topic, setting)
    }

    /**
     * @param   page_model      the page model to render. If undefined nothing is rendered.
     * @param   render_mode     "page" or "form" (string).
     */
    function render_page_model(page_model, render_mode) {
        topic_renderer.render_page_model(page_model, render_mode, 0, $("#page-content"))
    }

    /**
     * Reads out values from a page model's GUI elements and builds a topic model from it.
     *
     * @return  a topic model (object), a topic reference (string), a simple topic value, or null.
     *          Note 1: null is returned if a simple topic is being edited and the field renderer prevents the field
     *          from being updated.
     *          Note 2: despite at deeper recursion levels this method might return a topic reference (string), or
     *          a simple topic value, the top-level call will always return a topic model (object), or null.
     *          This is because topic references are only contained in composite topic models. A simple topic model
     *          on the other hand never represents a topic reference.
     */
    function build_topic_model(page_model) {
        if (page_model instanceof FieldModel) {
            var value = page_model.read_form_value()
            // Note: undefined form value is an error (means: field renderer returned no value).
            // null is a valid form value (means: field renderer prevents the field from being updated).
            if (value == null) {
                return null
            }
            // ### TODO: explain. Compare to TextFieldRenderer.render_form_element()
            switch (page_model.assoc_def && page_model.assoc_def.assoc_type_uri) {
            case undefined:
            case "dm4.core.composition_def":
                page_model.topic.value = value
                return page_model.topic
            case "dm4.core.aggregation_def":
                return value
            default:
                throw "TopicRendererError: \"" + page_model.assoc_def.assoc_type_uri +
                    "\" is an unexpected assoc type URI"
            }
        } else if (page_model instanceof PageModel) {
            var composite = {}
            for (var assoc_def_uri in page_model.childs) {
                var child_model = page_model.childs[assoc_def_uri]
                if (js.is_array(child_model)) {
                    // cardinality "many"
                    composite[assoc_def_uri] = []
                    for (var i = 0; i < child_model.length; i++) {
                        //
                        if (child_model[i].topic.delete) {
                            switch (child_model[i].assoc_def.assoc_type_uri) {
                            case "dm4.core.composition_def":
                                composite[assoc_def_uri].push(dm4c.DEL_PREFIX + child_model[i].topic.id)
                                break
                            case "dm4.core.aggregation_def":
                                // do nothing
                                break
                            default:
                                throw "TopicRendererError: \"" + child_model[i].assoc_def.assoc_type_uri +
                                    "\" is an unexpected assoc type URI"
                            }
                        } else {
                            var value = build_topic_model(child_model[i])
                            if (value != null) {
                                composite[assoc_def_uri].push(value)
                            }
                        }
                    }
                } else {
                    // cardinality "one"
                    var value = build_topic_model(child_model)
                    if (value != null) {
                        composite[assoc_def_uri] = value
                    }
                }
            }
            page_model.topic.composite = composite
            return page_model.topic
        } else {
            throw "TopicRendererError: invalid page model "
        }
    }



    // ------------------------------------------------------------------------------------------------- Private Classes

    function PageModel(topic, assoc_def, field_uri, toplevel_topic) {

        this.topic = topic
        this.assoc_def = assoc_def
        this.uri = field_uri
        this.toplevel_topic = toplevel_topic
        this.topic_type = dm4c.get_topic_type(topic.type_uri)   // ### TODO: real Topics would allow topic.get_type()
        this.childs = {}

        /**
         * @param   child_model     A FieldModel, or a PageModel, or an array of FieldModels or PageModels.
         */
        this.add_child = function(assoc_def_uri, child_model) {
            this.childs[assoc_def_uri] = child_model
        }
    }

    /**
     * @param   topic           The topic underlying this field. Its "value" is rendered through this field model.
     *                          A topic "id" -1 indicates a topic to be created.
     * @param   assoc_def       The direct association definition that leads to this field.
     *                          For a non-composite topic it is <code>undefined</code>.
     *                          The association definition has 2 meanings:
     *                              1) its view configuration has precedence over the topic type's view configuration
     *                              2) The particular field renderers are free to operate on it.
     *                                 Field renderers which do so:
     *                                  - TextFieldRenderer (Webclient module)
     * @param   field_uri       The field URI. Unique within the page/form. The field URI is a path composed of
     *                          association definition URIs that leads to this field, e.g.
     *                          "/dm4.contacts.address/dm4.contacts.street".
     *                          For a non-composite topic the field URI is an empty string.
     *                          This URI is passed to the field renderer constructors (as a property of the "field"
     *                          argument). The particular field renderers are free to operate on it. Field renderers
     *                          which do so:
     *                              - HTMLFieldRenderer (Webclient module)
     *                              - IconFieldRenderer (Icon Picker module)
     * @param   toplevel_topic  The topic the page/form is rendered for. Usually that is the selected topic.
     *                          (So, that is the same topic for all the FieldModel objects making up one page/form.)
     *                          This topic is passed to the field renderer constructors.
     *                          The particular field renderers are free to operate on it. Field renderers which do so:
     *                              - SearchResultRenderer  (Webclient module)
     *                              - FileContentRenderer   (Files module)
     *                              - FolderContentRenderer (Files module)
     */
    function FieldModel(topic, assoc_def, field_uri, toplevel_topic) {

        var self = this
        this.topic = topic
        this.assoc_def = assoc_def
        this.uri = field_uri
        this.toplevel_topic = toplevel_topic
        this.value = topic.value
        this.topic_type = dm4c.get_topic_type(topic.type_uri)   // ### TODO: real Topics would allow topic.get_type()
        this.label = this.topic_type.value
        this.rows = get_view_config("rows")
        var field_renderer = get_field_renderer()
        var read_form_value_func

        this.render_field = function(parent_element) {
            field_renderer.render_field(this, parent_element)
        }

        this.render_form_element = function(parent_element) {
            dm4c.render.field_label(this, parent_element)
            read_form_value_func = field_renderer.render_form_element(this, parent_element)
        }

        this.read_form_value = function() {
            var form_value = read_form_value_func()
            // Note: undefined value is an error (means: field renderer returned no value).
            // null is a valid result (means: field renderer prevents the field from being updated).
            if (form_value === undefined) {
                throw "TopicRendererError: the \"" + this.label + "\" field renderer returned no value " +
                    "(field_renderer_uri=\"" + field_renderer_uri + "\")"   // ### FIXME: field_renderer_uri undefined
            }
            //
            return form_value
        }

        // ---

        function get_field_renderer() {
            var field_renderer_uri = get_view_config("field_renderer_uri")
            // error check
            if (!field_renderer_uri) {
                throw "TopicRendererError: unknown renderer for field \"" + self.label +
                    "\" (field_uri=\"" + self.uri + "\")"
            }
            //
            return dm4c.get_field_renderer(field_renderer_uri)
        }

        function get_view_config(setting) {
            // the assoc def's config has precedence
            if (assoc_def) {
                var value = dm4c.get_view_config(assoc_def, setting)
                // Note 1: we explicitely compare to undefined to let assoc defs override with falsish values.
                // Note 2: we must regard an empty string as "not set" to not loose the default rendering classes.
                if (value !== undefined && value !== "") {      // compare to get_view_config() in webclient.js
                    // regard the assoc def's value as set
                    return value
                }
            }
            return dm4c.get_view_config(self.topic_type, setting, true)
        }
    }
})()
