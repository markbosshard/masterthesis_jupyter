/**
 * Main JS script loaded in the new.html page responsible for generating
 * the wizard, the steps for the wizard and the accordion with the action
 * taxonomy
 * @author Cristian Anastasiu
 * @module main_wizard.js
 */
require([
  'base/js/namespace',
  'base/js/utils',
  'base/js/events',
  'exports',
  'jquery',
  'require',
  'nbextensions/gdrive/gapiutils',
  'nbextensions/ma/client/common/js/gmail/gmailapi',
  'nbextensions/ma/client/common/js/googledrive/gdapi',
  'nbextensions/ma/client/common/js/helper',
  'nbextensions/ma/client/html/wizard/accordion.js',
  'nbextensions/ma/client/common/js/helper_jqbuilder.js',
  'nbextensions/ma/client/common/js/jqsteps/jquery.steps.js',
  'nbextensions/ma/client/common/js/jqpopup/jquery.magnific-popup.js',
  'nbextensions/ma/client/common/js/dropdown/dropdown.js',
  'jqueryui'
], function(
  IPython,
  utils,
  events,
  exports,
  $,
  require,
  gapiutils,
  gmailapi,
  gdapi,
  helper,
  accordion_helper,
  builder
) {

  /**
    * g_projobj. This is the global object used to store
    * the project properties, assifnments and actions
    *
    * @property g_projobj
    * @type {Object}
    */
  var g_projobj = {
    "name": '',
    "owner": '',
    "description": ''
  }

  /**
    * g_projactions. This is the global object used to store
    * the action taxonomy retrieved when creating the accordion
    *
    * @property g_projactions
    * @type {Object}
    */
  var g_projactions = {};

	var f_mgmt_icon = function(id,label,iconclass,link){
        return $('<div/>').append(
            $('<span/>', { text: label}),
            $('<span/>', {'id': id, class: 'fa-stack fa-3x '}).append(
              $('<a/>',  {target: "_blank", href: link}).append(
                
                $('<i/>', {class : "fa fa-stack-1x "+ iconclass})
              )
            )
          );
      }
  /**
   * Helper method responsible for the transitions between the wizard steps
   * and to perform the validation of inputs.
   * @method wizard_transitions
   * @param {Integer} currentIndext - index of the current step
   * @param {Integer} newIndex - index of the new step
   * @event {transition}
   * @return {Boolean} if true, wizard proceeds to next step, otherwise error is shown
   */
  var wizard_transitions = function(event, currentIndex, newIndex) {

    /**
      * Update project JSON with the current chosen actions
      */

    g_projobj = builder.project.createJSON(g_projobj);
	
    /**
      * Set owner of project
      */
    g_projobj['owner'] = gdapi.getCurrentUser().id;


    switch(currentIndex){
      case 0:
        /**
          * Set the input values from first step into the global project object
          */
        g_projobj['kernel'] = $('#nbkernel').val();
        g_projobj['name'] = $('#gpname').val();
        g_projobj['description'] = $('#gpdescription').val();

        /**
          * Perform some minimal validation.
          */
        if(g_projobj['kernel'] == 0){
          builder.popup.Warning('Please select a kernel', 'fa-exclamation');
          return false;
        }
        if(g_projobj['name'].length  == 0){
          builder.popup.Warning('Enter a project name', 'fa-exclamation');
          return false;
        }
        if(g_projobj['description'].length  == 0){
          builder.popup.Warning('Enter the project description', 'fa-exclamation');
          return false;
        }
        return true;

      case 1:
        /**
         * When moving to third step, add all the actions from the buckets
         * to the action queue.
         */
        if (newIndex == 2) {
	
          /* Add all the previously added actions in the actions placeholder */

          $(".ms-body .dropable .action-item:visible").each(function(index) {
            $(".acont").append($(this));
          });
          /* load the flowchart */
     $.getScript('nbextensions/ma/client/common/js/flowchart.js', function() {
              console.log("finish loading and running test.js. with a status of");
             	 
		initMe("wizard");
 		loadInitial();
          });
         }
        return true;

      case 2:
        /**
          * When moving to fouth step, check if
          * - any unassigned actions left in the actio queue
          * - we have at least one assignment and all assignments are unempty
          * - email address in each assignment is valid
          */

        if (newIndex == 4) {
          if(($(".step3 .ms-body .acont .action-item").length != 0)){
            builder.popup.Warning('Please assign all the actions from the queue', 'fa-exclamation');
            return false;
          }
          for (var x = 0; x < $('.aactions ul').length; x++){
            var tmp = $('.aactions ul')[x];
            if ($(tmp).children().length == 0){
              var n = (parseInt(x)+1)
              builder.popup.Warning('Please assign at least one action to the empty assignment ' + n, 'fa-exclamation');
              return false;
            }
          }

          if(g_projobj.bundles.length == 0){
            builder.popup.Warning('Please create at least one assignment', 'fa-exclamation');
            return false;
          }
          for(x in g_projobj.bundles){
            if(!(g_projobj.bundles[x]['owner']==""))
            {if(!helper.validateEmail(g_projobj.bundles[x]['owner'])){
              var n = (parseInt(x)+1)
              builder.popup.Warning('Enter a valid email address for assignment ' + n, 'fa-exclamation');
              return false;
            }}
          }
          if (!checkDiagramCompleteness()) {
             builder.popup.Warning('Not all Assignments are reachable from the Start! Reconfigure the diagram, please.', 'fa-exclamation');
             return false;

        }

        }

      case 3:
        /**
          * Store the notes board text into the variables object and
          * show the project summary / overview.
          */
        g_projobj['variables'] = $('#p_variables').html();
        console.log(g_projobj);

        if(newIndex == 4){
          var pre = builder.project.display(g_projobj);
          $('#master-wizard-p-' + (newIndex)).html(pre);
        }
        return true;
      default:
        return true;
    }

  };


  /**
   * Helper method executed when user clicks the finish button in the wizard. This will
   * open a popup and call the createNBFlat Promise which will create the project
   * structure in Google Drive and on the server, set up all permissions and notifications.
   * @method wizard_finish
   * @event {finish}
   * @param {Integer} currentIndext - index of the current step
   * @return {Boolean} if true, wizard completes.
   */
  var wizard_finish = function(event, currentIndex) {

    /**
      * Open the popup
      */
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
    helper.createNBFlat(g_projobj,'.magnific_messages').then(
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




  /**
    * Initialize the wizard object.
    * @method initWizard
    */
  var initWizard = function() {

    $("#master-wizard").steps({
      headerTag: "h3",
      bodyTag: "section",
      transitionEffect: 1,
      autoFocus: true,
      saveState: true,
      onStepChanging: wizard_transitions,
      onFinishing: wizard_finish
    });

  };


  /**
    * This method initiates

    */
    var actions=[];
  var initWizardSteps = function() {
      /**
        * HTML content for step 1:
        * - Step Description
        * - Option list
        * - Input for project name
        * - Textarea for project description
        * --------------------------------------------------------------------------------------------------------------------------------
        */

      var c1 = $('<div/>').append(
        $('<select/>', {class: 'span3', name: 'optionlist', id: 'nbkernel'}).append(
          $('<option/>', {selected: 'selected', value: '0', text: 'Select Kernel' }),
          $('<option/>', {value: 'R', text: 'R' }),
          $('<option/>', {value: 'Python', text: 'Python 3.4' })
        ),
        $('<input/>', {class: 'ainput', id: 'gpname', placeholder: 'Project Name'}),
        $('<textarea/>',{id: 'gpdescription', class: 'adescription', placeholder: 'Enter project description'} )
      );
var next = $('<div/>').append(
        $('<select/>', {class: 'span3', name: 'optionlist', id: 'nbkernel'}).append(
          $('<option/>', {selected: 'selected', value: '0', text: 'Select Kernel' }),
          $('<option/>', {value: 'R', text: 'R' }),
          $('<option/>', {value: 'Python', text: 'Python 3.4' })
        )
      );

      /**
        * Description of step 1
        */
      var s1dt = "This is the first step in creating your project. Select the kernel, enter a name and description for the project. ID is generated automatically.";


      /**
        * Creating step 1
        */
      $("#master-wizard").steps('add', {
        title: "Project Information",
        content: [builder.wizard.step_decription(s1dt),$(c1).css('margin', '1%')]
      });

      $("select").dropkick();


      /**
        * HTML content for step 2:
        * - Accordion
        * - Action buckets
        * --------------------------------------------------------------------------------------------------------------------------------
        */

      /**
        * List with action buckets titles. Generate actionbuckets.
        */

      var dmsteps = ["Select Actions"]; /* "Clean Data", "Transform", "Data Mining", "Interpretation" */
      var dms_2 =  dmsteps.map(builder.wizard.actionBuckets);

      /**
        * Initialize and add accordion to content for step 2, before the content withthe action buckets (left side)
        */
       dms_2.unshift(accordion_helper.init());

      /**
        * Description text for step 2
        */

      var s2dt = "In this step you will add the actions which need to be performed in the project. " +
      "Browse for actions in the accordion on the left side and Drag & Drop them in the buckets on the right side. You can add multiple actions to a bucket. " +
      "For adding custom " +
      "actions, click the 'Custom  Actions' menu -> 'Add Action' ";

      /**
        * Initiatie step 2 with content.
        */
	var email_resp=$('<input/>', {id: 'email_recip', class:'ainput', placeholder: 'Owner Email Address(es) [separate by semicolas]'});
        var c2l=$('<div/>',{class: 'ques-step-left'}).append(dms_2);
	var c2w = $('<div/>',{class: 'ques-step-right'}).append(
        f_mgmt_icon('_generate', 'Generate Questionnaire', 'fa-cog', ''),$('<div/>',{ id:'Q_link'}),email_resp,f_mgmt_icon('_send', 'Send', 'fa-paper-plane', ''),$('<div/>',{ id:'email_resp'}));
      	var c2 = $('<div/>', {class: 'stepcontent'}).append(c2l,c2w);
	
	

      $("#master-wizard").steps('add', {
        title: "Add Actions",
        content: [builder.wizard.step_decription(s2dt), c2]
      });
    	var link;
	var Subject="Congratulations!!! for your new assignment";
	var Body="Hello, You have been selected to play a role of worker in Collaborative Data Analysis. You will Shortly receive the workpackage as a shared Google drive folder from our Data Scientist. To receive the workpakage, please click on the link to answer few basic interview questions. You can communicate with him using the respective email id. Thank you!."
	$('#_generate').on('click',function(e){
	e.preventDefault();
	 for (var x = 0; x < $('.dropable ul li').length; x++){
        var tmp = $('.dropable ul li:eq('+x+')').text();
      	actions[x]=tmp;	

	}
	initScript();
	console.log(actions);
	});
	$('#_send').on('click',function(e){
	e.preventDefault();
	gmailapi.send_mail($('#email_recip').first().val(),Subject,Body+link);
	console.log($('#email_recip').first().val());
	
	});


     var initScript= function(){
console.log(actions);
var request = {
    'function': 'CreateFormfromSheet',
    'parameters': [actions]
    };

// Make the request.
	var op = gapi.client.request({
    'root': 'https://script.googleapis.com',
    'path': 'v1/scripts/' +'146gDICnkJSKNy5dIqumZQnGKV5SF891zGKxvMV92e8u5WSG8KdJLxF2W'+ ':run',
    'method': 'POST',
    'body': request
	});
	op.execute(function(resp) {
  if (resp.error && resp.error.status) {
    // The API encountered a problem before the script started executing.
    console.log('Error calling API: ' + JSON.stringify(resp, null, 2));
 	 } else if (resp.error) {
    // The API executed, but the script returned an error.
    var error = resp.error.details[0];
    console.log('Script error! Message: ' + error.errorMessage);
 	 } else {
    var url = resp.response.result;
    console.log('url of the form created');
    $('#Q_link').append("<a href="+url+">Google Form is ready!<br /> Please click here to open it in Google Drive...</a>")
    // Here, the function returns an array of strings.
    link=$('#Q_link').text();
  		}
	});
	};
     
      /**
        * HTML content for step 3:
        * - Step Description
        * - Accordion
        * - Action buckets
        * --------------------------------------------------------------------------------------------------------------------------------
        */


      /**
        * Description text for step 3
        */
      var s3dt = "Here you will assign the actions to users. First click on the '+' icon to create a new assignment. " +
      "Then click on the assignment to make it active, the bar will change to orange. Use the '>'-arrow to add actions to an active assignment."


      /**
        * Generate content for step 3
        */
      var c3 = $('<div/>', {class: 'stepcontent'}).append(
        builder.wizard.actionQueue(),
        builder.wizard.actionChevron(),
        builder.wizard.assignmentContainer()
      )

      /**
        * Initialize step 3
        */
      $("#master-wizard").steps('add', {
        title: "Assignments",
        content: [builder.wizard.step_decription(s3dt),c3]
      });



      /**
        * HTML content for step 4:
        * - Step Description
        * - Note Board - Editable <p>
        * --------------------------------------------------------------------------------------------------------------------------------
        */


      /**
        * Description text for step 4
        */
      var s4dt = "In order to avoid conflicts between notebooks and have a clean transition from one step to another, "+
      "use the Shared Notes. These contents will be stored in the project folder under  'shared.txt' . The contents of the file will be loaded and made visible in every notebook, "+
      "so it is a good place to register variable names used in the different steps or to provide feedback after an interation"


      /**
        * DOM element representing the editable <p> for step 4.
        */
      var shared_notes = $('<div id="shared_notes" class="stepcontent"><p id="p_variables" contenteditable="true"></p></div>')

      /**
        * Demo content for the editable paragraph.
        */
      $(shared_notes).children('p').html("<div>#### Use this place to coordinate input / output between different steps or share notes and requirement after iterations.</div>" +
                              "<div>#### This file is using markdown language.</div>" +
                              "<div><br></div>" +
                              "<div>#### Example - Coordinate between steps</div>" +
                              "<div>#### Variables used in steps</div>" +
                              "<div><br></div>" +
                              "<div>project.step2.csvtable</div>" +
                              "<div>project.step2.map</div>" +
                              "<div>project.step3.ggmap</div>" +
                              "<div><br></div>" +
                              "<div>#### Example - Iteration date <dd.mm.yyyy></div>" +
                              "<div>#### TO DOs</div>" +
                              "<div><br></div>" +
                              "<div>##### Step1</div>" +
                              "<div><br></div>" +
                              "<div>* add proper encoding to the imported data</div>" +
                              "<div>* remove column from dataframe</div>");


      /**
        * Content for step 4
        */
      var c4 = $('<div/>', {class: 'stepcontent'}).append(shared_notes);


      /**
        * Adding step 4 to wizard
        */
      $("#master-wizard").steps('add', {
        title: "Note Board",
        content: [builder.wizard.step_decription(s4dt), c4]
      });



      /**
        * Adding last step to wizard
        */
      $("#master-wizard").steps('add', {
        title: "Summary",
        content: ''
      });

  };


  $(function() {
    /**
      * Initialize the Google Drive API and authentication
      */
    gdapi.init.then(
      function(res){
        /**
          *  Is Google API loaded, Initialize the wizard object
          */
        initWizard();

        /**
          * Initialize the wizard steps
          */
        initWizardSteps();

      }, function(err){
        console.log(err);
      }

    );
  });

});


/* -- END WIZARD ---------------------------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------------------------------------------ */
