const React = require('react')
const h = require('react-hyperscript')
const debounce = require('debounce')
const CodeMirror = require('react-codemirror')

require('codemirror/mode/javascript/javascript')

module.exports = class extends React.Component {
  constructor (props) {
    super(props)

    this.dsaveCode = debounce(this.saveCode.bind(this), 700).bind(this)
  }

  render () {
    return (
      h('div', [
        h('h1', 'Reducer'),
        h(CodeMirror, {
          value: this.props.code,
          onChange: this.dsaveCode,
          options: {
            viewportMargin: Infinity,
            mode: 'javascript'
          }
        })
      ])
    )
  }

  saveCode (code) {
    this.props.save(code)
  }
}
