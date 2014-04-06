(function(){

	/* LOAD JQUERY
	 * http://coding.smashingmagazine.com/2010/05/23/make-your-own-bookmarklets-with-jquery/
	   ************************************************************************************/

	// the minimum version of jQuery we want
	var v = "2.1.0";

	// check prior inclusion and version
	if (window.jQuery === undefined || window.jQuery.fn.jquery < v) {
		addScriptTag("https://ajax.googleapis.com/ajax/libs/jquery/" + v + "/jquery.min.js", init);
	} else {
		init();
	}

	function addScriptTag(url, callback) {
		var done = false;
		var script = document.createElement("script");
		script.src = url;
		script.onload = script.onreadystatechange = function() {
			if (!done && (!this.readyState || this.readyState == "loaded" || this.readyState == "complete")) {
				done = true;
				callback();
			}
		};
		document.getElementsByTagName("head")[0].appendChild(script);
	}
	
	function init() {
		(window.myBookmarklet = function() {
			
			/* Try to guess which element contains the text the user wants to read. */
			var elem = findBody();
			if (elem) {
				var elems = elem.find('p, li, blockquote').filter(":visible");
				startSpritzing(elems.toArray());
			}

			$('*').dblclick(function(e) {
				var elems = [];
				var e = $(this);
				while (true) {
					if (e[0].nodeName.toLowerCase() == "p")
						elems.push(e[0])
					else
						e.find('p, li, blockquote').filter(":visible").each(function() {
							elems.push(this)
						});

					var n = e.next();
					while (n.length == 0 && e.parent().length) {
						e = e.parent();
						n = e.next();
					}
					if (n.length == 0) break; // end of document
					e = n;
				}

				if (elems.length == 0) return;
				$(elems[0]).addClass("spritzing-here");
				
				startSpritzing(elems);

				return false; // only process the innermost element clicked
			})
		})();
	}

	function findBody(targets) {
		// Find the element that has the largest amount of paragraph
		// text but not very much non-paragraph text.
		var items = !targets ? document.getElementsByTagName("*") : targets;
		var body = null;
		var score = 0;
		for (var i = items.length; i--;) {
			if (items[i].nodeName.toLowerCase() == "script") continue;
		    var e = $(items[i]);

		    var textlength = 0;
		    e.find("p").each(function() {
				textlength += $(this).text().length;
		    })
		    e.find("> *").each(function() {
		    	if (this.nodeName.toLowerCase() != "p" && $(this).find("p").length == 0)
					textlength -= $(this).text().length;
		    })

		    if (textlength > score) {
		    	body = e;
		    	score = textlength;
		    }
		}
		return body;
	}

	function startSpritzing(elems) {
		if ($("#spritzer").length == 0)
			loadSpritz(function() { startSpritzing(elems); });
		else
			startSpritzing2(elems);
	}

	function loadSpritz(callback) {
		var reticle = $('<div id="spritzer" style="z-index: 9999999999; position: absolute; right: 100px"></div>');
			/* position: fixed; top: 50px; right: 50px; */
		$('body').append(reticle);
		// http://stackoverflow.com/questions/2177983/how-to-make-div-follow-scrolling-smoothly-with-jquery
		$(window).scroll(function(){
		    var windowpos = $(window).scrollTop();
	        reticle.stop().css({'top':windowpos},500);
		});		

		$('head').append($('<style type="text/css">.spritzing-here { font-weight: bold; border: 1px solid #FAA; color: black; background-color: white; }</style>'));
		
		window.SpritzSettings = {
          clientId: "001914533a9238ad4",
          redirectUri: "https://occams.info/readlet/login_success.html",
   		};

		addScriptTag('https://sdk.spritzinc.com/js/1.0/js/spritz.min.js', function() {
			window.spritzController = new SPRITZ.spritzinc.SpritzerController({
     		   /*"redicleWidth" :     340,
		       "redicleHeight" :     70,
		       "defaultSpeed" :     250, 
		       "speedItems" :         [250, 300, 350, 400, 450, 500, 550, 600], 
		       "controlButtons" :     ["back", "pauseplay", "rewind"],
		       "controlTitles" : {
		           "pause" :         "Pause",
		           "play" :         "Play",
		           "rewind" :         "Rewind", 
		           "back" :         "Previous Sentence"
		       }*/
			});
			
			// Attach the controller's container to this page's "spritzer" container
			spritzController.attach($("#spritzer"));
			
			callback();
		});
	}

	function startSpritzing2(elems) {
		// compute the text and align character positions to elements we can highlight
		var text = "";
		var spritz_text_positions = [];
		var num_words = 0;
		elems.forEach(function(item) {
			// skip content inside of figures
			if ($(item).parents('figure').length > 0) return;

			// append text content
			var elemtext = $(item).text() + "\n\n";

			// things that make Spritzing easier (for me at least)
			elemtext = elemtext.replace(/“/g, " « ");
			elemtext = elemtext.replace(/(\.)?”/g, " » » "); // remove a period before an end quote because the pause inserted between the period and the quote is disturbing, double up the quote character in the hopes this creates a longer duration
			elemtext = elemtext.replace(/(Mr|Ms|Mrs|Dr)\. /g, "$1_");

			text += elemtext;
			num_words += elemtext.split(/\s+/).length; // number of words-ish
			spritz_text_positions.push([num_words, item]);
		})

		// Supply custom progress reporter
		$("*").removeClass("spritzing-here");
		var prev_elem = null;
		window.spritzController.setProgressReporter(function(completed, total) {
			// find the element containing the word currently being completed
			while (spritz_text_positions.length > 0 && completed/total > (spritz_text_positions[0][0] - 1)/num_words)
				spritz_text_positions.shift();
			if (spritz_text_positions.length == 0) return;
			var e = spritz_text_positions[0][1];
			if (e == prev_elem) return;

			// highlight it
			if (prev_elem) $(prev_elem).removeClass("spritzing-here");
			$(e).addClass("spritzing-here");
			prev_elem = e;

			// scroll to it
			$('html, body').animate({ scrollTop: $(e).offset().top - .2*$(window).height() });
		});

		// Other Events
		var container = $("#spritzer");
		//container.on("onSpritzPlay", function(event, position) {console.log("onSpritzPlay: " + position);});
		//container.on("onSpritzSpeedChanged", function(event, speed) {console.log("onSpritzSpeedChanged: " + speed);});
		// container.on("onSpritzCompleted", function(event) { });
		//container.on("onSpritzBack", function(event, position, pausePos) {console.log("onSpritzBack: " + position + "/" + pausePos);});			

		// begin spritzing
  		var locale = "en_us;";       
    	window.SpritzClient.spritzify(text, locale,
    		function(spritzText) {
				spritzController.startSpritzing(spritzText);
			},
			function(e) {
				console.log(e);
				alert("Sorry we got an error from Spritz.")
			}
		);
	}
	
})();
