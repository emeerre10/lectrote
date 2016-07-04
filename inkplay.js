'use strict';

const Story = require('./inkjs/ink.cjs.js').Story;

/* The inkjs story object that will be loaded. */
var story = null;

/* Start with the defaults. These can be modified later by the game_options
   defined in the HTML file.

   Note that the "io" entry is not filled in here, because
   we don't know whether the GlkOte library was loaded before
   this one. We'll fill it in at load_run() time.
*/
var all_options = {
    io: null,              // default display layer (GlkOte)
    spacing: 0,            // default spacing between windows
    set_page_title: true,  // set the window title to the game name
    default_page_title: 'Game', // fallback game name to use for title
    exit_warning: 'The game session has ended.',
};

function load_run(optobj, src)
{
    all_options.io = window.GlkOte;

    if (!optobj)
        optobj = window.game_options;
    if (optobj)
        jQuery.extend(all_options, optobj);

    /* First we strip the BOM, if there is one. Dunno why ink can't deal
       with a BOM in JSON data, but okay. */
    src = src.replace(/^\uFEFF/, '');

    story = new Story(src);
    window.story = story; //### export for debugging

    all_options.accept = game_accept;

    /* Now fire up the display library. This will take care of starting
       the VM engine, once the window is properly set up. */
    all_options.io.init(all_options);
}

function get_game_signature()
{
    return 'XXX'; //###
}

function get_metadata(key)
{
    return null;
}

window.GiLoad = {
    load_run: load_run,
    get_metadata: get_metadata,
    get_game_signature: get_game_signature,
};


var game_generation = 1;
var game_metrics = null;
var game_streamout = new Array();

var prompt = '\n>';

/* Put your game-startup text here. 
*/
function startup() 
{
    say('Welcome to...');
    say('The Game', 'header');
}

/* Put your game-response code here. The val argument is the player's input.
*/
function respond(val) 
{
    say('You typed "' + val + '".');
}

/* Print a line of text. (Or several lines, if the argument contains \n
   characters.)

   The optional second argument is the text style. The standard glkote.css
   file defines all the usual Glk styles: 'normal', 'emphasized' (italics),
   'preformatted' (fixed-width), 'subheader' (bold), 'header' (large bold),
   'alert', 'note', and 'input'.

   If the third argument is true, the text is appended to the previous
   line instead of starting a new line.
*/
function say(val, style, runon) 
{
    if (style == undefined)
        style = 'normal';
    var ls = val.split('\n');
    for (var ix=0; ix<ls.length; ix++) {
        if (runon) {
            if (ls[ix])
                game_streamout.push({ content: [style, ls[ix]], append: 'true' });
            runon = false;
        }
        else {
            if (ls[ix])
                game_streamout.push({ content: [style, ls[ix]] });
            else
                game_streamout.push({ });
        }
    }
}

/* Print a line of text, appending it to the previous line. This is a
   clearer shortcut for say(val, style, true).
*/
function say_runon(val, style) 
{
    say(val, style, true);
}

/* This is the top-level game event hook. It's all set up for a basic
   game that accepts line input. */
function game_accept(res) 
{
    if (res.type == 'init') {
        game_metrics = res.metrics;
        startup();
        say(prompt);
    }
    else if (res.type == 'arrange') {
        game_metrics = res.metrics;
    }
    else if (res.type == 'line') {
        say_runon(res.value, 'input');
        respond(res.value);
        say(prompt);
    }
    
    game_select();
}

/* This constructs the game display update and sends it to the display.
   It's all set up for a basic game that accepts line input. */
function game_select() 
{
    game_generation = game_generation+1;
    
    var metrics = game_metrics;
    var pwidth = metrics.width;
    var pheight = metrics.height;
    
    var argw = [
        { id: 1, type: 'buffer', rock: 11,
          left: metrics.outspacingx,
          top: metrics.outspacingy,
          width: pwidth-(2*metrics.outspacingx),
          height: pheight-(metrics.outspacingy+metrics.outspacingy) }
    ];
    
    var argc = [ ];
    if (game_streamout.length) {
        var obj = { id: 1 };
        if (game_streamout.length)
            obj.text = game_streamout;
        argc.push(obj);
    }
    
    
    var argi = [ 
        { id: 1, gen: game_generation, type: 'line', maxlen: 200 } 
    ];
    
    var arg = { type:'update', gen:game_generation, windows:argw, content:argc, input:argi };
    
    GlkOte.update(arg);
    
    game_streamout.length = 0;
}
