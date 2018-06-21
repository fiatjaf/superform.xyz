const React = require('react')
const h = require('react-hyperscript')
const debounce = require('debounce')
const CodeMirror = require('react-codemirror')

require('codemirror/mode/pug/pug')

module.exports = class extends React.Component {
  constructor (props) {
    super(props)

    this.dsaveUI = debounce(this.saveUI.bind(this), 700).bind(this)
  }

  render () {
    return (
      h('div', [
        h('h1', 'UI'),
        h(CodeMirror, {
          value: this.props.ui,
          onChange: this.dsaveUI,
          options: {
            viewportMargin: Infinity,
            mode: 'pug'
          }
        })
      ])
    )
  }

  saveUI (uicode) {
    this.props.save(uicode)
  }
}
