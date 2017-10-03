function react_template(React) {
  var clearseam = $clearseam.react(React)
  return function(name, directives){
    var tmpltag = fromDOM(React.createElement, document.querySelector("template[name='"+name+"']").content)
    return clearseam(tmpltag, directives)
  }
}

function fromDOM(h, dom) {
    if(dom.nodeName === "#text") return dom.textContent
    if(dom.nodeName === "#cdata-section") return dom.textContent
    if(dom.nodeName === "#comment") return []
    var res = {}
    if(dom.tagName !== undefined) res.tag = dom.tagName
    if(dom.attributes) {
        var len = dom.attributes.length
        var attrs = {}
        for(var i = 0; i < len; i++) {
            var attr = dom.attributes[i]
            attrs[attr.name] = attr.value
        }
        if(len > 0) res.attrs = attrs
    }
    if(dom.childNodes){
        var children = []
        var len = dom.childNodes.length
        for(var i = 0; i < len; i++){
            var child = dom.childNodes[i]
            children.push(fromDOM(h, child))
        }
        if(len > 0) res.children = children
    }
    res = h(res.tag, res.attrs, res.children)
    if(dom instanceof DocumentFragment) res = res.children
    //console.log("%o -> %o", dom, res)
    return res
}


