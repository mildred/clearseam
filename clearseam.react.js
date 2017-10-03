$clearseam.react = function(React){
  var h = React.createElement
  var reactdom = {}

  reactdom.children = function(domnode){
    if(typeof(domnode) != 'object') return []
    React.Children.toArray(domnode.props.children)
  }

  reactdom.isVDOM = function(domnode){
    return React.isValidElement(domnode)
  }

  reactdom.toVDOM = function(domnode){
    if(reactdom.isVDOM(domnode)) {
      return domnode
    } else {
      return domnode
    }
  }

  reactdom.clone = function dom_clone(domnode, recursive){
    if(typeof(domnode) != 'object') return domnode
    if(domnode instanceof Array) {
      var res = []
      for(var i of domnode) {
        res.push(dom_clone(i, recursive))
      }
      return res
    }
    var children = []
    if(recursive) {
      children = React.Children.map(domnode.props.children, (child) => (dom_clone(domnode, true)))
    }
    return React.cloneElement.apply(React, [domnode, {}].concat([children]))
  }

  reactdom.fragment = function(){
    return []
  }

  reactdom.text = function(text){
    return text
  }

  reactdom.insertChild = function(domnode, child){
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
    TODO
  }

  reactdom.addChild = function(domnode, child){
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
    TODO
  }

  reactdom.clearChildren = function(domnode){
    if(domnode instanceof Array) {
      domnode.splice(0)
      return
    }
    TODO
  }

  reactdom.tagName = function(dom) {
    TODO
    return dom.nodeName
  }

  reactdom.attr = function(dom, name) {
    TODO
    if(dom.attributes) {
      return dom.attributes[name]
    }
  }

  reactdom.setAttr = function(dom, name, value) {
    TODO
    dom.attributes = dom.attributes || {}
    if(value === undefined || value === null || value === false) {
      delete dom.attributes[name]
    } else {
      dom.attributes[name] = value
    }
  }

  reactdom.addEventHandler = function(dom, name, handler) {
    TODO
    reactdom.setAttr(dom, "on"+name, handler)
  }

  return $clearseam(reactdom)
}

