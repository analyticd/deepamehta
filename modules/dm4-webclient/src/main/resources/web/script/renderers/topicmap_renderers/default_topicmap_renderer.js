function DefaultTopicmapRenderer() {

    // ------------------------------------------------------------------------------------------------ Constructor Code

    js.extend(this, TopicmapRenderer)
    var self = this

    // Settings
    this.DEFAULT_ASSOC_COLOR = "#b2b2b2"
    var HIGHLIGHT_COLOR = "#0000ff"
    var HIGHLIGHT_BLUR = 16
    var ANIMATION_STEPS = 30
    var ANIMATION_DELAY = 10
    var LABEL_FONT = "1em 'Lucida Grande', Verdana, Arial, Helvetica, sans-serif"   // copied from webclient.css
    var LABEL_COLOR = "black"
    var LABEL_DIST_Y = 4            // in pixel

    // Model
    var model = new DefaultTopicmapViewmodel()

    // View (HTML5 Canvas)
    var ctx                         // canvas drawing context
    var width, height               // canvas size (in pixel)
    var grid_positioning            // while grid positioning is in progress: a GridPositioning object, null otherwise

    // Short-term interaction state
    var topic_move_in_progress      // true while topic move is in progress (boolean)
    var cluster_move_in_progress    // true while cluster move is in progress (boolean)
    var canvas_move_in_progress     // true while canvas translation is in progress (boolean)
    var association_in_progress     // true while new association is pulled (boolean)
    var action_topic                // the topic being selected/moved/associated (CanvasTopic)
    var action_assoc                // the association being selected/cluster-moved (CanvasAssoc)
    var cluster                     // the cluster being moved (Cluster)
    var tmp_x, tmp_y                // coordinates while action is in progress

    // Coordinate systems (for mouse event interpretation)
    // Note: constants begin at 1 as 0 could be interpreted as "not set"
    var Coord = {
        WINDOW: 1,          // browser window display area
        CANVAS: 2,          // canvas display area -- the default
        CANVAS_SPACE: 3     // canvas space (involves canvas translation)
    }

    // ------------------------------------------------------------------------------------------------------ Public API



    // === TopicmapRenderer Implementation ===

    this.get_info = function() {
        return {
            uri: "dm4.webclient.default_topicmap_renderer",
            name: "Topicmap"
        }
    }

    // ---

    /**
     * Adds a topic to the canvas. If the topic is already on the canvas it is not added again.
     * Note: the canvas is not refreshed.
     *
     * @param   topic       an object with "id", "type_uri", "value" properties and optional "x", "y" properties.
     * @param   do_select   Optional: if true, the topic is selected.
     */
    this.add_topic = function(topic, do_select) {
        // update model
        if (!model.topic_exists(topic.id)) {
            init_position()
            var ct = model.add_topic(topic)
            update_view_model(ct)
        }
        //
        if (do_select) {
            model.set_highlight_topic(topic.id)
        }
        //
        return topic

        function init_position() {
            if (topic.x == undefined || topic.y == undefined) {
                if (grid_positioning) {
                    var pos = grid_positioning.next_position()
                } else if (model.highlight()) {
                    var pos = find_free_position(model.highlight_pos())
                } else {
                    var pos = random_position()
                }
                topic.x = pos.x
                topic.y = pos.y
            }
            topic.x = Math.floor(topic.x)
            topic.y = Math.floor(topic.y)
        }
    }

    /**
     * @param   assoc       an object with "id", "type_uri", "role_1", "role_2" properties.
     * @param   do_select   Optional: if true, the association is selected.
     */
    this.add_association = function(assoc, do_select) {
        // update model
        if (!model.association_exists(assoc.id)) {
            model.add_association(assoc)
        }
        //
        if (do_select) {
            model.set_highlight_association(assoc.id)
        }
    }

    // ---

    /**
     * Updates a topic. If the topic is not on the canvas nothing is performed.
     */
    this.update_topic = function(topic, refresh_canvas) {
        var ct = model.get_topic(topic.id)
        if (!ct) {
            return
        }
        // update model
        ct.update(topic)
        update_view_model(ct)
        // update GUI
        if (refresh_canvas) {
            this.refresh()
        }
    }

    /**
     * Updates an association. If the association is not on the canvas nothing is performed.
     */
    this.update_association = function(assoc, refresh_canvas) {
        var ca = model.get_association(assoc.id)
        if (!ca) {
            return
        }
        // update model
        ca.update(assoc)
        // update GUI
        if (refresh_canvas) {
            this.refresh()
        }
    }

    // ---

    /**
     * Removes a topic from the canvas (model) and optionally refreshes the canvas (view).
     * If the topic is not present on the canvas nothing is performed.
     *
     * @param   refresh_canvas  Optional - if true, the canvas is refreshed.
     */
    this.remove_topic = function(id, refresh_canvas) {
        // 1) update model
        var ct = model.remove_topic(id)
        if (!ct) {
            return
        }
        model.reset_highlight_conditionally(id)
        // 2) update GUI
        if (refresh_canvas) {
            this.refresh()
        }
    }

    /**
     * Removes an association from the canvas (model) and optionally refreshes the canvas (view).
     * If the association is not present on the canvas nothing is performed.
     *
     * @param   refresh_canvas  Optional - if true, the canvas is refreshed.
     */
    this.remove_association = function(id, refresh_canvas) {
        // 1) update model
        var ca = model.remove_association(id)
        if (!ca) {
            return
        }
        model.reset_highlight_conditionally(id)
        // 2) update GUI
        if (refresh_canvas) {
            this.refresh()
        }
    }

    // ---

    this.topic_exists = function(topic_id) {
        return model.topic_exists(topic_id)
    }

    this.clear = function() {
        // Must reset canvas translation.
        // See TopicmapRenderer contract.
        translate_by(-model.trans_x, -model.trans_y)
        //
        model.clear()
    }

    // ---

    this.select_topic = function(topic_id) {
        // 1) fetch from DB
        var topic = dm4c.fetch_topic(topic_id)
        // 2) update model
        model.set_highlight_topic(topic_id)
        //
        return {select: topic, display: topic}
    }

    this.select_association = function(assoc_id) {
        // 1) fetch from DB
        var assoc = dm4c.fetch_association(assoc_id)
        // 2) update model
        model.set_highlight_association(assoc_id)
        //
        return assoc
    }

    this.reset_selection = function(refresh_canvas) {
        // update model
        model.reset_highlight()
        // update GUI
        if (refresh_canvas) {
            this.refresh()
        }
    }

    // ---

    this.scroll_topic_to_center = function(topic_id) {
        var ct = model.get_topic(topic_id)
        scroll_to_center(ct.x + model.trans_x, ct.y + model.trans_y)
    }

    this.begin_association = function(topic_id, x, y) {
        association_in_progress = true
        action_topic = model.get_topic(topic_id)
        //
        tmp_x = x
        tmp_y = y
        draw()
    }

    this.refresh = function() {
        draw()
    }

    this.close_context_menu = function() {
        close_context_menu()
    }

    // --- Grid Positioning ---

    this.start_grid_positioning = function() {
        grid_positioning = new GridPositioning()
    }

    this.stop_grid_positioning = function() {
        grid_positioning = null
    }



    // === Left SplitPanel Component Implementation ===

    /**
     * Called in 2 situations:
     * 1) The user resizes the main window.
     * 2) The user moves the split panel's slider.
     */
    this.resize = function(size) {
        resize_canvas(size)
    }



    // === End of interface implementations ===

    // Called from Topicmap Renderer Extension (Topicmaps plugin).
    this.translate_by = function(dx, dy) {
        translate_by(dx, dy)
    }

    this.get_associations = function(topic_id) {
        return model.get_associations(topic_id)
    }

    // ----------------------------------------------------------------------------------------------- Private Functions



    // ******************
    // *** View Model ***
    // ******************



    /**
     * Updates the renderer-specific parts of a topic view model.
     */
    function update_view_model(ct) {
        // line height 19px = 1.2em
        ct.label_wrapper = new js.TextWrapper(ct.truncated_label, dm4c.MAX_TOPIC_LABEL_WIDTH, 19, ctx)
    }



    // ***************
    // *** Drawing ***
    // ***************



    function draw() {
        ctx.clearRect(-model.trans_x, -model.trans_y, width, height)
        // fire event
        dm4c.fire_event("pre_draw_canvas", ctx)
        //
        draw_associations()
        //
        if (association_in_progress) {
            draw_line(action_topic.x, action_topic.y, tmp_x - model.trans_x, tmp_y - model.trans_y,
                dm4c.ASSOC_WIDTH, self.DEFAULT_ASSOC_COLOR)
        }
        //
        ctx.fillStyle = LABEL_COLOR     // set label style
        draw_topics()
    }

    // ---

    function draw_topics() {
        model.iterate_topics(function(topic) {
            draw_object(topic, draw_topic)
        })
    }

    function draw_associations() {
        model.iterate_associations(function(assoc) {
            draw_object(assoc, draw_association)
        })
    }

    // ---

    function draw_topic(ct) {
        try {
            // icon
            var icon = dm4c.get_type_icon(ct.type_uri)
            var x = ct.x - ct.width / 2
            var y = ct.y - ct.height / 2
            ctx.drawImage(icon, x, y)
            // label
            ct.label_wrapper.draw(x, y + ct.height + LABEL_DIST_Y + 16, ctx)    // 16px = 1em
            // Note: the context must be passed to every draw() call.
            // The context changes when the canvas is resized.
        } catch (e) {
            dm4c.log("### ERROR at CanvasTopic.draw:\nicon.src=" + icon.src + "\nicon.width=" + icon.width +
                "\nicon.height=" + icon.height  + "\nicon.complete=" + icon.complete
                /* + "\n" + JSON.stringify(e) */)
        }
    }

    function draw_association(ca) {
        var ct1 = ca.get_topic_1()
        var ct2 = ca.get_topic_2()
        // error check
        if (!ct1 || !ct2) {
            // TODO: deleted associations must be removed from all topicmaps.
            // ### alert("ERROR in draw_associations: association " + this.id + " is missing a topic")
            // ### delete canvas_assocs[i]
            return
        }
        //
        var color = dm4c.get_type_color(ca.type_uri)
        draw_line(ct1.x, ct1.y, ct2.x, ct2.y, dm4c.ASSOC_WIDTH, color)
    }

    // ---

    function draw_object(topic_or_association, drawing_func) {
        // highlight
        var highlight = model.has_highlight(topic_or_association.id)
        set_highlight_style(highlight)
        //
        drawing_func(topic_or_association)
        //
        reset_highlight_style(highlight)
    }

    function draw_line(x1, y1, x2, y2, width, color) {
        ctx.lineWidth = width
        ctx.strokeStyle = color
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
    }

    // ---

    function set_highlight_style(is_highlight) {
        if (is_highlight) {
            ctx.shadowColor = HIGHLIGHT_COLOR
            ctx.shadowBlur  = HIGHLIGHT_BLUR
        }
    }

    function reset_highlight_style(is_highlight) {
        if (is_highlight) {
            // Note: according to the HTML5 spec setting the blur to 0 should be sufficient to switch the shadow off.
            // Works so in Safari 5 but not in Firefox 3.6. Workaround: set the shadow color to fully-transparent.
            // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#shadows
            ctx.shadowColor = "rgba(0, 0, 0, 0)"
            ctx.shadowBlur = 0
        }
    }



    // **********************
    // *** Event Handling ***
    // **********************



    function bind_event_handlers() {
        self.dom.bind("mousedown",   do_mousedown)
        self.dom.bind("mouseup",     do_mouseup)
        self.dom.bind("mousemove",   do_mousemove)
        self.dom.bind("mouseleave",  do_mouseleave)
        self.dom.bind("dblclick",    do_doubleclick)
        self.dom.bind("contextmenu", do_contextmenu)
        self.dom.bind("dragover",    do_dragover)
        self.dom.bind("drop",        do_drop)
    }



    // === Mouse Events ===

    /**
     * @param   event   a jQuery event object (the browser's event object normalized according to W3C standards).
     *                  http://api.jquery.com/category/events/event-object/
     *                  http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
     */
    function do_mousedown(event) {
        if (dm4c.LOG_GUI) dm4c.log("Mouse down on canvas!")
        if (association_in_progress) {
            return
        }
        //
        if (event.which == 1) {
            var p = pos(event)
            tmp_x = p.x
            tmp_y = p.y
            //
            var ct = find_topic(event)
            if (ct) {
                if (event.shiftKey) {
                    dm4c.do_select_topic(ct.id)
                    self.begin_association(ct.id, p.x, p.y)
                } else {
                    action_topic = ct
                }
            } else {
                var ca = find_association(event)
                if (ca) {
                    action_assoc = ca
                } else if (!association_in_progress) {
                    canvas_move_in_progress = true
                }
            }
        }
    }

    function do_mousemove(event) {
        // if (dm4c.LOG_GUI) dm4c.log("Mouse moves on canvas!")
        // Note: action_topic is defined for a) topic move, and b) association in progress
        if (action_topic || action_assoc || canvas_move_in_progress) {
            var p = pos(event)
            var dx = p.x - tmp_x
            var dy = p.y - tmp_y
            if (canvas_move_in_progress) {
                translate_by(dx, dy)
            } else if (action_assoc) {
                cluster_move_in_progress = true
                cluster = cluster || model.create_cluster(action_assoc)
                cluster.move_by(dx, dy)
            } else if (!association_in_progress) {
                topic_move_in_progress = true
                action_topic.move_by(dx, dy)
            }
            tmp_x = p.x
            tmp_y = p.y
            draw()
        }
    }

    function do_mouseleave(event) {
        if (dm4c.LOG_GUI) dm4c.log("Mouse leaves canvas!")
        //
        if (topic_move_in_progress) {
            end_topic_move()
        } else if (cluster_move_in_progress) {
            end_cluster_move()
        } else if (canvas_move_in_progress) {
            end_canvas_move()
        } else if (association_in_progress) {
            end_association_in_progress()
            draw()
        }
    }

    function do_mouseup(event) {
        if (dm4c.LOG_GUI) dm4c.log("Mouse up on canvas!")
        //
        close_context_menu()
        //
        if (topic_move_in_progress) {
            end_topic_move()
        } else if (cluster_move_in_progress) {
            end_cluster_move()
        } else if (canvas_move_in_progress) {
            end_canvas_move()
        } else if (association_in_progress) {
            var ct = find_topic(event)
            if (ct && ct.id != action_topic.id) {
                dm4c.do_create_association("dm4.core.association", ct)
            }
            //
            end_association_in_progress()
            draw()
        } else {
            if (action_topic) {
                dm4c.do_select_topic(action_topic.id)
                action_topic = null
            } else if (action_assoc) {
                dm4c.do_select_association(action_assoc.id)
                action_assoc = null
            }
        }
    }

    function do_doubleclick(event) {
        if (dm4c.LOG_GUI) dm4c.log("Canvas double clicked!")
        var ct = find_topic(event)
        if (ct) {
            dm4c.fire_event("topic_doubleclicked", ct)
        }
    }

    // ---

    function end_topic_move() {
        // fire event
        dm4c.fire_event("post_move_topic", action_topic)
        //
        topic_move_in_progress = false
        action_topic = null
    }

    function end_cluster_move() {
        // fire event
        dm4c.fire_event("post_move_cluster", cluster)
        //
        cluster_move_in_progress = false
        action_assoc = null
        cluster = null
    }

    function end_canvas_move() {
        // fire event
        dm4c.fire_event("post_move_canvas", model.trans_x, model.trans_y)
        //
        canvas_move_in_progress = false
    }

    function end_association_in_progress() {
        association_in_progress = false
        action_topic = null
    }



    // === Context Menu Events ===

    function do_contextmenu(event) {
        if (dm4c.LOG_GUI) dm4c.log("Contextmenu!")
        //
        close_context_menu()
        // 1) assemble commands
        var ct, ca
        if (ct = find_topic(event)) {
            dm4c.do_select_topic(ct.id)
            // Note: only dm4c.selected_object has the composite value (the canvas topic has not)
            var commands = dm4c.get_topic_commands(dm4c.selected_object, "context-menu")
        } else if (ca = find_association(event)) {
            dm4c.do_select_association(ca.id)
            // Note: only dm4c.selected_object has the composite value (the canvas assiation has not)
            var commands = dm4c.get_association_commands(dm4c.selected_object, "context-menu")
        } else {
            var p = pos(event, Coord.CANVAS_SPACE)
            var commands = dm4c.get_canvas_commands(p.x, p.y, "context-menu")
        }
        // 2) show menu
        if (commands.length) {
            open_context_menu(commands, event)
        }
        //
        return false
    }

    /**
     * Builds a context menu from a set of commands and shows it.
     *
     * @param   commands    Array of commands. Must neither be empty nor null/undefined.
     * @param   event       The mouse event that triggered the context menu.
     */
    function open_context_menu(commands, event) {
        // fire event (compare to GUITookit's open_menu())
        dm4c.pre_open_context_menu()
        //
        if (dm4c.LOG_GUI) dm4c.log("Opening context nenu: event.screenY=" + event.screenY +
            ", event.clientY=" + event.clientY + ", event.pageY=" + event.pageY +
            ", event.originalEvent.layerY=" + event.originalEvent.layerY)
        var cm_pos = pos(event, Coord.WINDOW)
        var contextmenu = $("<div>").addClass("menu").css({
            top:  cm_pos.y + "px",
            left: cm_pos.x + "px"
        })
        for (var i = 0, cmd; cmd = commands[i]; i++) {
            if (cmd.is_separator) {
                contextmenu.append("<hr>")
            } else {
                var handler = context_menu_handler(cmd.handler)
                var item_dom = $("<a>").attr("href", "#").click(handler).text(cmd.label)
                add_hovering()
                contextmenu.append(item_dom)
            }
        }
        $("#canvas-panel").append(contextmenu)
        contextmenu.show()

        function context_menu_handler(handler) {
            return function(event) {
                // pass the coordinates of the command selecting mouse click to the command handler
                var item_offset = pos(event)
                handler(cm_pos.x + item_offset.x, cm_pos.y + item_offset.y)
                dm4c.canvas.close_context_menu()
                return false
            }
        }

        // ### FIXME: copy in GUIToolkit
        // ### TODO: refactor canvas context menu to make use of GUIToolkit Menu class
        function add_hovering() {
            item_dom.hover(
                function() {$(this).addClass("hover")},
                function() {$(this).removeClass("hover")}
            )
        }
    }

    function close_context_menu() {
        // remove context menu
        $("#canvas-panel .menu").remove()
    }



    // === Drag and Drop Events ===

    // Required. Otherwise we don't receive a drop.
    function do_dragover () {
        // Return false is Required. Otherwise we don't receive a drop.
        return false
    }

    function do_drop(event) {
        // e.preventDefault();  // Useful for debugging when exception is thrown before false is returned.
        dm4c.fire_event("process_drop", event.originalEvent.dataTransfer)
        return false
    }



    // ***********
    // *** GUI ***
    // ***********



    /**
     * Resizes the HTML5 canvas element.
     *
     * @param   size    the new canvas size.
     */
    function resize_canvas(size) {
        if (dm4c.LOG_GUI) dm4c.log("Resizing canvas to " + JSON.stringify(size))
        width  = size.width
        height = size.height
        //
        // 1) create canvas element
        // Note: in order to resize the canvas element we must recreate it.
        // Otherwise the browsers would just distort the canvas rendering.
        self.dom = $("<canvas>").attr({id: "canvas", width: width, height: height})
        // replace existing canvas element
        // Note: we can't call dm4c.split_panel.set_left_panel() here (-> endless recursion)
        $("#canvas").remove()
        $("#canvas-panel").append(self.dom)
        //
        // 2) initialize the 2D context
        // Note: the canvas element must be already on the page
        ctx = self.dom.get(0).getContext("2d")
        ctx.font = LABEL_FONT   // the canvas font must be set early. Label measurement takes place *before* drawing.
        ctx.translate(model.trans_x, model.trans_y)
        //
        bind_event_handlers()
        draw()
    }

    function translate_by(dx, dy) {
        // update GUI
        ctx.translate(dx, dy)
        // update model
        model.translate_by(dx, dy)
    }

    function scroll_to_center(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height) {
            var dx = (width  / 2 - x) / ANIMATION_STEPS
            var dy = (height / 2 - y) / ANIMATION_STEPS
            var step_count = 0;
            var animation = setInterval(animation_step, ANIMATION_DELAY)
        }

        function animation_step() {
            translate_by(dx, dy)
            draw()
            if (++step_count == ANIMATION_STEPS) {
                clearInterval(animation)
                // Note: the Topicmaps module's setTopicmapTranslation()
                // resource method expects integers (otherwise 404)
                model.trans_x = Math.floor(model.trans_x)
                model.trans_y = Math.floor(model.trans_y)
                //
                end_canvas_move()
            }
        }
    }



    // === Geometry ===

    function find_topic(event) {
        var p = pos(event, Coord.CANVAS_SPACE)
        return model.find_topic(p)
    }

    function find_association(event) {
        var p = pos(event, Coord.CANVAS_SPACE)
        return model.find_association(p)
    }

    // ---

    /**
     * Interprets a mouse event according to a coordinate system.
     *
     * @param   coordinate_system   Coord.WINDOW, Coord.CANVAS, Coord.CANVAS_SPACE
     *
     * @return  an object with "x" and "y" properties.
     */
    function pos(event, coordinate_system) {
        // set default
        coordinate_system = coordinate_system || Coord.CANVAS
        //
        switch (coordinate_system) {
        case Coord.WINDOW:
            return {
                x: event.clientX,
                y: event.clientY
            }
        case Coord.CANVAS:
            return {
                x: event.originalEvent.layerX,
                y: event.originalEvent.layerY
            }
        case Coord.CANVAS_SPACE:
            return {
                x: event.originalEvent.layerX - model.trans_x,
                y: event.originalEvent.layerY - model.trans_y
            }
        }
    }

    /**
     * @return  an object with "x" and "y" properties.
     */
    function find_free_position(start_pos) {
        var RADIUS_INCREMENT = 150
        var round_count = 0
        var radius = 0
        while (true) {
            round_count++
            radius += RADIUS_INCREMENT
            var max_tries = 10 * round_count
            for (var t = 0; t < max_tries; t++) {
                var pos = {
                    x: start_pos.x + 2 * radius * Math.random() - radius,
                    y: start_pos.y + 2 * radius * Math.random() - radius
                }
                if (is_position_free(pos)) {
                    return pos
                }
            }
        }
    }

    function is_position_free(pos) {
        return true     // ### TODO
    }

    /**
     * @return  an object with "x" and "y" properties.
     */
    function random_position() {
        return {
            x: width  * Math.random() - model.trans_x,
            y: height * Math.random() - model.trans_y
        }
    }



    // ------------------------------------------------------------------------------------------------- Private Classes

    function GridPositioning() {

        // Settings
        var GRID_DIST_X = 220   // MAX_TOPIC_LABEL_WIDTH + 20 pixel padding
        var GRID_DIST_Y = 80
        var START_X = 50 - model.trans_x
        var START_Y = 50
        var MIN_Y = -9999

        var item_count = 0
        var start_pos = find_start_postition()
        var grid_x = start_pos.x
        var grid_y = start_pos.y

        this.next_position = function() {
            var pos = {x: grid_x, y: grid_y}
            if (item_count == 0) {
                scroll_to_center(width / 2, pos.y + model.trans_y)
            }
            //
            advance_position()
            item_count++
            //
            return pos
        }

        function find_start_postition() {
            var max_y = MIN_Y
            model.iterate_topics(function(ct) {
                if (ct.y > max_y) {
                    max_y = ct.y
                }
            })
            var x = START_X
            var y = max_y != MIN_Y ? max_y + GRID_DIST_Y : START_Y
            return {x: x, y: y}
        }

        function advance_position() {
            if (grid_x + GRID_DIST_X + model.trans_x > width) {
                grid_x = START_X
                grid_y += GRID_DIST_Y
            } else {
                grid_x += GRID_DIST_X
            }
        }
    }
}
