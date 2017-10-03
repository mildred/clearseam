$clearseam.mithril = (function(m){
  const mithrildom = $clearseam.mithrildom(m)
  return $clearseam(mithrildom)
})

$clearseam.mithrildom = (function(m){
  var mithrildom = {}

  mithrildom.children = function(domnode){
    if(domnode === undefined) return []
    if(typeof(domnode.text) == "text") return [textNode(domnode.text)]
    if(domnode.children instanceof Array) return domnode.children
    return []
  }

  mithrildom.isVDOM = function(domnode){
    return domnode.tag !== undefined
  }

  mithrildom.toVDOM = function(domnode){
    if(typeof(domnode) == 'string') {
      return textNode(domnode)
    } else if(mithrildom.isVDOM(domnode)) {
      return domnode
    } else if (typeof(domnode.view) == "function") {
      return m(domnode)
    } else {
      return textNode(domnode.toString())
    }
  }

  mithrildom.clone = function dom_clone(domnode, recursive){
    if(typeof(domnode) != 'object') return domnode
    var res = {}
    for(var k in domnode) {
      if(k == 'children' && domnode[k] instanceof Array) {
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

  mithrildom.text = textNode
  function textNode(text){
    return m("div", {}, [text, m("div")]).children[0]
  }

  mithrildom.fragment = fragmentNode
  function fragmentNode(content){
    return m("div", {}, [content || [], m("div")]).children[0]
  }

  mithrildom.insertChild = function(domnode, child){
    if(typeof(domnode.text) == "string" && !domnode.children) {
      domnode.children = mithrildom.children(domnode)
      domnode.text = undefined
    }
    if(!(domnode.children instanceof Array)) {
      console.error("mithil element cannot insert child %o", domnode)
      return
    }
    domnode.children = [child].concat(domnode.children)
  }

  mithrildom.addChild = function(domnode, child){
    if(typeof(domnode.text) == "string" && !domnode.children) {
      domnode.children = mithrildom.children(domnode)
      domnode.text = undefined
    }
    if(!(domnode.children instanceof Array)) {
      console.error("mithil element cannot add child %o", domnode)
      return
    }
    domnode.children = domnode.children.concat([child])
  }

  mithrildom.clearChildren = function(domnode){
    if(typeof(domnode.text) == "string" && !domnode.children) {
      domnode.children = []
      domnode.text = undefined
    } else if(!(domnode.children instanceof Array)) {
      console.error("mithil element cannot clear children %o", domnode)
    } else {
      domnode.children = []
    }
  }

  mithrildom.tagName = function(dom) {
    if(typeof dom !== "object") return undefined
    return dom.tag
  }

  mithrildom.attr = function(dom, name) {
    if(dom.attrs) {
      return dom.attrs[name]
    }
  }

  mithrildom.setAttr = function(dom, name, value) {
    if(value === undefined || value === null || value === false) {
      if(dom.attrs) delete dom.attrs[name]
    } else {
      if(!dom.attrs) dom.attrs = {}
      dom.attrs[name] = value
    }
  }

  mithrildom.addEventHandler = function(dom, name, handler) {
    dom.setAttr(dom, "on"+name, handler)
  }

  mithrildom.fromDOM = function fromDOM(dom) {
    if(dom.nodeName === "#text") return textNode(dom.textContent)
    if(dom.nodeName === "#cdata-section") return textNode(dom.textContent)
    if(dom.nodeName === "#comment") return fragmentNode()
    var children = []
    if(dom.childNodes){
        var len = dom.childNodes.length
        for(var i = 0; i < len; i++){
            var child = dom.childNodes[i]
            children.push(fromDOM(child))
        }
    }
    if(dom instanceof DocumentFragment) return fragmentNode(children)
    var attrs = {}
    if(dom.attributes) {
        var len = dom.attributes.length
        for(var i = 0; i < len; i++) {
            var attr = dom.attributes[i]
            attrs[attr.name] = attr.value
        }
    }
    return m(dom.tagName, attrs, children)
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

  return mithrildom
})
