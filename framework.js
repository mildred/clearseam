function template(name, directives){
  var tmpltag = cito.vdom.fromDOM(document.querySelector("template[name='"+name+"']").content)
  return $templateless.citojsdom(tmpltag, directives)
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
