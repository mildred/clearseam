Clearseam
=========

This is a standalone templating engine, inspired from [weld](https://github.com/tmpvar/weld) and [pure.js](https://beebole.com/pure/), that is compatible with virtual DOM. There is integration with [citojs](https://github.com/joelrich/citojs), but support for more is possible. Reusing code of menionned templating engine was not possible due to the fact that we are targetting virtual DOMs.

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

For example, for [citojs](https://github.com/joelrich/citojs), you might want to use the following helper function:

    function template(name, directives){
      var tmpltag = cito.vdom.fromDOM(document.querySelector("template[name='"+name+"']").content)
      return $templateless.citojsdom(tmpltag, directives)
    }

This takes a template name, found on the page as a `<emplate>` tag, and directives, and return the compiled template.

Please note that the function `cito.vdom.fromDOM` is taken from [my fork of citojs](https://github.com/mildred/citojs).

Clearseam directives
====================

Directives were meant to be compatible with [pure.js](https://beebole.com/pure/). Directives is a JSON object containing on keys a selector that matches a node from the template VDOM, and the JSON values contains a selector that matches a data object taken fron the data object on template instanciation.

Looping is performed specifying a JSON object in place of the JSON
string representing the value to insert in the template on
instanciation. This JSON object contains the following keys that can
customie the loop:

- *iteration_variable* `<-` *data_collection_selector*

VDOM Selectors:

- `+` *directive* : the text selected should be inserted before the existing text and not replace it
- *directive* `+` : the text selected should be appended after the existing text and not replace it
- *directive* `@` *attribute* : matches the attribute with the specified name (insert text as attribute value)
- *directive* `&` *event* : matches the event with the specified name (insert event handler)
- *directive* `$` *property* : matches the property with the specified name
- *directive* `.`, `*` : matches any element
- *directive* `:not(` *criteria* `)`: inverse the match of the criterias following on this list
- *directive* `.` *classname*: matches an element with *classname’appearing in the `class` attribute list
- *directive* `#` *idname*: matches an element with `id` attribute as *idname*
- *directive* `[` *index* `]`: matches an element that is the child *index* (which can be negative to cound from the end)
- *directive* `:first-child`: same as *directive* `[1]`
- *directive* `:last-child`: same as *directive* `[-1]`
- *directive* `:nth-child(` *index* `)`: same as *directive* `[`*index*`]`
- *directive* `:nth-last-child(` *index* `)`: same as *directive* `[-`*index*`]`
- *directive* `[` *attr* `=` *value* `]`: matches an element which has an attribute *attr* with value *value*
- *directive* `[` *attr* `~=` *value* `]`: matches an element which has an attribute *attr* as a space separated list containing *value*
- *directive* `[` *attr* `|=` *value* `]`: matches an element which has an attribute *attr* as a `-` separated list containing *value*
- *directive* `[` *attr* `^=` *value* `]`: matches an element which has an attribute *attr* that starts with *value*
- *directive* `[` *attr* `*=` *value* `]`: matches an element which has an attribute *attr* that contains *value*
- *directive* `[` *attr* `]`: matches an element which has an attribute *attr* that contains *value*
- *tagname* : matches a tag with the given name

Data Selectors:

- a function: the function is called to get the data. this is the
  current data object.
- *prop* : matches the value for the property *prop*
- *prop* `.` *prop* : matches the value following a path of properties
  (not limited to a depth of two)

In case the selector was not directly a function, and the data
selector yields a function which is called with `this` as the
current data object. This does not applies when assigning an event
handler.
