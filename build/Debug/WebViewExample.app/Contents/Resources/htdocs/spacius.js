/**
 * @Constructor
 */
Spacius = function() {

	// Constants (sort of)
	var
		// Keys
		KEY_LEFT = 37,
		KEY_RIGHT = 39,
		KEY_DOWN = 40,
		KEY_UP = 38,
		KEY_SPACE = 32,
		KEY_S = 83,

		// Game settings
		MAIN_TIME = 10,
		MODE_DYING = 1,
		MODE_PLAYING = 2,
		MODE_TITLE = 3,
		SCREEN_WIDTH = 400,
		SCREEN_HEIGHT = 300,

		// Ship settings
		MAX_SHOTS = 3,
		NUM_PIECES = 16,
		SHIP_SPEED = 2,
		SHIP_WIDTH = 32,
		SHIP_HEIGHT = 16,
		SHOT_SPEED = 5,
		SHOT_SIZE = 8,
		
		// UFO settings
		MAX_UFOS = 15,
		MOVE_DIAG = 1,
		MOVE_METEOR = 2,
		MOVE_STRAIGHT = 3,
		MOVE_WAVE = 4,
		UFO_WIDTH = 32,
		UFO_HEIGHT = 32;

	var
		con,
		game = {
			mode : MODE_TITLE
		},
		mp3 = {},
		ops,
		pattern,
		screen,
		shots = [],
		sound = false,
		ufos = [],
		waveScores = [0,
			200,
			800,
			2000,
			4000,
			10000,
			999999999
		];

	/**
	 * Initialize 
	 * @param {Object} ops The parameters [id, width, height, imgUrl]
	 * @public
	 */
	var init = function(o) {

		ops = o;
		ops.imgUrl = ops.imgUrl || './';
		con = document.getElementById(ops.id);

		SCREEN_WIDTH = ops.width || con.offsetWidth || SCREEN_WIDTH;
		SCREEN_HEIGHT = ops.height || con.offsetHeight || SCREEN_HEIGHT;

		// Create the screen
		screen = document.createElement('div');
		setEl(screen, {
			background : '#000',
			overflow : 'hidden',
			position : 'relative',
			width : SCREEN_WIDTH + 'px',
			height : SCREEN_HEIGHT + 'px'
		});
		con.appendChild(screen);

		mute.init();
		score.init();
		ship.init();
		title.init();
		tryAgain.init();
		starfield.init();
		starfield.start();

		// Listen for keystrokes (probably going to hell for this)
		addEvent(document, 'keydown', execKeyDown);
		addEvent(document, 'keyup', execKeyUp);

		soundManager.onload = function() {
			sound = true;
			mp3.death = soundManager.createSound({
				id : 'death',
				url : 'death.mp3'
			});
			mp3.shot = soundManager.createSound({
				id : 'shot',
				url : 'shot.mp3'
			});
			mp3.theme = soundManager.createSound({
				id : 'theme',
				onfinish : function() {
					playSound('theme');
				},
				url : 'theme.mp3'
			});
			mp3.ufoDie = soundManager.createSound({
				id : 'ufoDie',
				url : 'ufo_die.mp3'
			});
		};

	};

	/**
	 * Add an event listener
	 * @param {Object} el The element to attach to
	 * @param {String} e The event to watch
	 * @param {Function} fn The function to attach
	 */
	var addEvent = (document.addEventListener ? function(el, e, fn) {
			el.addEventListener(e, fn, false);
		} : function(el, e, fn) {
			el.attachEvent('on' + e, fn);
		}
	);

	/**
	 * Check to see if it's time to make a new UFO
	 */
	var checkWave = function() {

		// Don't make a new one if we're not playing
		if (game.mode != MODE_PLAYING) {
			return;
		}

		var meteors = false;

		// What kind of wave are we dealing with here?
		switch (game.wave) {
			case 1: // Just create random bombers
				if (rand(1, 100) == 1) {
					makeUfo('bomber');
				}
				break;
			case 2: // Do diagonal bogeys
				if (!pattern) {
					pattern = createPattern({
						delay : 16,
						movement : MOVE_DIAG,
						num : 6,
						speed : rand(3, 4),
						type : 'bogey'
					});
				}
				break;
			case 3: // Death stars
				if (!pattern) {
					pattern = createPattern({
						delay : 16,
						movement : MOVE_WAVE,
						num : rand(5, 8),
						speed : rand(2, 3),
						type : 'ds'
					});
				}
				break;
			case 4: // High wavey bogeys and meteors
				meteors = 250;
				if (!pattern) {
					pattern = createPattern({
						delay : 10,
						extra : {
							tallWave : true
						},
						movement : MOVE_WAVE,
						num : 8,
						speed : rand(3, 4),
						type : 'bogey'
					});
				}
				break;
			case 5: // Lots of fast bombers and meteors
				meteors = 150;
				if (rand(1, 50) == 1) {
					makeUfo('bomber', {
						speed : rand(4, 6)
					});
				}
				break;
			case 6: // The final wave. Everybody in!
				meteors = 200;
				if (rand(1, 75) == 1) {
					makeUfo('bomber', {
						speed : rand(3, 6)
					});
				}
				if (!pattern) {
					if (rand(1, 2) == 1) {
						pattern = createPattern({
							delay : 16,
							movement : MOVE_WAVE,
							num : 5,
							speed : rand(2, 3),
							type : 'ds'
						});
					} else {
						pattern = createPattern({
							delay : 16,
							movement : MOVE_DIAG,
							num : 6,
							speed : rand(2, 3),
							type : 'bogey'
						});
					}
				}
				break;
		}

		if (meteors) {
			if (rand(1, meteors) == 1) {
				makeUfo('meteor', {
					movement : MOVE_METEOR
				});
			}
		}

		// If a pattern exists, this block sets a delay then creates a UFO if one's ready. It will only destroy itself when there are no UFOs left
		if (pattern) {
			if (pattern.d++ >= pattern.delay) {

				pattern.d = 0;

				if (pattern.n < pattern.num) {
					if (makeUfo(pattern.type, pattern)) {
						pattern.n++;
					}
				} else if (game.numUfos <= 0) {
					pattern = false;
				}

			}
		}

		if (game.score >= waveScores[game.wave]) {
			game.wave++;
			pattern = false;
		}

	};

	/**
	 *
	*/
	var collide = function(coords, coords2) {

		var hx = ((coords.x >= coords2.x) && (coords.x <= coords.x)),
			hy = ((coords.y  >= coords2.y) && (coords.y <= coords2.y));   

		if ((coords.x < coords2.x2) && (coords.x2 > coords2.x) && (coords.y < coords2.y2) && (coords.y2 > coords2.y)) {
			return true;
		}

		return false;

	};

	var createPattern = function(pat) {

		pat.d = 0;
		pat.n = 0;

		switch (pat.movement) {
			case MOVE_DIAG:
				pat.x = SCREEN_WIDTH;
				pat.y = rand(UFO_HEIGHT, (SCREEN_HEIGHT / 4));
				break;
			case MOVE_WAVE:
				pat.x = SCREEN_WIDTH;
				pat.y = rand((SCREEN_HEIGHT / 4), (SCREEN_HEIGHT / 2));
				break;
		}

		return pat;

	};

	/**
	 * Executes a key command, like moving or firing
	 * @param {Event} e The event
	 * @private
	 */
	var execKeyDown = function(e) {

		if (game.mode == MODE_PLAYING) {

			switch (e.keyCode) {
				case KEY_LEFT:
					ship.setMoveX(KEY_LEFT);
					break;
				case KEY_RIGHT:
					ship.setMoveX(KEY_RIGHT);
					ship.setImg('ship_moving.gif');
					break;
				case KEY_UP:
					ship.setMoveY(KEY_UP);
					break;
				case KEY_DOWN:
					ship.setMoveY(KEY_DOWN);
					break;
				case KEY_SPACE:
					shoot();
					break;
			}

		} else if (game.mode == MODE_TITLE) {
			if (e.keyCode == KEY_SPACE) {
				newGame();
			}
		}

		if (e.keyCode == KEY_S) {
			toggleSound();
		}

	};

	/**
	 * Executes a key being let up
	 * @param {Event} e The event
	 * @private
	 */
	var execKeyUp = function(e) {

		if (game.mode != MODE_PLAYING) {
			return;
		}

		switch (e.keyCode) {
			case KEY_LEFT:
				ship.setMoveX();
				break;
			case KEY_RIGHT:
				ship.setMoveX();
				ship.setImg('ship.gif');
				break;
			case KEY_UP:
				ship.setMoveY();
				break;
			case KEY_DOWN:
				ship.setMoveY();
				break;
		}

	};

	var explosion = function() {

		var
			els = [],
			interval,
			params;

		var done = function() {

			for (var i = 0; i < params.num; i++) {
				els[i].hide();
			}

			clearInterval(interval);

			params.onComplete();

		};

		var move = function() {

			for (var i = 0; i < params.num; i++) {

				els[i].x -= Math.cos(els[i].radians) * params.speed;
				els[i].y -= Math.sin(els[i].radians) * params.speed;

				els[i].style.left = els[i].x + 'px';
				els[i].style.top = els[i].y + 'px';

				if ((els[i].x < 0) || (els[i].x > SCREEN_WIDTH) || (els[i].y < 0) || (els[i].y > SCREEN_HEIGHT)) {
					els[i].hide();
				}

			}

		};

		var start = function(o) {

			var
				a = 0,
				aInc = parseInt(360 / o.num);

			o.speed = o.speed || 2;

			for (var i = 0; i < o.num; i++) {

				if (!els[i]) {
					els[i] = makeEl();
					screen.appendChild(els[i]);
				}

				setEl(els[i], {
					background : 'url(' + ops.imgUrl + 'ship_piece.gif)',
					position : 'absolute',
					width : '8px',
					height : '8px',
					zIndex : '2'
				});

				els[i].radians = (a * Math.PI) / 180;
				els[i].x = ship.getX() + (SHIP_WIDTH / 2);
				els[i].y = ship.getY() + (SHIP_HEIGHT / 2);
				els[i].style.left = els[i].x + 'px';
				els[i].style.top = els[i].y + 'px';
				a += aInc;

				els[i].show();

			}

			interval = setInterval(move, MAIN_TIME);
			setTimeout(done, 2500);
			params = o;

		};

		return {
			start : start
		};

	}();

	/**
	 * The main game controller
	 * @private
	 */
	var main = function() {

		var
			s, u,
			shotLen = shots.length,
			ufoLen = ufos.length;

		// Move the ship
		ship.move();

		// Loop through the UFOs and see if we have to KILL SOMETHING!
		for (u = 0; u < ufoLen; u++) {
			if (ufos[u].isAlive()) {

				ufos[u].move();

				if (ship.isAlive() && collide(ship.getCoords(), ufos[u].getCoords())) {
					ship.kill();
					ufos[u].kill();
				}

				for (s = 0; s < shotLen; s++) {
					if (shots[s].isActive()) {
						if (collide(shots[s].getCoords(), ufos[u].getCoords())) {
							shots[s].stop();
							ufos[u].kill();
						}
					}
				}

			}
		}

		// Move the shots
		for (s = 0; s < shotLen; s++) {
			if (shots[s].isActive()) {
				shots[s].move();
			}
		}

		// Make a new UFO?
		checkWave();

	};

	var makeEl = function() {

		var el = document.createElement('div');

		el.hide = function() {
			el.style.display = 'none';
		};

		el.show = function() {
			el.style.display = '';
		};

		return el;

	};

	/**
	 * Creates a UFO
	 */
	var makeUfo = function(t, params) {

		var ok = false;

		for (var i = 0; i < MAX_UFOS; i++) {
			if (!ufos[i]) {
				ok = true;
				ufos[i] = new Ufo();
				break;
			} else if (!ufos[i].isActive()) {
				ok = true;
				break;
			}
		}

		if (ok) {
			game.numUfos++;
			ufos[i].start(t, params);
		}

		return ok;

	};

	/**
	 * The mute element
	 */
	var mute = function() {

		var
			el = makeEl(),
			timeout;

		var init = function() {

			setEl(el, {
				color : '#fff',
				fontFamily : 'verdana, sans-serif',
				fontSize : '10px',
				padding : '0px',
				position : 'absolute',
				left : '2px',
				bottom : '2px'
			});

			el.hide();

			screen.appendChild(el);

		};

		var hide = function() {

			if (timeout) {
				clearTimeout(timeout);
			}

			timeout = setTimeout(function() {
				el.hide();
			}, 1000);

		};

		var show = function() {
			el.innerHTML = 'Sound is ' + (sound ? 'ON' : 'OFF');
			el.show();
		};

		return {
			hide : hide,
			init : init,
			show : show
		};

	}();

	/**
	 * Starts a new agme
	 * @private
	 */
	var newGame = function() {

		if (game.interval) {
			clearInterval(game.interval);
			game.interval = false;
		}

		// Reset vars
		game.interval = setInterval(main, MAIN_TIME);
		game.mode = MODE_PLAYING;
		game.numUfos = 0;
		game.score = 0;
		game.wave = 1;
		pattern = false;
		score.add(0);

		// Hide stuff we don't wanna see
		title.hide();
		tryAgain.hide();

		// Show stuff we do wanna see
		score.show();
		ship.start();

		playSound('theme');

	};

	/**
	 * Attemps to play a sound if mute is not on and SM2 loaded successfully
	 */
	var playSound = function(id) {
		if (sound && mp3 && mp3[id]) {
			mp3[id].play();
		}
	};

	/**
	 * The player's score
	 * @private
	 */
	var score = function() {

		var el = makeEl();

		var init = function() {

			setEl(el, {
				color : '#fff',
				display : 'none',
				fontFamily : 'verdana, sans-serif',
				fontSize : '10px',
				left : '2px',
				top : '2px',
				position : 'absolute',
				zIndex : '1'
			});
			el.innerHTML = 'Score: 0';

			screen.appendChild(el);

		};

		var add = function(s) {
			game.score += s || 0;
			el.innerHTML = 'Score: ' + game.score;
		};

		return {
			add : add,
			hide : el.hide,
			init : init,
			show : el.show
		};

	}();

	/**
	 * Generate a random number based on the passed range
	 * @param {Number} from The starting point
	 * @param {Number} to The ending point
	 * @return {Number} The random number
	 * @private
	 */
	var rand = function(from, to) {
		return (from + Math.floor((to - from + 1) * (Math.random() % 1)));
	};

	/**
	 * Mass-sets styles on an element
	 * @param {Object} el The element to alter
	 * @param {Object} s Key/value pairs of the styles to set
	 */
	var setEl = function(el, s) {
		for (var i in s) {
			el.style[i] = s[i];
		}
	};

	/**
	 * The ship object
	 * @private
	 */
	var ship = function() {

		var
			alive = true,
			el = makeEl(),
			moveX = 0, moveY = 0;

		var init = function() {

			setEl(el, {
				background : 'url(' + ops.imgUrl + 'ship.gif)',
				display : 'none',
				width : SHIP_WIDTH + 'px',
				height : SHIP_HEIGHT + 'px',
				position : 'absolute',
				zIndex : '2'
			});

			screen.appendChild(el);

		};

		var getCoords = function() {
			return {
				x : el.x,
				y : el.y,
				x2 : (el.x + SHIP_WIDTH),
				y2 : (el.y + SHIP_HEIGHT)
			};
		};

		
		var isAlive = function() {
			return alive;
		};

		var kill = function() {

			alive = false;
			game.mode = MODE_DYING;

			explosion.start({
				num : NUM_PIECES,
				onComplete : function() {
					game.mode = MODE_TITLE;
					tryAgain.show();
				}
			});

			ship.hide();

			playSound('death');
			stopSound('theme');

		};

		var move = function() {

			switch (moveX) {
				case KEY_LEFT:
					el.x -= SHIP_SPEED;
					if (el.x < 0) {
						el.x = 0;
					}
					break;
				case KEY_RIGHT:
					el.x += SHIP_SPEED;
					if ((el.x + SHIP_WIDTH) > SCREEN_WIDTH) {
						el.x = (SCREEN_WIDTH - SHIP_WIDTH);
					}
					break;
			}

			switch (moveY) {
				case KEY_UP:
					el.y -= SHIP_SPEED;
					if (el.y < 0) {
						el.y = 0;
					}
					break;
				case KEY_DOWN:
					el.y += SHIP_SPEED;
					if ((el.y + SHIP_HEIGHT) > SCREEN_HEIGHT) {
						el.y = (SCREEN_HEIGHT - SHIP_HEIGHT);
					}
					break;
			}

			el.style.left = el.x + 'px';
			el.style.top = el.y + 'px';

		};

		var setImg = function(src) {
			el.style.background = 'url(' + ops.imgUrl + src + ')';
		};

		var setMoveX = function(x) {
			moveX = x || false;
		};

		var setMoveY = function(y) {
			moveY = y || false;
		};

		var start = function() {

			alive = true;
			el.x = ((SCREEN_WIDTH / 2) - (SHIP_WIDTH / 2));
			el.y = ((SCREEN_HEIGHT / 2) - (SHIP_HEIGHT / 2));
			moveX = 0;
			moveY = 0;

			el.style.left = el.x + 'px';
			el.style.top = el.y + 'px';

			el.show();

		};

		return {
			getCoords : getCoords,
			getX : function() {return el.x;},
			getY : function() {return el.y;},
			hide : el.hide,
			init : init,
			isAlive : isAlive,
			kill : kill,
			move : move,
			setImg : setImg,
			setMoveX : setMoveX,
			setMoveY : setMoveY,
			show : el.show,
			start : start
		};

	}();

	/**
	 * Generate a shot coming form the ship
	 * @Constructor of sorts
	 */
	var shot = function() {

		var
			active = false,
			el = makeEl();

		var init = function() {

			setEl(el, {
				background : 'url(' + ops.imgUrl + 'shot.gif)',
				overflow : 'hidden', // IE6
				position : 'absolute',
				width : SHOT_SIZE + 'px',
				height : SHOT_SIZE + 'px'
			});

			screen.appendChild(el);

			start();

		};

		var isActive = function() {
			return active;
		};

		var getCoords = function() {
			return {
				x : el.x,
				y : el.y,
				x2 : (el.x + SHOT_SIZE),
				y2 : (el.y + SHOT_SIZE)
			};
		};

		var move = function() {

			el.x += SHOT_SPEED;

			if ((el.x + SHOT_SIZE) >= SCREEN_WIDTH) {
				stop();
			}

			el.style.left = el.x + 'px';

		};

		var start = function() {

			active = true;

			el.x = (ship.getX() + SHIP_WIDTH);
			el.y = (ship.getY() + (SHIP_HEIGHT / 4));

			el.style.left = el.x + 'px';
			el.style.top = el.y + 'px';

			el.show();

		};

		/**
		 * Destroys the shot
		 */
		var stop = function() {

			active = false;

			el.hide();

		};

		init();

		return {
			move : move,
			getCoords : getCoords,
			isActive : isActive,
			start : start,
			stop : stop
		};

	};

	/**
	 * Creates or activates a shot
	 */
	var shoot = function() {

		var ok = false;

		for (var i = 0; i < MAX_SHOTS; i++) {
			if (!shots[i]) {
				ok = true;
				shots[i] = shot();
				break;
			} else if (!shots[i].isActive()) {
				ok = true;
				shots[i].start();
				break;
			}
		}

		if (ok) {
			playSound('shot');
		}

	};

	/**
	 * 
	 */
	var starfield = function() {

		var
			interval = false,
			numStars = 50,
			speed = 25,
			stars = [];

		var animate = function() {
			for (var i = 0; i < numStars; i++) {
				stars[i].x -= stars[i].speed;
				if (stars[i].x < 0) {
					stars[i].x = (SCREEN_WIDTH - 1);
					stars[i].y = rand(0, SCREEN_HEIGHT - 1);
				}
				stars[i].style.left = stars[i].x + 'px';
				stars[i].style.top = stars[i].y + 'px';
			}
		};

		var makeStar = function() {

			var
				el = makeEl('div'),
				s = rand(1, 5)
				r = (s * 55) - 50,
				x = rand(0, SCREEN_WIDTH - 1),
				y = rand(0, SCREEN_HEIGHT - 1);

			el.speed = s;

			setEl(el, {
				background : 'rgb(' + r + ',' + r + ',' + r + ')',
				zoom : 1,
				left : x + 'px',
				top : y + 'px',
				overflow : 'hidden', // IE6
				position : 'absolute',
				width : '1px',
				height : '1px',
				zIndex : '1'
			});

			el.x = x;
			el.y = y;

			screen.appendChild(el);

			return el;

		};

		var start = function() {
			if (!interval) {
				interval = setInterval(animate, speed);
			}
		};

		var stop = function() {
			if (interval) {
				clearInterval(interval);
				interval = false;
			}
		};

		var init = function() {
			for (var i = 0; i < numStars; i++) {
				stars[i] = makeStar();
			}
		};

		return {
			//setSpeed : setSpeed,
			//show : show,
			init : init,
			start : start,
			stop : stop
		};
		
	}();

	/**
	 * Attemps to stop a sound if SM2 loaded
	 */
	var stopSound = function(id) {

		if (mp3 && sound && mp3[id]) {
			mp3[id].stop();
		}

	};

	var title = function() {

		var el = makeEl();

		var init = function() {

			setEl(el, {
				// 287x110
				background : 'url(' + ops.imgUrl + 'title.gif)',
				left : (SCREEN_WIDTH / 2 - 144) + 'px',
				top : (SCREEN_HEIGHT / 2 - 55) + 'px',
				position : 'absolute',
				width : '287px',
				height : '110px',
				zIndex : '2'
			});
			screen.appendChild(el);

		};

		var hide = function() {
			el.style.display = 'none';
		};

		var show = function() {
			el.style.display = '';
		};

		return {
			hide : el.hide,
			init : init,
			show : el.show
		};

	}();

	/**
	 * Toggles the sound between on/off states
	 */
	var toggleSound = function() {

		if (sound) {
			if (game.mode == MODE_PLAYING) {
				stopSound('theme');
			}
			sound = false;
		} else {
			sound = true;
			if (game.mode == MODE_PLAYING) {
				playSound('theme');
			}
		}

		mute.show();
		mute.hide();

	};

	/**
	 * The try again object - lets the user try again, doy
	 */
	var tryAgain = function() {

		var el = makeEl();

		var init = function() {

			setEl(el, {
				color : '#fff',
				fontFamily : 'verdana, sans-serif',
				fontSize : '10px',
				padding : '0px',
				position : 'absolute',
				right : '2px',
				bottom : '2px'
			});

			el.hide();

			el.innerHTML = 'Play Again?<br>Press SPACE';

			screen.appendChild(el);

		};

		return {
			hide : el.hide,
			init : init,
			show : el.show
		};

	}();

	var Ufo = function() {

		var
			active = false,
			alive = false,
			el,
			type;

		var init = function() {

			el = makeEl();

			screen.appendChild(el);

		};

		var animations = {
			'1' : function() { // MOVE_DIAG
				switch (el.stage) {
					case 1:
						if (el.x < (SCREEN_WIDTH / 4)) {
							el.stage = 2;
						}
					case 3:
						el.x -= el.speed;
						break;
					case 2:
						el.x += el.speed;
						el.y += el.speed;
						if ((el.x > (SCREEN_WIDTH * .75)) || (el.y > (SCREEN_HEIGHT * .75))) {
							el.stage = 3;
						}
						break;
				}
				if (el.x < -UFO_WIDTH) {
					stop();
				}
				el.style.left = el.x + 'px';
				el.style.top = el.y + 'px';
			},
			'3' : function() { // MOVE_STRAIGHT
				el.x -= el.speed;
				if (el.x < -UFO_WIDTH) {
					stop();
				}
				el.style.left = el.x + 'px';
				el.style.top = el.y + 'px';
			},
			'4' : function() { // MOVE_WAVE
				el.inc += 5;
				el.x -= el.speed;
				if (el.extra && el.extra.tallWave) {
					el.y = parseInt(el.yStart - ((UFO_HEIGHT * 2) * Math.sin(0.02 * el.inc)));
				} else {
					el.y = parseInt(el.yStart - (UFO_HEIGHT * Math.sin(0.0125 * el.inc)));
				}
				if (el.x < -UFO_WIDTH) {
					stop();
				}
				el.style.left = el.x + 'px';
				el.style.top = el.y + 'px';
			},
			'2' : function() { // MOVE_METEOR
				el.x -= Math.cos(el.radians) * el.speed;
				el.y -= Math.sin(el.radians) * el.speed;
				if ((el.x < -UFO_WIDTH) || (el.y > SCREEN_HEIGHT)) {
					stop();
				}
				el.style.left = el.x + 'px';
				el.style.top = el.y + 'px';
			}
		};

		var getCoords = function() {
			return {
				x : el.x,
				y : el.y,
				x2 : (el.x + UFO_WIDTH),
				y2 : (el.y + UFO_WIDTH)
			};
		};

		var isActive = function() {
			return active;
		};

		var isAlive = function() {
			return alive;
		};

		var kill = function() {

			alive = false;
			el.style.background = 'url(' + ops.imgUrl + 'explode.gif)';

			playSound('ufoDie');
			score.add(el.score);
			setTimeout(stop, 900);

		};

		var move = function() {
			animations[el.movement]();
		};

		var start = function(t, params) {

			params = params || {};

			// Defaults
			active = true;
			alive = true;
			el.extra = params.extra;
			el.movement = params.movement || MOVE_STRAIGHT;
			el.speed = params.speed || rand(1, 3);
			el.stage = 1;
			el.x = params.x || (SCREEN_WIDTH - UFO_WIDTH);
			el.y = params.y || rand(0, (SCREEN_HEIGHT - UFO_HEIGHT));
			type = t;

			switch (el.movement) {
				case MOVE_WAVE:
					el.inc = 0;
					el.speed = params.speed || rand(1, 2);
					el.yStart = el.y;
					break;
				case MOVE_METEOR:
					el.radians = ((rand(225, 315) * Math.PI) / 180);
					el.speed = params.speed || rand(3, 5);
					el.x = (SCREEN_WIDTH / 2) - rand(-UFO_WIDTH, UFO_WIDTH);
					el.y = -UFO_HEIGHT;
					break;
			}

			switch (t) {
				case 'bogey':
					el.score = 20;
					break;
				case 'bomber':
					el.score = 15;
					break;
				case 'ds':
					el.score = 25;
					break;
				case 'meteor':
					el.score = 50;
					break;
			}

			setEl(el, {
				background : 'url(ufo_' + type + '.gif)',
				left : el.x + 'px',
				top : el.y + 'px',
				position : 'absolute',
				width : UFO_WIDTH + 'px',
				height : UFO_HEIGHT + 'px',
				zIndex : '2'
			});

			el.show();

		};

		var stop = function() {

			active = false;
			alive = false;

			el.hide();
			game.numUfos--;

		};

		init();

		return {
			getCoords : getCoords,
			isActive : isActive,
			isAlive : isAlive,
			kill : kill,
			move : move,
			start : start,
			stop : stop
		};

	};

	// Open up some Spacius methods
	return {
		init : init
	};

}();
