import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import keycode from 'keycode';
import Menu from '../Menu/Menu';
import { isFilled } from '../Input/Input';

/**
 * @ignore - internal component.
 */
class SelectInput extends React.Component {
  state = {
    open: false,
  };

  componentDidMount() {
    if (this.isOpenControlled && this.props.open) {
      // Focus the display node so the focus is restored on this element once
      // the menu is closed.
      this.displayNode.focus();
      // Rerender with the resolve `displayNode` reference.
      this.forceUpdate();
    }

    if (this.props.autoFocus) {
      this.displayNode.focus();
    }
  }

  shouldComponentUpdate() {
    this.updateDisplayWidth();

    return true;
  }

  ignoreNextBlur = false;
  displayNode = null;
  displayWidth = null;
  isOpenControlled = this.props.open !== undefined;

  updateDisplayWidth = () => {
    // Perfom the layout computation outside of the render method.
    if (this.displayNode) {
      this.displayWidth = this.displayNode.clientWidth;
    }
  };

  update = this.isOpenControlled
    ? ({ event, open }) => {
        if (open) {
          this.props.onOpen(event);
        } else {
          this.props.onClose(event);
        }
      }
    : ({ open }) => this.setState({ open });

  handleClick = event => {
    // Opening the menu is going to blur the. It will be focused back when closed.
    this.ignoreNextBlur = true;
    this.update({
      open: true,
      event,
    });
  };

  handleClose = event => {
    this.update({
      open: false,
      event,
    });
  };

  handleItemClick = child => event => {
    if (!this.props.multiple) {
      this.update({
        open: false,
        event,
      });
    }

    const { onChange, name } = this.props;

    if (onChange) {
      let value;
      let target;

      if (event.target) {
        target = event.target;
      }

      if (this.props.multiple) {
        value = Array.isArray(this.props.value) ? [...this.props.value] : [];
        const itemIndex = value.indexOf(child.props.value);
        if (itemIndex === -1) {
          value.push(child.props.value);
        } else {
          value.splice(itemIndex, 1);
        }
      } else {
        value = child.props.value;
      }

      event.persist();
      event.target = { ...target, value, name };

      onChange(event, child);
    }
  };

  handleBlur = event => {
    if (this.ignoreNextBlur === true) {
      // The parent components are relying on the bubbling of the event.
      event.stopPropagation();
      this.ignoreNextBlur = false;
      return;
    }

    if (this.props.onBlur) {
      this.props.onBlur(event);
    }
  };

  handleKeyDown = event => {
    if (this.props.readOnly) {
      return;
    }

    if (['space', 'up', 'down'].indexOf(keycode(event)) !== -1) {
      event.preventDefault();
      // Opening the menu is going to blur the. It will be focused back when closed.
      this.ignoreNextBlur = true;
      this.update({
        open: true,
        event,
      });
    }
  };

  handleDisplayRef = node => {
    this.displayNode = node;
    this.updateDisplayWidth();
  };

  handleInputRef = node => {
    const { inputRef } = this.props;

    if (!inputRef) {
      return;
    }

    const nodeProxy = {
      node,
      // By pass the native input as we expose a rich object (array).
      value: this.props.value,
    };

    if (typeof inputRef === 'function') {
      inputRef(nodeProxy);
    } else {
      inputRef.current = nodeProxy;
    }
  };

  render() {
    const {
      autoWidth,
      children,
      classes,
      className,
      disabled,
      displayEmpty,
      IconComponent,
      inputRef,
      MenuProps = {},
      multiple,
      name,
      onBlur,
      onChange,
      onClose,
      onFocus,
      onOpen,
      open: openProp,
      readOnly,
      renderValue,
      SelectDisplayProps,
      tabIndex: tabIndexProp,
      type = 'hidden',
      value,
      ...other
    } = this.props;
    const open = this.isOpenControlled && this.displayNode ? openProp : this.state.open;

    let display;
    let displaySingle = '';
    const displayMultiple = [];
    let computeDisplay = false;

    // No need to display any value if the field is empty.
    if (isFilled(this.props) || displayEmpty) {
      if (renderValue) {
        display = renderValue(value);
      } else {
        computeDisplay = true;
      }
    }

    const items = React.Children.map(children, child => {
      if (!React.isValidElement(child)) {
        return null;
      }
      let selected;

      if (multiple) {
        if (!Array.isArray(value)) {
          throw new Error(
            'Material-UI: the `value` property must be an array ' +
              'when using the `Select` component with `multiple`.',
          );
        }

        selected = value.indexOf(child.props.value) !== -1;
        if (selected && computeDisplay) {
          displayMultiple.push(child.props.children);
        }
      } else {
        selected = value === child.props.value;
        if (selected && computeDisplay) {
          displaySingle = child.props.children;
        }
      }

      return React.cloneElement(child, {
        onClick: this.handleItemClick(child),
        role: 'option',
        selected,
        value: undefined, // The value is most likely not a valid HTML attribute.
        'data-value': child.props.value, // Instead, we provide it as a data attribute.
      });
    });

    if (computeDisplay) {
      display = multiple ? displayMultiple.join(', ') : displaySingle;
    }

    const MenuMinWidth = this.displayNode && !autoWidth ? this.displayWidth : undefined;

    let tabIndex;
    if (typeof tabIndexProp !== 'undefined') {
      tabIndex = tabIndexProp;
    } else {
      tabIndex = disabled ? null : 0;
    }

    return (
      <div className={classes.root}>
        <div
          className={classNames(
            classes.select,
            classes.selectMenu,
            {
              [classes.disabled]: disabled,
            },
            className,
          )}
          ref={this.handleDisplayRef}
          data-mui-test="SelectDisplay"
          aria-pressed={open ? 'true' : 'false'}
          tabIndex={tabIndex}
          role="button"
          aria-owns={open ? `menu-${name || ''}` : null}
          aria-haspopup="true"
          onKeyDown={this.handleKeyDown}
          onBlur={this.handleBlur}
          onClick={disabled || readOnly ? null : this.handleClick}
          onFocus={onFocus}
          {...SelectDisplayProps}
        >
          {/* So the vertical align positioning algorithm quicks in. */}
          {/* eslint-disable-next-line react/no-danger */}
          {display || <span dangerouslySetInnerHTML={{ __html: '&#8203;' }} />}
        </div>
        <input
          value={Array.isArray(value) ? value.join(',') : value}
          name={name}
          readOnly={readOnly}
          ref={this.handleInputRef}
          type={type}
          {...other}
        />
        <IconComponent className={classes.icon} />
        <Menu
          id={`menu-${name || ''}`}
          anchorEl={this.displayNode}
          open={open}
          onClose={this.handleClose}
          {...MenuProps}
          MenuListProps={{
            role: 'listbox',
            ...MenuProps.MenuListProps,
          }}
          PaperProps={{
            ...MenuProps.PaperProps,
            style: {
              minWidth: MenuMinWidth,
              ...(MenuProps.PaperProps != null ? MenuProps.PaperProps.style : null),
            },
          }}
        >
          {items}
        </Menu>
      </div>
    );
  }
}

SelectInput.propTypes = {
  /**
   * @ignore
   */
  autoFocus: PropTypes.bool,
  /**
   * If true, the width of the popover will automatically be set according to the items inside the
   * menu, otherwise it will be at least the width of the select input.
   */
  autoWidth: PropTypes.bool,
  /**
   * The option elements to populate the select with.
   * Can be some `<MenuItem>` elements.
   */
  children: PropTypes.node,
  /**
   * Override or extend the styles applied to the component.
   * See [CSS API](#css-api) below for more details.
   */
  classes: PropTypes.object.isRequired,
  /**
   * The CSS class name of the select element.
   */
  className: PropTypes.string,
  /**
   * If `true`, the select will be disabled.
   */
  disabled: PropTypes.bool,
  /**
   * If `true`, the selected item is displayed even if its value is empty.
   */
  displayEmpty: PropTypes.bool,
  /**
   * The icon that displays the arrow.
   */
  IconComponent: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  /**
   * Use that property to pass a ref callback to the native select element.
   */
  inputRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  /**
   * Properties applied to the `Menu` element.
   */
  MenuProps: PropTypes.object,
  /**
   * If true, `value` must be an array and the menu will support multiple selections.
   */
  multiple: PropTypes.bool,
  /**
   * Name attribute of the `select` or hidden `input` element.
   */
  name: PropTypes.string,
  /**
   * @ignore
   */
  onBlur: PropTypes.func,
  /**
   * Callback function fired when a menu item is selected.
   *
   * @param {object} event The event source of the callback.
   * You can pull out the new value by accessing `event.target.value`.
   * @param {object} [child] The react element that was selected.
   */
  onChange: PropTypes.func,
  /**
   * Callback fired when the component requests to be closed.
   * Use in controlled mode (see open).
   *
   * @param {object} event The event source of the callback
   */
  onClose: PropTypes.func,
  /**
   * @ignore
   */
  onFocus: PropTypes.func,
  /**
   * Callback fired when the component requests to be opened.
   * Use in controlled mode (see open).
   *
   * @param {object} event The event source of the callback
   */
  onOpen: PropTypes.func,
  /**
   * Control `select` open state.
   */
  open: PropTypes.bool,
  /**
   * @ignore
   */
  readOnly: PropTypes.bool,
  /**
   * Render the selected value.
   *
   * @param {*} value The `value` provided to the component.
   * @returns {ReactElement}
   */
  renderValue: PropTypes.func,
  /**
   * Properties applied to the clickable div element.
   */
  SelectDisplayProps: PropTypes.object,
  /**
   * @ignore
   */
  tabIndex: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  /**
   * @ignore
   */
  type: PropTypes.string,
  /**
   * The input value.
   */
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  ]).isRequired,
};

export default SelectInput;
