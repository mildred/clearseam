function template(name, directives){
  var tmpltag = cito.vdom.fromDOM(document.querySelector("template[name='"+name+"']").content)
  return $clearseam.citojsdom(tmpltag, directives)
}

function render_vdom(component, tmpl) {
  return function(data){
    var dom = tmpl(data === undefined ? component : data)
    if(component._vdom) {
      // Update existing vdom
      cito.vdom.update(component._vdom, dom)
    }
    component._vdom = dom

    // Return dom so clearseam will render a component as vdom
    return dom
  }
}

function template_render(component, name, directives) {
  var t = template(name, directives)
  return render_vdom(component, t)
}

function Component() {
  //this.render({children: []})
}

Component.prototype.dom = function(){
  return this._vdom
}

Component.prototype.render = function(dom){
  if(this._vdom) {
    if(!this._vdom.dom){
      //console.error("Cannot update dom: not inserted in hierarchy (update %o to %o)", this, dom)
    } else {
      cito.vdom.update(this._vdom, dom)
    }
  }
  this._vdom = dom
  return this._vdom
}

