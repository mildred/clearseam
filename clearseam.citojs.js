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

  citojsdom.fragment = function(){
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
