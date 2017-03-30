// Get the doc: sed -rne 's|\s*//\+\+ ?(.*)|\1|p'
function $clearseam(domlib, debug){
  var dconsole = window.console
  if(!debug) {
    dconsole = {
      log: function(){},
      group: function(){},
      groupEnd: function(){},
    }
  }
  return compile
  function compile(domtmpl, directives0, matches_optional, parentdom){
    var dirstack = normdirectives(directives0)

    var children = domlib.children(domtmpl)
    var matches = matches_optional || []
    var childrentmpl = []
    var cmatches = []
    var cdirs = []
    var cdirs2 = []
    var cl = children.length
    var merged_directives = {}
    var tagName = domlib.tagName(domtmpl)

    dconsole.log("Compile %s %o (%d matches): %o (dirstack %d)", tagName, domtmpl, matches.length,
        dirstack.length == 1 ? dirstack[0] : dirstack, dirstack.length)

    // Here we match the directives against the parent dom node
    // We generate a list of matches that will be used for rendering

    while(dirstack.length > 0){
      var directives = dirstack[0]
      dirstack = dirstack.slice(1)
      for(var tsel in directives){
        var dsel = directives[tsel]
        var match
        if(match = tmatch(parentdom, domtmpl, tsel, dsel)) {
          if(match.d) dirstack.push(match.d)
          if(match.f) matches.push({tsel: tsel, dsel: dsel, f: match.f})
          delete directives[tsel]
        }
      }
      merged_directives = merge([merged_directives, directives])
    }

    // Here we match the directives (after merge) against the children of the
    // dom node, and we prepare a list of directives to send to compilation to
    // these children. This is a pre-compilation step for directives that match
    // here and will not match in children compile function.

    if(cl > 0) dconsole.group("Match "+cl+" children of " + tagName + ":")
    for(var tsel in merged_directives){
      var dsel = merged_directives[tsel]
      var match
      for(var i = 0; i < cl; i++){
        cmatches[i] = cmatches[i] || []
        cdirs[i] = cdirs[i] || clone(merged_directives)
        cdirs2[i] = cdirs2[i] || []
        if(match = tmatch(domtmpl, children[i], tsel, dsel)) {
          if(match.d) cdirs2[i].push(match.d)
          if(match.f) cmatches[i].push({tsel: tsel, dsel: dsel, f: match.f})
          delete cdirs[i][tsel]
        }
      }
    }
    if(cl > 0) dconsole.groupEnd()

    // Here we compile each child of the template dom node with the prepared
    // subdirectives.

    if(cl > 0) dconsole.group("Compile "+cl+" children of " + tagName + ":")
    for(var i = 0; i < cl; i++){
      var subdirectives = cdirs2[i] && cdirs2[i].length ? cdirs2[i] : cdirs[i]
      childrentmpl[i] = compile(children[i], subdirectives, cmatches[i], domtmpl)
    }
    if(cl > 0) dconsole.groupEnd()

    return function(data){
      dconsole.log("Render %s %o using %o", tagName, domtmpl, data)
      var dom = domlib.clone(domtmpl, false)

      function renderChildren(dom, data){
        if(cl) dconsole.group("render " + tagName + " " + cl + " children")
        for(var i = 0; i < cl; i++){
          domlib.addChild(dom, childrentmpl[i](data))
        }
        if(cl) dconsole.groupEnd()
      }

      // Render children using the parent data (general case when not looping)

      renderChildren(dom, data)

      // Render matches of current node

      var ml = matches.length
      if(ml>1) dconsole.group("render " + tagName + " " + ml + " matches")
      var loop = [{dom: dom, data: data}]
      for(var i = 0; i < ml; i++){
        var match = matches[i]
        var matchf = match.f
        dconsole.log("render %s match %d %o", tagName, i, match)
        var newloop = []
        var ll = loop.length
        if(ll>1) dconsole.group("render "+tagName+" "+i+".* " + ll + " loop items")
        for(var j = 0; j < ll; j++) {
          var item = loop[j]
          dconsole.log("render %s %d.%d, %o with %o", tagName, i, j, item.dom, item.data)

          // Execute rendering function (the function returned by tmatch when
          // compiling). Pass it the renderChildren function in case the
          // rendering layer wants to loop. Looping is implemented by having
          // this function return a dom fragment.
          var newitems = matchf(item.dom, item.data, renderChildren)
          if (newitems) {
            dconsole.log("render %s %d.%d to %o", tagName, i, j, newitems)
          } else {
            newitems = [item]
          }
          newloop = newloop.concat(newitems)
        }
        if(ll>1) dconsole.groupEnd()
        loop = newloop
      }
      if(ml>1) dconsole.groupEnd()

      // Rendering done, handle fragment caused by loops

      if(loop.length == 1) {
        dconsole.log("Render %s to node = %o", tagName, loop[0].dom)
        return loop[0].dom
      } else {
        var fragment = domlib.emptyFragment()
        var ll = loop.length
        for(var i = 0; i < ll; i++){
          domlib.addChild(fragment, loop[i].dom)
        }
        dconsole.log("Render %s to fragment = %o", tagName, fragment)
        return fragment
      }
    }
  }

  // return falsy if template selector does not match domtmpl
  // return {f: function(dom, data)->dom, d: DIRECTIVES} with f that modifies
  // the DOM according to data and dsel if tsel matches domtmpl
  // loops can be implemented in making the return function transform a dom node
  // into a dom fragment
  //
  // The function f can also take a third parameter which is a
  // function(dom, data) that populate the children of dom with rendering. It
  // uses data for that. This is used in case of looping when the function f
  // wants to duplicate a node.
  //
  // tsel: [+] [tagName] [@attribute] [+]
  //   + in front: insert before
  //   leading +: append text
  //   tagname: must match domtmpl if present, "." match all
  //   attribute: modifies the tag attribute instead of textContents
  //
  // dsel: function
  //   call it with data
  //
  // dsel: jsonpath
  //   fetch data using provided path
  //
  // dsel: { "item<-collection": DIRECTIVES, sort: ..., filter: ...}
  //   loop, transform dom into fragment
  //   item is the name of the current item
  //   collection is the jsonpath for data
  //
  // dsel: {DIRECTIVES}
  //   TODO
  function tmatch(parentdom, domtmpl, tsel, dsel){
    var s = matchtsel(tsel)
    if(!s.match(domtmpl, parentdom)){
      return null
    }

    var loopinst
    var loopdir
    var loopvar
    var loopdsel
    //++ Looping is performed specifying a JSON object in place of the JSON
    //++ string representing the value to insert in the template on
    //++ instanciation. This JSON object contains the following keys that can
    //++ customise the loop:
    //++
    //++ - *iteration_variable* `<-` *data_collection_selector*
    if(typeof(dsel) === 'object') {
      if(s.event) {
        error("Cannot loop over an event")
      }
      if(s.attr) {
        error("Cannot loop over an attribute")
      }
      if(s.prop) {
        error("Cannot loop over a property")
      }
      for(dir in dsel) {
        var m = dir.match( /^(\w+)\s*<-\s*(\S+)?$/ )
        if(m) {
          if(loopinst) error("Loop directive must contain only one loop instruction")
          loopinst = m
          loopdir = dsel[dir]
          loopvar = m[1]
          loopdsel = m[2]
        }
      }
    }

    if(loopinst) {
      dconsole.log("Match %s to loop %s: %o", tsel, loopinst[0], loopdir)
      var loopdataf = dataselectfn(loopdsel, false)
      return {
        loop: true,
        d: loopdir,
        f: function(dom, data, renderChildren){
          var collection = loopdataf.call(data, {context: data})
          var cl = collection.length
          var loop = []
          dconsole.log("render list of %d: %o", cl, collection)
          for(var i = 0; i < cl; i++) {
            // Clone the dom node without its children (these needs to be
            // rendered with correct data instead)
            var element = domlib.clone(dom, false)
            //dconsole.log("render list element %d to: %o", i, element)
            var elemdata = Object.create(data, {})
            elemdata[loopvar] = collection[i]
            // render the children with correct data
            renderChildren(element, elemdata)
            loop.push({dom: element, data: elemdata})
          }
          return loop
        }
      }
    }

    var dataf = dataselectfn(dsel, s.event)

    if(s.content) {
      //dconsole.log({tmatch: domtmpl, tsel: tsel, dsel: dsel, result: true})
      dconsole.log("Match %s to tag: %o", tsel, dsel)
      return {f: function(dom, data){
        var newcontent = dataf.call(data, {context: data})
        dconsole.log("render tag %o: %o", dom, newcontent)
        newcontent = domlib.toVDOM(newcontent)
        if(s.insert) {
          domlib.insertChild(dom, newcontent)
        } else if(s.append) {
          domlib.addChild(dom, newcontent)
        } else {
          domlib.clearChildren(dom)
          domlib.addChild(dom, newcontent)
        }
        return null
      }}
    } else {
      //dconsole.log({tmatch: domtmpl, tsel: tsel, dsel: dsel, result: true})
      if(s.event) dconsole.log("Match %s to event %s: %o", tsel, s.event, dsel)
      if(s.attr) dconsole.log("Match %s to attr %s: %o", tsel, s.attr, dsel)
      if(s.event && (s.insert || s.append)) {
        error("Cannot insert before or append to and event")
      }
      return {f: function(dom, data){
        var userdata = dataf.call(data, {context: data})
        if(s.event) {
          dconsole.log("render event %s: %o", s.event, userdata)
          domlib.addEventHandler(dom, s.event, userdata)
        } else {
          dconsole.log("render attribute %s: %o", s.attr, userdata)
          if(s.insert) {
            domlib.setAttr(dom, s.attr, userdata + domlib.attr(dom, s.attr))
          } else if(s.append) {
            domlib.setAttr(dom, s.attr, domlib.attr(dom, s.attr) + userdata)
          } else {
            domlib.setAttr(dom, s.attr, userdata)
          }
        }
        return null
      }}
    }

    return null;
  }

  function matchtsel(tsel){
    var sel = {}
    tsel = matchappend(sel, tsel)
    tsel = matchattr(sel, tsel)
    sel.criterias = []
    while(tsel != "") {
      tsel = matchcriterias(sel, tsel)
    }
    sel.match = function(dom, parentdom){
      var cl = sel.criterias.length
      for(var i = 0; i < cl; i++) {
        if(!sel.criterias[i](dom, parentdom)) return false
      }
      return true
    }
    return sel
  }

  //++
  //++ VDOM Selectors:
  //++
  //++ - `+` *directive* : the text selected should be inserted before the existing text and not replace it
  //++ - *directive* `+` : the text selected should be appended after the existing text and not replace it
  function matchappend(sel, tsel){
    sel.insert = false
    sel.append = false
    var m = tsel.match(/^(\+)?\s*(.*?)\s*(\+)?$/)
    if(!m) return tsel
    sel.insert = m[1] !== "" && m[1] !== undefined
    sel.append = m[3] !== "" && m[3] !== undefined
    return m[2]
  }

  //++ - *directive* `@` *attribute* : matches the attribute with the specified name (insert text as attribute value)
  //++ - *directive* `&` *event* : matches the event with the specified name (insert event handler)
  //++ - *directive* `$` *property* : matches the property with the specified name
  function matchattr(sel, tsel){
    sel.attr = null
    sel.event = null
    sel.prop = null
    sel.content = false

    var m = tsel.match(/^(.*)\@(.+)$/)
    if(m) {
      sel.attr = m[2]
      return m[1]
    }

    var m = tsel.match(/^(.*)\&(.+)$/)
    if(m) {
      sel.event = m[2]
      return m[1]
    }

    var m = tsel.match(/^(.*)\$(.+)$/)
    if(m) {
      sel.prop = m[2]
      return m[1]
    }

    sel.content = true
    return tsel
  }

  function matchcriterias(sel, tsel) {
    //++ - *directive* `.`, `*` : matches any element
    if(tsel == "*" || tsel == "."){
      sel.criterias.push(function(){
        return true
      })
      return ""
    }

    //++ - *directive* `:not(` *criteria* `)`: inverse the match of the criterias following on this list
    var m = tsel.match(/^(.*)\:not\(([^\(\)]+(\([^\(\)]*\))?)\)$/)
    if(m) {
      var subsel = {
        criterias: []
      }
      if(matchcriterias(subsel, m[2]) == ""){
        sel.criterias.push(function(dom, parent){
          return !subsel.criterias[0](dom, parent)
        })
        return m[1]
      }
    }

    function crit_index(index, dom, parent){
      var children = domlib.children(parent)
      if(index < 0) {
        return children[children.length+index] === dom
      } else {
        return children[1+index] === dom
      }
    }

    function crit_matchattr(attr, op, value, dom){
      var actual = domlib.attr(dom, attr)
      if(actual === undefined) return false;
      if(op == "=") return value === actual;
      if(op == "~=") return actual.split(" ").indexOf(value) != -1
      if(op == "|=") return actual.split("-").indexOf(value) == 0
      if(op == "^=") return actual.startsWith(value)
      if(op == "*=") return actual.includes(value)
      error("Unknown operator " + op)
      return false
    }

    //++ - *directive* `.` *classname*: matches an element with *classname’appearing in the `class` attribute list
    var m = tsel.match(/^(.*)\.([^\:\#\.\[\]]+)$/)
    if(m) {
      sel.criterias.push(crit_matchattr.bind(this, 'class', '~=', m[2]))
      return m[1]
    }

    //++ - *directive* `#` *idname*: matches an element with `id` attribute as *idname*
    var m = tsel.match(/^(.*)\#([^\:\#\.\[\]]+)$/)
    if(m) {
      sel.criterias.push(crit_matchattr.bind(this, 'id', '=', m[2]))
      return m[1]
    }

    //++ - *directive* `[` *index* `]`: matches an element that is the child *index* (which can be negative to cound from the end)
    var m = tsel.match(/^(.*)\[(-?[0-9]+)\]$/)
    if(m) {
      sel.criterias.push(crit_index.bind(this, parseInt(m[2])))
      return m[1]
    }

    //++ - *directive* `:first-child`: same as *directive* `[1]`
    var m = tsel.match(/^(.*)\:first-child$/)
    if(m) {
      sel.criterias.push(crit_index.bind(this, 1))
      return m[1]
    }

    //++ - *directive* `:last-child`: same as *directive* `[-1]`
    var m = tsel.match(/^(.*)\:last-child$/)
    if(m) {
      sel.criterias.push(crit_index.bind(this, -1))
      return m[1]
    }

    //++ - *directive* `:nth-child(` *index* `)`: same as *directive* `[`*index*`]`
    //++ - *directive* `:nth-last-child(` *index* `)`: same as *directive* `[-`*index*`]`
    var m = tsel.match(/^(.*)\:nth(-last)?-child\((-?[0-9]+)\)$/)
    if(m) {
      sel.criterias.push(crit_index.bind(this, m[2] ? -parseInt(m[3]) : parseInt(m[3])))
      return m[1]
    }

    //++ - *directive* `[` *attr* `=` *value* `]`: matches an element which has an attribute *attr* with value *value*
    //++ - *directive* `[` *attr* `~=` *value* `]`: matches an element which has an attribute *attr* as a space separated list containing *value*
    //++ - *directive* `[` *attr* `|=` *value* `]`: matches an element which has an attribute *attr* as a `-` separated list containing *value*
    //++ - *directive* `[` *attr* `^=` *value* `]`: matches an element which has an attribute *attr* that starts with *value*
    //++ - *directive* `[` *attr* `*=` *value* `]`: matches an element which has an attribute *attr* that contains *value*
    var m = tsel.match(/^(.*)\[([^\[\]]+)([\~\|\^\$\*]?=)([^\[\]]+)\]$/)
    if(m) {
      sel.criterias.push(crit_matchattr.bind(this, m[2], m[3], m[4]))
      return m[1]
    }

    //++ - *directive* `[` *attr* `]`: matches an element which has an attribute *attr* that contains *value*
    var m = tsel.match(/^(.*)\[([^\[\]]+)\]$/)
    if(m) {
      var attr = m[2]
      sel.criterias.push(function(dom){
        return domlib.attr(dom, attr) !== undefined
      })
      return m[1]
    }

    //++ - *tagname* : matches a tag with the given name
    sel.criterias.push(function(dom){
      dconsole.log(domlib)
      var tagName = domlib.tagName(dom)
      return tagName !== undefined && tagName.toLowerCase() == tsel.toLowerCase()
    })
    return ""
  }

  // from pure.js
  // parse a data selector and return a function that
  // can traverse the data accordingly, given a context.
  function dataselectfn (sel, eventhandler){
    //++
    //++ Data Selectors:
    //++
    //++ - a function: the function is called to get the data. this is the
    //++   current data object.
    if( typeof(sel) === 'function' ){
      //handle false values in function directive
      return function ( ctxt ){
        var r = sel.call( ctxt.item || ctxt.context || ctxt, ctxt );
        return !r && r !== 0 ? '' : r;
      };
    }
    //check for a valid js variable name with hyphen(for properties only), $, _ and :
    var m = sel.match(/^[\da-zA-Z\$_\@\#][\w\$:\-\#]*(\.[\w\$:\-\#]*[^\.])*$/),
      found = false, s = sel, parts = [], pfns = [], i = 0, retStr;

    if(m === null){
      // check if literal
      if(/\'|\"/.test( s.charAt(0) )){
        if(/\'|\"/.test( s.charAt(s.length-1) )){
          retStr = s.substring(1, s.length-1);
          return function(){ return retStr; };
        }
      }else{
        // check if literal + #{var}
        while((m = s.match(/#\{([^{}]+)\}/)) !== null){
          found = true;
          parts[i++] = s.slice(0, m.index);
          pfns[i] = dataselectfn(m[1], eventhandler);
          s = s.slice(m.index + m[0].length, s.length);
        }
      }
      if(!found){ //constant, return it
        return function(){ return sel; };
      }
      parts[i] = s;
      return concatenator(parts, pfns);
    }
    //++ - *prop* : matches the value for the property *prop*
    //++ - *prop* `.` *prop* : matches the value following a path of properties
    //++   (not limited to a depth of two)
    m = sel.split('.');
    return function(ctxt){
      var data = ctxt.context || ctxt,
        v = ctxt[m[0]],
        i = 0,
        n,
        dm;

      if(v && typeof v.item !== 'undefined'){
        i += 1;
        if(m[i] === 'pos'){
          //allow pos to be kept by string. Tx to Adam Freidin
          return v.pos;
        }
        data = v.item;
      }
      n = m.length;

      //++
      //++ In case the selector was not directly a function, and the data
      //++ selector yields a function which is called with `this` as the
      //++ current data object. This does not applies when assigning an event
      //++ handler.
      while( i < n ){
        if(!data){break;}
        dm = data[ m[i] ];
        //if it is a function call it
        data = (!eventhandler && typeof dm === 'function') ? dm.call( data ) : dm;
        i++;
      }

      return !data && data !== 0 ? '':data;
    };
  }

  function merge(objects) {
    var res = {}
    var ol = objects.length
    for(var i = 0; i < ol; i++){
      for(var k in objects[i]){
        res[k] = objects[i][k]
      }
    }
    return res
  }

  function normdirectives(arg){
    var dirstack0 = (arg instanceof Array) ? arg : [arg]
    var dirstack = []
    var dsl = dirstack0.length
    for(var k = 0; k < dsl; k++){
      var directives0 = dirstack0[k]
      var directives = {}
      for(var tselss in directives0){
        var dsel = directives0[tselss]
        var tsels = tselss.split(/\s*,\s*/) //allow selector separation by quotes
        var sl = tsels.length
        for(var i = 0; i < sl; i++){
          var tsel = tsels[i]
          directives[tsel] = dsel
        }
      }
      dirstack.push(directives)
    }
    return dirstack
  }

  function clone(o){
    if(typeof(o) != 'object') return o
    if(o instanceof Array) return o.slice(0)
    var res = {}
    for(var k in o) {
      res[k] = o[k]
    }
    return res
  }

  // error utility
  function error(e){
    if(typeof console !== 'undefined'){
      console.log(e);
    }
    throw 'pure error: ' + e;
  }
}

$clearseam.citojsdom = (function(){
  var citojsdom = {}

  citojsdom.children = function(domnode){
    if(typeof(domnode) != 'object') return []
    if(domnode.tag === "!" || domnode.tag === "#") return []
    if(!domnode.children) return []
    if(typeof(domnode.children) !== 'object') return [domnode.children]
    if(!(domnode.children instanceof Array)) return [domnode.children]
    return domnode.children
  }

  citojsdom.fragments = function(domnode){
    if(typeof(domnode) != 'object') return [domnode]
    if(!domnode.tag) return citojsdom.children(domnode)
    return [domnode]
  }

  citojsdom.isVDOM = function(domnode){
    return domnode.tag !== undefined || domnode.children !== undefined
  }

  citojsdom.toVDOM = function(domnode){
    if(typeof(domnode) == 'string') {
      return {tag: '#', children: domnode}
    } else if(citojsdom.isVDOM(domnode)) {
      return domnode
    } else if(typeof domnode.template === "function") {
      return domnode.template()
    } else if(typeof domnode.render === "function") {
      return domnode.render()
    } else if(typeof domnode.vdom === "function") {
      return domnode.vdom()
    } else {
      return domnode
    }
  }

  citojsdom.clone = function dom_clone(domnode, recursive){
    if(typeof(domnode) != 'object') return domnode
    var res = {}
    for(var k in domnode) {
      if(k == 'children' && domnode.tag !== "#" && domnode.tag !== "!") {
        if (recursive) {
          var newc = []
          var children = domnode[k]
          var cl = children.length
          for(var i = 0; i < cl; i++) {
            newc.push(dom_clone(children[i], recursive))
          }
          res[k] = newc
        } else {
          res[k] = []
        }
      } else {
        res[k] = shallowclone(domnode[k])
      }
    }
    return res
  }

  citojsdom.emptyFragment = function(){
    return {children: []}
  }

  citojsdom.text = function(text){
    return {tag: '#', children: text}
  }

  citojsdom.insertChild = function(domnode, child){
    domnode.children = domnode.children || []
    domnode.children = [child].concat(domnode.children)
  }

  citojsdom.addChild = function(domnode, child){
    domnode.children = domnode.children || []
    domnode.children = domnode.children.concat([child])
  }

  citojsdom.clearChildren = function(domnode){
    domnode.children = []
  }

  citojsdom.tagName = function(dom) {
    return dom.tag
  }

  citojsdom.attr = function(dom, name) {
    if(dom.attrs) {
      return dom.attrs[name]
    }
  }

  citojsdom.setAttr = function(dom, name, value) {
    if(value === undefined || value === null || value === false) {
      delete dom.attrs[name]
    } else {
      dom.attrs[name] = value
    }
  }

  citojsdom.addEventHandler = function(dom, name, handler) {
    dom.events = dom.events || {}
    var evts = dom.events[name]
    if(typeof(evts) === 'object' && evts instanceof Array) {
      evts.push(handler)
    } else if(evts !== undefined) {
      dom.events[name] = [evts, handler]
    } else {
      dom.events[name] = [handler]
    }
  }

  function shallowclone(o){
    if(typeof(o) != 'object') return o
    if(o instanceof Array) return o.slice(0)
    var res = {}
    for(var k in o) {
      res[k] = o[k]
    }
    return res
  }

  return $clearseam(citojsdom)
})()
