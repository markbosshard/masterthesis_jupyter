/**
 * Main JS script loaded in the master.html page.
 * This module retrieves the projects list from the database after the
 * user authenticates and provides an overview of each project the user
 * has access to.
 * {Function} init_projects
 * @author Cristian Anastasiu
 * @module main_master.js
 */


require([
  'base/js/namespace',
  'base/js/utils',
  'base/js/events',
  'jquery',
  'require',
	
  'nbextensions/ma/client/common/js/googledrive/gdapi',
  'nbextensions/ma/client/common/js/helper',
  'nbextensions/ma/client/common/js/helper_jqbuilder',
  'jqueryui',
  'nbextensions/ma/client/common/js/jqpopup/jquery.magnific-popup'
], function(
  IPython,
  utils,
  events,
  $,
  require,
  gdapi,
  dphelper,
  builder
) {
  /**
   * Main method responsible for loading and displaying the projects
   * @method init_projects
   * @author Cristian Anastasiu
   */

  var init_projects = function(){


    /**
     * Main method responsible for loading and displaying the projects
     * This method performs a REST call to the backend and retrieves all
     * the projects where the current user is involved, as owner or worker.
     * @method retrieve_projects
     */
    var retrieve_projects = function(){
      /**
        * REST call to the backend retrieving all projects.
        */

      $.ajax({
        url: "/distprojects",
        contentType: 'application/json,charset=UTF-8',
        type: 'GET',
        data: {'username': gdapi.getCurrentUser().id},
        dataType: 'json',
        success: function (data){
            $('.master .content .mining-step .acont').empty();

            /**
              * Displaying each project as an item in the list
              */

            for(x in data.items){
                var pr = data.items[x];
                var d = $('<div/>', {class: 'project_item', id: pr.gid});
                var a = $('<a/>').text(pr.name);
                var o = $('<span/>').text('Created on: '+ pr.created_date);

                /**
                  * When clicking on a project item, display the project overview
                  * in the middle of page
                  */

                $(d).append(a,o).on('click', function(){
                  var tprid = $(this).attr('id');
                  $.ajax({
                    data: {'username': gdapi.getCurrentUser().id},
                    url: "/distprojects/"+ tprid,
                    contentType: 'application/json,charset=UTF-8',
                    type: 'GET',
                    dataType: 'json',
                    success: function (res){
                      /**
                        * Show the project details
                        */

                      show_proiect(res);
                    }
                  });
                  $('.project_item').removeClass('selected');
                  $(this).addClass('selected');
                });
                $('.master .content .mining-step .acont').append(d);
            }

            /**
              * After project are loaded, click on first.
              */

            $( ".master .content .mining-step .acont .project_item" ).first().trigger( "click" );

         }
      });
    };


    /**
      * Helper method for rendering the management icons on the
      * right side of the master.html page
      * @method mgmt_toolbar
      * @param {Object} DOM object containing the management toolbar with icons
      */

    var mgmt_toolbar = function(project){
      var m = $('<div/>', {class: 'nbmgmt'});

      /**
        * Helper method for rendering icons, returns a DOM element
        * @method f_mgmt_icon
        * @param {String} id - id of DOM element
        * @param {String} label - Title of icon
        * @param {String} iconclass - class of icon, using FontAwesome icons
        * @param {String} link - link where icon should redirect
        * @param {Boolean} disabled
        * @return {Object} DOM element representing the icon
        */

      var f_mgmt_icon = function(id,label,iconclass,link, disabled){
        return $('<div/>').append(
            $('<span/>', {class: 'label', text: label}),
            $('<span/>', {'id': id, class: 'fa-stack fa-3x ' + disabled}).append(
              $('<a/>',  {target: "_blank", href: link}).append(
                $('<i/>', {class : "fa fa-circle fa-stack-2x icon-background"}),
                $('<i/>', {class : "fa fa-circle-thin fa-stack-2x icon-background6"}),
                $('<i/>', {class : "fa fa-stack-1x "+ iconclass})
              )
            )
          );
      }

      /**
        * Creating the management icons
        */
	var _edit = f_mgmt_icon('_edit', 'Edit Worker', 'fa-pencil-square-o', '',   (gdapi.getCurrentUser().id == project['owner'] ? 'enabled' : 'disabled'));
	var _save = f_mgmt_icon('_save', 'Save', 'fa-floppy-o','',(gdapi.getCurrentUser().id == project['owner'] ? 'enabled' : 'disabled'));
      var _merge = f_mgmt_icon('_merge', 'Merge', 'fa-code-fork', '',   (gdapi.getCurrentUser().id == project['owner'] ? 'enabled' : 'disabled'));
      var _goto =  f_mgmt_icon('_goto', 'Go To', 'fa-arrow-right', '/tree/'+ project['gid']);
      var _notes =  f_mgmt_icon('_notes', 'Notes', 'fa-sticky-note-o', '/edit/'+ project['gid'] + '/shared.txt');
      var _delete = f_mgmt_icon('_delete', 'Delete', 'fa-trash-o', '',   (gdapi.getCurrentUser().id == project['owner'] ? 'enabled' : 'disabled'));


      /**
        * Function triggered when merge button is clicked.
        * Will open a popup and call the function mergeNBFlat
        * @event {click}
        */
      $(_merge).on('click','#_merge:not(.disabled)' ,function(e){
        e.preventDefault();
        var popup = $(builder.popup.FormSimple()).clone();
        $.magnificPopup.open({
          items: {
            src: popup,
            type: 'inline',
            closeBtnInside: true,
            fixedContentPos: true
          }
        });
        /**
          * Show success message in case merge was successful
          */
        dphelper.mergeNBFlat(project['gid'],$('.magnific_messages')).then(
          function(res){
            var redirect = $(builder.popup.RedirectWrapper('Merge operation was succesful. Click icon below to navigate to the merged notebook. ', 'fa-check', '/tree/'+ project['gid'])).css('display','none');
            $(popup).append(redirect);
            $(redirect).fadeIn(1000);
            retrieve_projects();
          },
          /**
            * Show error message
            */
          function(err){
            var redirect = $(builder.popup.RedirectWrapper('An error has occured. The project cloud not been created. Please try again.', 'fa-exclamation')).css('display','none');
            $(redirect).addClass('error');
            $(popup).append(redirect);
            $(redirect).fadeIn(1000);
          }
        );
      });


      /**
        * Function triggered when delete button is clicked
        * Will open a popup. If user clicks on Delete, will call deleteNBFlat function
        * @event {click}
        */
      $(_delete).on('click', '#_delete:not(.disabled)',function(e){
        e.preventDefault();
        var popup = $(builder.popup.FormButtons(['Cancel', 'Delete'],['disabled', 'delete'], null, 'Are you sure you want to delete the project '+ project['name'] +'?')).clone();

        /**
          * Open popup
          */

        $.magnificPopup.open({
          items: {
            src: popup,
            type: 'inline',
            closeBtnInside: true,
            fixedContentPos: true
          }
        });

        /**
          * Event triggered when user clicks Delete
          * @event {click} - Click on delete button
          */
        $(popup).on('click', 'a:contains("Delete")', function(){
          dphelper.removeNBFlat(project['gid'],$('.magnific_messages')).then(
            function(res){
              var redirect = $(builder.popup.RedirectWrapper('Delete operation was succesful.', 'fa-check', '')).css('display','none');
              $(popup).html(redirect);
              $(redirect).fadeIn(1000);
              retrieve_projects();
            }
          );
        });

        /**
          * Event triggered when user clicks Cancel
          * @event {click} - Click on Cancel button
          */
        $(popup).on('click', 'a:contains("Cancel")', function(){
          $.magnificPopup.close();
        });
      });

      /**
        * edit function */        
	
      $(_edit).on('click', '#_edit:not(.disabled)',function(e){
		   e.preventDefault();
	  $('#_edit').parent().hide();
	  $(m).prepend(_save);
	  $('.ainput').attr('readonly', false);
  	
	
	});
	/**
        * save function persists changed mailaddresses and action statuses */
	$(_save).on('click', '#_save:not(.disabled)',function(e){
	  e.preventDefault();
	  for (x in project['bundles']){
	    project.bundles[x]['owner']=$('.ainput:eq('+x+')').first().val();
	  }

	  if(saveProject(project)) {
	    $('#_edit').parent().show();
        $('#_save').parent().hide();
        //sharing();
        createsharing();
             }
	});
	var createsharing=function(){
	 var popup = $(builder.popup.FormSimple()).clone();
    $.magnificPopup.open({
      items: {
        src: $(popup),
        type: 'inline',
        closeBtnInside: true,
        fixedContentPos: true
      }
    });

    /**
      * Call the helper method for generating the project. Pass the object class
      * which will display the progress.
      */
    dphelper.shareNBFlat(project, project['gid'],'.magnific_messages').then(
      function(res){

        /**
          * If project creation was successful, show link to the master overview page.
          */
        var redirect = $(builder.popup.RedirectWrapper('Click the link below to be redirected to the master page', 'fa-list', '/master')).clone().css('display','none');
        $(popup).append(redirect);
        $(redirect).fadeIn(1000);
      },
      function(err){

        /**
          * If project was unsuccessful, show error icon and message.
          */
        var redirect = $(builder.popup.RedirectWrapper('An error has occured. The project cloud not been created. Please try again.', 'fa-exclamation')).clone().css('display','none');
        $(redirect).addClass('error');
        $(popup).append(redirect);
        $(redirect).fadeIn(1000);
      }
    );
	};

	var saveProject=function(proj){
	    // persist the project as a whole with an http PUT call
        $.ajax({
            url: "/distprojects",
            data: JSON.stringify(proj),
            contentType: 'application/json,charset=UTF-8',
            type: 'PUT',
            dataType: 'html',
            succes: function(ret) {
              resolve(ret);
              // the success function is not called on a put call. still all is fine if no error called, don't worry.
            },
            error: function(err) {
              alert("couldnt save your changes for some reason. Please try again!");
              return false;
            }
        });
        return true;
	}

      /**
        * Appending all the icons/buttons to the management toolbar in the right.
        */
	
      $(m).append(_edit,_goto,_notes, _delete,_merge);
	
      return m;
    };


    /**
      * Method for rendering the project contents. The method will retrieve
      * the project complete information using a REST service call and will
      * update the overview part of the page.
      * @param {Object} res - the project JSON object
      * @method show_proiect
      */
    var show_proiect = function(res){
      /**
        * Calling helper method to display the project
        */
      $('.pr').html(builder.project.display(res));
      builder.deactivateAssignmentDetail();
      $('.pr').append(mgmt_toolbar(res));

      // create a flowchart div here, load flowchart code here with getscript
       $('.pr').find('.split').first().before($('<div id="flowchartSelector" style="overflow: hidden;"></div>'));
       $('.pr').find('.split').first().before($('<div id="flowchartPane" style="overflow: hidden;"></div>'));
       $.getScript('nbextensions/ma/client/common/js/flowchart.js', function() {
           initMe("master");
           loadExisting(res['flowchartJSON']);
		 $('#flowchartPane').children().eq(1).css("overflow", "hidden");

          for (x in res['bundles']) {
              // remove currently selected choice in dropdown & set the one from the project file
              $("#statusDropdown_" + res.bundles[x]['flowchartID']).find("option[selected='selected']").removeAttr("selected");
              var dropdownSelection = $("#statusDropdown_" + res.bundles[x]['flowchartID']).find("option[value='"+res.bundles[x]['status']+"']");
              dropdownSelection.removeAttr("disabled");
              dropdownSelection.attr("selected", "selected");


              // change color in diagram based on current status
              var flowchartID = res.bundles[x]['flowchartID'].substring(3);
              if (res.bundles[x]['status'] == "New")  {
                changeColorByKey(flowchartID, "#14b9d6");
              } else if (res.bundles[x]['status'] == "Done") {
                changeColorByKey(flowchartID, "#1fbba6");
              } else {
                changeColorByKey(flowchartID, "#f27935");
              }
          }
          determineWorkableNodes(res);
       });
	 // unhide all status dropdowns
      $("i[name='statusDropdownSymbol']").each(function(){
          $(this).show();
       });
       $("select[name='statusDropdown']").each(function(){
          $(this).show();
       });

      var a_wrp = $('<div class="fw activities"></div>');
      var activities = $('<div class="fw-value"></div>');
      $(activities).addClass('overflow150');

      /**
        * Call REST service to get latest events occured
        * in this project
        */
      $.ajax({
        url: "/events/recent/" + res.gid,
        contentType: 'application/json,charset=UTF-8',
        type: 'GET',
        dataType: 'json',
        success: function (data){

          /**
            * Display the events
            */
          for (x in data['items']){
            var astr = $('<span class="activity"></span>').append(
              data['items'][x]['user']+ " " +
              data['items'][x]['type']+"ed" + " " +
              builder.project.getActObjIcon(data['items'][x]['obj_type']) + " " +
              "<strong>" + data['items'][x]['obj_value'] +"</strong>" + "  -  " +
              data['items'][x]['time'] + " min ago."
            )
            $(activities).append(astr);
          }
        }
      });

      $(a_wrp).append($('<i class="fw-icon fa fa-lg fa-bullhorn"></i>'), activities);
      $('.pr').find('.split').first().append(a_wrp);
    };
	var determineWorkableNodes = function(res) {
      for (x in res['bundles']) {

          var flowchartID = res.bundles[x]['flowchartID'];
          // check if node is workable and should be editable
         if (!(res.bundles[x]['status'] == "Done") && determineWorkableNode(flowchartID.substring(3))) {
                $("#statusDropdown_" + flowchartID).find("option[value='New']").removeAttr("selected");

                if(res.bundles[x]['status'] == "New") {
                    $("#statusDropdown_" + flowchartID).find("option[value='Ready']").attr("selected", "selected");
                } else {
                    $("#statusDropdown_" + flowchartID).find("option[value='"+res.bundles[x]['status']+"']").attr("selected", "selected");
                }
                // make assignment orange: it's ready for work now!
                changeColorByKey(flowchartID.substring(3), "#f27935");
                // make dropdown editable
                $("#statusDropdown_" + res.bundles[x]['flowchartID']).find("option").removeAttr("disabled");

                // listen for changes on dropdown and save them
                $("#statusDropdown_" + res.bundles[x]['flowchartID']).change(function() {
                    $( "select option:selected" ).each(function() {
                      var attrFlowchartID = $( this ).parent().parent().parent().parent().parent().attr("id");
                      if($(this).text() == "Done") {
                        if(changeColorByKey(attrFlowchartID.substring(3), "#1fbba6", "changed")){
                            // save new dropdown status on server
                            for(y in res['bundles']) {
                                if(res.bundles[y]['flowchartID'] == attrFlowchartID) {
                                    res.bundles[y]['status'] = $(this).text();
                                    saveProject(res);
                                }
                            }
                          // make dropdown fully blocked again
                          $("#statusDropdown_" + attrFlowchartID).find("option").attr("disabled", "disabled")

                          // make titlebar of assignment green
                          $("#text"+attrFlowchartID).css("background", "#1fbba6");
                          determineWorkableNodes(res);
                        }
                      } else {
                          $("#statusDropdown_" + attrFlowchartID).find("option[value='Ready']").attr("disabled", "disabled");
                          // save new dropdown status on server
                          for(y in res['bundles']) {
                                if(res.bundles[y]['flowchartID'] == attrFlowchartID) {
                                    res.bundles[y]['status'] = $(this).text();
                                    saveProject(res);
                                }
                          }
                      }
                    });
                });
                // this is down here due to race conditions.. just deactivate the blank dropdownchoice, once the ass. is orange
                $("#statusDropdown_" + flowchartID).find("option[value='New']").attr("disabled", "disabled");
            }
        }
    }

    /**
      * Retrieving the projects
      */
    retrieve_projects();

  };



  $(function() {
    /**
      * First we check id user is authenticated
      * If yes, retrieve projects, if no init the
      * Google authentication again.
      */

    if(gdapi.getCurrentUser().id){
      init_projects();
    }
    else{
      gdapi.init.then(function(res){
        init_projects();
      }, function(err){
        console.log(err);
      });
    }
  });
});
