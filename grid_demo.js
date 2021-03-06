var grid_demo = {

  // html elements to bind grid to
  domGrid: null,
  domContainer: null,
  domTarget: null,

  // user settable values
  num_columns: 10,
  num_rows: 13,
  column_gutter: 10,
  row_gutter: 10,
  content_left_margin: 0,
  content_right_margin: 0,
  content_top_margin: 0,
  content_bottom_margin: 0,

  // class will set these values automatically
  // don't mess with them
  label_offset: 20,
  columns: [],
  rows: [],
  cellWidth: 0,
  cellHeight: 0,
  cell_padding: 10,
  minX: 0,
  maxX: 0,
  minY: 0,
  maxY: 0,
  numBoxes: 0,

  /**
   * Get coordinates that reside within the grid
   * -
   *
   * @param double coord
   * @param boolean isX
   *
   * @return double
   */
  get_valid_midpoint: function(coord, isX){
    var min = isX ? this.minX : this.minY;
    var max = isX ? this.maxX : this.maxY;
    var values = isX ? this.columns : this.rows;
    if(coord > max)
      var valid =  max;
    else if(coord < min)
      var valid =  min;
    else
      var valid = coord;
    return values[this.get_nearest_coord(valid, isX)];
  },

  /**
   * Set the background image of the grids to user upload
   *
   * @param input
   */
  set_bg_image: function(input){
    if(input.files && input.files[0]){
      var reader = new FileReader();
      reader.onload = function(event){
        var file = event.target.result;
        if(file.match(/^data:image\//)){
          $('.grid_container').css('background-image', 'url(' + event.target.result + ')');
          $('#bg_image_controls').css('display', 'block');

          // default the background image dimensions to fit the grid
          grid_demo.set_bg_dimension('left', 0);
          grid_demo.set_bg_dimension('top', 0);
          grid_demo.set_bg_dimension('width', 100);
          grid_demo.set_bg_dimension('height', 100);
        }
      }
      reader.readAsDataURL(input.files[0]);
    }
  },

  /**
   * Set some dimension of the background images
   *
   * @param dimension
   * @param value
   */
  set_bg_dimension: function(dimension, value){
    value = parseInt(value);
    if(dimension == 'top' || dimension == 'left'){
      var css_dimension = 'background-position';
      value = parseInt(value) + this.label_offset;
      if(dimension == 'top')
        value += this.row_gutter;
    }
    else{
      var css_dimension = 'background-size';

      // convert percentage to pixel value so we can do calculations with it
      if(dimension == 'width')
        var container_dimension = this.domContainer.width() - 
          this.column_gutter - this.label_offset;
      else
        var container_dimension = this.domContainer.height() - 
            this.row_gutter - this.label_offset;

      value = value * .01 * container_dimension;
    }
    value += 'px';
    var old = $('.grid_container').css(css_dimension).split(' ');

    if(dimension == 'left' || dimension == 'width')
        old[0] = value;
    else
        old[1] = value;

    $('.grid_container').css(css_dimension, old.join(' '));
  },

  /**
   * Handle mouse down events
   *
   * @param event
   */
  start_new_box: function(event){
    event.preventDefault();

    // increment box count (mainly for color styling)
    grid_demo.numBoxes++;
    var colorClass = 'bg_' + (grid_demo.numBoxes % 4);

    var click_x = grid_demo.get_valid_midpoint(event.pageX, true);
    var click_y = grid_demo.get_valid_midpoint(event.pageY, false);

    var domNew = $('<div></div>')
      .addClass('layout_item')
      .addClass(colorClass)
      .css({
        'top': grid_demo.get_edge_from_midpoint(click_y, false, true),
        'left': grid_demo.get_edge_from_midpoint(click_x, true, true),
        'width': grid_demo.cellWidth,
        'height': grid_demo.cellHeight,
      });
    domNew.appendTo(grid_demo.domContainer);

    /**
     * Attach mousemove listener for the duration of the drag event
     */
    grid_demo.domContainer.on('mousemove', function(event){
      var move_x = grid_demo.get_valid_midpoint(event.pageX, true);
      var move_y = grid_demo.get_valid_midpoint(event.pageY, false);

      if(move_x < click_x){
        var neX = move_x;
        var swX = click_x;
      }
      else{
        var neX = click_x;
        var swX = move_x;
      }
      if(move_y < click_y){
        var neY = move_y;
        var swY = click_y;
      }
      else{
        var neY = click_y;
        var swY = move_y;
      }

      // get the all corner coords point
      neX = grid_demo.get_edge_from_midpoint(neX, true, true);
      neY = grid_demo.get_edge_from_midpoint(neY, false, true);
      swX = grid_demo.get_edge_from_midpoint(swX, true, false);
      swY = grid_demo.get_edge_from_midpoint(swY, false, false);

      // calc width and height from corners
      var width = swX - neX;
      var height = swY - neY;

      domNew.css({
        'width': width,
        'height': height,
        'top': neY,
        'left': neX,
      });
    });

    /**
     * Function finishes creation of the box and cleans up any
     * event listeners we no longer need
     */
    var finish_new_box = function(event){
      grid_demo.domContainer.off('mousemove');
      grid_demo.domContainer.off('mouseup');
      grid_demo.domContainer.off('mouseleave');

      // create the mirror box to display the code
      var domCodeBox = domNew.clone();
      grid_demo.position_codebox(domNew, domCodeBox);
      domCodeBox.removeClass('layout_item').addClass('layout_code').appendTo(grid_demo.domTarget);

      // get the code text itself
      var grid_points = grid_demo.get_grid_points(domNew);
      var code = grid_demo.get_rmq_code(grid_points);
      domCodeBox.text(code).attr('title', code);

      // clicked and timer are here to handle double click events
      domCodeBox.data({'clicked': false, 'timer': null, 'sister': domNew, 'grid_points': grid_points});
      domCodeBox.on('click', dispatch_codebox_clicks);
    };

    /**
     * Monitor clicks on a codebox and dispatch separate click / dblclick events
     */
    var dispatch_codebox_clicks = function(){
      var element = $(this);
      var isClicked = element.data('clicked');

      // double click successful
      if(isClicked){
        // clear out double click logic
        clearTimeout(element.data('timer'));
        element.data({'timer': null, 'clicked': false});

        // don't forget to clear annoying browser text selection
        if(window.getSelection){
            if(window.getSelection().empty)
              window.getSelection().empty();
            else if(window.getSelection().removeAllRanges)
              window.getSelection.removeAllRanges();
        }
        else if(document.selection)
            document.selection.empty();

        grid_demo.delete_box(element);
      }

      // single click
      else{
        element.data({
          'clicked':  true,
          'timer': setTimeout(function(){
            element.data('clicked', false);
            attempt_delete(element);
          }, 250)
        });
      }
      return false;
    }

    /**
     * Delete with confirmation prompt
     * 
     * @param domElement
     */
    var attempt_delete = function(element){
      $( "#dialog-confirm" ).dialog({
      resizable: false,
      height: 260,
      modal: true,
      buttons: {
        "Yes": function() {
          grid_demo.delete_box(element);
          $( this ).dialog( "close" );
        },
        Cancel: function() {
          $( this ).dialog( "close" );
        }
      }
      }).html("<p>Are you sure you would like to remove <em>" + element[0].innerHTML + "</em>?</p>");
    };

    /**
     * Releasing mouse triggers completion of new box
     */
    grid_demo.domContainer.on('mouseup', finish_new_box);

    /**
     * If the mouse leaves the outer container, we will stop
     * creation of the box at the final coordinates
     */
    grid_demo.domContainer.on('mouseleave', finish_new_box);

  },

  /**
   * Remove a box and its sister element
   *
   * @param domBox
   */
  delete_box: function(domBox){
    var domSister = domBox.data('sister'); 
    if(domSister)
      domSister.fadeOut();
    domBox.fadeOut();
  },

  /**
   * Position codebox based on sister gridbox
   *
   * @param domGridBox
   * @param domCodeBox
   */
  position_codebox: function(domGridBox, domCodeBox){
    var objPosition = domGridBox.position();
    var objGridPosition = this.domContainer.position();
    var objTargetPosition = this.domTarget.position();
    var offsetPadding = 16;

    domCodeBox.css({
      'top': objPosition.top - objGridPosition.top + objTargetPosition.top,
      'left': objPosition.left - objGridPosition.left + objTargetPosition.left,
      'width': domGridBox.width() - offsetPadding,
      'height': domGridBox.height() - offsetPadding
    });
  },

  /**
   * Get the grid corner points for the passed box
   *
   * @param domBox
   *
   * @return object
   */
  get_grid_points: function(domBox){
    var grid_points = {}
    grid_points.start = this.get_nearest_midpoint(domBox, true);
    grid_points.end = this.get_nearest_midpoint(domBox, false);
    return grid_points;
  },

  /**
   * Generate rmq code for building a box on the grid
   *
   * @param grid_points
   *
   * @return string
   */
  get_rmq_code: function(grid_points){
    return 'st.frame = \'' + grid_points.start + ':' + grid_points.end + '\'';
  },

  /**
   * Get the coordinates of the nearest grid point
   *
   * @param domBox
   * @param isLeft
   *
   * @return string gridpoint
   */
  get_nearest_midpoint: function(domBox, isLeft){
    var position = domBox.position();
    var testpoint = {};
    if(isLeft){
      testpoint.x = position.left;
      testpoint.y = position.top;
    }
    else{
      testpoint.x = position.left + domBox.width();
      testpoint.y = position.top + domBox.height();
    }

    var column = this.num_to_alpha(this.get_nearest_coord(testpoint.x, true));
    var row = this.get_nearest_coord(testpoint.y, false);

    return column + '' + row;
  },

  /**
   * Function gets the nearest row or column to a point
   *
   * @param float coord
   * @param boolean isX
   *
   * @return int
   */
  get_nearest_coord: function(coord, isX){
    var midpoints = isX ? this.columns : this.rows;
    var numUnit = isX ? this.num_columns : this.num_rows;
    var closest = 0;
    var distance = 9999;
    for(var i = 0; i < numUnit; i++){
      var temp = Math.abs(midpoints[i] - coord);
      if(temp < distance){
        closest = i;
        distance = temp;
      }
    }
    return closest;
  },

  /**
   * Given a midpoint, find the relevant grid box edge
   *
   * @param midpoint
   * @param isX
   * @param isNW
   */
  get_edge_from_midpoint: function(midpoint, isX, isNW){
    var dimension = isX ? this.cellWidth : this.cellHeight;

    // since we're in the midpoint, we only add/subtract half
    dimension = dimension / 2;

    return isNW ? midpoint - dimension : midpoint + dimension;
  },

  /**
   * Convert numeric column (starting at 0) to alpha column name
   * - only built for lowercase a-z right now
   *
   * @param int
   *
   * @return char
   */
  num_to_alpha: function(x){
     return String.fromCharCode(97 + x);
  },

  /**
   * Convert alpha column name to numeric column index
   *
   * @param int
   *
   * @return char
   */
  alpha_to_num: function(x){
     return x.charCodeAt(0) - 97;
  },

  /**
   * Build the grid html
   *
   * @return domGrid
   */
  build_grid: function(){

    // table header
    var domGrid = $('<div></div>').addClass('grid_builder');
    var domHeadRow = $('<div></div>');

    // empty cell for the y axis labels
    $('<div></div>')
      .addClass('grid_label grid_label_corner')
      .css({
        'margin-right': this.content_left_margin + this.column_gutter, 
        'margin-bottom': this.content_top_margin
      })
      .appendTo(domHeadRow);

    // x axis labels
    for(var i = 0; i < this.num_columns; i++)
      $('<div></div>')
        .addClass('grid_label grid_label_top')
        .text(this.num_to_alpha(i))
        .css({
          'width': this.cellWidth, 
          'margin-right': this.column_gutter,
          'margin-bottom': this.content_top_margin
        })
        .appendTo(domHeadRow);
    domHeadRow.appendTo(domGrid);

    // table body
    for(var i = 0; i < this.num_rows; i++){
      var domRow = $('<div></div>')
        .css({'margin-bottom': this.row_gutter, 'height': this.cellHeight});
      $('<div></div>')
        .addClass('grid_label grid_label_left')
        .css({'margin-right': this.content_left_margin + this.column_gutter})
        .text(i).appendTo(domRow);
      for(var j = 0; j< this.num_columns; j++)
        $('<div></div>').addClass('grid_cell')
          .css({
            'width': this.cellWidth, 
            'padding-top': this.cell_padding,
            'margin-right': this.column_gutter
          })
          .text(this.num_to_alpha(j) + i)
          .appendTo(domRow);
      domRow.appendTo(domGrid);
    }

    domGrid.appendTo(this.domContainer);
    return domGrid;
  },

  /**
   * Set the top cell padding to vertically center cell text
   */
  setCellPadding: function(){
    var font_size = 14;
    this.cell_padding = this.cellHeight / 2 - font_size / 2;
    if(this.cell_padding < 0)
        this.cell_padding = 0;
  },

  /**
   * Set demo_grid dimension if exists in dimension object
   *
   * @param name
   * @param dimensions
   */
  setDimension: function(name, dimensions){
    if(dimensions.hasOwnProperty(name))
      this[name] = parseInt(dimensions[name]);
  },

  /**
   * Set the column related parameters
   *
   * @param dimensions
   */
  setColumns: function(dimensions){
    this.setDimension('num_columns', dimensions);
    this.setDimension('column_gutter', dimensions);
    this.setDimension('content_left_margin', dimensions);
    this.setDimension('content_right_margin', dimensions);
    
    var container_width = this.domContainer.width() - this.label_offset
      - this.content_left_margin - this.content_right_margin - this.column_gutter * 2; 
    this.cellWidth = container_width / this.num_columns - this.column_gutter;

    // store grid column midpoints for position caclulations
    var midX = this.cellWidth / 2;
    var offsetX = this.domContainer.position().left + this.label_offset +
      this.content_left_margin + parseInt(this.domContainer.css('padding-left')) +
      this.column_gutter;
    this.columns = [];
    for(var i = 0; i < this.num_columns; i++)
      this.columns.push((this.cellWidth + this.column_gutter) * i + midX + offsetX);
    this.minX = this.columns[0];
    this.maxX = this.columns[this.columns.length-1];
  },

  /**
   * Set the row related parameters
   *
   * @param dimensiosn
   */
  setRows: function(dimensions){
    this.setDimension('num_rows', dimensions);
    this.setDimension('row_gutter', dimensions);
    this.setDimension('content_top_margin', dimensions);
    this.setDimension('content_bottom_margin', dimensions);
    
    var container_height = this.domContainer.height() - this.label_offset
      - this.content_top_margin - this.content_bottom_margin;
    this.cellHeight = container_height / this.num_rows - this.row_gutter;

    // store row midpoints to use in position calculations
    var midY = this.cellHeight / 2;
    var offsetY = this.domContainer.position().top + this.label_offset + 
      this.content_top_margin + parseInt(this.domContainer.css('padding-top'));
    this.rows = [];
    for(var i = 0; i < this.num_rows; i++)
      this.rows.push((this.cellHeight + this.row_gutter) * i + midY + offsetY);
    this.minY = this.rows[0];
    this.maxY = this.rows[this.rows.length-1];

    // vertically center text
    this.setCellPadding();
  },

  /**
   * Get a row / column index from the gridpoint given
   *
   * @param gridpoint
   * @param bolX
   *
   * @return int
   */
  get_gridpoint_index: function(gridpoint, bolX){
    return bolX ? this.alpha_to_num(gridpoint) : parseInt(gridpoint.substring(1));
  },

  /**
   * Does a midpoint exist
   *
   * @param midpoint (string)
   * 
   * @return boolean
   */
  gridpoint_exists: function(gridpoint){
    return this.get_gridpoint_index(gridpoint, true) < this.columns.length &&
      this.get_gridpoint_index(gridpoint, false) < this.rows.length;
  },

  /**
   * Repositin all codeboxes according to their stored gridpoints
   */
  reposition_boxes: function(){
    $('.layout_code').each(function(index, codebox){
      codebox = $(codebox);
      var sister = codebox.data('sister');
      var grid_points = codebox.data('grid_points');
      if(grid_demo.gridpoint_exists(grid_points.start) && grid_demo.gridpoint_exists(grid_points.end)){

        // calculate grid dimensions
        var css_left = grid_demo.get_edge_from_midpoint(
          grid_demo.columns[grid_demo.get_gridpoint_index(grid_points.start, true)], true, true);
        var css_top = grid_demo.get_edge_from_midpoint(
          grid_demo.rows[grid_demo.get_gridpoint_index(grid_points.start, false)], false, true);
        var css_width = grid_demo.get_edge_from_midpoint(
          grid_demo.columns[grid_demo.get_gridpoint_index(grid_points.end, true)], true, false) - css_left;
        var css_height = grid_demo.get_edge_from_midpoint(
          grid_demo.rows[grid_demo.get_gridpoint_index(grid_points.end, false)], false, false) - css_top;
      
        // position grid box
        sister.css({'top': css_top, 'left': css_left, 'width': css_width, 'height': css_height});
        grid_demo.position_codebox(sister, codebox);
      }

      // valid gridpoints have been removed, destroy the box
      else
        grid_demo.delete_box(codebox);
    });

  },

  /**
   * Change grid dimensions according to the changed input and rebuild the grid
   */
  changeGridDimension: function(){
    grid_demo.domGrid.remove();
    var dimensions = {};
    dimensions[this.id] = this.value;

    // reset changed grid dimensions
    switch(this.id){
        case 'num_columns':
        case 'column_gutter':
        case 'content_left_margin':
        case 'content_right_margin':
          grid_demo.setColumns(dimensions);
          break;

        case 'num_rows': 
        case 'row_gutter': 
        case 'content_top_margin': 
        case 'content_bottom_margin': 
          grid_demo.setRows(dimensions);
          break;
    }

    // rebuild grid
    grid_demo.domGrid = grid_demo.build_grid(grid_demo.domContainer);

    // readjust existing codeboxes
    grid_demo.reposition_boxes();
  },

  /**
   * Preset the dimension changing inputs to the current grid dimensions
   */
  presetDimensionInputs: function(){
    var inputs = ['num_columns', 'column_gutter',
      'content_left_margin', 'content_right_margin',
      'num_rows', 'row_gutter', 'content_top_margin', 
      'content_bottom_margin']; 
    for(var i = 0; i < inputs.length; i++)
      $('#' + inputs[i])[0].value = this[inputs[i]];
  },

  /**
   * Function initializes the grid demo
   *
   * @param domContainer
   * @param domTargetContainer
   * @param dimensions
   */
  init_grid: function(domContainer, domTargetContainer, dimensions){
    this.domContainer = domContainer;
    this.domTarget = domTargetContainer;
    if(!dimensions)
      dimensions = {}

    // set grid dimensions
    this.setColumns(dimensions);
    this.setRows(dimensions);
    
    // build the grid
    this.domGrid = this.build_grid(this.domContainer);

    // preset grid dimension inputs
    this.presetDimensionInputs();

    // start event listeners
    this.domContainer.mousedown(this.start_new_box);
    $('#bg_upload').on('change', function(){
      grid_demo.set_bg_image(this);
    });
    $('.bg_dimension').on('change', function(){
      grid_demo.set_bg_dimension(this.id.split('_')[1], this.value);
    });
    $('.grid_dimension').on('change', this.changeGridDimension);
  }
}

$(document).ready(function(){
  var dimensions = {
    num_columns: 10,
    num_rows: 18,
    column_gutter: 8,
    row_gutter: 8,
    content_left_margin: 0,
    content_right_margin: 0,
    content_top_margin: 0,
    content_bottom_margin: 0
  }
  grid_demo.init_grid($('#demo_grid'), $('#demo_code'), dimensions);
  $(document).tooltip();
});

