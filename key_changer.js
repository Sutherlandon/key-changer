/**
 * @OnlyCurrentDoc Limits the script to only accessing the current doc.
 */
  
// a circular link list for calculating replacement chords
var KEYS_SHARPS = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
var KEYS_FLATS  = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];

/**
 * Runs when the add-on is installed.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onInstall trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode. (In practice, onInstall triggers always
 *     run in AuthMode.FULL, but onOpen triggers may be AuthMode.LIMITED or
 *     AuthMode.NONE.)
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Creates a menu entry in the Google Docs UI when the document is opened.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onOpen(e) {

  console.log('event', e);
  console.log('auth', e.authMode);
  const menu = DocumentApp.getUi().createAddonMenu();
  
  if (!e || e.authMode === ScriptApp.AuthMode.NONE) {
    // TODO: Write the 'auth' Function..
    menu.addItem('Authorize this add-on', 'auth');
  } else {
    menu.addItem('Show Sidebar', 'showSidebar');
    PropertiesService.getDocumentProperties().setProperty('active_document_id', e.source.getId());
  }

  menu.addToUi();
}


/**
 * Opens a sidebar in the document containing the add-on's user interface.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 */
function showSidebar() {
  var ui = HtmlService
    .createHtmlOutputFromFile('sidebar')
    .setTitle('Key Changer');
  DocumentApp.getUi().showSidebar(ui);
}

/**
 * Changes the key up one half step
 */
function handleKeyChangeUp(chord_style){
  return changeKey(1, chord_style);
}

/**
 * Changes the key down one half step
 */
function handleKeyChangeDown(chord_style) {
  return changeKey(-1, chord_style); 
}

/**
 * Calculates the distance between the current and target key
 *
 * TODO: Detect Current Key
 * TODO: Detect Current Chord Style
 */
function handleKeyChange(current_key, target_key, chord_style) {
  // Key selector values only produce sharps values
  // the distance is the same regardless of referencing
  // sharps or flats.  For simplicity, we only compare sharps.
  const KEYS = KEYS_SHARPS;
  
  // calculate the distance
  const distance = KEYS.indexOf(target_key) - KEYS.indexOf(current_key);
  
  // change the key
  return changeKey(distance, chord_style);
}

/**
 * Effects the key change
 */
function changeKey(distance, chord_style) {
  var doc = DocumentApp.openById(
    PropertiesService
      .getDocumentProperties()
      .getProperty('active_document_id')
  );

  // select the chord style
  const KEYS = chord_style === 'flats' ? KEYS_FLATS : KEYS_SHARPS;
  var body = doc.getBody();
  
  // gather all the lines of the document
  var num_lines = body.getNumChildren();
  var lines = [];
  var line = body.getChild(0);
  while (line) {
    // only process the lines with chords on them.
    // the line must be entirely bolded, including spaces.
    var text = line.editAsText();
    if (text.isBold()) {      
      // rebuild the line character by character replacing current chords with target ones
      var curr_text = text.getText();
      var target_text = '';
      for (var i = 0; i < curr_text.length; i++) {
        var curr_char = curr_text.charAt(i);
        var key_index = KEYS.indexOf(curr_char);
        // if the character is a chord change it, otherwise just add it to the target_text
        if (key_index !== -1) {
          // check to see if the chord is # or b
          var next_char = curr_text.charAt(i+1);
          if (next_char === '#' || next_char === 'b') {
            curr_char += next_char;
            i += 1;
          }
          
          // Find the index of the current chord, it may not be in the current
          // chord style, so assume sharps and check otherwise.  Indexies of
          // equivilent chords are the same in each list.
          var chord_index = KEYS_SHARPS.indexOf(curr_char);
          if (chord_index === -1) {
            // look in flats
            chord_index = KEYS_FLATS.indexOf(curr_char);
          }
          
          target_text += KEYS[(KEYS.length + chord_index + distance) % KEYS.length];
        } else {
          target_text += curr_char;
        }
      }
      
      // debugging info
      lines.push({
        element: text,
        curr_text: text.getText(),
        target_text: target_text,
        text_len: text.getText().length,
        type: text.getType().toString(),
      });
      
      // update the chords on the line
      text.setText(target_text);
      text.setBold(true);
    }

    // get the next line to process
    line = line.getNextSibling();
  }
  
  return "success";
}