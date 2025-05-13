function MultiselectDropdown(options) {
  const config = {
    placeholder: 'Select...',
    ...options
  };

  function createElement(tag, attrs = {}) {
    const element = document.createElement(tag);

    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') {
        if (Array.isArray(value)) {
          value.filter(cls => cls !== '').forEach(cls => element.classList.add(cls));
        } else if (value !== '') {
          element.classList.add(value);
        }
      } else if (key === 'style') {
        Object.entries(value).forEach(([styleKey, styleValue]) => {
          element.style[styleKey] = styleValue;
        });
      } else if (key === 'text') {
        element.textContent = value === '' ? '\u00A0' : value;
      } else if (key === 'html') {
        element.innerHTML = value;
      } else {
        element[key] = value;
      }
    });

    return element;
  }

  document.querySelectorAll("select[multiple]").forEach(selectElement => {
    selectElement.style.display = 'none';

    const dropdownContainer = createElement('div', {
      class: 'multiselect-dropdown',
      role: 'listbox',
      'aria-label': selectElement.getAttribute('aria-label') || 'Multiselect dropdown',
      tabIndex: 0
    });

    selectElement.parentNode.insertBefore(dropdownContainer, selectElement.nextSibling);

    const listWrapper = createElement('div', {
      class: ['multiselect-dropdown-list-wrapper', 'dropdown-hidden']
    });

    const optionsList = createElement('div', {
      class: 'multiselect-dropdown-list',
      role: 'group'
    });

    dropdownContainer.appendChild(listWrapper);
    listWrapper.appendChild(optionsList);

    selectElement.loadOptions = () => {
      optionsList.innerHTML = '';

      Array.from(selectElement.options).forEach(option => {
        const optionItem = createElement('div', {
          class: option.selected ? 'checked' : '',
          optEl: option,
          role: 'option',
          'aria-selected': option.selected
        });

        const optionLabel = createElement('label', {
          text: option.text
        });

        optionItem.appendChild(optionLabel);

        optionItem.addEventListener('click', (e) => {
          e.stopPropagation();
          option.selected = !option.selected;
          optionItem.setAttribute('aria-selected', option.selected);
          optionItem.classList.toggle('checked', option.selected);
          selectElement.dispatchEvent(new Event('change'));
          refreshDropdown();
        });

        option.listitemEl = optionItem;
        optionsList.appendChild(optionItem);
      });
    };

    const refreshDropdown = () => {
      dropdownContainer.querySelectorAll('span.optext, span.placeholder').forEach(el =>
          dropdownContainer.removeChild(el)
      );

      const selectedOptions = Array.from(selectElement.selectedOptions);

      if (selectedOptions.length === 0) {
        dropdownContainer.appendChild(createElement('span', {
          class: 'placeholder',
          text: config.placeholder
        }));
      } else {
        selectedOptions.forEach(option => {
          const tag = createElement('span', {
            class: 'optext',
            text: option.text,
            srcOption: option
          });

          dropdownContainer.appendChild(tag);
        });
      }
    };

    selectElement.loadOptions();
    refreshDropdown();

    dropdownContainer.addEventListener('click', () => {
      listWrapper.classList.toggle('dropdown-hidden');
      dropdownContainer.classList.toggle('open');
    });

    document.addEventListener('click', (event) => {
      if (!dropdownContainer.contains(event.target)) {
        listWrapper.classList.add('dropdown-hidden');
        dropdownContainer.classList.remove('open');
        refreshDropdown();
      }
    });

    dropdownContainer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        listWrapper.classList.toggle('dropdown-hidden');
      } else if (e.key === 'Escape') {
        listWrapper.classList.add('dropdown-hidden');
      }
    });

    selectElement.addEventListener('change', refreshDropdown);
  });
}

window.initMultiselect = () => {
  MultiselectDropdown(window.MultiselectDropdownOptions || {});
};