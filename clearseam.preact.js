$clearseam.preact = function(preact){
  var h = preact.h
  var preactdom = {}

  preactdom.children = function(domnode){
    if(typeof(domnode) != 'object') return []
    if(domnode instanceof Array) return domnode
    if(!domnode.children) return []
    if(typeof(domnode.children) !== 'object') return [domnode.children]
    if(!(domnode.children instanceof Array)) return [domnode.children]
    return domnode.children
  }

  preactdom.toVDOM = function(domnode){
    return domnode
  }

  preactdom.clone = function dom_clone(domnode, recursive){
    if(typeof(domnode) != 'object') return domnode
    if(domnode instanceof Array) {
      var res = []
      for(var i of domnode) {
        res.push(dom_clone(i, recursive))
      }
      return res
    }
    var res = {}
    for(var k in domnode) {
      if(k == 'children') {
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

  preactdom.fragment = function(){
    return []
  }

  preactdom.text = function(text){
    return text
  }

  preactdom.insertChild = function(domnode, child){
    if(domnode instanceof Array) {
      if(child instanceof Array) {
        for(var i = child.length-1; i >= 0; i--) {
          domnode.unshift(child[i])
        }
      } else {
        domnode.unshift(child)
      }
      return
    }
    domnode.children = domnode.children || []
    if(!(child instanceof Array)) child = [child]
    domnode.children = child.concat(domnode.children)
  }

  preactdom.addChild = function(domnode, child){
    if(domnode instanceof Array) {
      if(child instanceof Array) {
        for(var i = 0; i < child.length; i++) {
          domnode.push(child[i])
        }
      } else {
        domnode.push(child)
      }
      return
    }
    domnode.children = domnode.children || []
    if(!(domnode.children instanceof Array)) {
      domnode.children = [domnode.children]
    }
    if(!(child instanceof Array)) child = [child]
    domnode.children = domnode.children.concat(child)
  }

  preactdom.clearChildren = function(domnode){
    if(domnode instanceof Array) {
      domnode.splice(0)
      return
    }
    domnode.children = []
  }

  preactdom.tagName = function(dom) {
    return dom.nodeName
  }

  preactdom.attr = function(dom, name) {
    if(dom.attributes) {
      return dom.attributes[name]
    }
  }

  preactdom.setAttr = function(dom, name, value) {
    dom.attributes = dom.attributes || {}
    if(value === undefined || value === null || value === false) {
      delete dom.attributes[name]
    } else {
      dom.attributes[name] = value
    }
  }

  preactdom.addEventHandler = function(dom, name, handler) {
    preactdom.setAttr(dom, "on"+name, handler)
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

  return $clearseam(preactdom)
}

