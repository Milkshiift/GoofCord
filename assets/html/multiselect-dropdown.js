function MultiselectDropdown(options){
  let config={
    placeholder:'Select...',
    ...options
  };
  function newEl(tag,attrs){
    let e=document.createElement(tag);
    if(attrs!==undefined) Object.keys(attrs).forEach(k=>{
      if(k==='class') { Array.isArray(attrs[k]) ? attrs[k].forEach(o=>o!==''?e.classList.add(o):0) : (attrs[k]!==''?e.classList.add(attrs[k]):0)}
      else if(k==='style'){
        Object.keys(attrs[k]).forEach(ks=>{
          e.style[ks]=attrs[k][ks];
        });
       }
      else if(k==='text'){attrs[k]===''?e.innerHTML='&nbsp;':e.innerText=attrs[k]}
      else e[k]=attrs[k];
    });
    return e;
  }


  document.querySelectorAll("select[multiple]").forEach((el,k)=>{
    let div=newEl('div',{class:'multiselect-dropdown'});
    el.style.display='none';
    el.parentNode.insertBefore(div,el.nextSibling);
    let listWrap=newEl('div',{class:'multiselect-dropdown-list-wrapper'});
    let list=newEl('div',{class:'multiselect-dropdown-list'});
    div.appendChild(listWrap);
    listWrap.appendChild(list);
    listWrap.classList.add('dropdown-hidden');

    el.loadOptions=()=>{
      list.innerHTML='';

      Array.from(el.options).map(o=>{
        let op=newEl('div',{class:'checkbox-container',optEl:o})
        op.classList.add('no-margin')
        let ic=newEl('input',{type:'checkbox',class:'slim-checkbox',checked:o.selected});
        op.appendChild(ic);
        op.appendChild(newEl('label',{text:o.text}));

        op.addEventListener('click',()=>{
          ic.checked=!ic.checked;
          op.optEl.selected=!!!op.optEl.selected;
          el.dispatchEvent(new Event('change'));
        });
        ic.addEventListener('click',(ev)=>{
          ic.checked=!ic.checked;
        });
        o.listitemEl=op;
        list.appendChild(op);
      });
      div.listEl=listWrap;

      div.refresh=()=>{
        div.querySelectorAll('span.optext, span.placeholder').forEach(t=>div.removeChild(t));
        let sels=Array.from(el.selectedOptions);
        sels.map(x=>{
          let c=newEl('span',{class:'optext',text:x.text, srcOption: x});
          div.appendChild(c);
        });
        if(0==el.selectedOptions.length) div.appendChild(newEl('span',{class:'placeholder',text:config.placeholder}));
      };
      div.refresh();
    }
    el.loadOptions();

    div.addEventListener('click',()=>{
      div.listEl.classList.remove('dropdown-hidden')
    });

    document.addEventListener('click', function(event) {
      if (!div.contains(event.target)) {
        listWrap.classList.add('dropdown-hidden');
        div.refresh();
      }
    });
  });
}

window.addEventListener('load',()=>{
  setTimeout(()=>{
    MultiselectDropdown(window.MultiselectDropdownOptions);
  }, 500)
});
