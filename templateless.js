function $templateless(domlib){
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
    //console.log({compile: domtmpl, directives: dirstack, matches: matches})

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

    for(var i = 0; i < cl; i++){
      var subdirectives = cdirs2[i] && cdirs2[i].length ? cdirs2[i] : cdirs[i]
      childrentmpl[i] = compile(children[i], subdirectives, cmatches[i])
    }

    return function(data){
      var dom = domlib.cloneparent(domtmpl)
      var ml = matches.length
      for(var i = 0; i < cl; i++){
        domlib.addChild(dom, childrentmpl[i](data))
      }
      for(var i = 0; i < ml; i++){
        var frag = domlib.fragments(dom)
        var fl = frag.length
        if(fl <= 1){
          dom = matches[i](dom, data)
        } else {
          dom = domlib.emptyFragment()
          for(var j = 0; j < fl; j++){
            domlib.addChild(dom, matches[i](frag[j], data))
          }
        }
      }
      return dom
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
  //   FIXME: compile the rest of the directives
  //
  // dsel: {DIRECTIVES}
  //   FIXME: compile the rest of the directives
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

    var dataf = dataselectfn(dsel, event !== undefined && event !== "")

    if(suffix === "" || suffix === undefined) {
      //console.log({tmatch: domtmpl, tsel: tsel, dsel: dsel, result: true})
      return {f: function(dom, data){
        var newcontent = dataf.call(data, {context: data})
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
        return dom
      }}
    } else {
      //console.log({tmatch: domtmpl, tsel: tsel, dsel: dsel, result: true})
      return {f: function(dom, data){
        var userdata = dataf.call(data, {context: data})
        if(event) {
          domlib.addEventHandler(dom, event, userdata)
        } else if(prepend) {
          domlib.setAttr(dom, attr, userdata + domlib.attr(dom, attr))
        } else if(append) {
          domlib.setAttr(dom, attr, domlib.attr(dom, attr) + userdata)
        } else {
          domlib.setAttr(dom, attr, userdata)
        }
        return dom
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

  citojsdom.cloneparent = function(domnode){
    if(typeof(domnode) != 'object') return domnode
    var res = {}
    for(var k in domnode) {
      if(k == 'children' && domnode.tag !== "#" && domnode.tag !== "!") {
        res[k] = []
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
    domnode.children = [child].concat(domnode.children)
  }

  citojsdom.addChild = function(domnode, child){
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
