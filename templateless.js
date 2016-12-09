function $templateless(domlib, debug){
  var console = window.console
  if(!debug) {
    console = {
      log: function(){},
      group: function(){},
      groupEnd: function(){},
    }
  }
  return compile
  function compile(domtmpl, directives0, matches_optional){
    var dirstack = normdirectives(directives0)

    var children = domlib.children(domtmpl)
    var matches = matches_optional || []
    var childrentmpl = []
    var cmatches = []
    var cdirs = []
    var cdirs2 = []
    var cl = children.length
    var merged_directives = {}

    console.log("Compile %s %o (%d matches): %o", domlib.tagName(domtmpl), domtmpl, matches.length,
        dirstack.length == 1 ? dirstack[0] : dirstack)

    while(dirstack.length > 0){
      var directives = dirstack[0]
      dirstack = dirstack.slice(1)
      for(var tsel in directives){
        var dsel = directives[tsel]
        var match
        if(match = tmatch(domtmpl, tsel, dsel)) {
          if(match.d) dirstack.push(match.d)
          if(match.f) matches.push(match.f)
          delete directives[tsel]
        }
      }
      merged_directives = merge([merged_directives, directives])
    }

    if(cl > 0) console.group("Match "+cl+" children:")
    for(var tsel in merged_directives){
      var dsel = merged_directives[tsel]
      var match
      for(var i = 0; i < cl; i++){
        cmatches[i] = cmatches[i] || []
        cdirs[i] = cdirs[i] || clone(merged_directives)
        cdirs2[i] = cdirs2[i] || []
        if(match = tmatch(children[i], tsel, dsel)) {
          if(match.d) cdirs2[i].push(match.d)
          if(match.f) cmatches[i].push(match.f)
          delete cdirs[i][tsel]
        }
      }
    }
    if(cl > 0) console.groupEnd()

    if(cl > 0) console.group("Compile "+cl+" children:")
    for(var i = 0; i < cl; i++){
      var subdirectives = cdirs2[i] && cdirs2[i].length ? cdirs2[i] : cdirs[i]
      childrentmpl[i] = compile(children[i], subdirectives, cmatches[i])
    }
    if(cl > 0) console.groupEnd()

    return function(data){
      console.log("Render %s %o using %o", domlib.tagName(domtmpl), domtmpl, data)
      var dom = domlib.clone(domtmpl, false)
      var ml = matches.length
      if(cl) console.group("render " + cl + " children")
      for(var i = 0; i < cl; i++){
        domlib.addChild(dom, childrentmpl[i](data))
      }
      if(cl) console.groupEnd()
      if(ml>1) console.group("render " + ml + " matches")
      var loop = [{dom: dom, data: data}]
      for(var i = 0; i < ml; i++){
        var match = matches[i]
        var newloop = []
        var ll = loop.length
        if(ll>1) console.group("render " + i + ".* " + ll + " loop items")
        for(var j = 0; j < ll; j++) {
          var item = loop[j]
          console.log("render %d.%d, %o with %o", i, j, item.dom, item.data)
          var newitems = match(item.dom, item.data)
          if (newitems) console.log("render %d.%d to %o", i, j, newitems)
          else newitems = [item]
          newloop = newloop.concat(newitems)
        }
        if(ll>1) console.groupEnd()
        loop = newloop
      }
      if(ml>1) console.groupEnd()
      if(loop.length == 1) {
        return loop[0].dom
      } else {
        var fragment = domlib.emptyFragment()
        var ll = loop.length
        for(var i = 0; i < ll; i++){
          domlib.addChild(fragment, loop[i].dom)
        }
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
  function tmatch(domtmpl, tsel, dsel){
    var m = tsel.match(/^(\+)?([^\@\&\+]+)?(\@([^\+]+)|\&([^\+]+))?(\+)?$/)
    if(!m) return null;
    var prepend = m[1];
    var selector = m[2].toLowerCase();
    var suffix = m[3];
    var attr = m[4];
    var event = m[5];
    var append = m[6];

    var matchSelector = domlib.tagName(domtmpl) && (
        (selector === ".") ||
        (selector === "" && suffix !== "") ||
        (selector === domlib.tagName(domtmpl).toLowerCase()))
    if(!matchSelector) {
      //console.log({tmatch: domtmpl, tsel: tsel, dsel: dsel, result: false})
      return null;
    }

    var loopinst
    var loopdir
    if(typeof(dsel) === 'object') {
      if(event !== undefined && event !== "") {
        error("Cannot loop over an event")
      }
      if(attr !== undefined && attr !== "") {
        error("Cannot loop over an attribute")
      }
      for(dir in dsel) {
        var m = dir.match( /^(\w+)\s*<-\s*(\S+)?$/ )
        if(m) {
          if(loopinst) error("Loop directive must contain only one loop instruction")
          loopinst = m
          loopdir = dsel[dir]
        }
      }
    }

    if(loopinst) {
      console.log("Match %s to loop %s: %o", tsel, loopinst[0], loopdir)
      var loopvar = m[1]
      var loopdsel = m[2]
      var loopdataf = dataselectfn(loopdsel, false)
      return {
        d: loopdir,
        f: function(dom, data){
          var collection = loopdataf.call(data, {context: data})
          var cl = collection.length
          var loop = []
          console.log("render list of %d: %o", cl, collection)
          for(var i = 0; i < cl; i++) {
            var element = domlib.clone(dom)
            var elemdata = Object.create(data, {})
            elemdata[loopvar] = collection[i]
            loop.push({dom: element, data: elemdata})
          }
          return loop
        }
      }
    }

    var dataf = dataselectfn(dsel, event !== undefined && event !== "")

    if(suffix === "" || suffix === undefined) {
      //console.log({tmatch: domtmpl, tsel: tsel, dsel: dsel, result: true})
      console.log("Match %s to tag: %o", tsel, dsel)
      if(prepend && append) {
        error("Cannot append and insert before")
      }
      return {f: function(dom, data){
        var newcontent = dataf.call(data, {context: data})
        console.log("render tag %o: %o", dom, newcontent)
        if(typeof(newcontent) == 'string') {
          newcontent = domlib.text(newcontent)
        }
        if(prepend) {
          domlib.insertChild(dom, newcontent)
        } else if(append) {
          domlib.addChild(dom, newcontent)
        } else {
          domlib.clearChildren(dom)
          domlib.addChild(dom, newcontent)
        }
        return null
      }}
    } else {
      //console.log({tmatch: domtmpl, tsel: tsel, dsel: dsel, result: true})
      if(event) console.log("Match %s to event %s: %o", tsel, event, dsel)
      if(attr) console.log("Match %s to attr %s: %o", tsel, attr, dsel)
      if(event && (prepend || append)) {
        error("Cannot insert before or append to and event")
      }
      return {f: function(dom, data){
        var userdata = dataf.call(data, {context: data})
        if(event) {
          console.log("render event %s: %o", event, userdata)
          domlib.addEventHandler(dom, event, userdata)
        } else {
          console.log("render attribute %s: %o", attr, userdata)
          if(prepend) {
            domlib.setAttr(dom, attr, userdata + domlib.attr(dom, attr))
          } else if(append) {
            domlib.setAttr(dom, attr, domlib.attr(dom, attr) + userdata)
          } else {
            domlib.setAttr(dom, attr, userdata)
          }
        }
        return null
      }}
    }

    return null;
  }

  // from pure.js
  // parse a data selector and return a function that
  // can traverse the data accordingly, given a context.
  function dataselectfn (sel, eventhandler){
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

$templateless.citojsdom = (function(){
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

  citojsdom.clone = function dom_clone(domnode, recursive){
    if(typeof(domnode) != 'object') return domnode
    var res = {}
    for(var k in domnode) {
      if(k == 'children' && domnode.tag !== "#" && domnode.tag !== "!") {
        if (recursive) {
          var newc = []
          var children = res[k]
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
    domnode.children.push(child)
  }

  citojsdom.clearChildren = function(domnode){
    domnode.children = []
  }

  citojsdom.tagName = function(dom) {
    return dom.tag
  }

  citojsdom.attr = function(dom, name) {
    return dom.attrs[name]
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

  return $templateless(citojsdom)
})()
