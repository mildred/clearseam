var clearseamdom = $clearseam.mithrildom(m)
var clearseam = $clearseam(clearseamdom)

function template(name, directives) {
  var dom = document.querySelector("template[name='"+name+"']").content
  var tmpltag = clearseamdom.fromDOM(dom)
  //console.log("template "+name+" dom: %o", dom)
  //console.log("template "+name+" vdom: %o", tmpltag)
  return clearseam(tmpltag, directives)
}

