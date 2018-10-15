import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/python/python'
import './editor.css'
import './index.css';

import $ from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import Layout from "purly-layout";
import {UnControlled as CodeMirror} from 'react-codemirror2'


function makeId(size) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < size; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}


class Sandbox extends React.Component {

  render() {
    let id = makeId(12);
    const uri = window.location.hostname + ':80';
    let executorEndpoint=`http://${uri}/sandbox-exec-${id}`;
    let layoutEndpoint=`ws://${uri}/state/model/sandbox-${id}/stream`;
    let outputEndpoint=`ws://${uri}/state/model/sandbox-output-${id}/stream`;
    let editor = ( <Editor executorEndpoint={ executorEndpoint } outputEndpoint={ outputEndpoint }/> );
    let navbar = <Menu/>
    return (
      <div>
        { navbar }
        { editor }
        <div id="layout">
          <Layout endpoint={ layoutEndpoint }/>
        </div>
      </div>
    )
  }
}


class Editor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
			code: "hello = 'world'",
			readOnly: false,
			mode: 'python',
		};
    window.currentEditor = this;
  }

  updateCode = (code, now) => {
    this.setState({ code });
    this.sendCodeUpdate(code, now)
  }

	sendCodeUpdate = (newCode, now) => {
    if ( this.updateTrigger !== undefined ) {
      clearTimeout(this.updateTrigger);
    }
    let updateView = () => {
      let toSend = JSON.stringify({ code: newCode });
      $.post(this.props.executorEndpoint, toSend);
    }
    if ( now !== undefined ) {
      updateView()
    } else {
      this.updateTrigger = setTimeout(updateView, 2000);
    }
	}

	render = () => {
		let options = {
			lineNumbers: true,
			readOnly: false,
			mode: "python"
		};
		return (
      <div id="editor">
  			<CodeMirror
          ref="editor"
          value={this.state.code}
          onChange={ (editor, data, value) => this.sendCodeUpdate(value) }
          options={options}
        />
        <div id="output">
          <Layout endpoint={ this.props.outputEndpoint }/>
        </div>
      </div>
		);
	}
};


class Menu extends React.Component {
  render = () => {
    return (
      <nav>
        <ul>
        <li>
          <a>Examples</a>
          <ul className="dropdown">
            <li onClick={ () => { window.currentEditor.updateCode(toggleButtonCode, true) } }><a>Toggle Button</a></li>
            <li onClick={ () => { window.currentEditor.updateCode(colorPickerCode, true) } }><a>Color Picker</a></li>
            <li onClick={ () => { window.currentEditor.updateCode(gridSelectorCode, true) } }><a>Grid Selector</a></li>
          </ul>
        </li>
        <li onClick={() => this.projectLink.click()}><a ref={a => this.projectLink = a} href="https://github.com/rmorshea/purly" target="_blank">GitHub</a></li>
        </ul>
      </nav>
    );
  }
}


const toggleButtonCode = `# Toggle Button
# -------------

div = layout.html('div')
layout.children.append(div)
div.style.update(height='50px', width='50px', backgroundColor='coral')


@div.on('Click')
def toggle():
    if div.style['backgroundColor'] == 'teal':
        div.style['backgroundColor'] = 'coral'
    else:
        div.style['backgroundColor'] = 'teal'
`;

const colorPickerCode = `# Color Picker
# ------------

import math

def hsl(radius, x, y):
    """Return an HSL color string."""
    x -= radius
    y -= radius
    unit_radius = int((x ** 2 + y **2) ** 0.5) / radius
    degrees = int(math.atan2(x, y) * 180 / math.pi)
    return "hsl(%s, 100%%, %s%%)" % (degrees, unit_radius * 100)

radius = 50
wheel = layout.html('div')
wheel.style.update(
    height="%spx" % (radius * 2),
    width="%spx" % (radius * 2),
    backgroundColor="hsl(120, 100%, 50%)",
    borderRadius="50%",
)

selection = layout.html('div')
selection.style.update(
    height="20px",
    width="20px",
    backgroundColor="hsl(120, 100%, 50%)",
)

layout.children.append(wheel)
layout.children.append(selection)

@wheel.on('MouseMove')
def cause_color_change(offsetX, offsetY):
    wheel.style["backgroundColor"] = hsl(50, offsetX, offsetY)

@wheel.on("Click")
def cause_color_select(offsetX, offsetY):
    selection.style["backgroundColor"] = hsl(50, offsetX, offsetY)
`

const gridSelectorCode = `# Grid Selector
# -------------

def grid(x, y, size):

    container = layout.html('div', style={"display": "table"})
    state = {"dragging": False, "selection": set(), "start": (0, 0), "stop": (0, 0)}

    def square(size, color, margin):
        return layout.html(
            'div',
            style={
                "display": "table-cell",
                "height": "%spx" % size,
                "width": "%spx" % size,
                "backgroundColor": "blue",
                "border": "2px solid white"
            },
        )

    def select():
        new = set()
        x1, y1 = state["start"]
        x2, y2 = state["stop"]
        start_x, stop_x = sorted([x1, x2])
        start_y, stop_y = sorted([y1, y2])
        for i in range(start_x, stop_x + 1):
            for j in range(start_y, stop_y + 1):
                new.add((i, j))
        for (x, y) in state["selection"].difference(new):
            container.children[x].children[y].style["backgroundColor"] = "blue"
        for (x, y) in new:
            container.children[x].children[y].style["backgroundColor"] = "red"
        state["selection"].update(new)

    def clear():
        for (x, y) in state["selection"]:
            container.children[x].children[y].style["backgroundColor"] = "blue"
        state["selection"].clear()

    for i in range(y):
        row = layout.html('div', style={"display": "table-row"})
        for j in range(x):
            sqr = square(size, 'blue', size)

            @sqr.on("MouseDown")
            def drag_start(_x=i, _y=j):
                state["stop"] = state["start"] = (_x, _y)
                state["dragging"] = True
                select()

            @sqr.on("MouseUp")
            def drag_stop():
                if state["stop"]:
                    state["dragging"] = False
                    clear()

            @sqr.on("MouseEnter")
            def drag_select(_x=i, _y=j):
                if state["dragging"]:
                    if state["stop"] != (_x, _y):
                        state["stop"] = (_x, _y)
                        select()

            row.children.append(sqr)
        container.children.append(row)

    return container

g = grid(7, 7, 30)
layout.children.append(g)
`


ReactDOM.render(<Sandbox/>, document.getElementById('app'));
