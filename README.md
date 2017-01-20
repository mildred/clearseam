Clearseam
=========

This is a standalone templating engine, inspired from weld and pure.js, that is compatible with virtual DOM. There is integration with citojs, but support for more is possible.

The goal was to have a templating engine with no specific markup. Everything is standard HTML and JSON or Javascript. In particular:

- no extensions to the HTML syntax
- no special attributes in HTML markup
- no textual formatting like `{{` or `<?` or anything you might think
- understands DOM structure. No XSS for you there. Everything is escaped for HTML
- compatible with the HTML `<template>` tag

How does it work?
-----------------

A template consists of markup and directives to apply data to markup. This allows clear separation between markup and the model. Directives are a JSON data structure that describes the mapping.

Clearseam exports one function per supported VDOM engine:

> `$templateless.*domengine*(vdom, directives) -> function(data) -> vdom`

Compile a template from markup (taken as VDOM) and directives. Return a compiled template consisting of a function that will take the data and return the final VDOM.

Give me an example
------------------

For example, for citojs, you might want to use the following helper function:

    function template(name, directives){
      var tmpltag = cito.vdom.fromDOM(document.querySelector("template[name='"+name+"']").content)
      return $templateless.citojsdom(tmpltag, directives)
    }

This takes a template name, found on the page as a `<emplate>` tag, and directives, and return the compiled template.

Clearseam directives
====================

Directives were meant to be compatible with pure.js (or is that weld). We could not reuse code because we support VDOM instead of browser DOM.

TODO
