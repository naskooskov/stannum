/*
 * This function uses CSS to create a div overlay containing a red cross on
 * top of the document, spanning the full viewport.
 */
function createX() {
  var d = document.createElement('div');
  d.classList.add('crossed');
  d.id = 'stannum-crossed-div';
  document.body.appendChild(d);
}

/*
 * Look for password fields in forms that submit over plaintext.
 */
function findPwdFields() {
  var inputs = document.getElementsByTagName('input');
  for(var i = 0; i < inputs.length; i++) {
    if (inputs[i].type === 'password') {
      if (/^http:\/\//i.test(inputs[i].form.action)) {
        createX();
        break;
      }
    }
  }
}

/* 
 * Observe DOM manipulations to see if any new password fields are added
 * dynamically throughout the lifetime of the document.
 */
var observer = new MutationObserver(function(mutations, observer) {
  for (var i = 0; i < mutations.length; i++) {
    if (mutations[i].addedNodes) {
      for (var j = 0; j < mutations[i].addedNodes.length; j++) {
        var node = mutations[i].addedNodes[j];
        if (node instanceof HTMLInputElement && node.type === 'password' &&
            /^http:\/\//i.test(node.form.action)) {
          createX();
        }
      }
    }
  }
});

/* 
 * Start the observer and examine the document for already loaded fields.
 */
observer.observe(document, {
  childList: true,
  subtree: true
});

findPwdFields();
