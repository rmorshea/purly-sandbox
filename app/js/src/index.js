import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/python/python'
import './editor.css'
import './index.css';

import $ from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import Layout from "purly-layout";
import CodeMirror from "react-codemirror";


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
    const uri = document.location.hostname + ":" + document.location.port;
    let executorEndpoint=`http://${uri}/editor/sandbox-exec-${id}`
    let layoutEndpoint=`ws://${uri}/state/model/sandbox-${id}/stream`
    let outputEndpoint=`ws://${uri}/state/model/sandbox-output-${id}/stream`
    return (
      <div>
        <Editor executorEndpoint={ executorEndpoint } outputEndpoint={ outputEndpoint }/>
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
  }

	updateCode = (newCode) => {
		this.setState({
			code: newCode
		});
    if ( this.updateTrigger !== undefined ) {
      clearTimeout(this.updateTrigger)
    }
    let updateView = () => {
      let toSend = JSON.stringify({ code: newCode });
      $.post(this.props.executorEndpoint, toSend);
    }
    this.updateTrigger = setTimeout(updateView, 2000)
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
        onChange={this.updateCode}
        options={options}
      />
      <div id="output">
        <Layout endpoint={ this.props.outputEndpoint }/>
      </div>
      </div>
		);
	}
};


ReactDOM.render(<Sandbox/>, document.getElementById('app'));
